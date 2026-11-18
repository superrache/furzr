import type { Messages } from "./en";

export const es: Messages = {
  "meta.description":
    "furzr ofrece una nueva forma de explorar el mundo de la música: recorre las relaciones entre artistas o grupos y escucha fragmentos. Haz crecer tu cultura musical como las ramas de un árbol.",
  "map.label": "Mapa de artistas similares",

  "lang.label": "Idioma",

  "form.add": "Añadir",
  "sound.toggle": "Activar/silenciar sonido",
  "sound.on": "Sonido activado",
  "sound.off": "Sonido desactivado",
  "sound.none": "No hay fragmento disponible",
  "sound.unavailable": "Servicio de fragmentos no disponible",

  "mode.label": "Modo del mapa",
  "mode.title": "Qué conecta el mapa",
  "mode.similar": "Similares",
  "mode.influences": "Influencias",
  "mode.movies": "Películas",
  "play.label": "Explorar o jugar",
  "play.explore": "Explorar",
  "play.game": "Jugar",
  "mode.confirmSwitch": "Cambiar de modo borra el mapa actual. ¿Continuar?",

  "input.label": "Nombre del artista",
  "input.artist": "Escribe aquí el nombre de un artista",
  "input.movie": "Escribe aquí el título de una película",
  "suggestions.label": "Sugerencias",
  "suggestions.fans": "{n} fans",

  "about.title": "Acerca de esta aplicación",
  "about.introHtml":
    "<b>furzr</b> ofrece una forma original de explorar el mundo de la música: recorre las relaciones entre artistas o grupos y escucha fragmentos. Haz crecer tu cultura musical como las ramas de un árbol y descubre lo que pronto escucharás.",
  "about.howto":
    "Escribe un artista y luego haz clic en cualquier nombre para ampliar el mapa. Arrastra los nombres, desplázate o pellizca para hacer zoom.",
  "about.growthHtml":
    "<b>Serpiente</b> (Crazy Snake) solo conserva el camino recorrido: los nombres no explorados desaparecen en cada paso. <b>Árbol</b> (Huge Tree of Death) no elimina nada y deja que el mapa crezca sin fin.",
  "about.modesHtml":
    "Tres modos: artistas <b>Similares</b>, <b>Influencias</b> (quién inspiró a un artista y a quién inspiró él) y, si está disponible, <b>Películas</b> (películas recomendadas).",
  "about.gameHtml":
    "<b>Juego</b>: une a dos artistas conocidos y alejados entre sí con la serpiente más corta posible. Cada reto tiene una dificultad (de fácil a extrema) que fija un objetivo de clics y los puntos en juego: de 1000 a 4000 dentro del objetivo y luego un 20 % menos por cada clic de más.",
  "about.creditsHtml":
    "<b>furzr</b> usa datos de {lastfm}, {wikidata} y {tmdb}, y fragmentos de audio de {deezer}. Este producto usa la API de TMDB, pero no está avalado ni certificado por TMDB.",
  "legend.input": "tus artistas",
  "legend.exploded": "explorados",
  "legend.similar": "similares",
  "legend.target": "objetivo (juego)",

  "share.tab": "Compartir este mapa",
  "share.copy": "Copiar enlace",
  "share.native": "Compartir…",
  "share.urlLabel": "Enlace a este mapa",
  "share.copied": "¡Enlace copiado! Quien lo abra verá este mapa.",
  "share.copyManually": "Copia este enlace para compartir tu mapa.",
  "share.invalid": "Este enlace de mapa compartido no es válido",
  "share.unavailable": "Este mapa compartido necesita una fuente de datos que no está disponible aquí",

  "map.description": "Este mapa muestra cómo conectar {a} con {b}",
  "map.empty.similar": "Amplía tu mapa de artistas",
  "map.empty.influences": "Amplía tu mapa de influencias",
  "map.empty.movies": "Amplía tu mapa de películas",
  "map.empty.game": "Une a los dos artistas",

  "notFound.similar": "No se conoce ningún artista con ese nombre, prueba con otro",
  "notFound.influences": "Wikidata no conoce a este artista, prueba con otro",
  "notFound.movies": "No se conoce ninguna película con ese título, prueba con otra",
  "noNeighbors.similar": "Este artista no tiene artistas similares",
  "noNeighbors.influences": "Wikidata no conoce ninguna influencia de este artista",
  "noNeighbors.movies": "No hay recomendaciones para esta película",
  "notFound.game": "No se conoce ningún artista con ese nombre, prueba con otro",
  "noNeighbors.game": "Este artista no tiene artistas similares",

  "game.new": "Nuevo reto",
  "game.loading": "Buscando dos artistas alejados…",
  "game.goal": "Une a {a} con {b}",
  "game.start": "Une a {a} con {b} haciendo clic en artistas similares. ¡Cuantos menos clics, más puntuación!",
  "game.moves": "Clics: {n}",
  "game.score": "Puntuación: {score}",
  "game.difficulty": "Dificultad: {level}",
  "difficulty.1": "Fácil",
  "difficulty.2": "Media",
  "difficulty.3": "Difícil",
  "difficulty.4": "Extrema",
  "game.record": "¡Nuevo récord personal!",
  "game.failed": "No se encontró ningún reto, inténtalo de nuevo",
  "game.shareGoal": "Reto furzr: une a {a} con {b} con el menor número de clics",
  "game.shareWon": "He unido a {a} con {b} en furzr. Clics: {n}, puntuación: {score}. ¿Puedes hacerlo mejor?",

  "victory.title": "¡Bien hecho!",
  "victory.perfect": "¡Perfecto!",
  "victory.subtitle": "Has unido a {a} con {b}",
  "victory.path": "Tu camino",
  "victory.score": "Puntuación",
  "victory.clicks": "Clics",
  "victory.difficulty": "Dificultad",
  "victory.par": "objetivo: {n} clics",
  "victory.best": "Récord",
  "victory.share": "Compartir",
  "victory.close": "Cerrar",
  "victory.copied": "¡Enlace copiado! Envíaselo a un amigo para retarlo.",
  "tip.loading": "Cargando…",

  "help.clickArtist": "Haz clic en un artista para ampliar el mapa",
  "help.clickMovie": "Haz clic en una película para ampliar el mapa",
  "help.share": "¡Diviértete y comparte tu mapa!",

  "growth.label": "Crecimiento del mapa",
  "growth.snake": "Serpiente",
  "growth.tree": "Árbol",
  "growth.snakeTitle": "Crazy Snake: los nombres no explorados desaparecen en cada paso, solo queda tu camino",
  "growth.treeTitle": "Huge Tree of Death: no se elimina nada, el mapa sigue creciendo",
  "growth.toSnake": "Serpiente: los nombres no explorados desaparecerán en tu próximo clic",
  "growth.toTree": "Árbol: a partir de ahora, no se elimina nada del mapa",
  "clear": "Borrar el mapa",

  "overview.about": "Acerca de {name}",
  "overview.readMore": "Más información en {source}",

  "error.service": "El servicio no está disponible por el momento, inténtalo de nuevo en un instante",
  "error.generic": "Algo salió mal, inténtalo de nuevo",
};
