import type { Artist } from "../api/types";
import { normalizeName } from "../graph/model";

/**
 * Mode jeu : relier deux artistes connus et éloignés par le snake le plus court.
 *
 * - Les deux artistes viennent du classement Last.fm du moment, filtrés sur le nombre total
 *   d'auditeurs (des artistes que le joueur a toutes les chances de connaître).
 * - « Éloignés » : aucun des deux n'est dans les 50 similaires de l'autre, et leurs listes de
 *   similaires n'ont aucun nom en commun. Il faut donc au moins 3 liens, soit 2 clics.
 * - Difficulté (1 à 4) estimée d'après les similaires de chacun sur deux niveaux, puis les genres : elle donne le
 *   nombre de clics de référence (« par ») et le score maximal. Chaque clic au-delà du par
 *   retire 20 % du score.
 */

/** Seuil de popularité (auditeurs Last.fm depuis toujours) ; ~200 artistes du top 500 le passent. */
export const MIN_LISTENERS = 2_500_000;
/** Taille du classement interrogé. */
export const CHART_SIZE = 500;
/** Nombre de similaires examinés pour vérifier l'éloignement. */
export const DISTANCE_CHECK = 50;
/** Clics minimaux possibles (A → X → Y → B : clics sur X puis Y). */
export const MIN_MOVES = 2;
/** Points d'un défi réussi au par, par niveau de difficulté (1000 à 4000). */
export const POINTS_PER_LEVEL = 1000;
/** Coefficient appliqué au score à chaque clic au-delà du par. */
export const EXTRA_CLICK_FACTOR = 0.8;
/** Largeur maximale de l'estimation (2 × largeur requêtes Last.fm). */
export const ESTIMATE_WIDTH = 16;

/** 1 facile, 2 moyen, 3 difficile, 4 extrême. */
export type Difficulty = 1 | 2 | 3 | 4;

/** Clics de référence : 3 à 6 (un défi facile se joue en général en 3 clics, rarement en 2). */
export const parFor = (difficulty: Difficulty): number => MIN_MOVES + difficulty;

export interface Challenge {
  from: Artist;
  to: Artist;
}

/**
 * 1000 points par niveau de difficulté si le joueur fait le par (ou mieux), puis −20 % par clic
 * de plus : 16 clics sur un défi extrême (par 6) valent encore 429 points. 1 point au plus bas.
 */
export function scoreFor(moves: number, difficulty: Difficulty): number {
  const extra = Math.max(0, moves - parFor(difficulty));
  return Math.max(1, Math.round(POINTS_PER_LEVEL * difficulty * EXTRA_CLICK_FACTOR ** extra));
}

const intersects = (a: Set<string>, b: Set<string>): boolean => [...a].some((name) => b.has(name));
const nameSet = (lists: Artist[][]): Set<string> => new Set(lists.flat().map((x) => normalizeName(x.name)));

/** `fn` sur chaque élément, au plus `concurrency` à la fois (ménage l'API Last.fm). */
async function mapLimited<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

/** Tags trop vagues pour rapprocher deux artistes. */
const VAGUE_TAGS = new Set(["seen live", "favorites", "favourites", "favorite", "love", "awesome"]);

/** Vrai si les deux listes de tags (Last.fm, en anglais) ont un genre en commun. */
export function shareGenre(tagsA: string[], tagsB: string[]): boolean {
  const genres = (tags: string[]) => tags.map((t) => t.trim().toLowerCase()).filter((t) => t && !VAGUE_TAGS.has(t));
  const b = new Set(genres(tagsB));
  return genres(tagsA).some((t) => b.has(t));
}

/**
 * Difficulté d'un défi, d'après ce que le joueur voit : les `width` premiers similaires de chaque
 * nœud (16 par défaut sur la carte). A1/A2 = similaires de A à 1 et 2 liens, B1/B2 de même pour B ;
 * A2⁺/B2⁺ = second niveau élargi aux 50 similaires. La similarité Last.fm n'est pas symétrique,
 * mais presque : « Y ∈ B1 » sert d'approximation de « B est un similaire de Y ».
 *
 * Échelle calée sur des tirages réels (le tirage exclut déjà les paires proches : sur 30 défis,
 * 5 faciles, 9 moyens, 3 difficiles, 13 extrêmes) :
 * - 1 facile (par 3) : les deux univers se rencontrent dans ce qui est affiché (A2 ∩ B2 ≠ ∅,
 *   ou plus près encore) ;
 * - 2 moyen (par 4) : ils ne se rencontrent qu'en élargissant au moins un côté (A2⁺ ∩ B2⁺ ≠ ∅) ;
 * - 3 difficile (par 5) : aucune rencontre, mais les deux artistes ont un genre en commun (tags) ;
 * - 4 extrême (par 6) : aucune rencontre et aucun genre commun.
 *
 * Coût : 2 + 2 × width appels (mis en cache par l'appelant), dont au plus 6 en parallèle, plus les
 * tags des deux artistes (fiches déjà préchargées pour l'infobulle). Sans `tags`, 3 devient 4.
 */
