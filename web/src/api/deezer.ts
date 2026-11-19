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

/**
 * Classe les résultats de recherche Deezer pour l'auto-complétion : les noms qui
 * commencent par la saisie d'abord, du plus au moins écouté, puis les autres dans
 * l'ordre de Deezer. Les doublons de nom sont retirés.
 */
export function rankSuggestions(query: string, artists: DeezerArtist[], limit: number): Suggestion[] {
  const q = normalizeName(query);
  const seen = new Set<string>();
  const unique = artists.filter((a) => {
    const key = normalizeName(a.name);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
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
  private artistCache = new Map<string, Promise<DeezerArtist | null>>();

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

  /** Artiste Deezer correspondant à un nom (correspondance exacte préférée), mis en cache. */
  findArtist(name: string): Promise<DeezerArtist | null> {
    const key = name.trim().toLowerCase();
    let cached = this.artistCache.get(key);
    if (!cached) {
      cached = this.call<{ data?: DeezerArtist[] }>("search/artist", { q: name, limit: 5 }).then((resp) => {
        const artists = resp.data ?? [];
        return artists.find((a) => a.name.toLowerCase() === key) ?? artists[0] ?? null;
      });
      // une erreur réseau ne doit pas rester en cache
      cached.catch(() => this.artistCache.delete(key));
      this.artistCache.set(key, cached);
    }
    return cached;
  }

  /** Propositions d'artistes pour une saisie partielle (Deezer gère bien les préfixes, Last.fm non). */
  async suggestArtists(query: string, limit = 6): Promise<Suggestion[]> {
    const resp = await this.call<{ data?: DeezerArtist[] }>("search/artist", { q: query, limit: 15 });
    const artists = resp.data ?? [];
    // pré-remplit le cache de findArtist : choisir une proposition lancera l'extrait sans nouvelle recherche
    for (const artist of artists) {
      const key = artist.name.trim().toLowerCase();
      if (!this.artistCache.has(key)) {
        this.artistCache.set(key, Promise.resolve(artist));
      }
    }
    return rankSuggestions(query, artists, limit);
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
