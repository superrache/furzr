import { ServiceError, type Artist, type ArtistInfo, type SimilarityProvider, type Suggestion } from "./types";
import { escapeHtml } from "../ui/html";
import { LANGUAGES, type LangGetter } from "../i18n/languages";

/**
 * Mode films via TMDB (remplace les anciens modes film Rovi) : chaque nœud est un film,
 * ses voisins sont les recommandations TMDB (« les spectateurs ont aussi aimé »),
 * ou à défaut les films similaires.
 *
 * Clé gratuite : https://www.themoviedb.org/settings/api. On accepte la clé API v3
 * (paramètre api_key) ou le jeton de lecture v4 (« eyJ… », en-tête Authorization).
 * Comme celle de Last.fm, elle est visible côté navigateur : elle ne permet que la lecture.
 */

const API_URL = "https://api.themoviedb.org/3/";
const IMAGE_URL = "https://image.tmdb.org/t/p/";

interface TmdbMovie {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  popularity?: number;
}

interface TmdbMovieDetails extends TmdbMovie {
  overview?: string;
  genres?: { name: string }[];
  tagline?: string;
}

type JsonFetcher = (url: string, init?: RequestInit) => Promise<unknown>;

const defaultFetcher: JsonFetcher = async (url, init) => {
  let resp: Response;
  try {
    resp = await fetch(url, init);
  } catch (e) {
    throw new ServiceError(`TMDB unreachable: ${(e as Error).message}`);
  }
  if (resp.status === 404) {
    return {};
  }
  if (!resp.ok) {
    throw new ServiceError(`TMDB HTTP ${resp.status}`, resp.status);
  }
  return resp.json();
};

/** « Alien (1979) » : l'année distingue les remakes et homonymes. */
export function movieLabel(movie: TmdbMovie): string {
  const year = movie.release_date?.slice(0, 4);
  return year ? `${movie.title} (${year})` : movie.title;
}

const toArtist = (movie: TmdbMovie): Artist => ({ id: String(movie.id), name: movieLabel(movie) });

export class TmdbProvider implements SimilarityProvider {
  readonly name = "tmdb";
  readonly kind = "movie";

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: JsonFetcher = defaultFetcher,
    private readonly lang: LangGetter = () => "en",
  ) {}

  /** Titres, synopsis et genres sont demandés dans la langue de l'interface (« fr-FR »…). */
  private async call<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const query = new URLSearchParams({ language: LANGUAGES[this.lang()].tmdb, ...params });
    const init: RequestInit = {};
    if (this.apiKey.startsWith("eyJ")) {
      init.headers = { Authorization: `Bearer ${this.apiKey}` };
    } else {
      query.set("api_key", this.apiKey);
    }
    return (await this.fetcher(`${API_URL}${path}?${query}`, init)) as T;
  }

  private search(query: string): Promise<TmdbMovie[]> {
    return this.call<{ results?: TmdbMovie[] }>("search/movie", { query: query.trim(), include_adult: "false" }).then(
      (r) => r.results ?? [],
    );
  }

  async suggest(query: string): Promise<Suggestion[]> {
    const movies = await this.search(query);
    return movies.slice(0, 6).map((m) => ({
      name: m.title,
      detail: m.release_date?.slice(0, 4) || undefined,
      picture: m.poster_path ? `${IMAGE_URL}w92${m.poster_path}` : undefined,
      artist: toArtist(m),
    }));
  }

  /** Correspondance exacte du titre (ou « titre (année) ») préférée, sinon le plus pertinent. */
  async findArtist(query: string): Promise<Artist | null> {
    const wanted = query.trim().toLowerCase();
    // « Alien (1979) » : on cherche le titre seul et on filtre sur l'année
    const withYear = /^(.*\S)\s*\((\d{4})\)$/.exec(query.trim());
    const movies = await this.search(withYear ? withYear[1] : query);
    const best =
      movies.find((m) => movieLabel(m).toLowerCase() === wanted) ??
      (withYear ? undefined : movies.find((m) => m.title.toLowerCase() === wanted)) ??
      movies[0];
    return best ? toArtist(best) : null;
  }

  async getSimilars(movie: Artist, limit: number): Promise<Artist[]> {
    let list = (await this.call<{ results?: TmdbMovie[] }>(`movie/${encodeURIComponent(movie.id)}/recommendations`)).results;
    if (!list?.length) {
      list = (await this.call<{ results?: TmdbMovie[] }>(`movie/${encodeURIComponent(movie.id)}/similar`)).results;
    }
    return (list ?? []).filter((m) => m.title).slice(0, limit).map(toArtist);
  }

  async getInfo(movie: Artist): Promise<ArtistInfo | null> {
    const m = await this.call<Partial<TmdbMovieDetails>>(`movie/${encodeURIComponent(movie.id)}`);
    if (!m.id || !m.title) {
      return null;
    }
    let overview = m.overview ?? "";
    if (!overview && this.lang() !== "en") {
      // synopsis pas encore traduit sur TMDB : repli sur l'anglais
      overview = (await this.call<Partial<TmdbMovieDetails>>(`movie/${encodeURIComponent(movie.id)}`, { language: "en-US" })).overview ?? "";
    }
    const tagline = m.tagline ? `<i>${escapeHtml(m.tagline)}</i><br />` : "";
    return {
      name: movieLabel(m as TmdbMovie),
      url: `https://www.themoviedb.org/movie/${m.id}`,
      bioHtml: tagline + escapeHtml(overview),
      tags: (m.genres ?? []).map((g) => g.name),
      image: m.poster_path ? `${IMAGE_URL}w185${m.poster_path}` : null,
      source: "TMDB",
    };
  }
}
