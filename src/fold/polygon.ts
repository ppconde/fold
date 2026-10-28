import type { Vec2 } from './types';

const cross = (a: Vec2, b: Vec2) => a[0] * b[1] - a[1] * b[0];
/** Signed area, positive when the polygon runs counter-clockwise. */
export const signedArea = (poly: Vec2[]) => poly.reduce((s, p, i) => s + cross(p, poly[(i + 1) % poly.length]), 0) / 2;

/** Area of the overlap of two convex polygons (Sutherland–Hodgman) and its centroid. */
export function overlap(a: Vec2[], b: Vec2[]): { area: number; centre: Vec2 } {
  const clip = signedArea(b) < 0 ? [...b].reverse() : b;
  let out = a;
  clip.forEach((p, i) => {
    const q = clip[(i + 1) % clip.length];
    // a hair outside the edge counts as inside: faces lying exactly on each other have collinear edges, and
    // rounding to either side of one would cut an edge parallel to it (0 / 0)
    const keep = (v: Vec2) => (q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0]) >= -1e-12;
    const next: Vec2[] = [];
    out.forEach((v, j) => {
      const w = out[(j + 1) % out.length];
      if (keep(v)) next.push(v);
      if (keep(v) !== keep(w)) {
        const [dx, dy] = [w[0] - v[0], w[1] - v[1]];
        const t =
          ((q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0])) / ((q[1] - p[1]) * dx - (q[0] - p[0]) * dy);
        next.push([v[0] + dx * t, v[1] + dy * t]);
      }
    });
    out = next;
  });
  if (out.length < 3) return { area: 0, centre: [0, 0] };
  const area = Math.abs(signedArea(out));
  return {
    area,
    centre: [out.reduce((s, v) => s + v[0], 0) / out.length, out.reduce((s, v) => s + v[1], 0) / out.length]
  };
}
