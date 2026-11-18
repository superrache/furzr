import "./style.css";
import { DeezerClient } from "./api/deezer";
import { LastFmProvider } from "./api/lastfm";
import { TmdbProvider } from "./api/tmdb";
import { WikidataProvider } from "./api/wikidata";
import { ServiceError, type Artist, type ArtistInfo, type SimilarityProvider, type Suggestion } from "./api/types";
import { ArtistMap, normalizeName, type Growth, type MapNode } from "./graph/model";
import { decodeSnapshot, encodeSnapshot } from "./graph/share";
import { MapView, themeFromCss } from "./graph/view";
import { Autocomplete } from "./ui/autocomplete";
import { byId, closeDrawers, exposeHeight, prefs, setupDrawers, toast } from "./ui/dom";
import { escapeHtml } from "./ui/html";
import { ArtistTip } from "./ui/artist-tip";
import { launchConfetti } from "./ui/confetti";
import { PreviewPlayer, type PreviewStatus } from "./ui/preview";
import {
  CHART_SIZE,
  DISTANCE_CHECK,
  ESTIMATE_WIDTH,
  estimateDifficulty,
  parFor,
  pickChallenge,
  popularPool,
  scoreFor,
  type Challenge,
  type Difficulty,
} from "./game/game";
import { LANGUAGES, detectLang, getLang, isLang, setLang, t, translateDocument, type Lang } from "./i18n";

const params = new URLSearchParams(location.search);

/** Haut-parleur barré (SVG plutôt qu'emoji : rendu identique partout). */
const MUTED_ICON =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" fill="none" stroke="currentColor"' +
  ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>' +
  '<path d="M16 9l5 6M21 9l-5 6"/></svg>';


/** Nombre de similaires ajoutés à chaque expansion (paramètre d'URL similar_number). */
/** Durée de la célébration sur la carte avant la fenêtre de victoire (écourtée par un clic ou une touche). */
const CELEBRATION_MS = 2500;
const SIMILAR_NUMBER = clamp(Number(params.get("similar_number")) || 16, 1, 50);

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY as string | undefined;
/** Facultative : sans elle, le mode films n'est pas proposé. */
const TMDB_KEY = (import.meta.env.VITE_TMDB_API_KEY as string | undefined)?.trim() || undefined;

type ModeId = "similar" | "influences" | "movies" | "game";

/** Un mode = une source de similarité ; ses textes sont les clés `*.${id}` des catalogues. */
interface Mode {
  id: ModeId;
  provider: SimilarityProvider;
}

class App {
  private readonly deezer = new DeezerClient();
  private readonly modes = new Map<ModeId, Mode>();
  private mode: Mode;
  /** Dernier mode d'exploration (similaires, influences, films) : on y revient en quittant le jeu. */
  private exploreMode!: Mode;
  private map = new ArtistMap();
  private readonly view: MapView;
  private readonly player: PreviewPlayer;
  /** Les expansions sont appliquées dans l'ordre des clics, même si les réponses arrivent dans le désordre. */
  private applyQueue: Promise<void> = Promise.resolve();
  private overviewRequest = 0;
  /** Pour retraduire la fiche et l'état du son au changement de langue. */
  private overviewArtist: Artist | null = null;
  private soundStatus: PreviewStatus = { state: "off" };
  private help: "none" | "click" | "share" | "done" = "none";
  /** Croissance choisie par l'utilisateur ; le mode jeu impose "snake" sans l'écraser. */
  private growthChoice: Growth = "snake";

  // mode jeu
  private readonly lastfm: LastFmProvider;
  private challenge: Challenge | null = null;
  /** Défi gagné ; `score` reste null le temps que l'estimation de difficulté se termine. */
  private gameResult: { moves: number; score: number | null } | null = null;
  /** Difficulté du défi en cours : estimée en arrière-plan au lancement, gardée si on recommence. */
  private difficulty: { challenge: Challenge; level: Difficulty | null; promise: Promise<Difficulty> } | null = null;
  /** Similaires Last.fm (50) partagés entre tirage, estimation et lancement du défi. */
  private readonly similarCache = new Map<string, Promise<Artist[]>>();
  private gamePool: Promise<Artist[]> | null = null;
  private gameRequest = 0;
  /** Résumé affiché dans la fenêtre de victoire (gardé pour la retraduire). */
  private victory: {
    path: string[];
    moves: number;
    score: number;
    difficulty: Difficulty;
    best: number;
    record: boolean;
  } | null = null;
  private stopConfetti: () => void = () => undefined;
  /** Vrai entre la victoire et l'ouverture de la fenêtre : la carte célèbre, les clics sont ignorés. */
  private celebrating = false;
  /** Infobulle des artistes du défi, et éléments du bandeau (créés une fois par défi). */
  private readonly artistTip = new ArtistTip(byId("artist-tip"), () => t("tip.loading"));
  private gameBar: { key: string; status: HTMLElement } | null = null;
  /** Fiches déjà demandées (par langue) : l'infobulle s'affiche sans attendre. */
  private readonly infoCache = new Map<string, Promise<ArtistInfo | null>>();

  private readonly input = byId<HTMLInputElement>("artist-input");
  private readonly submit = byId<HTMLButtonElement>("artist-submit");
  private readonly autocomplete: Autocomplete;
  private readonly modeSelect = byId<HTMLSelectElement>("mode");