export async function estimateDifficulty(
  challenge: Challenge,
  similars: (artist: Artist) => Promise<Artist[]>,
  width = ESTIMATE_WIDTH,
  tags?: (artist: Artist) => Promise<string[]>,
): Promise<Difficulty> {
  const all = (artist: Artist) => similars(artist).catch((): Artist[] => []);
  const [a1, b1] = (await Promise.all([all(challenge.from), all(challenge.to)])).map((l) => l.slice(0, width));
  const [a2Full, b2Full] = await Promise.all([mapLimited(a1, 3, all), mapLimited(b1, 3, all)]);
  const shown = (lists: Artist[][]) => nameSet(lists.map((l) => l.slice(0, width)));
  const a2 = shown(a2Full);
  if (a2.has(normalizeName(challenge.to.name)) || intersects(a2, nameSet([b1])) || intersects(a2, shown(b2Full))) {
    return 1;
  }
  if (intersects(nameSet(a2Full), nameSet(b2Full))) {
    return 2;
  }
  if (!tags) {
    return 4;
  }
  const none = (): string[] => [];
  const [tagsA, tagsB] = await Promise.all([tags(challenge.from).catch(none), tags(challenge.to).catch(none)]);
  return shareGenre(tagsA, tagsB) ? 3 : 4;
}

/** Artistes assez connus pour le jeu, sans doublons. */
export function popularPool(chart: { artist: Artist; listeners: number }[], minListeners = MIN_LISTENERS): Artist[] {
  const seen = new Set<string>();
  const pool: Artist[] = [];
  for (const { artist, listeners } of chart) {
    const key = normalizeName(artist.name);
    if (listeners >= minListeners && !seen.has(key)) {
      seen.add(key);
      pool.push(artist);
    }
  }
  return pool;
}

/** Vrai si A et B sont à au moins 3 liens d'après leurs listes de similaires. */
export function areFarApart(a: Artist, b: Artist, similarsA: Artist[], similarsB: Artist[]): boolean {
  if (similarsA.length === 0 || similarsB.length === 0) {
    return false; // artiste mal référencé : défi peut-être impossible
  }
  const namesA = new Set(similarsA.map((s) => normalizeName(s.name)));
  const namesB = new Set(similarsB.map((s) => normalizeName(s.name)));
  if (namesA.has(normalizeName(b.name)) || namesB.has(normalizeName(a.name))) {
    return false; // voisins directs
  }
  for (const name of namesA) {
    if (namesB.has(name)) {
      return false; // un similaire commun : 2 liens
    }
  }
  return true;
}

/**
 * Tire deux artistes du pool jusqu'à en trouver deux éloignés. `similars` est appelé avec
 * DISTANCE_CHECK ; renvoie null après `maxTries` tirages infructueux.
 */
export async function pickChallenge(
  pool: Artist[],
  similars: (artist: Artist, limit: number) => Promise<Artist[]>,
  random: () => number = Math.random,
  maxTries = 8,
): Promise<Challenge | null> {
  if (pool.length < 2) {
    return null;
  }
  const cache = new Map<string, Promise<Artist[]>>();
  const similarsOf = (artist: Artist) => {
    let list = cache.get(artist.id);
    if (!list) {
      list = similars(artist, DISTANCE_CHECK).catch(() => []);
      cache.set(artist.id, list);
    }
    return list;
  };
  for (let i = 0; i < maxTries; i++) {
    const from = pool[Math.floor(random() * pool.length)];
    let to = pool[Math.floor(random() * pool.length)];
    if (to.id === from.id) {
      to = pool[(pool.indexOf(from) + 1) % pool.length];
    }
    const [similarsFrom, similarsTo] = await Promise.all([similarsOf(from), similarsOf(to)]);
    if (areFarApart(from, to, similarsFrom, similarsTo)) {
      return { from, to };
    }
  }
  return null;
}
