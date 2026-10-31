import { Vector3 } from 'three';
import { foldedPositions, landingAt, movingFaces, type ReverseFan, reverseFan, spineEdges, tuckBow } from './fold';
import type { Model, Vec3 } from './types';

/** Everything the player draws for a reverse fold, all of it found or none. */
export type ReverseFold = {
  fan: ReverseFan;
  /** The flap's folded edges that turn inside out. */
  spine: number[];
  /** Progress at which the paper lands, before its layers change places (`landingAt`). */
  landing: number;
  tuck: NonNullable<ReturnType<typeof tuckArrow>>;
  pushes: NonNullable<ReturnType<typeof pushArrows>>;
};
const found = new WeakMap<Model, (ReverseFold | null)[]>();

/**
 * Step `step` as a reverse fold, or null: outside one, and on one the engine can't fan (a step from someone's file
 * that only looks like one), which the player then shows as a plain step, its sentence in words.
 */
export function reverseFold(model: Model, step: number): ReverseFold | null {
  const list = found.get(model) ?? [];
  found.set(model, list);
  if (list[step] !== undefined) return list[step];
  const fan = reverseFan(model, step);
  const tuck = fan && tuckArrow(model, step);
  const pushes = fan && pushArrows(model, step);
  list[step] =
    fan && tuck && pushes
      ? { fan, spine: spineEdges(model, step), landing: landingAt(model, step), tuck, pushes }
      : null;
  return list[step];
}

/**
 * A tuck arrow for a reverse fold, like a diagram's: from the flap's tip where it is to where that tip ends up
 * inside the body, bowed a little out from the body. `shaft` is a polyline, `head` the two back corners of the filled
 * head at its end. Null outside a reverse fold.
 */
export function tuckArrow(model: Model, step: number): { shaft: Vec3[]; head: [Vec3, Vec3] } | null {
  if (model.steps[step]?.kind !== 'reverse') return null;
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
  const bow = mid.clone().addScaledVector(out, 0.15 * span);
  const at = (k: number) =>
    start
      .clone()
      .multiplyScalar((1 - k) ** 2)
      .addScaledVector(bow, 2 * k * (1 - k))
      .addScaledVector(end, k * k);
  const shaft = Array.from({ length: 17 }, (_, i) => at(i / 16));
  const back = at(0.9).sub(end).normalize();
  const side = out.clone().addScaledVector(back, -out.dot(back)).normalize();
  const wing = 0.035 * sheetSize(model);
  const barb = (s: 1 | -1) =>
    end
      .clone()
      .addScaledVector(back, wing * Math.cos(0.5))
      .addScaledVector(side, s * wing * Math.sin(0.5))
      .toArray() as Vec3;
  return { shaft: shaft.map((p) => p.toArray() as Vec3), head: [barb(1), barb(-1)] };
}

/** The tuck arrow's strength at eased progress `s`: full until three quarters through, gone as the step ends. */
export const arrowOpacity = (s: number): number => Math.max(0, Math.min(1, (1 - s) * 4));

/**
 * Push marks for a reverse fold, as a diagram's: a broad hollow arrow each side of the body, flat in the paper's plane
 * and pointing in at the flap's folded edge (its spine) from outside the flap, just past where the fold line meets it.
 * Each is a closed `outline`, and `facing` the way it faces, out from the paper: show the one facing you. Null outside
 * a reverse fold.
 */
export function pushArrows(model: Model, step: number): { outline: Vec3[]; facing: Vec3 }[] | null {
  if (model.steps[step]?.kind !== 'reverse') return null;
  const [start, end] = [foldedPositions(model, step - 1, 1), foldedPositions(model, step, 1)];
  const corners = [...movingFaces(model, step)].flatMap((f) =>
    start[f].map((p, i) => [new Vector3(...p), new Vector3(...end[f][i])])
  );
  // the pivot is the flap's corner that stays put, where the fold line meets the spine; the tip, its corner farthest
  // from there
  const pivot = corners.reduce((a, b) => (b[0].distanceTo(b[1]) < a[0].distanceTo(a[1]) ? b : a))[0];
  const tip = corners.reduce((a, b) => (b[0].distanceTo(pivot) > a[0].distanceTo(pivot) ? b : a))[0];
  const spine = pivot.clone().lerp(tip, 0.1);
  const length = tip.distanceTo(pivot);
  const [p, q, r] = start[model.steps[step].fixedFace].map((x) => new Vector3(...x));
  const n = q.sub(p).cross(r.sub(p)).normalize();
  // the flap's layers sit a hair off the plane: the spine's in-plane direction
  const along = tip.clone().sub(pivot);
  along.addScaledVector(n, -along.dot(n)).normalize();
  // from just outside the paper on either side, as thick as it is around there
  const depths = start.flat().flatMap((x) => {
    const d = new Vector3(...x).sub(spine);
    const off = d.dot(n);
    return d.addScaledVector(n, -off).length() < 0.5 * length ? [off] : [];
  });
  // in the paper's plane, across the spine, away from the flap's middle
  const out = n.clone().cross(along);
  const middle = corners.reduce((sum, [c]) => sum.add(c), new Vector3()).divideScalar(corners.length);
  if (middle.sub(spine).dot(out) > 0) out.negate();
  // sized by the sheet, as the tuck arrow's head is, so a short flap's mark still reads
  const [reach, half] = [0.1 * sheetSize(model), 0.017 * sheetSize(model)];
  return pushSides(depths).map(([d, side]) => {
    const at = spine.clone().addScaledVector(n, d + side * 0.04 * length);
    const point = (u: number, v: number) =>
      at
        .clone()
        .addScaledVector(out, u * reach)
        .addScaledVector(along, v * half)
        .toArray() as Vec3;
    const outline = [
      [0, 0],
      [0.45, 1.6],
      [0.45, 0.7],
      [1, 0.7],
      [1, -0.7],
      [0.45, -0.7],
      [0.45, -1.6],
      [0, 0]
    ].map(([u, v]) => point(u, v));
    return { outline, facing: n.clone().multiplyScalar(side).toArray() as Vec3 };
  });
}

/** Along the normal, where each push mark lies (just past the paper's front-most and back-most layer around the
 * spine) and which side it is on. */
export const pushSides = (depths: number[]): [number, 1 | -1][] => [
  [Math.max(0, ...depths), 1],
  [Math.min(0, ...depths), -1]
];

/** The push marks' strength at eased progress `s`: full from the first frame, gone by the first sixth of the step,
 * before the flap has narrowed much. */
export const pushOpacity = (s: number): number => Math.max(0, Math.min(1, (1 / 6 - s) * 12));

/** The flat sheet's longer side. */
function sheetSize(model: Model): number {
  const xs = model.vertices.map((p) => p[0]);
  const ys = model.vertices.map((p) => p[1]);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}
