/**
 * Nœud de la carte tel que manipulé par l'application, indépendamment de la source :
 * un artiste, ou un film en mode films.
 */
export interface Artist {
  /** Identifiant stable dans la source (MBID Last.fm ou nom, QID Wikidata, id TMDB). */
  id: string;
  name: string;
  mbid?: string;
}

export interface ArtistInfo {
  name: string;
  url: string;
  /** Résumé de la bio, en HTML (liens) déjà assaini. */
  bioHtml: string;
  tags: string[];
  image: string | null;
  /** Nom du service de la fiche, pour le lien « En savoir plus sur … ». */
  source: string;
}

/** Proposition d'auto-complétion. */
export interface Suggestion {
  name: string;
  picture?: string;
  /** Petit texte à droite (année…). */
  detail?: string;
  /** Nombre de fans, formaté et traduit par l'interface. */
  fans?: number;
  /** Si la source le connaît déjà, l'ajout se fait sans nouvelle recherche. */
  artist?: Artist;
}

/**
 * Source de similarité (équivalent des anciens DAO furzr).
 * Une nouvelle source = une nouvelle implémentation de cette interface.
 */
export interface SimilarityProvider {
  /** Enregistré dans les cartes partagées (champ `p`) : ne jamais le renommer. */
  readonly name: string;
  /** Les extraits audio Deezer n'ont de sens que pour la musique. */
  readonly kind: "music" | "movie";
  /** Propositions pour une saisie partielle. */
  suggest(query: string): Promise<Suggestion[]>;
  /** Trouve l'artiste correspondant à un nom saisi, ou null s'il est inconnu. */
  findArtist(query: string): Promise<Artist | null>;
  /** Artistes similaires, du plus proche au plus lointain (liste vide si aucun). */
  getSimilars(artist: Artist, limit: number): Promise<Artist[]>;
  getInfo(artist: Artist): Promise<ArtistInfo | null>;
}

/** Extrait audio jouable. */
export interface PreviewTrack {
  id: number;
  title: string;
  artistName: string;
  albumTitle: string;
  link: string;
  previewUrl: string;
}

/** Erreur réseau ou de service (par opposition à « pas de résultat »). */
export class ServiceError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ServiceError";
  }
}
