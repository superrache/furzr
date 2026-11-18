import type { Artist } from "../api/types";

/**
 * Nœud de la carte. Les objets sont réutilisés d'un rendu à l'autre :
 * force-graph y stocke la position (x, y) et la vitesse (vx, vy).
 */
export interface MapNode {
  id: string;
  name: string;
  mbid?: string;
  isInput: boolean;
  isExploded: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface MapLink {
  /** force-graph remplace source/target par les objets nœuds : on garde les ids à part. */
  source: string | MapNode;
  target: string | MapNode;
  from: string;
  to: string;
}

export type NodeKind = "input" | "exploded" | "similar";

/**
 * Croissance de la carte, comme les deux modes d'origine :
 * - "snake" (serpent) : à chaque expansion, les similaires non explorés disparaissent ;
 * - "tree" (arbre) : rien n'est élagué, l'arbre grossit sans fin.
 */
export type Growth = "snake" | "tree";

export function nodeKind(node: MapNode): NodeKind {
  return node.isInput ? "input" : node.isExploded ? "exploded" : "similar";
}

/** Format sérialisable d'une carte (partage par URL). */
export interface MapSnapshot {
  v: 1;
  /** source de similarité */
  p: string;
  /** artistes A (premier saisi) et B (dernier exploré) */
  a: string;
  b: string;
  /** nœuds : [id, nom, mbid ("" si aucun)] */
  n: [string, string, string][];
  /** liens : indices dans n */
  l: [number, number][];
  /** indices des nœuds saisis (dans l'ordre) et explorés */
  i: number[];
  e: number[];
  /** croissance ; absent = "snake" (cartes partagées avant l'option) */
  g?: Growth;
}

/** Comparaison de noms tolérante : « Beyoncé » = « beyonce ». */
export function normalizeName(name: string): string {
  return name.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLowerCase();
}

const linkKey = (a: string, b: string) => (a < b ? `${a}\u0001${b}` : `${b}\u0001${a}`);

/**
 * Carte des artistes : reproduit la mécanique du furzr d'origine.
 * - chaque artiste saisi est un nœud « input » ;
 * - cliquer un nœud l'« explore » : ses similaires sont ajoutés ;
 * - à chaque expansion, les similaires non explorés des expansions
 *   précédentes sont élagués : reste le chemin parcouru (le serpent)
 *   entre l'artiste A (premier saisi) et B (dernier exploré).
 */
export class ArtistMap {
  private nodes = new Map<string, MapNode>();
  private links = new Map<string, MapLink>();
  private inputIds: string[] = [];
  private explodedIds: string[] = [];
  artistA = "";
  artistB = "";
  /** Peut changer en cours de route : passer de "tree" à "snake" élague à la prochaine expansion. */
  growth: Growth = "snake";

  get isEmpty(): boolean {
    return this.nodes.size === 0;
  }

  getNode(id: string): MapNode | undefined {
    return this.nodes.get(id);
  }

  /** Données pour force-graph (mêmes objets d'un appel à l'autre). */
  graphData(): { nodes: MapNode[]; links: MapLink[] } {
    return { nodes: [...this.nodes.values()], links: [...this.links.values()] };
  }

  /**
   * Ajoute un artiste saisi et ses similaires.
   * À n'appeler que si des similaires ont été trouvés (comme l'original).
   */
  addInput(artist: Artist, similars: Artist[], max: number): MapNode {
    const node = this.upsert(artist);
    node.isInput = true;
    if (!this.inputIds.includes(node.id)) {
      this.inputIds.push(node.id);
    }
    if (this.inputIds.length === 1) {
      this.artistA = node.name;
      this.artistB = node.name;
    }
    this.expand(node.id, similars, max);
    return node;
  }

  /** Marque un nœud comme exploré (clic) ; il devient l'extrémité B du chemin. */
  markExplored(id: string): void {
    const node = this.nodes.get(id);
    if (!node) {
      return;
    }
    node.isExploded = true;
    if (!this.explodedIds.includes(id)) {
      this.explodedIds.push(id);
    }
    this.artistB = node.name;
  }

  /** Élague les similaires non explorés (mode snake) puis ajoute ceux du nœud `centerId`. */
  expand(centerId: string, similars: Artist[], max: number): void {
    const center = this.nodes.get(centerId);
    if (!center) {
      return;
    }
    if (this.growth === "snake") {
      this.prune();
    }
    for (const similar of similars.slice(0, max)) {
      if (similar.id === centerId) {
        continue;
      }
      const isNew = !this.nodes.has(similar.id);
      const node = this.upsert(similar);
      if (isNew && center.x !== undefined && center.y !== undefined) {
        // les nouveaux nœuds partent du nœud exploré : animation plus lisible
        node.x = center.x + (Math.random() - 0.5) * 20;
        node.y = center.y + (Math.random() - 0.5) * 20;
      }
      this.link(centerId, node.id);
    }
  }

