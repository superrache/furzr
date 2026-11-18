/**
 * Catalogue de référence. Les autres langues sont typées sur ses clés (`Messages`) :
 * une clé manquante ou en trop fait échouer le typecheck.
 *
 * Conventions :
 * - `{name}` : valeur remplacée par t() ;
 * - clés `*Html` : HTML de confiance (le nôtre), inséré tel quel ; `{lastfm}`, `{wikidata}`, `{tmdb}` et
 *   `{deezer}` y deviennent des liens vers les services.
 */
export const en = {
  "meta.description":
    "furzr offers a new way to explore the world of music, browsing relationships between artists or bands and listening to samples. Expand your musical knowledge like the leaves of a tree.",
  "map.label": "Artist similarity map",

  "lang.label": "Language",

  "form.add": "Add",
  "sound.toggle": "Sound on/off",
  "sound.on": "Sound on",
  "sound.off": "Sound off",
  "sound.none": "No preview song available",
  "sound.unavailable": "Preview service unavailable",

  "mode.label": "Map mode",
  "mode.title": "What the map links together",
  "mode.similar": "Similar",
  "mode.influences": "Influences",
  "mode.movies": "Movies",
  "mode.confirmSwitch": "Switching mode clears the current map. Continue?",

  "input.label": "Artist name",
  "input.artist": "Give a music artist name here",
  "input.movie": "Give a movie title here",
  "suggestions.label": "Suggestions",
  "suggestions.fans": "{n} fans",

  "about.title": "About this app",
  "about.introHtml":
    "<b>furzr</b> offers an original way to explore the world of music, browsing relationships between artists or bands and listening to samples. Expand your musical knowledge like the leaves of a tree and find out what you will be listening to soon.",
  "about.howto": "Type an artist, then click on any name to expand the map. Drag names around, scroll or pinch to zoom.",
  "about.growthHtml":
    "<b>Snake</b> (Crazy Snake) keeps only the path you followed: unexplored names vanish at each step. <b>Tree</b> (Huge Tree of Death) removes nothing and lets the map grow forever.",
  "about.modesHtml":
    "Three modes: <b>Similar</b> artists, <b>Influences</b> (who inspired an artist, and whom they inspired) and, when available, <b>Movies</b> (recommended films).",
  "about.creditsHtml":
    "<b>furzr</b> uses data from {lastfm}, {wikidata} and {tmdb}, and audio previews from {deezer}. This product uses the TMDB API but is not endorsed or certified by TMDB.",
  "legend.input": "your artists",
  "legend.exploded": "explored",
  "legend.similar": "similar",

  "share.tab": "Share this map",
  "share.copy": "Copy link",
  "share.native": "Share…",
  "share.urlLabel": "Link to this map",
  "share.copied": "Link copied! Anyone opening it will see this map.",
  "share.copyManually": "Copy this link to share your map.",
  "share.invalid": "This shared map link is invalid",
  "share.unavailable": "This shared map needs a data source that is not available here",

  "map.description": "This map shows how to connect {a} to {b}",
  "map.empty.similar": "Expand your artist map",
  "map.empty.influences": "Expand your influence map",
  "map.empty.movies": "Expand your movie map",

  "notFound.similar": "There is no music artist known named like that, please try another",
  "notFound.influences": "This artist is unknown to Wikidata, please try another",
  "notFound.movies": "There is no movie known with that title, please try another",
  "noNeighbors.similar": "This artist doesn't have related artists",
  "noNeighbors.influences": "No influence is known for this artist on Wikidata",
  "noNeighbors.movies": "No recommendation for this movie",

  "help.clickArtist": "Click on an artist to expand the map",
  "help.clickMovie": "Click on a movie to expand the map",
  "help.share": "Have fun and share your map!",

  "growth.label": "Map growth",
  "growth.snake": "Snake",
  "growth.tree": "Tree",
  "growth.snakeTitle": "Crazy Snake: unexplored names vanish at each step, only your path remains",
  "growth.treeTitle": "Huge Tree of Death: nothing is removed, the map keeps growing",
  "growth.toSnake": "Snake: unexplored names will vanish at your next click",
  "growth.toTree": "Tree: from now on, nothing is removed from the map",
  "clear": "Clear the map",

  "overview.about": "About {name}",
  "overview.readMore": "Read more on {source}",

  "error.service": "The service is temporarily unavailable, please retry in a moment",
  "error.generic": "Something went wrong, please retry",
};

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
