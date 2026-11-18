import ForceGraph from "force-graph";
import { forceCollide } from "d3-force-3d";
import { nodeKind, type MapLink, type MapNode, type NodeKind } from "./model";

export interface MapViewTheme {
  background: string;
  link: string;
  halo: string;
  ring: string;
  ringHover: string;
  font: string;
  colors: Record<NodeKind, string>;
}

/** Lit le thème dans les variables CSS (cf. style.css). */
export function themeFromCss(el: HTMLElement = document.documentElement): MapViewTheme {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    background: v("--map-bg"),
    link: v("--map-link"),
    halo: v("--map-halo"),
    ring: v("--map-ring"),
    ringHover: v("--map-ring-hover"),
    font: v("--map-font"),
    colors: { input: v("--node-input"), exploded: v("--node-exploded"), similar: v("--node-similar") },
  };
}

/** Rayon du cercle et de la zone cliquable autour d'un nom, en pixels écran. */
const NODE_RADIUS = 20;
/** Taille des noms en pixels écran : constante quel que soit le zoom, comme l'original. */
const FONT_SIZE = 12;
/**
 * En dessous de ce zoom, les noms rétrécissent avec la carte (petits écrans) :
 * les collisions sont calculées pour ce zoom, ce qui garantit l'absence de chevauchement.
 */
const MIN_LABEL_SCALE = 0.7;

/** Facteur graphe → écran appliqué aux noms et aux cercles. */
const labelScale = (scale: number) => Math.max(scale, MIN_LABEL_SCALE);

/** Le recadrage automatique ne zoome pas au-delà (sinon une petite carte remplit l'écran). */
const MAX_AUTO_ZOOM = 1.4;

const measureCtx = document.createElement("canvas").getContext("2d");
const widthCache = new Map<string, number>();

/** Largeur d'un nom en pixels à FONT_SIZE (sert au calcul des collisions). */
function labelWidth(name: string, font: string): number {
  let width = widthCache.get(name);
  if (width === undefined) {
    if (measureCtx) {
      measureCtx.font = `bold ${FONT_SIZE}px ${font}`;
      width = measureCtx.measureText(name).width;
    } else {
      width = name.length * FONT_SIZE * 0.6;
    }
    widthCache.set(name, width);
  }
  return width;
}

/**
 * Rendu de la carte avec force-graph : canvas net sur écrans HiDPI,
 * zoom/déplacement, glisser-déposer des nœuds, recadrage automatique.
 */
export class MapView {
  private graph: ForceGraph<MapNode, MapLink>;
  private hovered: MapNode | null = null;
  private fitPending = false;
  /** Nœuds à cadrer (derniers similaires) ; vide = toute la carte. */
  private focusIds: ReadonlySet<string> = new Set();
  private resizeObserver: ResizeObserver;