  /** Nombre de nœuds explorés (clics) : la longueur du snake, qui fait le score du mode jeu. */
  get exploredCount(): number {
    return this.explodedIds.length;
  }

  /** Premier nœud dont le nom correspond (casse et accents ignorés). */
  findByName(name: string): MapNode | undefined {
    const wanted = normalizeName(name);
    return [...this.nodes.values()].find((n) => normalizeName(n.name) === wanted);
  }

  /** Plus court chemin (en liens) entre deux nœuds, noms compris ; vide s'ils ne sont pas reliés. */
  shortestPath(fromId: string, toId: string): MapNode[] {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      return [];
    }
    const previous = new Map<string, string | null>([[fromId, null]]);
    const queue = [fromId];
    while (queue.length > 0 && !previous.has(toId)) {
      const id = queue.shift()!;
      for (const next of this.neighborhood(id)) {
        if (!previous.has(next)) {
          previous.set(next, id);
          queue.push(next);
        }
      }
    }
    if (!previous.has(toId)) {
      return [];
    }
    const path: MapNode[] = [];
    for (let id: string | null = toId; id !== null; id = previous.get(id) ?? null) {
      path.unshift(this.nodes.get(id)!);
    }
    return path;
  }

  /** Un nœud et ses voisins directs : ce qu'on cadre après une expansion. */
  neighborhood(id: string): Set<string> {
    const ids = new Set<string>();
    if (!this.nodes.has(id)) {
      return ids;
    }
    ids.add(id);
    for (const link of this.links.values()) {
      if (link.from === id) {
        ids.add(link.to);
      } else if (link.to === id) {
        ids.add(link.from);
      }
    }
    return ids;
  }

  clear(): void {
    this.nodes.clear();
    this.links.clear();
    this.inputIds = [];
    this.explodedIds = [];
    this.artistA = "";
    this.artistB = "";
  }

  private upsert(artist: Artist): MapNode {
    let node = this.nodes.get(artist.id);
    if (!node) {
      node = {
        id: artist.id,
        name: artist.name,
        mbid: artist.mbid,
        isInput: this.inputIds.includes(artist.id),
        isExploded: this.explodedIds.includes(artist.id),
      };
      this.nodes.set(artist.id, node);
    }
    return node;
  }

  private link(from: string, to: string): void {
    const key = linkKey(from, to);
    if (from !== to && !this.links.has(key)) {
      this.links.set(key, { source: from, target: to, from, to });
    }
  }

  /** Retire les nœuds ni saisis ni explorés, et leurs liens. */
  private prune(): void {
    for (const [id, node] of this.nodes) {
      if (!node.isInput && !node.isExploded) {
        this.nodes.delete(id);
      }
    }
    for (const [key, link] of this.links) {
      if (!this.nodes.has(link.from) || !this.nodes.has(link.to)) {
        this.links.delete(key);
      }
    }
  }

  toSnapshot(provider: string): MapSnapshot {
    const nodes = [...this.nodes.values()];
    const index = new Map(nodes.map((n, i) => [n.id, i]));
    const indicesOf = (ids: string[]) => ids.map((id) => index.get(id)).filter((i): i is number => i !== undefined);
    return {
      v: 1,
      p: provider,
      a: this.artistA,
      b: this.artistB,
      n: nodes.map((n) => [n.id, n.name, n.mbid ?? ""]),
      l: [...this.links.values()].map((l) => [index.get(l.from)!, index.get(l.to)!]),
      i: indicesOf(this.inputIds),
      e: indicesOf(this.explodedIds),
      ...(this.growth === "tree" ? { g: "tree" as const } : {}),
    };
  }

  static fromSnapshot(snapshot: MapSnapshot): ArtistMap {
    const map = new ArtistMap();
    const ids = snapshot.n.map(([id]) => id);
    map.inputIds = snapshot.i.map((i) => ids[i]).filter(Boolean);
    map.explodedIds = snapshot.e.map((i) => ids[i]).filter(Boolean);
    for (const [id, name, mbid] of snapshot.n) {
      map.upsert({ id, name, mbid: mbid || undefined });
    }
    for (const [a, b] of snapshot.l) {
      if (ids[a] !== undefined && ids[b] !== undefined) {
        map.link(ids[a], ids[b]);
      }
    }
    map.artistA = snapshot.a;
    map.artistB = snapshot.b;
    map.growth = snapshot.g ?? "snake";
    return map;
  }
}
