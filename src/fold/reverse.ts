import { Vector3 } from 'three';
import { anglesAt, foldedPositions, landingAt, progress, rootTransforms } from './fold';
import type { Model, Vec3 } from './types';

/**
 * A reverse fold turns a flap's spine inside out: a crease already folded flat flips sign (+180 to −180 or
 * back), while new creases appear along one line, valley on some layers and mountain on others.
 */
export function isReverseFold(model: Model, step: number): boolean {
  if (step === 0) return false;
  const before = model.steps[step - 1].angles;
  const after = model.steps[step].angles;
  const flips = after.some((a, e) => Math.abs(before[e]) === 180 && a === -before[e]);
  const made = after.filter((a, e) => before[e] === 0 && a !== 0);
  return flips && made.some((a) => a > 0) && made.some((a) => a < 0);
}

const moving = new WeakMap<Model, (ReadonlySet<number> | undefined)[]>();
const NONE: ReadonlySet<number> = new Set();

/** Faces that turn relative to the step's fixed face before a reverse fold lands (its spine's relabel doesn't move them). */
function movingFaces(model: Model, step: number): ReadonlySet<number> {
  const list = moving.get(model) ?? [];
  moving.set(model, list);
  const cached = list[step];
  if (cached) return cached;
  const fixed = model.steps[step].fixedFace;
  const relative = (t: number) => {
    const T = rootTransforms(model, anglesAt(model, step, t), step);
    const inv = T[fixed].clone().invert();
    return T.map((m) => inv.clone().multiply(m).elements);
  };
  // partway through the swing, before the layers change places
  const [a, b] = [relative(0), relative(landingAt(model, step) / 2)];
  const found = new Set(model.faces.map((_, f) => f).filter((f) => a[f].some((x, i) => Math.abs(x - b[f][i]) > 1e-6)));
  list[step] = found;
  return found;
}

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
