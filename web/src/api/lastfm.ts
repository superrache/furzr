import { ServiceError, type Artist, type ArtistInfo, type SimilarityProvider, type Suggestion } from "./types";
import type { DeezerClient } from "./deezer";
import { sanitizeBio } from "../ui/html";
import type { LangGetter } from "../i18n/languages";

/**
 * Last.fm ajoute « Read more on Last.fm » (toujours en anglais) à la fin des bios :
 * on le retire, l'interface affiche son propre lien traduit.
 */
export function stripReadMore(summary: string): string {
  return summary.replace(/<a\b[^>]*>\s*Read more on Last\.fm\s*<\/a>\.?/gi, "").trim();
}

const API_URL = "https://ws.audioscrobbler.com/2.0/";

interface LastFmArtist {
  name: string;
  mbid?: string;
  url?: string;
}

type JsonFetcher = (url: string) => Promise<unknown>;

const defaultFetcher: JsonFetcher = async (url) => {
  let resp: Response;
  try {
    resp = await fetch(url);
  } catch (e) {
    throw new ServiceError(`Last.fm unreachable: ${(e as Error).message}`);
  }
  if (!resp.ok && resp.status >= 500) {
    throw new ServiceError(`Last.fm HTTP ${resp.status}`, resp.status);
  }
  return resp.json();
};

export function toArtist(a: LastFmArtist): Artist {
  const mbid = a.mbid?.trim() || undefined;
  return { id: mbid ?? a.name, name: a.name, mbid };
}

/**
 * Similarité via Last.fm (API publique, CORS autorisé).
 * Last.fm ne fournit plus de photos d'artistes : on les prend chez Deezer.
 */
export class LastFmProvider implements SimilarityProvider {
  readonly name = "lastfm";
  readonly kind = "music";

  constructor(
    private readonly apiKey: string,
    private readonly deezer: DeezerClient | null,
    private readonly fetcher: JsonFetcher = defaultFetcher,
    private readonly lang: LangGetter = () => "en",
  ) {}

  private async call<T>(params: Record<string, string>): Promise<T & { error?: number; message?: string }> {
    const query = new URLSearchParams({ ...params, api_key: this.apiKey, format: "json" });
    const data = (await this.fetcher(`${API_URL}?${query}`)) as T & { error?: number; message?: string };
    // Last.fm renvoie les erreurs dans le corps. 6 = artiste introuvable : ce n'est pas une panne.
    if (data && typeof data === "object" && data.error && data.error !== 6) {
      throw new ServiceError(`Last.fm error ${data.error}: ${data.message ?? ""}`, data.error);
    }
    return data;
  }

  private artistParams(artist: Artist): Record<string, string> {
    return artist.mbid ? { mbid: artist.mbid } : { artist: artist.name };
  }

  /** Last.fm gère mal les saisies partielles (« radioh » ne trouve pas Radiohead) : on interroge Deezer. */
  suggest(query: string): Promise<Suggestion[]> {
    return this.deezer ? this.deezer.suggestArtists(query) : Promise.resolve([]);
  }

  async findArtist(query: string): Promise<Artist | null> {
    const data = await this.call<{ results?: { artistmatches?: { artist?: LastFmArtist[] | LastFmArtist } } }>({
      method: "artist.search",
      artist: query,
      limit: "10",
    });
    const raw = data.results?.artistmatches?.artist;
    const matches = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const wanted = query.trim().toLowerCase();
    const best = matches.find((a) => a.name.toLowerCase() === wanted) ?? matches[0];
    return best ? toArtist(best) : null;
  }

  async getSimilars(artist: Artist, limit: number): Promise<Artist[]> {
    const data = await this.call<{ similarartists?: { artist?: LastFmArtist[] } }>({
      method: "artist.getsimilar",
      limit: String(limit),
      ...this.artistParams(artist),
    });
    const similars = data.similarartists?.artist;
    return Array.isArray(similars) ? similars.filter((a) => a.name).map(toArtist) : [];
  }

  private fetchInfo(artist: Artist, lang: string) {
    return this.call<{
      artist?: { name: string; url: string; bio?: { summary?: string }; tags?: { tag?: { name: string }[] | { name: string } } };
    }>({ method: "artist.getinfo", ...this.artistParams(artist), ...(lang === "en" ? {} : { lang }) });
  }

  /**
   * Fiche dans la langue de l'interface. Last.fm n'a pas de bio traduite pour tous les artistes
   * (bio vide) : on se replie alors sur l'anglais. Les tags sont toujours en anglais.
   */
  async getInfo(artist: Artist): Promise<ArtistInfo | null> {
    const lang = this.lang();
    const [data, picture] = await Promise.all([
      this.fetchInfo(artist, lang),
      this.deezer ? this.deezer.findArtist(artist.name).catch(() => null) : Promise.resolve(null),
    ]);
    const a = data.artist;
    if (!a) {
      return null;
    }
    let summary = stripReadMore(a.bio?.summary ?? "");
    if (!summary && lang !== "en") {
      summary = stripReadMore((await this.fetchInfo(artist, "en")).artist?.bio?.summary ?? "");
    }
    const rawTags = a.tags?.tag;
    const tags = Array.isArray(rawTags) ? rawTags : rawTags ? [rawTags] : [];
    return {
      name: a.name,
      url: a.url,
      bioHtml: sanitizeBio(summary),
      tags: tags.map((t) => t.name),
      image: picture?.picture_medium ?? null,
      source: "Last.fm",
    };
  }
}