  constructor(
    private readonly container: HTMLElement,
    private readonly theme: MapViewTheme,
    onNodeClick: (node: MapNode) => void,
  ) {
    this.graph = new ForceGraph<MapNode, MapLink>(container)
      .backgroundColor(theme.background)
      .nodeId("id")
      .nodeLabel(() => "")
      .linkColor(() => theme.link)
      .linkWidth(1)
      .minZoom(0.2)
      .maxZoom(6)
      .cooldownTime(6000)
      .nodeCanvasObject((node, ctx, scale) => this.drawNode(node, ctx, scale))
      .nodePointerAreaPaint((node, color, ctx, scale) => {
        // zone cliquable : le nom entier, ou le cercle s'il est plus grand
        const halfW = Math.max(NODE_RADIUS, labelWidth(node.name, theme.font) / 2) / labelScale(scale);
        const halfH = NODE_RADIUS / labelScale(scale);
        ctx.fillStyle = color;
        ctx.fillRect((node.x ?? 0) - halfW, (node.y ?? 0) - halfH, halfW * 2, halfH * 2);
      })
      .onNodeHover((node) => {
        this.hovered = node;
        container.style.cursor = node ? "pointer" : "";
      })
      .onNodeClick((node) => onNodeClick(node))
      .onEngineStop(() => this.fitIfPending(600));

    // répulsion et distance proches du rendu arbor d'origine ;
    // collision dimensionnée sur la largeur de chaque nom pour éviter les chevauchements
    this.graph.d3Force("charge")?.strength(-240);
    this.graph.d3Force("link")?.distance(80);
    const collide = forceCollide(
      (node) => (Math.max(NODE_RADIUS, labelWidth((node as MapNode).name, theme.font) / 2) + 4) / MIN_LABEL_SCALE,
    )
      .strength(0.9)
      .iterations(2);
    this.graph.d3Force("collide", collide as unknown as Parameters<typeof this.graph.d3Force>[1]);

    // une interaction de l'utilisateur (zoom, déplacement) annule le recadrage automatique en attente
    for (const type of ["wheel", "pointerdown", "touchstart"]) {
      container.addEventListener(type, () => (this.fitPending = false), { passive: true });
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  /**
   * Met à jour les données ; `fit` recadre la vue une fois la simulation stabilisée,
   * sur `focus` s'il est donné (sinon sur toute la carte).
   */
  update(data: { nodes: MapNode[]; links: MapLink[] }, fit = true, focus: ReadonlySet<string> = new Set()): void {
    this.fitPending = fit && data.nodes.length > 0;
    this.focusIds = focus;
    this.graph.graphData(data);
    if (this.fitPending) {
      // recadrages intermédiaires pendant que les nouveaux nœuds s'écartent, puis final à l'arrêt
      for (const delay of [700, 2000]) {
        setTimeout(() => {
          if (this.fitPending) {
            this.zoomToFit(500);
          }
        }, delay);
      }
    }
  }

  fit(durationMs = 600): void {
    this.focusIds = new Set();
    this.zoomToFit(durationMs);
  }

  /**
   * zoomToFit plafonné à MAX_AUTO_ZOOM. Avec un focus, seuls ces nœuds sont cadrés : le reste du
   * snake peut sortir de l'écran, mais les noms restent lisibles (zoom plancher à MIN_LABEL_SCALE).
   */
  private zoomToFit(durationMs: number): void {
    const focus = this.focusIds;
    if (focus.size > 0) {
      this.graph.zoomToFit(durationMs, 60, (node) => focus.has((node as MapNode).id));
    } else {
      this.graph.zoomToFit(durationMs, 80);
    }
    setTimeout(() => {
      if (this.graph.zoom() > MAX_AUTO_ZOOM) {
        this.graph.zoom(MAX_AUTO_ZOOM, 300);
      }
    }, durationMs + 20);
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.graph._destructor();
  }

  private fitIfPending(durationMs: number): void {
    if (this.fitPending) {
      this.fitPending = false;
      this.zoomToFit(durationMs);
    }
  }

  private resize(): void {
    this.graph.width(this.container.clientWidth).height(this.container.clientHeight);
  }

  private drawNode(node: MapNode, ctx: CanvasRenderingContext2D, scale: number): void {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const isHovered = node === this.hovered;

    // tailles divisées par le zoom : constantes à l'écran (sauf fort dézoom, cf. MIN_LABEL_SCALE)
    const k = labelScale(scale);
    ctx.beginPath();
    ctx.arc(x, y, NODE_RADIUS / k, 0, 2 * Math.PI);
    ctx.lineWidth = (isHovered ? 1.5 : 1) / scale;
    ctx.strokeStyle = isHovered ? this.theme.ringHover : this.theme.ring;
    ctx.stroke();

    const fontSize = FONT_SIZE / k;
    ctx.font = `bold ${fontSize}px ${this.theme.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = fontSize / 4;
    ctx.strokeStyle = this.theme.halo;
    ctx.strokeText(node.name, x, y);
    ctx.fillStyle = this.theme.colors[nodeKind(node)];
    ctx.fillText(node.name, x, y);
  }
}
