import type { Artist } from "../api/types";
import { ArtistMap, type MapNode } from "../graph/model";
import { MapView, type MapViewTheme } from "../graph/view";

/** Similaires affichés à chaque étape : moins que sur la carte, le cadre est petit. */
const SIMILARS_PER_STEP = 6;
/** Expansions avant de recommencer avec un autre artiste. */
const STEPS = 3;
const STEP_MS = 5000;
const PAUSE_MS = 3500;

/**
 * Graphe de l'accueil, entre le titre et le formulaire : même rendu que la carte (MapView, force-graph),
 * qui se déploie tout seul en snake à partir d'un artiste populaire, avec ses vrais similaires Last.fm.
 * Décoratif : pas d'interaction (pointer-events: none en CSS). Sans données, il reste vide.
 */
export class HomeGraph {
  private readonly view: MapView;
  private stopped = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(
    container: HTMLElement,
    theme: MapViewTheme,
    private readonly pool: () => Promise<Artist[]>,
    private readonly similars: (artist: Artist) => Promise<Artist[]>,
  ) {
    // fond transparent : le graphe est posé sur le voile de l'accueil
    this.view = new MapView(container, { ...theme, background: "rgba(0, 0, 0, 0)" }, () => undefined, 16);
    void this.run();
  }

  stop(): void {
    if (this.stopped) {
      return;
    }
    this.stopped = true;
    clearTimeout(this.timer);
    this.view.destroy();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.timer = setTimeout(resolve, ms);
    });
  }

  /** Une partie de démonstration, puis une autre avec un autre artiste, jusqu'à stop(). */
  private async run(): Promise<void> {
    try {
      const pool = await this.pool();
      let previous: Artist | null = null;
      while (!this.stopped && pool.length > 0) {
        const candidates = pool.length > 1 ? pool.filter((a) => a !== previous) : pool;
        const start = pick(candidates);
        previous = start;
        await this.play(start);
        if (this.reducedMotion) {
          return; // une seule étape, figée
        }
        await this.wait(PAUSE_MS);
      }
    } catch {
      /* pas de classement ni de similaires (hors ligne, service indisponible) : graphe vide */
    }
  }

  private async play(start: Artist): Promise<void> {
    const map = new ArtistMap();
    map.growth = "snake";
    const first = await this.similars(start);
    if (this.stopped || first.length === 0) {
      return;
    }
    let head = map.addInput(start, first, SIMILARS_PER_STEP);
    this.view.update(map.graphData(), true);
    for (let step = 0; step < STEPS && !this.reducedMotion; step++) {
      await this.wait(STEP_MS);
      // onglet en arrière-plan : pas de requêtes pour rien
      while (!this.stopped && document.hidden) {
        await this.wait(1000);
      }
      if (this.stopped) {
        return;
      }
      const children = [...map.focusSet(head.id)]
        .map((id) => map.graphData().nodes.find((n) => n.id === id))
        .filter((n): n is MapNode => !!n && n.id !== head.id && !n.isExploded);
      if (children.length === 0) {
        return;
      }
      const next = pick(children);
      const list = await this.similars({ id: next.id, name: next.name, mbid: next.mbid });
      if (this.stopped || list.length === 0) {
        return;
      }
      map.markExplored(next.id);
      map.expand(next.id, list, SIMILARS_PER_STEP);
      head = next;
      this.view.update(map.graphData(), true);
    }
  }
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
