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

/** The flap's spine: of the creases a reverse fold flips, the longest (the paper the hands push in). */
function spine(model: Model, step: number): number {
  const before = model.steps[step - 1].angles;
  const len = (e: number) => {
    const [a, b] = model.edges[e].map((v) => model.vertices[v]);
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  };
  return model.steps[step].angles
    .map((a, e) => (Math.abs(before[e]) === 180 && a === -before[e] ? e : -1))
    .filter((e) => e >= 0)
    .reduce((best, e) => (len(e) > len(best) ? e : best));
}

/**
 * A push arrow for a reverse fold, in the step's starting pose: an ink stroke just outside the flap's spine,
 * pointing at it, toward the layers it goes in between. `shaft` is a polyline with a slight hand-drawn bend,
 * `head` the two strokes of an open V at its end. Null outside a reverse fold.
 */
export function pushArrow(model: Model, step: number): { shaft: Vec3[]; head: [Vec3, Vec3] } | null {
  if (!isReverseFold(model, step)) return null;
  const faces = foldedPositions(model, step, 0);
  const e = spine(model, step);
  const corner = (f: number, v: number) => new Vector3(...faces[f][model.faces[f].indexOf(v)]);
  const sides = model.edgeFaces[e];
  const [a, b] = model.edges[e].map((v) => corner(sides[0], v));
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const along = b.clone().sub(a).normalize();
  const inner = sides
    .reduce(
      (acc, f) =>
        acc.add(faces[f].reduce((c, p) => c.add(new Vector3(...p)), new Vector3()).divideScalar(faces[f].length)),
      new Vector3()
    )
    .divideScalar(sides.length);
  const into = inner.sub(mid);
  into.addScaledVector(along, -into.dot(along)).normalize();
  const xs = model.vertices.map((v) => v[0]);
  const ys = model.vertices.map((v) => v[1]);
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const [length, gap, wing] = [0.1 * size, 0.015 * size, 0.035 * size];
  const head = mid.clone().addScaledVector(into, -gap);
  const tail = head.clone().addScaledVector(into, -length);
  const bend = tail
    .clone()
    .lerp(head, 0.5)
    .addScaledVector(along, 0.04 * length);
  const barb = (side: 1 | -1) =>
    head
      .clone()
      .addScaledVector(into, -wing * Math.cos(0.6))
      .addScaledVector(along, side * wing * Math.sin(0.6))
      .toArray() as Vec3;
  return { shaft: [tail, bend, head].map((p) => p.toArray() as Vec3), head: [barb(1), barb(-1)] };
}

/**
 * The push arrow's strength at eased progress `s`: it belongs to the starting pose, so it is full as the step
 * starts and gone a fifth of the way to the landing, before the flap has swung far from where it is pushed.
 */
export const pushOpacity = (s: number, landing: number): number =>
  Math.max(0, Math.min(1, (landing / 5 - s) / (landing / 8)));
