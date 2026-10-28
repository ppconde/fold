import { Vector3 } from 'three';
import {
  foldedPositions,
  isReverseFold,
  landingAt,
  movingFaces,
  progress,
  REVERSE_FLIP,
  reverseTurn,
  tuckBow
} from './fold';
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
  // from the flap as the last step left it: at t = 0 it is already tucked
  const { tip, landed, out } = tuckBow(
    model,
    step,
    foldedPositions(model, step - 1, 1),
    foldedPositions(model, step, 1)
  );
  const span = tip.distanceTo(landed);
  const [start, end] = [tip.clone().lerp(landed, 0.08), landed.clone().lerp(tip, 0.08)];
  const mid = start.clone().lerp(end, 0.5);
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

/**
 * Two arrows for a reverse fold, one each side of the body, pointing at each other along its normal: at the
 * flap's spine, a quarter of the way from its pivot to its tip, where you pinch it to turn it inside out.
 * Null outside a reverse fold.
 */
export function pinchArrows(model: Model, step: number): { from: Vec3; to: Vec3 }[] | null {
  if (!reverseTurn(model, step)) return null;
  const [start, end] = [foldedPositions(model, step - 1, 1), foldedPositions(model, step, 1)];
  const corners = [...movingFaces(model, step)].flatMap((f) =>
    start[f].map((p, i) => [new Vector3(...p), new Vector3(...end[f][i])])
  );
  // the pivot is the flap's corner that stays put; the tip, its corner farthest from there
  const pivot = corners.reduce((a, b) => (b[0].distanceTo(b[1]) < a[0].distanceTo(a[1]) ? b : a))[0];
  const tip = corners.reduce((a, b) => (b[0].distanceTo(pivot) > a[0].distanceTo(pivot) ? b : a))[0];
  const spine = pivot.clone().lerp(tip, 0.25);
  const length = tip.distanceTo(pivot);
  const [p, q, r] = start[model.steps[step].fixedFace].map((x) => new Vector3(...x));
  const n = q.sub(p).cross(r.sub(p)).normalize();
  // from just outside the paper on either side, as thick as it is around there
  const depths = start.flat().flatMap((x) => {
    const d = new Vector3(...x).sub(spine);
    const along = d.dot(n);
    return d.addScaledVector(n, -along).length() < 0.5 * length ? [along] : [];
  });
  // in the paper's plane, across the spine: the arrows lean in from opposite sides of it, 45 degrees off the normal
  const across = n.clone().cross(tip.clone().sub(pivot)).normalize(); // perpendicular to n and to the spine
  const lean = n.clone().add(across).multiplyScalar(Math.SQRT1_2);
  return ([Math.max(...depths), Math.min(...depths)] as const).map((d) => {
    const side = Math.sign(d) || 1;
    const to = spine.clone().addScaledVector(n, d + side * 0.04 * length);
    return {
      from: to
        .clone()
        .addScaledVector(lean, side * 0.3 * length)
        .toArray() as Vec3,
      to: to.toArray() as Vec3
    };
  });
}

/** The pinch arrows' strength at eased progress `s`: full from the first frame, gone by the time the flap is edge-on. */
export const pinchOpacity = (s: number): number =>
  Math.max(0, Math.min(1, (REVERSE_FLIP / 2 - s) / (REVERSE_FLIP / 4)));