  constructor() {
    if (!LASTFM_KEY) {
      throw new Error("VITE_LASTFM_API_KEY is missing (see web/.env)");
    }
    // les fournisseurs lisent la langue à chaque appel : un changement s'applique aux requêtes suivantes
    const lastfm = new LastFmProvider(LASTFM_KEY, this.deezer, undefined, getLang);
    this.lastfm = lastfm;
    this.addMode({ id: "similar", provider: lastfm });
    this.addMode({ id: "influences", provider: new WikidataProvider(lastfm, undefined, getLang) });
    if (TMDB_KEY) {
      this.addMode({ id: "movies", provider: new TmdbProvider(TMDB_KEY, undefined, getLang) });
    }
    // le jeu se joue sur les similaires Last.fm (une carte partagée depuis le jeu rouvre en « similar »)
    this.addMode({ id: "game", provider: lastfm });
    this.mode = this.modes.get(params.get("mode") as ModeId) ?? this.modes.get("similar")!;
    this.exploreMode = this.mode.id === "game" ? this.modes.get("similar")! : this.mode;
    this.view = new MapView(byId("map"), themeFromCss(), (node) => void this.explore(node));

    const soundParam = params.get("sound");
    const soundOn = soundParam ? soundParam !== "off" : prefs.get("sound") !== "off";
    this.player = new PreviewPlayer(this.deezer, soundOn, (status) => this.renderSound(status));

    setupDrawers();
    // lecteur posé à 8 px du bas : la fiche et les outils se placent 6 px au-dessus
    exposeHeight(byId("player"), "--player-space", 8 + 6);
    // hauteur du formulaire (variable : interrupteur, bandeau du défi sur 1 à 3 lignes…) : les outils
    // se placent dessous sur mobile
    exposeHeight(byId("artist-form"), "--form-height", 0);
    this.autocomplete = new Autocomplete(
      this.input,
      (query) => this.mode.provider.suggest(query),
      (suggestion) => void this.addArtist(suggestion.name, suggestion),
    );
    // sans clé TMDB, pas de mode films (option.hidden est ignoré par Safari iOS)
    for (const option of [...this.modeSelect.options]) {
      if (!this.modes.has(option.value as ModeId)) {
        option.remove();
      }
    }
    this.modeSelect.addEventListener("change", () => this.onModeChange());
    for (const button of this.playButtons()) {
      button.addEventListener("click", () =>
        this.switchMode(button.dataset.play === "game" ? this.modes.get("game")! : this.exploreMode),
      );
    }
    this.setupLanguagePicker();
    const growthParam = params.get("growth") ?? prefs.get("growth");
    this.growthChoice = growthParam === "tree" ? "tree" : "snake";
    this.applyMode();
    byId("artist-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.isGame) {
        void this.newChallenge();
      } else {
        void this.addArtist(this.input.value);
      }
    });
    // la note de l'extrait en cours coupe ou rétablit le son (contenu recréé : délégation)
    byId("sound-title").addEventListener("click", (e) => {
      if ((e.target as Element).closest(".sound-note")) {
        this.toggleSound();
      }
    });
    // en jeu, vider la carte = recommencer le même défi
    byId("clear").addEventListener("click", () => (this.isGame && this.challenge ? void this.startChallenge(this.challenge) : this.clear()));
    for (const button of this.growthButtons()) {
      button.addEventListener("click", () => this.setGrowth(button.dataset.growth as Growth));
    }
    this.renderGrowth();
    this.setupVictory();
    byId("share-copy").addEventListener("click", () => void this.copyShareLink());
    const nativeShare = byId<HTMLButtonElement>("share-native");
    nativeShare.hidden = typeof navigator.share !== "function";
    nativeShare.addEventListener("click", () => void this.nativeShare());
    // reprise de l'audio bloqué par la politique d'autoplay au premier geste
    document.addEventListener("pointerdown", () => this.player.resumeIfBlocked());
    window.addEventListener("hashchange", () => void this.loadFromHash());
  }

  async start(): Promise<void> {
    if (await this.loadFromHash()) {
      return;
    }
    if (this.isGame) {
      const from = params.get("from");
      const to = params.get("to");
      await this.newChallenge(from && to ? { from, to } : undefined);
      return;
    }
    const artist = params.get("artist");
    if (artist) {
      this.input.value = artist;
      await this.addArtist(artist);
    } else {
      this.input.focus();
    }
  }

  // ---------- carte ----------

  /** `suggestion.artist` évite une nouvelle recherche quand la source l'a déjà identifié. */
  private async addArtist(query: string, suggestion?: Suggestion): Promise<void> {
    const name = query.trim();
    this.autocomplete.close();
    if (!name) {
      return;
    }
    this.setBusy(true);
    try {
      const { provider, id } = this.mode;
      const artist = suggestion?.artist ?? (await provider.findArtist(name));
      if (!artist) {
        toast(t(`notFound.${id}`), { error: true });
        return;
      }
      const similars = await provider.getSimilars(artist, 50);
      if (provider !== this.mode.provider) {
        return; // mode changé pendant la requête
      }
      if (similars.length === 0) {
        toast(t(`noNeighbors.${id}`), { error: true });
        return;
      }
      this.leaveStartScreen();
      await this.enqueue(() => {
        const added = this.map.addInput(artist, similars, SIMILAR_NUMBER);
        this.refresh(true, added.id);
      });
      void this.showOverview(artist);
      this.input.value = "";
      if (this.help === "none") {
        this.help = "click";
        const message = this.mode.provider.kind === "movie" ? "help.clickMovie" : "help.clickArtist";
        setTimeout(() => toast(t(message), { durationMs: 6000 }), 1500);
      }
    } catch (e) {
      this.serviceError(e);
    } finally {
      this.setBusy(false);
    }
  }

  private async explore(node: MapNode): Promise<void> {
    if (this.celebrating) {
      return;
    }
    const artist: Artist = { id: node.id, name: node.name, mbid: node.mbid };
    this.map.markExplored(node.id);
    this.renderShare();
    this.renderGame();
    void this.showOverview(artist);
    const { provider, id } = this.mode;
    const similars = provider.getSimilars(artist, 50);
    similars.catch(() => undefined); // l'erreur est traitée dans la file ci-dessous
    try {
      await this.enqueue(async () => {
        const list = await similars;
        if (provider !== this.mode.provider) {
          return; // mode changé pendant la requête
        }
        if (list.length === 0) {
          toast(t(`noNeighbors.${id}`), { error: true });
          return;
        }
        this.map.expand(node.id, list, SIMILAR_NUMBER);
        this.refresh(true, node.id);
        this.checkGame();
      });
      if (this.help === "click") {
        this.help = "done";
        setTimeout(() => toast(t("help.share"), { durationMs: 6000 }), 2000);
      }
    } catch (e) {
      this.serviceError(e);
    }
  }

  private enqueue(task: () => void | Promise<void>): Promise<void> {
    const run = this.applyQueue.then(task);
    this.applyQueue = run.catch(() => undefined);
    return run;
  }

  /** `focusId` : cadrer sur ce nœud et ses voisins plutôt que sur toute la carte. */
  private refresh(fit = true, focusId?: string): void {
    const focus = focusId ? this.map.neighborhood(focusId) : undefined;
    this.view.update(this.map.graphData(), fit, focus);
    this.renderShare();
  }

  private clear(): void {
    this.map.clear();
    this.refresh(false);
    byId("overview").hidden = true;
    this.player.stop();
    this.renderSound(this.soundStatus);
    if (location.hash) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    this.input.focus();
  }

  private async loadFromHash(): Promise<boolean> {
    const encoded = new URLSearchParams(location.hash.slice(1)).get("map");
    if (!encoded) {
      return false;
    }
    const snapshot = await decodeSnapshot(encoded);
    if (!snapshot || snapshot.n.length === 0) {
      toast(t("share.invalid"), { error: true });
      return false;
    }
    const mode = [...this.modes.values()].find((m) => m.provider.name === snapshot.p);
    if (!mode) {
      toast(t("share.unavailable"), { error: true });
      return false;
    }
    this.setMode(mode);
    this.leaveStartScreen();
    this.help = "done";
    await this.enqueue(() => {
      this.map = ArtistMap.fromSnapshot(snapshot);
      this.renderGrowth();
      this.refresh();
    });
    const last = snapshot.n.find(([, name]) => name === snapshot.b) ?? snapshot.n[0];
    void this.showOverview({ id: last[0], name: last[1], mbid: last[2] || undefined });
    return true;
  }

  // ---------- mode jeu ----------

  private get isGame(): boolean {
    return this.mode.id === "game";
  }

  /** Nouveau défi : tiré au sort, ou imposé par l'URL (?mode=game&from=…&to=…). */
  private async newChallenge(names?: { from: string; to: string }): Promise<void> {
    const request = ++this.gameRequest;
    this.challenge = null;
    this.resetGameResult();
    this.renderGame();
    this.setBusy(true);
    try {
      const challenge = names ? await this.resolveChallenge(names) : await this.drawChallenge();
      if (request !== this.gameRequest || !this.isGame) {
        return; // autre défi demandé, ou mode changé entre-temps
      }
      if (!challenge) {
        toast(t("game.failed"), { error: true });
        return;
      }
      await this.startChallenge(challenge);
    } catch (e) {
      this.serviceError(e);
    } finally {
      if (request === this.gameRequest) {
        this.setBusy(false);
        this.renderGame();
      }
    }
  }

  private async drawChallenge(): Promise<Challenge | null> {
    // classement chargé une fois par session
    this.gamePool ??= this.lastfm.getTopArtists(CHART_SIZE).then((chart) => popularPool(chart));
    let pool: Artist[];
    try {
      pool = await this.gamePool;
    } catch (e) {
      this.gamePool = null;
      throw e;
    }
    return pickChallenge(pool, (artist) => this.cachedSimilars(artist));
  }

  /** Défi partagé : les noms sont recherchés tels quels, sans contrôle de distance. */
  private async resolveChallenge(names: { from: string; to: string }): Promise<Challenge | null> {
    const [from, to] = await Promise.all([this.lastfm.findArtist(names.from), this.lastfm.findArtist(names.to)]);
    return from && to && normalizeName(from.name) !== normalizeName(to.name) ? { from, to } : null;
  }

  /** Les 50 premiers similaires Last.fm, en cache pour la session (un échec n'est pas gardé). */
  private cachedSimilars(artist: Artist): Promise<Artist[]> {
    let list = this.similarCache.get(artist.id);
    if (!list) {
      list = this.lastfm.getSimilars(artist, DISTANCE_CHECK);
      list.catch(() => this.similarCache.delete(artist.id));
      this.similarCache.set(artist.id, list);
    }
    return list;
  }

  /** Lance l'estimation (une fois par défi) ; le bandeau l'affiche dès qu'elle est connue. */
  private estimate(challenge: Challenge): void {
    if (this.difficulty?.challenge === challenge) {
      return;
    }
    const width = Math.min(SIMILAR_NUMBER, ESTIMATE_WIDTH);
    const promise = estimateDifficulty(challenge, (artist) => this.cachedSimilars(artist), width);
    const entry: NonNullable<App["difficulty"]> = { challenge, level: null, promise };
    this.difficulty = entry;
    void promise.then((level) => {
      entry.level = level;
      if (this.difficulty === entry) {
        this.renderGame();
      }
    });
  }

  /** (Re)part de l'artiste de départ, carte vidée et compteur à zéro. */
  private async startChallenge(challenge: Challenge): Promise<void> {
    const similars = await this.cachedSimilars(challenge.from);
    if (!this.isGame) {
      return;
    }
    if (similars.length === 0) {
      toast(t("game.failed"), { error: true });
      return;
    }
    this.challenge = challenge;
    this.resetGameResult();
    this.estimate(challenge);
    this.help = "done";
    this.leaveStartScreen();
    this.view.setTarget(challenge.to.name);
    await this.enqueue(() => {
      this.map.clear();
      this.map.growth = "snake";
      const added = this.map.addInput(challenge.from, similars, SIMILAR_NUMBER);
      this.refresh(true, added.id);
    });
    // URL rejouable : recharger ou partager redonne le même défi
    const url = new URL(location.href);
    url.searchParams.set("from", challenge.from.name);
    url.searchParams.set("to", challenge.to.name);
    url.hash = "";
    history.replaceState(null, "", url);
    // fiches préchargées pour les infobulles du bandeau
    void this.cachedInfo(challenge.from);
    void this.cachedInfo(challenge.to);
    this.renderGame();
    this.renderShare();
    void this.showOverview(challenge.from);
    toast(t("game.start", { a: challenge.from.name, b: challenge.to.name }), { durationMs: 8000 });
    // défi partagé entre voisins directs : gagné d'office (le tirage au sort l'exclut)
    this.checkGame();
  }

  /** Après chaque expansion : l'artiste cible est-il apparu sur la carte ? */
  private checkGame(): void {
    if (!this.isGame || !this.challenge || this.gameResult) {
      return;
    }
    const target = this.map.findByName(this.challenge.to.name);
    if (!target) {
      this.renderGame();
      return;
    }
    const challenge = this.challenge;
    const moves = this.map.exploredCount;
    const result: NonNullable<App["gameResult"]> = { moves, score: null };
    this.gameResult = result;
    const start = this.map.findByName(challenge.from.name);
    const nodes = start ? this.map.shortestPath(start.id, target.id) : [];
    const path = nodes.length > 1 ? nodes.map((n) => n.name) : [challenge.from.name, target.name];
    this.renderGame();
    // d'abord la carte : chemin en évidence, cible qui pulse, confettis ; la fenêtre vient après
    this.view.highlightPath(nodes.length > 1 ? nodes.map((n) => n.id) : [target.id]);
    this.celebrating = true;
    this.launchConfetti();
    // l'estimation est presque toujours finie (il a fallu au moins un clic) ; sinon on l'attend
    void Promise.all([this.estimateOf(challenge), this.celebrate(CELEBRATION_MS)]).then(([difficulty]) => {
      if (this.gameResult === result) {
        this.finishGame(result, difficulty, path);
      }
    });
  }

  /** Oublie la victoire précédente (nouveau défi, défi recommencé, sortie du jeu). */
  private resetGameResult(): void {
    this.gameResult = null;
    this.victory = null;
    this.celebrating = false;
  }

  /**
   * Célébration sur la carte avant la fenêtre de victoire : se termine au bout de `ms`, ou dès un
   * clic, un toucher ou une touche (sans que ce geste n'agisse sur la carte ni sur la fenêtre).
   */
  private celebrate(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        window.removeEventListener("pointerdown", onPointer, true);
        window.removeEventListener("keydown", onKey, true);
        resolve();
      };
      const onPointer = (e: PointerEvent) => {
        e.stopPropagation();
        // la suite du geste (mousedown, click) tomberait dans la fenêtre qui vient de s'ouvrir :
        // elle lui ôterait le focus, voire la fermerait (clic sur le voile). On l'absorbe.
        // Sur la carte, il interromprait le recadrage sur le chemin. On l'absorbe en entier.
        const swallow = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
        };
        const types = ["pointerup", "mousedown", "mouseup", "click", "touchstart", "touchend"];
        for (const type of types) {
          window.addEventListener(type, swallow, true);
        }
        window.addEventListener(
          "pointerup",
          () =>
            setTimeout(() => {
              for (const type of types) {
                window.removeEventListener(type, swallow, true);
              }
            }, 350),
          { capture: true, once: true },
        );
        done();
      };
      const onKey = (e: KeyboardEvent) => {
        // la touche ne doit pas activer le bouton Partager qui prendra le focus (Entrée, Espace)
        e.preventDefault();
        window.addEventListener("keyup", (up) => up.preventDefault(), { capture: true, once: true });
        done();
      };
      const timer = setTimeout(done, ms);
      window.addEventListener("pointerdown", onPointer, true);
      window.addEventListener("keydown", onKey, true);
    });
  }

  private launchConfetti(): void {
    const css = getComputedStyle(document.documentElement);
    const colors = ["--node-input", "--node-exploded", "--node-similar", "--node-target", "--accent"].map((v) =>
      css.getPropertyValue(v).trim(),
    );
    this.stopConfetti();
    this.stopConfetti = launchConfetti(byId<HTMLCanvasElement>("confetti"), colors);
  }

  private estimateOf(challenge: Challenge): Promise<Difficulty> {
    this.estimate(challenge);
    return this.difficulty!.promise;
  }

  private finishGame(result: NonNullable<App["gameResult"]>, difficulty: Difficulty, path: string[]): void {
    const { moves } = result;
    const score = scoreFor(moves, difficulty);
    result.score = score;
    const previousBest = Number(prefs.get("game.best")) || 0;
    if (score > previousBest) {
      prefs.set("game.best", String(score));
    }
    this.renderGame();
    this.renderShare();
    this.showVictory({
      path,
      moves,
      score,
      difficulty,
      best: Math.max(score, previousBest),
      record: previousBest > 0 && score > previousBest,
    });
  }

  // ---------- fenêtre de victoire ----------

  private setupVictory(): void {
    const dialog = byId<HTMLDialogElement>("victory");
    byId("victory-map").addEventListener("click", () => dialog.close());
    byId("victory-new").addEventListener("click", () => {
      dialog.close();
      void this.newChallenge();
    });
    byId("victory-share").addEventListener("click", () => void this.shareVictory());
    // clic en dehors de la carte de résultat = fermer
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        dialog.close();
      }
    });
    dialog.addEventListener("close", () => {
      this.stopConfetti();
      // les confettis jouent sur la carte avant la fenêtre : leur canvas revient dans la page
      document.body.append(byId("confetti"));
      // retour à la carte : cadrée sur le chemin gagnant, toujours en évidence
      this.view.frameHighlight();
      // le résumé est gardé : le bouton « Résultat » du bandeau rouvre la fenêtre
      this.renderGame();
    });
  }

  /**
   * Ouvre la fenêtre de victoire. Les confettis, lancés sur la carte au moment de la victoire,
   * passent dans la fenêtre pour rester au-dessus de son voile. `replay` : réouverture par le
   * bouton « Résultat », sans défilement du score.
   */
  private showVictory(victory: NonNullable<App["victory"]>, replay = false): void {
    this.victory = victory;
    this.celebrating = false;
    const dialog = byId<HTMLDialogElement>("victory");
    byId("victory-feedback").hidden = true;
    this.renderVictory();
    dialog.prepend(byId("confetti"));
    if (!dialog.open) {
      dialog.showModal();
    }
    // le bouton Partager a le focus : action la plus probable, et Échap ferme
    byId("victory-share").focus();
    if (!replay) {
      this.animateScore(victory.score);
    }
  }

  /** Textes de la fenêtre (aussi au changement de langue). */
  private renderVictory(): void {
    const victory = this.victory;
    if (!victory) {
      return;
    }
    const a = victory.path[0];
    const b = victory.path[victory.path.length - 1];
    byId("victory-title").textContent = t(victory.moves <= parFor(victory.difficulty) ? "victory.perfect" : "victory.title");
    byId("victory-subtitle").textContent = t("victory.subtitle", { a, b });
    const items = victory.path.map((name, i) => {
      const li = document.createElement("li");
      if (i > 0) {
        const arrow = document.createElement("span");
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "→";
        li.append(arrow);
      }
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = name;
      li.append(chip);
      return li;
    });
    byId("victory-path").replaceChildren(...items);
    byId("victory-score").textContent = String(victory.score);
    byId("victory-clicks").textContent = String(victory.moves);
    byId("victory-difficulty").textContent = t(`difficulty.${victory.difficulty}`);
    byId("victory-par").textContent = t("victory.par", { n: parFor(victory.difficulty) });
    byId("victory-best").textContent = String(victory.best);
    byId("victory-record").hidden = !victory.record;
  }

  /** Le score défile de 0 à sa valeur (sauf si l'utilisateur limite les animations). */
  private animateScore(score: number): void {
    const el = byId("victory-score");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = String(score);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / 900);
      el.textContent = String(Math.round(score * (1 - (1 - progress) ** 3)));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  /** Partage du défi : feuille de partage du système si elle existe, sinon copie du lien. */
  private async shareVictory(): Promise<void> {
    const url = await this.shareUrl();
    const text = this.describeMap();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "furzr", text, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          return; // partage annulé par l'utilisateur
        }
      }
    }
    const feedback = byId("victory-feedback");
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      feedback.textContent = t("victory.copied");
    } catch {
      feedback.textContent = url;
    }
    feedback.hidden = false;
  }

  /** Bandeau du défi « A → B · Clics : n », à la place du champ de saisie. */
  private renderGame(): void {
    const game = this.isGame;
    document.body.classList.toggle("game", game);
    const bar = byId("game-goal");
    bar.hidden = !game;
    byId("input-box").hidden = game;
    if (!game || !this.challenge) {
      this.artistTip.hide();
      this.gameBar = null;
      if (game) {
        bar.textContent = t("game.loading");
      }
      return;
    }
    const { from, to } = this.challenge;
    // noms recréés seulement au changement de défi ou de langue : l'infobulle survolée reste en place
    const key = `${getLang()}|${from.id}|${to.id}`;
    if (this.gameBar?.key !== key) {
      this.artistTip.hide();
      const name = (className: string, artist: Artist) => {
        const el = document.createElement("b");
        el.className = className;
        el.textContent = artist.name;
        this.artistTip.attach(el, artist.name, () => this.cachedInfo(artist));
        return el;
      };
      const status = document.createElement("span");
      status.className = "status";
      bar.replaceChildren(name("from", from), " → ", name("to", to), status);
      this.gameBar = { key, status };
    }
    const score = this.gameResult?.score;
    const level = this.difficulty?.challenge === this.challenge ? this.difficulty.level : null;
    // deux morceaux insécables : sur mobile, la ligne se coupe entre les deux
    const part = (text: string) => {
      const span = document.createElement("span");
      span.textContent = text;
      return span;
    };
    this.gameBar.status.replaceChildren(
      " · ",
      part(score != null ? t("game.score", { score }) : t("game.moves", { n: this.map.exploredCount })),
      " · ",
      part(t("game.difficulty", { level: level ? t(`difficulty.${level}`) : "…" })),
    );
    // fenêtre de victoire fermée : un bouton la rouvre
    const victory = this.victory;
    if (victory && !byId<HTMLDialogElement>("victory").open) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "result-button";
      button.textContent = t("game.result");
      button.addEventListener("click", () => this.showVictory(victory, true));
      this.gameBar.status.append(" ", button);
    }
  }

  /** Fiche d'un artiste du jeu (Last.fm + photo Deezer), mise en cache par langue. */
  private cachedInfo(artist: Artist): Promise<ArtistInfo | null> {
    const key = `${getLang()}|${artist.id}`;
    let info = this.infoCache.get(key);
    if (!info) {
      info = this.lastfm.getInfo(artist).catch(() => null);
      this.infoCache.set(key, info);
    }
    return info;
  }

  // ---------- fiche artiste et son ----------

  private async showOverview(artist: Artist): Promise<void> {
    const requestId = ++this.overviewRequest;
    const provider = this.mode.provider;
    this.overviewArtist = artist;
    const overview = byId("overview");
    overview.hidden = false;
    byId("overview-name").textContent = artist.name;
    byId("overview-tags").textContent = "";
    byId("overview-bio").textContent = "";
    byId<HTMLImageElement>("overview-image").hidden = true;
    if (provider.kind === "music") {
      void this.player.load(artist.name);
    } else {
      this.player.stop();
      this.renderSound({ state: "off" });
    }
    try {
      const info = await provider.getInfo(artist);
      if (requestId !== this.overviewRequest || !info) {
        return;
      }
      this.renderOverview(info);
    } catch {
      /* la fiche reste minimale : le graphe continue de fonctionner */
    }
  }

  private renderOverview(info: ArtistInfo): void {
    byId("overview-name").textContent = t("overview.about", { name: info.name });
    byId<HTMLAnchorElement>("overview-link").href = info.url;
    byId("overview-tags").textContent = info.tags.join(" · ");
    const bio = byId("overview-bio");
    bio.innerHTML = info.bioHtml; // assaini par sanitizeBio / escapeHtml
    // lien traduit (celui de Last.fm, retiré de la bio, est toujours en anglais)
    const more = document.createElement("a");
    more.href = info.url;
    more.target = "_blank";
    more.rel = "noopener noreferrer";
    more.textContent = t("overview.readMore", { source: info.source });
    bio.append(" ", more);
    const image = byId<HTMLImageElement>("overview-image");
    if (info.image) {
      image.src = info.image;
      image.alt = info.name;
      image.hidden = false;
    } else {
      image.hidden = true;
    }
  }

  private toggleSound(): void {
    const enabled = !this.player.isEnabled;
    prefs.set("sound", enabled ? "on" : "off");
    const hadFocus = document.activeElement?.classList.contains("sound-note") ?? false;
    this.player.setEnabled(enabled);
    this.renderSound(this.soundStatus);
    if (hadFocus) {
      // le bouton est recréé : on lui rend le focus pour enchaîner au clavier
      byId("sound-title").querySelector<HTMLButtonElement>(".sound-note")?.focus();
    }
  }

  /**
   * Ligne de l'extrait : une note (animée pendant la lecture) qui coupe le son au clic, ou un
   * haut-parleur barré qui le rétablit. Rien en mode films (pas d'extraits).
   */
  private renderSound(status: PreviewStatus): void {
    this.soundStatus = status;
    const el = byId("sound-title");
    // le lecteur accompagne la fiche de l'artiste affiché ; pas d'extraits en mode films
    const music = this.mode.provider.kind === "music";
    byId("player").hidden = !music || byId("overview").hidden;
    if (!music) {
      el.textContent = "";
      return;
    }
    const on = this.player.isEnabled;
    const label = escapeHtml(t(on ? "sound.mute" : "sound.unmute"));
    const icon = on ? '<span aria-hidden="true">♪</span>' : MUTED_ICON;
    const playing = on && status.state === "playing";
    const button =
      `<button type="button" class="sound-note${playing ? " playing" : ""}${on ? "" : " muted"}"` +
      ` aria-label="${label}" title="${label}">${icon}</button> `;
    let text = "";
    if (!on) {
      text = `<i>${escapeHtml(t("sound.off"))}</i>`;
    } else if (status.state === "loading") {
      text = '<span class="spinner"></span>';
    } else if (status.state === "none" || status.state === "unavailable") {
      text = `<i>${escapeHtml(t(status.state === "none" ? "sound.none" : "sound.unavailable"))}</i>`;
    } else if (status.state === "playing") {
      const track = status.track!;
      text =
        `${escapeHtml(track.artistName)} – <a href="${escapeHtml(track.link)}" target="_blank" rel="noopener">${escapeHtml(track.title)}</a>` +
        (track.albumTitle ? ` <i>(${escapeHtml(track.albumTitle)})</i>` : "");
    }
    el.innerHTML = `${button}<span class="sound-text">${text}</span>`;
  }

  // ---------- partage ----------

  private renderShare(): void {
    byId("map-description").textContent = this.describeMap() || t(`map.empty.${this.mode.id}`);
    const empty = this.map.isEmpty;
    byId<HTMLButtonElement>("share-copy").disabled = empty;
    byId<HTMLButtonElement>("share-native").disabled = empty;
    byId<HTMLInputElement>("share-url").hidden = true;
    byId("share-feedback").hidden = true;
  }

  private describeMap(): string {
    if (this.isGame && this.challenge) {
      const names = { a: this.challenge.from.name, b: this.challenge.to.name };
      return this.gameResult?.score != null
        ? t("game.shareWon", { ...names, n: this.gameResult.moves, score: this.gameResult.score })
        : t("game.shareGoal", names);
    }
    const { artistA: a, artistB: b } = this.map;
    return a && b ? t("map.description", { a, b }) : "";
  }

  private async shareUrl(): Promise<string> {
    if (this.isGame && this.challenge) {
      // en jeu, on partage le défi (à refaire), pas la carte
      const query = new URLSearchParams({ mode: "game", from: this.challenge.from.name, to: this.challenge.to.name });
      return `${location.origin}${location.pathname}?${query}`;
    }
    const encoded = await encodeSnapshot(this.map.toSnapshot(this.mode.provider.name));
    const url = `${location.origin}${location.pathname}#map=${encoded}`;
    history.replaceState(null, "", `${location.pathname}#map=${encoded}`);
    return url;
  }

  private async copyShareLink(): Promise<void> {
    const url = await this.shareUrl();
    const field = byId<HTMLInputElement>("share-url");
    field.value = url;
    field.hidden = false;
    const feedback = byId("share-feedback");
    try {
      await navigator.clipboard.writeText(url);
      feedback.textContent = t("share.copied");
    } catch {
      field.select();
      feedback.textContent = t("share.copyManually");
    }
    feedback.hidden = false;
  }

  private async nativeShare(): Promise<void> {
    const url = await this.shareUrl();
    try {
      await navigator.share({ title: "furzr", text: this.describeMap(), url });
    } catch {
      /* partage annulé */
    }
  }

  // ---------- croissance : Snake / Tree ----------

  private growthButtons(): HTMLButtonElement[] {
    return [...document.querySelectorAll<HTMLButtonElement>("#tools [data-growth]")];
  }

  /** Effet à la prochaine expansion : repasser en snake élague alors l'arbre jusqu'au chemin parcouru. */
  private setGrowth(growth: Growth): void {
    if (growth === this.map.growth) {
      return;
    }
    this.map.growth = growth;
    this.growthChoice = growth;
    prefs.set("growth", growth);
    this.renderGrowth();
    this.renderShare();
    toast(
      t(growth === "tree" ? "growth.toTree" : "growth.toSnake"),
      { durationMs: 4000 },
    );
  }

  private renderGrowth(): void {
    for (const button of this.growthButtons()) {
      button.setAttribute("aria-pressed", String(button.dataset.growth === this.map.growth));
      // le jeu se joue en snake : sa longueur fait le score
      button.disabled = this.isGame;
    }
  }

  // ---------- langue ----------

  private setupLanguagePicker(): void {
    const select = byId<HTMLSelectElement>("lang");
    for (const [code, { name }] of Object.entries(LANGUAGES)) {
      select.append(new Option(name, code));
    }
    select.value = getLang();
    this.renderLangCode();
    select.addEventListener("change", () => {
      if (isLang(select.value)) {
        void this.changeLanguage(select.value);
      }
    });
  }

  /** Code affiché par le sélecteur compact (mobile). */
  private renderLangCode(): void {
    byId("lang-code").textContent = `${getLang().toUpperCase()} ▾`;
  }

  /**
   * Change la langue sans recharger : interface retraduite, fiche affichée redemandée dans la
   * nouvelle langue. Les noms déjà sur la carte (titres de films TMDB) gardent leur langue d'origine.
   */
  private async changeLanguage(lang: Lang): Promise<void> {
    const select = byId<HTMLSelectElement>("lang");
    if (!(await setLang(lang))) {
      select.value = getLang();
      toast(t("error.generic"), { error: true });
      return;
    }
    prefs.set("lang", lang);
    this.renderLangCode();
    translateDocument();
    // un ?lang= dans l'URL ne doit pas contredire le choix fait à la main
    const url = new URL(location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.set("lang", lang);
      history.replaceState(null, "", url);
    }
    this.input.placeholder = t(this.mode.provider.kind === "movie" ? "input.movie" : "input.artist");
    this.renderSound(this.soundStatus);
    this.renderShare();
    this.renderGame();
    this.renderVictory();
    if (!this.submit.disabled) {
      this.submit.textContent = this.submitLabel();
    }
    const overview = byId("overview");
    if (this.overviewArtist && !overview.hidden) {
      void this.refreshOverviewText(this.overviewArtist);
    }
  }

  /** Comme showOverview, sans relancer l'extrait audio en cours. */
  private async refreshOverviewText(artist: Artist): Promise<void> {
    const requestId = ++this.overviewRequest;
    try {
      const info = await this.mode.provider.getInfo(artist);
      if (requestId === this.overviewRequest && info) {
        this.renderOverview(info);
      }
    } catch {
      /* la fiche reste dans l'ancienne langue */
    }
  }

  // ---------- modes ----------

  private addMode(mode: Mode): void {
    this.modes.set(mode.id, mode);
  }

  private onModeChange(): void {
    const next = this.modes.get(this.modeSelect.value as ModeId);
    if (next) {
      this.switchMode(next);
    }
  }

  private playButtons(): HTMLButtonElement[] {
    return [...document.querySelectorAll<HTMLButtonElement>("#play-switch [data-play]")];
  }

  private renderPlay(): void {
    for (const button of this.playButtons()) {
      button.setAttribute("aria-pressed", String((button.dataset.play === "game") === this.isGame));
    }
  }

  /** Les identifiants n'ont pas le même sens d'une source à l'autre : changer de mode vide la carte. */
  private switchMode(next: Mode): void {
    if (next === this.mode) {
      return;
    }
    if (!this.map.isEmpty && !confirm(t("mode.confirmSwitch"))) {
      this.modeSelect.value = this.exploreMode.id;
      this.renderPlay();
      return;
    }
    this.setMode(next);
    this.clear();
    if (this.isGame) {
      void this.newChallenge();
    }
  }

  private setMode(mode: Mode): void {
    if (mode !== this.mode) {
      this.mode = mode;
      this.applyMode();
    }
  }

  private applyMode(): void {
    if (!this.isGame) {
      this.exploreMode = this.mode;
    }
    // en jeu, le menu des modes d'exploration disparaît (le jeu se joue sur les similaires Last.fm)
    this.modeSelect.value = this.exploreMode.id;
    this.modeSelect.hidden = this.isGame;
    this.renderPlay();
    this.input.placeholder = t(this.mode.provider.kind === "movie" ? "input.movie" : "input.artist");
    this.autocomplete.close();
    const music = this.mode.provider.kind === "music";
    if (!music) {
      this.player.stop();
    }
    this.renderSound(this.soundStatus);
    if (!this.isGame) {
      // fin du jeu : plus de cible, retour à la croissance choisie
      this.gameRequest++;
      this.challenge = null;
      this.resetGameResult();
      this.view.setTarget("");
    }
    this.map.growth = this.isGame ? "snake" : this.growthChoice;
    this.renderGrowth();
    this.renderGame();
    if (!this.submit.disabled) {
      this.submit.textContent = this.submitLabel();
    }
    // le mode est gardé dans l'URL (rechargement, lien vers une saisie)
    const url = new URL(location.href);
    if (!this.isGame) {
      url.searchParams.delete("from");
      url.searchParams.delete("to");
    }
    if (this.mode.id === "similar") {
      url.searchParams.delete("mode");
    } else {
      url.searchParams.set("mode", this.mode.id);
    }
    history.replaceState(null, "", url);
    this.renderShare();
  }

  // ---------- divers ----------

  private leaveStartScreen(): void {
    document.body.classList.remove("start");
  }

  private setBusy(busy: boolean): void {
    this.submit.disabled = busy;
    this.submit.innerHTML = busy ? '<span class="spinner"></span>' : escapeHtml(this.submitLabel());
  }

  private submitLabel(): string {
    return t(this.isGame ? "game.new" : "form.add");
  }

  private serviceError(e: unknown): void {
    console.error(e);
    const message =
      e instanceof ServiceError
        ? t("error.service")
        : t("error.generic");
    toast(message, { error: true });
  }
}

/** Langue choisie avant tout rendu : URL (?lang=fr), choix mémorisé, puis navigateur. */
async function boot(): Promise<void> {
  await setLang(detectLang(params.get("lang"), prefs.get("lang"), navigator.languages ?? [navigator.language]));
  translateDocument();
  await new App().start();
}

void boot();
// fermer les panneaux ouverts au toucher quand on revient sur la carte
byId("map").addEventListener("pointerdown", () => closeDrawers());
