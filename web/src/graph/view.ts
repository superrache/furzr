import ForceGraph from "force-graph";
import { forceCollide } from "d3-force-3d";
import { nodeKind, normalizeName, type MapLink, type MapNode, type NodeKind } from "./model";

export interface MapViewTheme {
  background: string;
  link: string;
  halo: string;
  ring: string;
  ringHover: string;
  font: string;
  colors: Record<NodeKind, string>;
  /** Artiste à atteindre (mode jeu). */
  target: string;
}

/** Lit le thème dans les variables CSS (cf. style.css). */
export function themeFromCss(el: HTMLElement = document.documentElement): MapViewTheme {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    background: v("--map-bg"),
    link: v("--map-link"),
    halo: v("--map-halo"),
    ring: v("--map-ring"),
    ringHover: v("--map-ring-hover"),
    font: v("--map-font"),
    colors: { input: v("--node-input"), exploded: v("--node-exploded"), similar: v("--node-similar") },
    target: v("--node-target"),
  };
}

/** Rayon du cercle et de la zone cliquable autour d'un nom, en pixels écran. */
const NODE_RADIUS = 20;
/** Taille des noms en pixels écran : constante quel que soit le zoom, comme l'original. */
const FONT_SIZE = 12;
/**
 * En dessous de ce zoom, les noms rétrécissent avec la carte (petits écrans) :
 * les collisions sont calculées pour ce zoom, ce qui garantit l'absence de chevauchement.
 */
const MIN_LABEL_SCALE = 0.7;

/** Facteur graphe → écran appliqué aux noms et aux cercles. */
const labelScale = (scale: number) => Math.max(scale, MIN_LABEL_SCALE);

/** Le recadrage automatique ne zoome pas au-delà (sinon une petite carte remplit l'écran). */
const MAX_AUTO_ZOOM = 1.4;
const MIN_ZOOM = 0.2;

const measureCtx = document.createElement("canvas").getContext("2d");
const widthCache = new Map<string, number>();

/** Largeur d'un nom en pixels à FONT_SIZE (sert au calcul des collisions). */
function labelWidth(name: string, font: string): number {
  let width = widthCache.get(name);
  if (width === undefined) {
    if (measureCtx) {
      measureCtx.font = `bold ${FONT_SIZE}px ${font}`;
      width = measureCtx.measureText(name).width;
    } else {
      width = name.length * FONT_SIZE * 0.6;
    }
    widthCache.set(name, width);
  }
  return width;
}

/** Clé d'un lien, indépendante du sens. */
const linkKey = (a: string, b: string): string => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

/**
 * Rendu de la carte avec force-graph : canvas net sur écrans HiDPI,
 * zoom/déplacement, glisser-déposer des nœuds, recadrage automatique.
 */
