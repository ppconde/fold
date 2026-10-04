import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { Model, Vec3 } from './types';

export const MAX_RENDER_ANGLE = 178;
const DEG = Math.PI / 180;
const EPSILON = 1e-6;

const ease = (t: number) => t * t * (3 - 2 * t);
const clampAngle = (a: number) => Math.max(-MAX_RENDER_ANGLE, Math.min(MAX_RENDER_ANGLE, a));

/** Rotation of face `g` about edge `e` by `angle` degrees, in flat-paper coordinates. */
function hinge(model: Model, e: number, g: number, angle: number): Matrix4 {
  const [a, b] = model.edges[e];
  const [ax, ay] = model.vertices[a];
  const [bx, by] = model.vertices[b];
  const axis = new Vector3(bx - ax, by - ay, 0).normalize();
  const [cx, cy] = model.faceCentroids[g];
  // Valley (+) lifts the face toward +z whichever side of the crease it is on.
  const side = axis.x * (cy - ay) - axis.y * (cx - ax) > 0 ? 1 : -1;
  const pivot = new Vector3(ax, ay, 0);
  return new Matrix4()
    .makeTranslation(pivot)
    .multiply(new Matrix4().makeRotationAxis(axis, side * angle * DEG))
    .multiply(new Matrix4().makeTranslation(pivot.clone().negate()));
}

/** Transform of every face relative to `fixed`, walking a BFS spanning tree of faces. */
function layout(model: Model, angles: number[], fixed: number) {
  const transforms: Matrix4[] = [];
  const tree = new Set<number>();
  transforms[fixed] = new Matrix4();
  const queue = [fixed];
  while (queue.length) {
    const f = queue.shift() as number;
    for (const e of model.faceEdges[f]) {
      for (const g of model.edgeFaces[e]) {
        if (transforms[g]) continue;
        transforms[g] = transforms[f].clone().multiply(hinge(model, e, g, angles[e]));
        tree.add(e);
        queue.push(g);
      }
    }
  }
  return { transforms, tree };
}

/** Pose of step `step`'s fixed face at the end of step `step - 1`, so steps join without a jump. */
// ponytail: recomputes every earlier step per call, O(steps × faces); memoize per model if long models stutter.
function anchor(model: Model, step: number): Matrix4 {
  let pose = new Matrix4();
  for (let k = 1; k < step; k++) {
    const { transforms } = layout(model, model.steps[k].angles.map(clampAngle), model.steps[k].fixedFace);
    pose = pose.clone().multiply(transforms[model.steps[k + 1].fixedFace]);
  }
  return pose;
}

function modelRotation(model: Model, from: Vec3, to: Vec3, s: number): Matrix4 {
  const q0 = new Quaternion().setFromEuler(new Euler(from[0] * DEG, from[1] * DEG, from[2] * DEG));
  const q1 = new Quaternion().setFromEuler(new Euler(to[0] * DEG, to[1] * DEG, to[2] * DEG));
  const centre = new Vector3(model.center[0], model.center[1], 0);
  return new Matrix4()
    .makeTranslation(centre)
    .multiply(new Matrix4().makeRotationFromQuaternion(q0.slerp(q1, s)))
    .multiply(new Matrix4().makeTranslation(centre.clone().negate()));
}

function assertStep(model: Model, step: number) {
  if (!Number.isInteger(step) || step < 0 || step >= model.steps.length) {
    throw new RangeError(`Step ${step} does not exist (0–${model.steps.length - 1}).`);
  }
}

/** Corners of every face (in `model.faces` order) at progress `t` through `step`. */
export function foldedPositions(model: Model, step: number, t: number): Vec3[][] {
  assertStep(model, step);
  if (step === 0) return model.faces.map((f) => f.map((v): Vec3 => [...model.vertices[v], 0]));

  const prev = model.steps[step - 1];
  const cur = model.steps[step];
  const s = ease(Math.max(0, Math.min(1, t)));
  const angles = prev.angles.map((a, e) => clampAngle(a + (cur.angles[e] - a) * s));
  const { transforms } = layout(model, angles, cur.fixedFace);
  const world = modelRotation(model, prev.rotation, cur.rotation, s).multiply(anchor(model, step));

  const point = new Vector3();
  return model.faces.map((face, f) => {
    const m = world.clone().multiply(transforms[f]);
    return face.map((v) => point.set(model.vertices[v][0], model.vertices[v][1], 0).applyMatrix4(m).toArray() as Vec3);
  });
}

/** At the end of `step`, does every crease off the spanning tree agree with it? (Unclamped angles.) */
export function checkConsistency(model: Model, step: number): { ok: true } | { ok: false; edges: number[] } {
  assertStep(model, step);
  const { angles, fixedFace } = model.steps[step];
  const { transforms, tree } = layout(model, angles, fixedFace);
  const bad: number[] = [];
  model.edgeFaces.forEach((faces, e) => {
    if (faces.length !== 2 || tree.has(e)) return;
    const [f, g] = faces;
    const [cx, cy] = model.faceCentroids[g];
    const viaTree = new Vector3(cx, cy, 0).applyMatrix4(transforms[g]);
    const viaEdge = new Vector3(cx, cy, 0).applyMatrix4(transforms[f].clone().multiply(hinge(model, e, g, angles[e])));
    if (viaTree.distanceTo(viaEdge) > EPSILON) bad.push(e);
  });
  return bad.length ? { ok: false, edges: bad } : { ok: true };
}
