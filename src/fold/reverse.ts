import { Vector3 } from 'three';
import { foldedPositions, isReverseFold, landingAt, movingFaces, progress } from './fold';
import type { Model, Vec3 } from './types';

export { isReverseFold };

const NONE: ReadonlySet<number> = new Set();

/** Faces to draw faint at progress `t`: a reverse fold's flap while it swings through the body, until it lands. */
export function ghostFaces(model: Model, step: number, t: number): ReadonlySet<number> {
  if (!isReverseFold(model, step) || progress(t) >= landingAt(model, step)) return NONE;
  return movingFaces(model, step);
}

/**
 * A tuck arrow for a reverse fold, like a diagram's: from the flap's tip where it is to where that tip ends up
 * inside the body, bowed out around the body. `shaft` is a polyline, `head` the two strokes of an
 * open V at its end. Null outside a reverse fold.
 */
export function tuckArrow(model: Model, step: number): { shaft: Vec3[]; head: [Vec3, Vec3] } | null {
  if (!isReverseFold(model, step)) return null;
  const [from, to] = [foldedPositions(model, step, 0), foldedPositions(model, step, 1)];
  const v = (p: Vec3) => new Vector3(...p);
  // the tip: the corner of the swinging faces that travels farthest
  const [tip, landed] = [...movingFaces(model, step)]
    .flatMap((f) => from[f].map((p, i) => [v(p), v(to[f][i])]))
    .reduce((best, m) => (m[0].distanceTo(m[1]) > best[0].distanceTo(best[1]) ? m : best));
  // bowed outward, away from the middle of the model
  const all = from.flat();
  const center = all.reduce((c, p) => c.add(v(p)), new Vector3()).divideScalar(all.length);
  const span = tip.distanceTo(landed);
  const [start, end] = [tip.clone().lerp(landed, 0.08), landed.clone().lerp(tip, 0.08)];
  const mid = start.clone().lerp(end, 0.5);
  const out = mid.clone().sub(center);
  const chord = end.clone().sub(start).normalize();
  out.addScaledVector(chord, -out.dot(chord)).normalize();
  const bow = mid.clone().addScaledVector(out, 0.35 * span);
  const at = (k: number) =>
    start
      .clone()
      .multiplyScalar((1 - k) ** 2)
      .addScaledVector(bow, 2 * k * (1 - k))
      .addScaledVector(end, k * k);
  const shaft = Array.from({ length: 17 }, (_, i) => at(i / 16));
  const back = at(0.9).sub(end).normalize();
  const side = out.clone().addScaledVector(back, -out.dot(back)).normalize();
  const xs = model.vertices.map((p) => p[0]);
  const ys = model.vertices.map((p) => p[1]);
  const wing = 0.035 * Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const barb = (s: 1 | -1) =>
    end
      .clone()
      .addScaledVector(back, wing * Math.cos(0.5))
      .addScaledVector(side, s * wing * Math.sin(0.5))
      .toArray() as Vec3;
  return { shaft: shaft.map((p) => p.toArray() as Vec3), head: [barb(1), barb(-1)] };
}

/** The tuck arrow's strength at eased progress `s`: full while the flap swings, gone as it lands. */
export const arrowOpacity = (s: number, landing: number): number =>
  Math.max(0, Math.min(1, (landing - s) / (landing / 4)));