export class MapView {
  private graph: ForceGraph<MapNode, MapLink>;
  private hovered: MapNode | null = null;
  private fitPending = false;
  /** Recadrage déjà fait pour la mise à jour en cours (l'arrêt de la simulation ne fait que vérifier). */
  private fitDone = false;
  private fitTimer: ReturnType<typeof setTimeout> | undefined;
  /** Nœuds à cadrer (derniers similaires) ; vide = toute la carte. */
  private focusIds: ReadonlySet<string> = new Set();
  private resizeObserver: ResizeObserver;
  /** Nom normalisé de l'artiste à atteindre (mode jeu), dessiné dans sa propre couleur. */
  private targetName = "";
  /** Chemin gagnant mis en évidence (ids des nœuds et des liens) ; null = aucun. */
  private highlight: { nodes: Set<string>; links: Set<string>; until: number } | null = null;
  private pulseTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly container: HTMLElement,
    private readonly theme: MapViewTheme,
    onNodeClick: (node: MapNode) => void,
  ) {
    this.graph = new ForceGraph<MapNode, MapLink>(container)
      .backgroundColor(theme.background)
      .nodeId("id")
      .nodeLabel(() => "")
      .linkColor((link) => this.linkStyle(link).color)
      .linkWidth((link) => this.linkStyle(link).width)
      .minZoom(MIN_ZOOM)
      .maxZoom(6)
      .cooldownTime(6000)
      .nodeCanvasObject((node, ctx, scale) => this.drawNode(node, ctx, scale))
      .nodePointerAreaPaint((node, color, ctx, scale) => {
        // zone cliquable : le nom entier, ou le cercle s'il est plus grand
        const halfW = Math.max(NODE_RADIUS, labelWidth(node.name, theme.font) / 2) / labelScale(scale);
        const halfH = NODE_RADIUS / labelScale(scale);
        ctx.fillStyle = color;
        ctx.fillRect((node.x ?? 0) - halfW, (node.y ?? 0) - halfH, halfW * 2, halfH * 2);
      })
      .onNodeHover((node) => {
        this.hovered = node;
        container.style.cursor = node ? "pointer" : "";
      })
      .onNodeClick((node) => onNodeClick(node))
      .onEngineStop(() => this.fitIfPending(600));

    // répulsion et distance proches du rendu arbor d'origine ;
    // collision dimensionnée sur la largeur de chaque nom pour éviter les chevauchements
    this.graph.d3Force("charge")?.strength(-240);
    this.graph.d3Force("link")?.distance(80);
    const collide = forceCollide(
      (node) => (Math.max(NODE_RADIUS, labelWidth((node as MapNode).name, theme.font) / 2) + 4) / MIN_LABEL_SCALE,
    )
      .strength(0.9)
      .iterations(2);
    this.graph.d3Force("collide", collide as unknown as Parameters<typeof this.graph.d3Force>[1]);

    // une interaction de l'utilisateur (zoom, déplacement) annule le recadrage automatique en attente
    for (const type of ["wheel", "pointerdown", "touchstart"]) {
      container.addEventListener(type, () => (this.fitPending = false), { passive: true });
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  /**
   * Met à jour les données ; `fit` recadre la vue une fois la simulation stabilisée,
   * sur `focus` s'il est donné (sinon sur toute la carte).
   */
  update(data: { nodes: MapNode[]; links: MapLink[] }, fit = true, focus: ReadonlySet<string> = new Set()): void {
    this.clearHighlight();
    this.fitPending = fit && data.nodes.length > 0;
    this.fitDone = false;
    this.focusIds = focus;
    this.graph.graphData(data);
    clearTimeout(this.fitTimer);
    if (this.fitPending) {
      // un seul recadrage, une fois les nouveaux nœuds écartés : les suivants (pendant que la
      // simulation finit de se stabiliser) faisaient zoomer et dézoomer la vue sans rien apporter
      this.fitTimer = setTimeout(() => {
        if (this.fitPending) {
          this.fitDone = true;
          this.zoomToFit(500);
        }
      }, 700);
    }
  }

  /**
   * Victoire : met en évidence le chemin (nœuds dans l'ordre), estompe le reste, fait pulser la
   * cible quelques secondes et recadre sur tout le chemin. Effacé à la mise à jour suivante.
   */
  highlightPath(ids: string[], pulseMs = 4000): void {
    const links = new Set<string>();
    for (let i = 1; i < ids.length; i++) {
      links.add(linkKey(ids[i - 1], ids[i]));
    }
    this.highlight = { nodes: new Set(ids), links, until: performance.now() + pulseMs };
    // redessin continu le temps de la pulsation (sinon force-graph ne redessine qu'en mouvement)
    this.graph.autoPauseRedraw(false);
    clearTimeout(this.pulseTimer);
    this.pulseTimer = setTimeout(() => this.graph.autoPauseRedraw(true), pulseMs + 100);
    this.focusIds = new Set(ids);
    if (this.fitPending && !this.fitDone) {
      return; // le recadrage déjà programmé (700 ms) cadrera le chemin
    }
    this.zoomToFit(800);
  }

  /** Recadre la vue sur le chemin mis en évidence (retour à la carte après la fenêtre de victoire). */
  frameHighlight(durationMs = 600): void {
    if (this.highlight) {
      this.fitPending = false;
      this.focusIds = this.highlight.nodes;
      this.zoomToFit(durationMs);
    }
  }

  private clearHighlight(): void {
    if (this.highlight) {
      this.highlight = null;
      clearTimeout(this.pulseTimer);
      this.graph.autoPauseRedraw(true);
    }
  }

  private linkStyle(link: MapLink): { color: string; width: number } {
    if (!this.highlight) {
      return { color: this.theme.link, width: 1 };
    }
    const id = (end: string | MapNode) => (typeof end === "string" ? end : end.id);
    return this.highlight.links.has(linkKey(id(link.source), id(link.target)))
      ? { color: this.theme.target, width: 3 }
      : { color: this.theme.ring, width: 1 };
  }

  /** Artiste à atteindre (mode jeu) ; "" pour aucun. */
  setTarget(name: string): void {
    this.targetName = name ? normalizeName(name) : "";
  }

  fit(durationMs = 600): void {
    this.focusIds = new Set();
    this.zoomToFit(durationMs);
  }

  /** Nœuds à cadrer : le focus, ou toute la carte. */
  private framed(node: MapNode): boolean {
    return this.focusIds.size === 0 || this.focusIds.has(node.id);
  }

  /**
   * Équivalent de zoomToFit, mais avec le zoom plafonné à MAX_AUTO_ZOOM dès le calcul : centrage et
   * zoom partent ensemble, en un seul mouvement (zoomToFit puis un zoom correctif en faisaient deux,
   * dont un aller-retour). Avec un focus, seuls ces nœuds sont cadrés : le reste du snake peut sortir
   * de l'écran, mais les noms restent lisibles.
   */
  private zoomToFit(durationMs: number): void {
    const box = this.graph.getGraphBbox((node) => this.framed(node));
    if (!box) {
      return;
    }
    const padding = this.focusIds.size > 0 ? 60 : 80;
    const width = Math.max(1, this.container.clientWidth - 2 * padding);
    const height = Math.max(1, this.container.clientHeight - 2 * padding);
    const zoom = Math.min(
      MAX_AUTO_ZOOM,
      width / Math.max(box.x[1] - box.x[0], 1),
      height / Math.max(box.y[1] - box.y[0], 1),
    );
    this.graph.centerAt((box.x[0] + box.x[1]) / 2, (box.y[0] + box.y[1]) / 2, durationMs);
    this.graph.zoom(Math.max(MIN_ZOOM, zoom), durationMs);
  }

  /**
   * Vrai si le centre de chaque nœud cadré est encore à l'écran. Pas de marge : les nœuds dérivent
   * de quelques dizaines de pixels en fin de simulation, et un dézoom tardif gêne plus qu'un nom
   * légèrement rogné au bord.
   */
  private framedVisible(margin = 0): boolean {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    return this.graph
      .graphData()
      .nodes.filter((node) => this.framed(node))
      .every((node) => {
        const p = this.graph.graph2ScreenCoords(node.x ?? 0, node.y ?? 0);
        return p.x >= margin && p.x <= width - margin && p.y >= margin && p.y <= height - margin;
      });
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.graph._destructor();
  }

  /**
   * Arrêt de la simulation : on ne recadre que si c'est nécessaire (pas encore fait, ou un nœud
   * cadré a dérivé hors de l'écran en finissant de s'écarter).
   */
  private fitIfPending(durationMs: number): void {
    if (this.fitPending) {
      this.fitPending = false;
      if (!this.fitDone || !this.framedVisible()) {
        this.zoomToFit(durationMs);
      }
    }
  }

  private resize(): void {
    this.graph.width(this.container.clientWidth).height(this.container.clientHeight);
  }

  private drawNode(node: MapNode, ctx: CanvasRenderingContext2D, scale: number): void {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const isHovered = node === this.hovered;
    const isTarget = this.targetName !== "" && normalizeName(node.name) === this.targetName;
    const highlight = this.highlight;
    // chemin gagnant : le reste de la carte est estompé
    ctx.globalAlpha = highlight && !highlight.nodes.has(node.id) ? 0.3 : 1;

    // tailles divisées par le zoom : constantes à l'écran (sauf fort dézoom, cf. MIN_LABEL_SCALE)
    const k = labelScale(scale);
    ctx.beginPath();
    ctx.arc(x, y, NODE_RADIUS / k, 0, 2 * Math.PI);
    ctx.lineWidth = (isHovered ? 1.5 : 1) / scale;
    ctx.strokeStyle = isHovered ? this.theme.ringHover : this.theme.ring;
    ctx.stroke();

    if (highlight && isTarget) {
      // cible atteinte : anneau vert, qui pulse quelques secondes puis reste fixe
      const now = performance.now();
      const phase = now < highlight.until ? (Math.sin(now / 160) + 1) / 2 : 0;
      ctx.beginPath();
      ctx.arc(x, y, (NODE_RADIUS + 4 + phase * 10) / k, 0, 2 * Math.PI);
      ctx.lineWidth = 3 / k;
      ctx.strokeStyle = this.theme.target;
      ctx.globalAlpha = 1 - phase * 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const fontSize = FONT_SIZE / k;
    ctx.font = `bold ${fontSize}px ${this.theme.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = fontSize / 4;
    ctx.strokeStyle = this.theme.halo;
    ctx.strokeText(node.name, x, y);
    ctx.fillStyle = isTarget ? this.theme.target : this.theme.colors[nodeKind(node)];
    ctx.fillText(node.name, x, y);
    ctx.globalAlpha = 1;
  }
}
