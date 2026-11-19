// d3-force-3d (utilisé par force-graph) ne publie pas de types : déclaration minimale.
declare module "d3-force-3d" {
  interface CollideForce {
    (alpha: number): void;
    radius(r: number | ((node: unknown) => number)): CollideForce;
    strength(s: number): CollideForce;
    iterations(n: number): CollideForce;
  }
  export function forceCollide(radius?: number | ((node: unknown) => number)): CollideForce;
}
