import { exactMatches, normalizeName, type DeezerArtist, type DeezerClient } from "./deezer";
import type { Artist } from "./types";

/** Homonymes Deezer essayés au plus (les plus écoutés d'abord). */
const MAX_CANDIDATES = 3;
/** Titres Deezer comparés à ceux de Last.fm. */
const DEEZER_TITLES = 10;
/** MBID par requête Wikidata. */
const BATCH_SIZE = 50;
/** Délai de regroupement des demandes de MBID (fiche et extrait arrivent ensemble). */
const BATCH_DELAY_MS = 20;

/**
 * Titre comparable d'une source à l'autre : sans casse, accents, parenthèses ni suffixe
 * (« Bohemian Rhapsody - Remastered 2011 » → « bohemian rhapsody »).
 */
export function normalizeTitle(title: string): string {
  return normalizeName(title)
    .replace(/\s*[([].*?[)\]]/g, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export interface MatcherDeps {
  deezer: Pick<DeezerClient, "searchArtists" | "getArtist" | "getTopTracks">;
  /** MBID → identifiant Deezer (Wikidata, voir deezerIdsByMbid). */
  deezerIds: (mbids: string[]) => Promise<Map<string, number>>;
  /** Titres les plus écoutés de l'artiste sur Last.fm. */
  topTrackTitles: (artist: Artist) => Promise<string[]>;
}

/**
 * Trouve l'artiste Deezer (extraits, photo) qui correspond à un artiste Last.fm. Last.fm et Deezer
 * n'ont pas d'identifiant commun, et une recherche par nom tombe souvent sur un homonyme
 * (« Oasis » → un artiste électro de 470 fans avant le groupe). Trois niveaux :
 *
 * 1. MBID → identifiant Deezer via Wikidata : sûr, environ 85 % des artistes connus ;
 * 2. sinon, par le nom : homonymes exacts, du plus au moins écouté ;
 * 3. chaque homonyme n'est retenu que s'il a au moins un titre en commun avec les titres les plus
 *    écoutés sur Last.fm. Aucun : null, et l'interface affiche « pas d'extrait » plutôt qu'un
 *    autre artiste. Si Last.fm ne connaît aucun titre, on n'accepte qu'un homonyme unique.
 */
export class DeezerMatcher {
  private readonly cache = new Map<string, Promise<DeezerArtist | null>>();
  private readonly idCache = new Map<string, Promise<number | null>>();
  private pending: { mbid: string; resolve: (id: number | null) => void }[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly deps: MatcherDeps) {}

  match(artist: Artist): Promise<DeezerArtist | null> {
    const key = artist.mbid ? `mbid:${artist.mbid}` : `name:${normalizeName(artist.name)}`;
    let cached = this.cache.get(key);
    if (!cached) {
      cached = this.resolve(artist);
      cached.catch(() => this.cache.delete(key));
      this.cache.set(key, cached);
    }
    return cached;
  }

  /** Demande d'avance les identifiants Deezer (une requête Wikidata pour toute une expansion). */
  prefetch(artists: Artist[]): void {
    for (const artist of artists) {
      if (artist.mbid) {
        void this.deezerIdFor(artist.mbid);
      }
    }
  }

  private async resolve(artist: Artist): Promise<DeezerArtist | null> {
    if (artist.mbid) {
      const id = await this.deezerIdFor(artist.mbid);
      if (id !== null) {
        const found = await this.deps.deezer.getArtist(id);
        if (found) {
          return found;
        }
      }
    }
    return this.byName(artist);
  }

  private async byName(artist: Artist): Promise<DeezerArtist | null> {
    const results = await this.deps.deezer.searchArtists(artist.name);
    const exact = exactMatches(artist.name, results);
    const candidates = (exact.length > 0 ? exact : results.slice(0, 1)).slice(0, MAX_CANDIDATES);
    if (candidates.length === 0) {
      return null;
    }
    const reference = new Set(
      (await this.deps.topTrackTitles(artist).catch(() => [] as string[])).map(normalizeTitle).filter(Boolean),
    );
    if (reference.size === 0) {
      // rien pour vérifier : un homonyme unique est sans doute le bon, sinon on ne devine pas
      return exact.length === 1 ? exact[0] : null;
    }
    for (const candidate of candidates) {
      const tracks = await this.deps.deezer.getTopTracks(candidate.id, DEEZER_TITLES);
      if (tracks.some((t) => reference.has(normalizeTitle(t.title)))) {
        return candidate;
      }
    }
    return null;
  }

  private deezerIdFor(mbid: string): Promise<number | null> {
    let cached = this.idCache.get(mbid);
    if (!cached) {
      cached = new Promise((resolve) => {
        this.pending.push({ mbid, resolve });
        clearTimeout(this.timer);
        if (this.pending.length >= BATCH_SIZE) {
          void this.flush();
        } else {
          this.timer = setTimeout(() => void this.flush(), BATCH_DELAY_MS);
        }
      });
      this.idCache.set(mbid, cached);
    }
    return cached;
  }

  private async flush(): Promise<void> {
    const batch = this.pending.splice(0, BATCH_SIZE);
    if (this.pending.length > 0) {
      this.timer = setTimeout(() => void this.flush(), 0);
    }
    if (batch.length === 0) {
      return;
    }
    try {
      const ids = await this.deps.deezerIds(batch.map((p) => p.mbid));
      for (const { mbid, resolve } of batch) {
        resolve(ids.get(mbid.toLowerCase()) ?? null);
      }
    } catch {
      // Wikidata indisponible : on passe par le nom, et on réessaiera plus tard
      for (const { mbid, resolve } of batch) {
        this.idCache.delete(mbid);
        resolve(null);
      }
    }
  }
}
