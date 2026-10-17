import { anglesAt, landingAt, progress, rootTransforms } from './fold';
import type { Model } from './types';

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
