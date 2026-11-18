import type { DeezerClient } from "../api/deezer";
import type { PreviewTrack } from "../api/types";

export interface PreviewStatus {
  state: "off" | "loading" | "playing" | "none" | "unavailable";
  track?: PreviewTrack;
}

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
  private artistName: string | null = null;
  private loadedArtist: string | null = null;

  constructor(
    private readonly deezer: DeezerClient,
    enabled: boolean,
    private readonly onStatus: (status: PreviewStatus) => void,
  ) {
    this.enabled = enabled;
    this.audio.preload = "auto";
    this.audio.addEventListener("ended", () => this.next());
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
    if (this.artistName && this.loadedArtist === this.artistName && this.audio.src) {
      this.play();
      this.onStatus({ state: "playing", track: this.playlist[this.cursor] });
    } else if (this.artistName) {
      void this.load(this.artistName);
    }
  }

  /** Arrête la lecture et oublie l'artiste courant (carte vidée). */
  stop(): void {
    this.requestId++;
    this.artistName = null;
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

  async load(artistName: string): Promise<void> {
    this.artistName = artistName;
    if (!this.enabled) {
      return;
    }
    const requestId = ++this.requestId;
    this.loadedArtist = artistName;
    this.audio.pause();
    this.onStatus({ state: "loading" });
    try {
      const artist = await this.deezer.findArtist(artistName);
      const tracks = artist ? await this.deezer.getTopTracks(artist.id, 5) : [];
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
