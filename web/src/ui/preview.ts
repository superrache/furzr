import type { DeezerArtist, DeezerClient } from "../api/deezer";
import type { Artist, PreviewTrack } from "../api/types";

export interface PreviewStatus {
  state: "off" | "loading" | "playing" | "none" | "unavailable";
  track?: PreviewTrack;
}

/** Volume par défaut des extraits. */
export const DEFAULT_VOLUME = 0.7;

/**
 * Lecteur d'extraits : joue à la suite les top titres Deezer de l'artiste courant.
 * Les URL d'extraits expirent : elles sont redemandées pour chaque titre suivant.
 */
export class PreviewPlayer {
  private readonly audio = new Audio();
  private enabled: boolean;
  private requestId = 0;
  private playlist: PreviewTrack[] = [];
  private cursor = 0;
  private artist: Artist | null = null;
  private loadedArtist: Artist | null = null;

  constructor(
    private readonly deezer: DeezerClient,
    /** Artiste Deezer de l'artiste affiché (DeezerMatcher) : null = pas d'extrait sûr. */
    private readonly resolve: (artist: Artist) => Promise<DeezerArtist | null>,
    enabled: boolean,
    private readonly onStatus: (status: PreviewStatus) => void,
    volume = DEFAULT_VOLUME,
  ) {
    this.enabled = enabled;
    this.setVolume(volume);
    this.audio.preload = "auto";
    this.audio.addEventListener("ended", () => this.next());
  }

  /** Volume de 0 à 1 (sans effet sur iOS, où seul le volume du système compte). */
  setVolume(volume: number): void {
    this.audio.volume = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : DEFAULT_VOLUME));
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.audio.pause();
      this.onStatus({ state: "off" });
      return;
    }
    if (this.artist && this.loadedArtist === this.artist && this.audio.src) {
      this.play();
      this.onStatus({ state: "playing", track: this.playlist[this.cursor] });
    } else if (this.artist) {
      void this.load(this.artist);
    }
  }

  /** Arrête la lecture et oublie l'artiste courant (carte vidée). */
  stop(): void {
    this.requestId++;
    this.artist = null;
    this.loadedArtist = null;
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.onStatus({ state: "off" });
  }

  /** À appeler lors d'un geste utilisateur : les navigateurs bloquent l'autoplay sinon. */
  resumeIfBlocked(): void {
    if (this.enabled && this.audio.src && this.audio.paused && !this.audio.ended) {
      this.play();
    }
  }

  async load(artist: Artist): Promise<void> {
    this.artist = artist;
    if (!this.enabled) {
      return;
    }
    const requestId = ++this.requestId;
    this.loadedArtist = artist;
    this.audio.pause();
    this.onStatus({ state: "loading" });
    try {
      const found = await this.resolve(artist);
      const tracks = found ? await this.deezer.getTopTracks(found.id, 5) : [];
      if (requestId !== this.requestId) {
        return;
      }
      if (tracks.length === 0) {
        this.audio.removeAttribute("src");
        this.onStatus({ state: "none" });
        return;
      }
      this.playlist = tracks;
      await this.playTrack(0, false, requestId);
    } catch {
      if (requestId === this.requestId) {
        this.onStatus({ state: "unavailable" });
      }
    }
  }

  private async next(): Promise<void> {
    if (this.cursor + 1 < this.playlist.length) {
      try {
        await this.playTrack(this.cursor + 1, true, this.requestId);
      } catch {
        this.onStatus({ state: "unavailable" });
      }
    }
  }

  private async playTrack(index: number, refresh: boolean, requestId: number): Promise<void> {
    const track = this.playlist[index];
    this.cursor = index;
    const url = refresh ? await this.deezer.refreshPreviewUrl(track.id) : track.previewUrl;
    if (requestId !== this.requestId || !this.enabled) {
      return;
    }
    if (!url) {
      return this.next();
    }
    this.audio.src = url;
    this.play();
    this.onStatus({ state: "playing", track });
  }

  private play(): void {
    this.audio.play().catch(() => {
      // lecture bloquée (pas encore de geste utilisateur) : reprise au prochain clic
    });
  }
}
