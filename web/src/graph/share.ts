import type { MapSnapshot } from "./model";

/**
 * Partage d'une carte sans back-end : la carte est compressée (deflate)
 * puis encodée en base64url dans le fragment d'URL (#map=...).
 */

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeSnapshot(snapshot: MapSnapshot): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(snapshot));
  return toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
}

const isInt = (x: unknown): x is number => Number.isInteger(x);
const isStr = (x: unknown): x is string => typeof x === "string";

function isSnapshot(x: unknown): x is MapSnapshot {
  const s = x as MapSnapshot;
  return (
    typeof s === "object" &&
    s !== null &&
    s.v === 1 &&
    isStr(s.p) &&
    isStr(s.a) &&
    isStr(s.b) &&
    Array.isArray(s.n) &&
    s.n.every((n) => Array.isArray(n) && n.length === 3 && n.every(isStr)) &&
    Array.isArray(s.l) &&
    s.l.every((l) => Array.isArray(l) && l.length === 2 && l.every(isInt)) &&
    Array.isArray(s.i) &&
    s.i.every(isInt) &&
    Array.isArray(s.e) &&
    s.e.every(isInt) &&
    (s.g === undefined || s.g === "snake" || s.g === "tree")
  );
}

/** Décode une carte partagée ; renvoie null si le contenu est invalide. */
export async function decodeSnapshot(encoded: string): Promise<MapSnapshot | null> {
  try {
    const json = new TextDecoder().decode(await pipe(fromBase64Url(encoded), new DecompressionStream("deflate-raw")));
    const data: unknown = JSON.parse(json);
    return isSnapshot(data) ? data : null;
  } catch {
    return null;
  }
}

/** Nœud de l'ancien format de carte sauvegardée (furzr 2013-2015, servlet savecs). */
interface LegacySnakeNode {
  id?: string;
  mbid?: string;
  name: string;
  isInput?: boolean;
  isExploded?: boolean;
  children?: LegacySnakeNode[] | null;
}

/**
 * Convertit une carte sauvegardée par l'ancien furzr (champ csJSON stocké dans le Datastore)
 * vers le nouveau format, pour pouvoir réimporter d'anciennes cartes.
 */
export function fromLegacySnake(legacy: {
  api?: string;
  artistA: LegacySnakeNode;
  inputIds?: string[];
  explodedIds?: string[];
  inputArtistsMbids?: string[];
  explodedArtistsMbids?: string[];
}): MapSnapshot {
  const snapshot: MapSnapshot = { v: 1, p: legacy.api ?? "lastfm", a: legacy.artistA.name, b: "", n: [], l: [], i: [], e: [] };
  const index = new Map<string, number>();
  const idOf = (node: LegacySnakeNode) => node.id || node.mbid || node.name;

  const visit = (node: LegacySnakeNode, parent: number | null) => {
    const id = idOf(node);
    let i = index.get(id);
    if (i === undefined) {
      i = snapshot.n.length;
      index.set(id, i);
      snapshot.n.push([id, node.name, node.mbid ?? (node.id && node.id !== node.name ? node.id : "")]);
    }
    if (parent !== null) {
      snapshot.l.push([parent, i]);
    }
    for (const child of node.children ?? []) {
      visit(child, i);
    }
  };
  visit(legacy.artistA, null);

  const inputIds = legacy.inputIds ?? legacy.inputArtistsMbids ?? [idOf(legacy.artistA)];
  const explodedIds = legacy.explodedIds ?? legacy.explodedArtistsMbids ?? [];
  snapshot.i = inputIds.map((id) => index.get(id)).filter((i): i is number => i !== undefined);
  snapshot.e = explodedIds.map((id) => index.get(id)).filter((i): i is number => i !== undefined);
  const last = snapshot.e.length > 0 ? snapshot.n[snapshot.e[snapshot.e.length - 1]] : snapshot.n[0];
  snapshot.b = last ? last[1] : snapshot.a;
  return snapshot;
}
