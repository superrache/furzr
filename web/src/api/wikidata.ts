import type { LangGetter } from "../i18n/languages";
import { ServiceError, type Artist, type ArtistInfo, type SimilarityProvider, type Suggestion } from "./types";

/**
 * Influences entre artistes d'après Wikidata (propriété P737 « influencé par »),
 * dans les deux sens : qui a influencé l'artiste, puis qui il a influencé.
 * Remplace les anciens modes Rovi influencers/followers.
 *
 * Seules les entités qui ont un identifiant MusicBrainz (P434) sont gardées : on reste
 * dans la musique, et le MBID sert à récupérer la fiche Last.fm.
 * Les données sont clairsemées pour les artistes récents (Radiohead → Pink Floyd seulement
 * en « influencé par »), riches pour les classiques (Beatles, Dylan…).
 */

const SEARCH_URL = "https://www.wikidata.org/w/api.php";
const SPARQL_URL = "https://query.wikidata.org/sparql";

type JsonFetcher = (url: string) => Promise<unknown>;

const defaultFetcher: JsonFetcher = async (url) => {
  let resp: Response;
  try {
    resp = await fetch(url, { headers: { Accept: "application/sparql-results+json, application/json" } });
  } catch (e) {
    throw new ServiceError(`Wikidata unreachable: ${(e as Error).message}`);
  }
  if (!resp.ok) {
    throw new ServiceError(`Wikidata HTTP ${resp.status}`, resp.status);
  }
  return resp.json();
};

interface Binding {
  [name: string]: { value: string } | undefined;
}

const QID = /^Q\d+$/;

/** « http://www.wikidata.org/entity/Q44190 » → « Q44190 ». */
const qidOf = (uri: string) => uri.slice(uri.lastIndexOf("/") + 1);

/** Partie d'un fournisseur réutilisée pour la fiche et les propositions (Last.fm + Deezer). */
export type InfoSource = Pick<SimilarityProvider, "getInfo" | "suggest">;

export class WikidataProvider implements SimilarityProvider {
  readonly name = "wikidata";
  readonly kind = "music";

  constructor(
    private readonly info: InfoSource,
    private readonly fetcher: JsonFetcher = defaultFetcher,
    private readonly lang: LangGetter = () => "en",
  ) {}

  private async sparql(query: string): Promise<Binding[]> {
    const data = (await this.fetcher(`${SPARQL_URL}?${new URLSearchParams({ query, format: "json" })}`)) as {
      results?: { bindings?: Binding[] };
    };
    return data.results?.bindings ?? [];
  }

  suggest(query: string): Promise<Suggestion[]> {
    return this.info.suggest(query);
  }

  /** Recherche plein texte Wikidata, puis premier résultat qui est un artiste musical (a un MBID). */
  async findArtist(query: string): Promise<Artist | null> {
    const params = new URLSearchParams({
      action: "wbsearchentities",
      search: query.trim(),
      // recherche dans la langue de l'interface (« ビートルズ » trouve les Beatles), avec repli sur l'anglais
      language: this.lang(),
      uselang: this.lang(),
      type: "item",
      limit: "10",
      format: "json",
      origin: "*",
    });
    const data = (await this.fetcher(`${SEARCH_URL}?${params}`)) as { search?: { id: string }[] };
    const ids = (data.search ?? []).map((r) => r.id).filter((id) => QID.test(id));
    if (ids.length === 0) {
      return null;
    }
    const rows = await this.sparql(`
      SELECT ?item ?itemLabel ?mbid WHERE {
        VALUES ?item { ${ids.map((id) => `wd:${id}`).join(" ")} }
        ?item wdt:P434 ?mbid .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
      }`);
    // on garde l'ordre de pertinence de la recherche
    const byId = new Map<string, Binding>();
    for (const row of rows) {
      byId.set(qidOf(row.item!.value), byId.get(qidOf(row.item!.value)) ?? row); // un artiste peut avoir plusieurs MBID
    }
    const best = ids.map((id) => byId.get(id)).find(Boolean);
    return best ? this.toArtist(best) : null;
  }

  /** Influences puis disciples, chacun du plus au moins connu (nombre de pages Wikipédia). */
  async getSimilars(artist: Artist, limit: number): Promise<Artist[]> {
    if (!QID.test(artist.id)) {
      return [];
    }
    // optimiseur désactivé : sinon Blazegraph commence par parcourir tous les P434 (> 30 s, voire timeout).
    // Pas de GROUP BY non plus (le service de libellés y est très lent) : doublons et tri gérés ici.
    const rows = await this.sparql(`
      SELECT ?item ?itemLabel ?mbid ?dir ?links WHERE {
        hint:Query hint:optimizer "None" .
        { wd:${artist.id} wdt:P737 ?item . BIND(0 AS ?dir) }
        UNION
        { ?item wdt:P737 wd:${artist.id} . BIND(1 AS ?dir) }
        ?item wdt:P434 ?mbid .
        OPTIONAL { ?item wikibase:sitelinks ?links . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
      }`);
    const best = new Map<string, { artist: Artist; dir: number; links: number }>();
    for (const row of rows) {
      const artistRow = this.toArtist(row);
      const dir = Number(row.dir?.value ?? 1);
      const links = Number(row.links?.value ?? 0);
      const known = best.get(artistRow.id);
      if (artistRow.id !== artist.id && (!known || dir < known.dir)) {
        best.set(artistRow.id, { artist: artistRow, dir, links });
      }
    }
    return [...best.values()]
      .sort((a, b) => a.dir - b.dir || b.links - a.links)
      .slice(0, Math.max(0, limit))
      .map((e) => e.artist);
  }

  getInfo(artist: Artist): Promise<ArtistInfo | null> {
    // recherche Last.fm par nom : plus fiable que par MBID, souvent absent de Last.fm
    return this.info.getInfo({ id: artist.name, name: artist.name });
  }

  /**
   * Les noms restent ceux d'usage international (libellés "en,mul"), pas la traduction locale :
   * ils servent ensuite à chercher la fiche Last.fm et l'extrait Deezer, qui ne connaissent pas
   * « ビートルズ » ou « Битлз ».
   */
  private toArtist(row: Binding): Artist {
    const id = qidOf(row.item!.value);
    // sans libellé, le service renvoie le QID : mieux vaut ça qu'un nœud vide
    return { id, name: row.itemLabel?.value || id, mbid: row.mbid?.value || undefined };
  }
}
