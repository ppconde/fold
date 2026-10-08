import { Euler, Matrix4, Vector3 } from 'three';
import { foldedPositions } from '../fold/fold';
import type { Model, Vec3 } from '../fold/types';

/** Seconds the homepage model takes to open back out to the flat sheet, however many steps it took to fold. */
export const UNFOLD_SECONDS = 2.4;

/** A face's orientation, from three of its corners. */
function basis([a, b, c]: Vec3[]): Matrix4 {
  const [p, q, r] = [a, b, c].map((v) => new Vector3(...v));
  const x = q.clone().sub(p).normalize();
  const z = x.clone().cross(r.clone().sub(p)).normalize();
  return new Matrix4().makeBasis(x, z.clone().cross(x), z);
}

/**
 * The model as one step from the flat sheet to its finished shape, every crease moving at once (along the
 * path solved to keep the paper joined): played backwards, the whole model opens out together. Its turn is
 * the one that leaves the finished model facing as it does at the end of the lesson.
 */
export function unfoldAll(model: Model): Model {
  const n = model.steps.length - 1;
  const last = model.steps[n];
  // its stack is the lesson's, read off where those orders were given (flat, before any flap stood out)
  const orderedAt = model.steps.find((s) => s.faceOrders === last.faceOrders)?.angles;
  const unturned: Model = {
    ...model,
    // the sheet it unfolds to was cut: every slit is open from the start, with no cut to trace
    cutAt: model.cutAt.map((k) => (k === Number.POSITIVE_INFINITY ? k : 0)),
    steps: [model.steps[0], { ...last, path: model.unfold, rotation: [0, 0, 0], orderedAt, cuts: [] }]
  };
  const turn = basis(foldedPositions(model, n, 1)[0]).multiply(basis(foldedPositions(unturned, 1, 1)[0]).invert());
  const e = new Euler().setFromRotationMatrix(turn);
  const rotation: Vec3 = [e.x, e.y, e.z].map((a) => (a * 180) / Math.PI) as Vec3;
  return { ...unturned, steps: [model.steps[0], { ...unturned.steps[1], rotation }] };
}

/**
 * Progress through `model`'s one step that has moved the paper a share `u` of its whole way, so an unfold
 * played evenly in time moves evenly on screen (the solved path packs most of its travel near the folded end).
 */
export function evenPace(model: Model): (u: number) => number {
  const N = 60;
  const at = Array.from({ length: N + 1 }, (_, i) => foldedPositions(model, 1, i / N).flat());
  const run = [0];
  for (let i = 1; i <= N; i++) {
    run.push(run[i - 1] + at[i].reduce((s, p, k) => s + Math.hypot(...p.map((x, c) => x - at[i - 1][k][c])), 0));
  }
  return (u) => {
    const goal = Math.max(0, Math.min(1, u)) * run[N];
    const i = Math.max(
      1,
      run.findIndex((r) => r >= goal)
    );
    const f = (goal - run[i - 1]) / (run[i] - run[i - 1] || 1);
    return (i - 1 + f) / N;
  };
}
