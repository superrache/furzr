import { jsonp } from "./jsonp";
import { ServiceError, type PreviewTrack, type Suggestion } from "./types";

/**
 * API publique Deezer (sans clé) : extraits 30 s et photos d'artistes.
 * Les URL d'extraits sont signées et expirent : utiliser refreshPreviewUrl()
 * juste avant de lire un titre qui n'est pas le premier de la liste.
 */

const API_URL = "https://api.deezer.com/";

export interface DeezerArtist {
  id: number;
  name: string;
  picture_small?: string;
  picture_medium: string;
  picture_big: string;
  nb_fan?: number;
}

/** Minuscules sans accents, pour comparer « sigur ros » et « Sigur Rós ». */
export function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
}

/** Homonymes : on garde le plus écouté (Deezer classe mal : le groupe Oasis vient après deux inconnus). */
function mostPopularByName(artists: DeezerArtist[]): DeezerArtist[] {
  const best = new Map<string, DeezerArtist>();
  for (const artist of artists) {
    const key = normalizeName(artist.name);
    const current = best.get(key);
    if (key && (!current || (artist.nb_fan ?? 0) > (current.nb_fan ?? 0))) {
      best.set(key, artist);
    }
  }
  // ordre de Deezer conservé (position du premier homonyme)
  return [...best.values()].sort((a, b) => artists.indexOf(a) - artists.indexOf(b));
}

/**
 * Classe les résultats de recherche Deezer pour l'auto-complétion : les noms qui
 * commencent par la saisie d'abord, du plus au moins écouté, puis les autres dans
 * l'ordre de Deezer. Entre homonymes, seul le plus écouté est gardé.
 */
export function rankSuggestions(query: string, artists: DeezerArtist[], limit: number): Suggestion[] {
  const q = normalizeName(query);
  const unique = mostPopularByName(artists);
  const prefix = unique
    .filter((a) => normalizeName(a.name).startsWith(q))
    .sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0));
  const others = unique.filter((a) => !prefix.includes(a));
  return [...prefix, ...others].slice(0, limit).map((a) => ({
    name: a.name,
    picture: a.picture_small || undefined,
    fans: a.nb_fan || undefined,
  }));
}

/** Homonymes exacts (casse et accents ignorés), du plus au moins écouté. */
export function exactMatches(name: string, artists: DeezerArtist[]): DeezerArtist[] {
  const key = normalizeName(name);
  return artists.filter((a) => normalizeName(a.name) === key).sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0));
}

interface DeezerTrack {
  id: number;
  title: string;
  readable?: boolean;
  link: string;
  preview: string;
  artist: { name: string };
  album?: { title: string };
}

type Fetcher = <T>(url: string) => Promise<T>;

export class DeezerClient {
  private searchCache = new Map<string, Promise<DeezerArtist[]>>();

  constructor(private readonly fetcher: Fetcher = jsonp) {}

  private async call<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    const query = new URLSearchParams({ output: "jsonp" });
    for (const [key, value] of Object.entries(params)) {
      query.set(key, String(value));
    }
    const resp = await this.fetcher<T & { error?: { message?: string } }>(`${API_URL}${path}?${query}`);
    if (resp && typeof resp === "object" && "error" in resp && resp.error) {
      throw new ServiceError(`Deezer: ${resp.error.message ?? "error"}`);
    }
    return resp;
  }

  /** Résultats bruts d'une recherche d'artiste par nom, mis en cache (pas les échecs). */
  searchArtists(name: string): Promise<DeezerArtist[]> {
    const key = normalizeName(name);
    let cached = this.searchCache.get(key);
    if (!cached) {
      cached = this.call<{ data?: DeezerArtist[] }>("search/artist", { q: name, limit: 10 }).then((resp) => resp.data ?? []);
      cached.catch(() => this.searchCache.delete(key));
      this.searchCache.set(key, cached);
    }
    return cached;
  }

  /**
   * Artiste Deezer d'après le nom seul : l'homonyme exact le plus écouté, sinon le premier résultat.
   * Sans vérification : pour un artiste Last.fm, préférer DeezerMatcher (MBID, puis titres en commun).
   */
  async findArtist(name: string): Promise<DeezerArtist | null> {
    const artists = await this.searchArtists(name);
    return exactMatches(name, artists)[0] ?? artists[0] ?? null;
  }

  /** Artiste par identifiant Deezer (null s'il n'existe plus). */
  async getArtist(id: number): Promise<DeezerArtist | null> {
    try {
      const artist = await this.call<DeezerArtist>(`artist/${id}`);
      return artist && artist.id ? artist : null;
    } catch {
      return null; // « no data » : identifiant périmé (Wikidata) ; l'appelant se rabat sur le nom
    }
  }

  /**
   * Propositions d'artistes pour une saisie partielle (Deezer gère bien les préfixes, Last.fm non).
   * Deezer renvoie beaucoup d'homonymes, regroupés ensuite : on en demande plus que nécessaire.
   */
  async suggestArtists(query: string, limit = 20): Promise<Suggestion[]> {
    const resp = await this.call<{ data?: DeezerArtist[] }>("search/artist", { q: query, limit: 50 });
    return rankSuggestions(query, resp.data ?? [], limit);
  }

  async getTopTracks(artistId: number, limit = 5): Promise<PreviewTrack[]> {
    const resp = await this.call<{ data?: DeezerTrack[] }>(`artist/${artistId}/top`, { limit });
    return (resp.data ?? [])
      .filter((t) => t.readable !== false && Boolean(t.preview))
      .map((t) => ({
        id: t.id,
        title: t.title,
        artistName: t.artist.name,
        albumTitle: t.album?.title ?? "",
        link: t.link,
        previewUrl: t.preview,
      }));
  }

  async refreshPreviewUrl(trackId: number): Promise<string | null> {
    const track = await this.call<DeezerTrack>(`track/${trackId}`);
    return track.preview || null;
  }
}
