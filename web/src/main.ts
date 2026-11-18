import "./style.css";
import { DeezerClient } from "./api/deezer";
import { LastFmProvider } from "./api/lastfm";
import { TmdbProvider } from "./api/tmdb";
import { WikidataProvider } from "./api/wikidata";
import { ServiceError, type Artist, type ArtistInfo, type SimilarityProvider, type Suggestion } from "./api/types";
import { ArtistMap, type Growth, type MapNode } from "./graph/model";
import { decodeSnapshot, encodeSnapshot } from "./graph/share";
import { MapView, themeFromCss } from "./graph/view";
import { Autocomplete } from "./ui/autocomplete";
import { byId, closeDrawers, prefs, setupDrawers, toast } from "./ui/dom";
import { escapeHtml } from "./ui/html";
import { PreviewPlayer, type PreviewStatus } from "./ui/preview";
import { LANGUAGES, detectLang, getLang, isLang, setLang, t, translateDocument, type Lang } from "./i18n";

const params = new URLSearchParams(location.search);


/** Nombre de similaires ajoutés à chaque expansion (paramètre d'URL similar_number). */
const SIMILAR_NUMBER = clamp(Number(params.get("similar_number")) || 16, 1, 50);

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY as string | undefined;
/** Facultative : sans elle, le mode films n'est pas proposé. */
const TMDB_KEY = (import.meta.env.VITE_TMDB_API_KEY as string | undefined)?.trim() || undefined;

type ModeId = "similar" | "influences" | "movies";

/** Un mode = une source de similarité ; ses textes sont les clés `*.${id}` des catalogues. */
interface Mode {
  id: ModeId;
  provider: SimilarityProvider;
}

class App {
  private readonly deezer = new DeezerClient();
  private readonly modes = new Map<ModeId, Mode>();
  private mode: Mode;
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
    this.addMode({ id: "similar", provider: lastfm });
    this.addMode({ id: "influences", provider: new WikidataProvider(lastfm, undefined, getLang) });
    if (TMDB_KEY) {
      this.addMode({ id: "movies", provider: new TmdbProvider(TMDB_KEY, undefined, getLang) });
    }
    this.mode = this.modes.get(params.get("mode") as ModeId) ?? this.modes.get("similar")!;
    this.view = new MapView(byId("map"), themeFromCss(), (node) => void this.explore(node));

    const soundParam = params.get("sound");
    const soundOn = soundParam ? soundParam !== "off" : prefs.get("sound") !== "off";
    this.player = new PreviewPlayer(this.deezer, soundOn, (status) => this.renderSound(status));
    this.renderSoundToggle();

    setupDrawers();
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
    this.setupLanguagePicker();
    this.applyMode();
    byId("artist-form").addEventListener("submit", (e) => {
      e.preventDefault();
      void this.addArtist(this.input.value);
    });
    byId("sound-toggle").addEventListener("click", () => this.toggleSound());
    byId("clear").addEventListener("click", () => this.clear());
    const growthParam = params.get("growth") ?? prefs.get("growth");
    this.map.growth = growthParam === "tree" ? "tree" : "snake";
    for (const button of this.growthButtons()) {
      button.addEventListener("click", () => this.setGrowth(button.dataset.growth as Growth));
    }
    this.renderGrowth();
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
    const artist: Artist = { id: node.id, name: node.name, mbid: node.mbid };
    this.map.markExplored(node.id);
    this.renderShare();
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
    this.player.setEnabled(enabled);
    this.renderSoundToggle();
  }

  private renderSoundToggle(): void {
    const button = byId("sound-toggle");
    const on = this.player.isEnabled;
    button.setAttribute("aria-pressed", String(on));
    const img = button.querySelector("img")!;
    img.src = on ? "volume_on.png" : "volume_off.png";
    img.alt = t(on ? "sound.on" : "sound.off");
  }

  private renderSound(status: PreviewStatus): void {
    this.soundStatus = status;
    const el = byId("sound-title");
    switch (status.state) {
      case "off":
        el.textContent = "";
        break;
      case "loading":
        el.innerHTML = '<span class="spinner"></span>';
        break;
      case "none":
        el.innerHTML = `<i>${escapeHtml(t("sound.none"))}</i>`;
        break;
      case "unavailable":
        el.innerHTML = `<i>${escapeHtml(t("sound.unavailable"))}</i>`;
        break;
      case "playing": {
        const t = status.track!;
        el.innerHTML =
          `♪ ${escapeHtml(t.artistName)} – <a href="${escapeHtml(t.link)}" target="_blank" rel="noopener">${escapeHtml(t.title)}</a>` +
          (t.albumTitle ? ` <i>(${escapeHtml(t.albumTitle)})</i>` : "");
        break;
      }
    }
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
    const { artistA: a, artistB: b } = this.map;
    return a && b ? t("map.description", { a, b }) : "";
  }

  private async shareUrl(): Promise<string> {
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
    this.renderSoundToggle();
    this.renderSound(this.soundStatus);
    this.renderShare();
    if (!this.submit.disabled) {
      this.submit.textContent = t("form.add");
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

  /** Les identifiants n'ont pas le même sens d'une source à l'autre : changer de mode vide la carte. */
  private onModeChange(): void {
    const next = this.modes.get(this.modeSelect.value as ModeId);
    if (!next || next === this.mode) {
      return;
    }
    if (!this.map.isEmpty && !confirm(t("mode.confirmSwitch"))) {
      this.modeSelect.value = this.mode.id;
      return;
    }
    this.setMode(next);
    this.clear();
  }

  private setMode(mode: Mode): void {
    if (mode !== this.mode) {
      this.mode = mode;
      this.applyMode();
    }
  }

  private applyMode(): void {
    this.modeSelect.value = this.mode.id;
    this.input.placeholder = t(this.mode.provider.kind === "movie" ? "input.movie" : "input.artist");
    this.autocomplete.close();
    const music = this.mode.provider.kind === "music";
    byId("sound-toggle").hidden = !music;
    if (!music) {
      this.player.stop();
    }
    // le mode est gardé dans l'URL (rechargement, lien vers une saisie)
    const url = new URL(location.href);
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
    this.submit.innerHTML = busy ? '<span class="spinner"></span>' : escapeHtml(t("form.add"));
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
