import { Box3, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { assertStep } from './assert-step';
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

type Tree = { order: number[]; parent: number[]; parentEdge: number[]; treeEdges: Set<number> };

const trees = new WeakMap<Model, Tree>();
// Models from loadModel are frozen, so cached anchors stay valid; an edit must create a new Model.
const anchors = new WeakMap<Model, Matrix4[]>();

/** One canonical spanning tree per model: BFS from face 0. */
function tree(model: Model): Tree {
  let t = trees.get(model);
  if (t) return t;
  const parent: number[] = [];
  const parentEdge: number[] = [];
  const treeEdges = new Set<number>();
  const seen = new Set([0]);
  const order = [0];
  for (let i = 0; i < order.length; i++) {
    const f = order[i];
    for (const e of model.faceEdges[f]) {
      for (const g of model.edgeFaces[e]) {
        if (seen.has(g)) continue;
        seen.add(g);
        parent[g] = f;
        parentEdge[g] = e;
        treeEdges.add(e);
        order.push(g);
      }
    }
  }
  t = { order, parent, parentEdge, treeEdges };
  trees.set(model, t);
  return t;
}

/** Transform of every face relative to face 0, for the given fold angles. */
function rootTransforms(model: Model, angles: number[]): Matrix4[] {
  const { order, parent, parentEdge } = tree(model);
  const T: Matrix4[] = [];
  for (const g of order) {
    T[g] =
      g === 0 ? new Matrix4() : T[parent[g]].clone().multiply(hinge(model, parentEdge[g], g, angles[parentEdge[g]]));
  }
  return T;
}

/** Pose of each step's fixed face at the end of the previous step, so steps join without a jump. Index k is step k. */
function anchorFor(model: Model, step: number): Matrix4 {
  let list = anchors.get(model);
  if (!list) {
    list = [new Matrix4(), new Matrix4()];
    anchors.set(model, list);
  }
  for (let k = list.length - 1; k < step; k++) {
    const T = rootTransforms(model, model.steps[k].angles.map(clampAngle));
    list[k + 1] = list[k]
      .clone()
      .multiply(T[model.steps[k].fixedFace].clone().invert())
      .multiply(T[model.steps[k + 1].fixedFace]);
  }
  return list[step];
}

/** Eased, unclamped angle of every edge at progress `t` through `step` (all zeros at step 0). */
export function anglesAt(model: Model, step: number, t: number): number[] {
  assertStep(model, step);
  if (step === 0) return model.steps[0].angles.map(() => 0);
  const prev = model.steps[step - 1].angles;
  const cur = model.steps[step].angles;
  const s = ease(Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0);
  return prev.map((a, e) => a + (cur[e] - a) * s);
}

const rotations = new WeakMap<Model, Matrix4[]>();

const toQuaternion = (r: Vec3) => new Quaternion().setFromEuler(new Euler(r[0] * DEG, r[1] * DEG, r[2] * DEG));

/** Unrotated pose of every face at the start of `step` (clamped angles, anchored). */
function startPose(model: Model, step: number): Matrix4[] {
  const T = rootTransforms(model, model.steps[step - 1].angles.map(clampAngle));
  const base = anchorFor(model, step).clone().multiply(T[model.steps[step].fixedFace].clone().invert());
  return T.map((m) => base.clone().multiply(m));
}

/** World-space bounding-box centre of `poses` after `world`. */
function centreOf(model: Model, poses: Matrix4[], world: Matrix4): Vector3 {
  const box = new Box3();
  const p = new Vector3();
  model.faces.forEach((face, f) => {
    const m = world.clone().multiply(poses[f]);
    for (const v of face) box.expandByPoint(p.set(model.vertices[v][0], model.vertices[v][1], 0).applyMatrix4(m));
  });
  return box.getCenter(new Vector3());
}

// Rotations slerp along the shortest path, so a 360° turn animates nothing and 180° picks a direction.
// Each step's turn pivots about the paper's centre at the start of that step, so a folded model turns in place.
function stepRotation(model: Model, step: number, s: number): Matrix4 {
  const before = rotationAfter(model, step - 1);
  const from = model.steps[step - 1].rotation;
  const to = model.steps[step].rotation;
  if (from[0] === to[0] && from[1] === to[1] && from[2] === to[2]) return before.clone();
  const delta = new Quaternion().slerpQuaternions(
    new Quaternion(),
    toQuaternion(to).multiply(toQuaternion(from).invert()),
    s
  );
  const c = centreOf(model, startPose(model, step), before);
  return new Matrix4()
    .makeTranslation(c)
    .multiply(new Matrix4().makeRotationFromQuaternion(delta))
    .multiply(new Matrix4().makeTranslation(c.clone().negate()))
    .multiply(before);
}

/** World rotation at the end of `step` (identity at step 0). Cached per model. */
function rotationAfter(model: Model, step: number): Matrix4 {
  let list = rotations.get(model);
  if (!list) {
    list = [new Matrix4()];
    rotations.set(model, list);
  }
  for (let k = list.length; k <= step; k++) list[k] = stepRotation(model, k, 1);
  return list[step];
}

/** Corners of every face (in `model.faces` order) at progress `t` through `step`. */
export function foldedPositions(model: Model, step: number, t: number): Vec3[][] {
  assertStep(model, step);
  if (step === 0) return model.faces.map((f) => f.map((v): Vec3 => [...model.vertices[v], 0]));

  const cur = model.steps[step];
  const angles = anglesAt(model, step, t).map(clampAngle);
  const T = rootTransforms(model, angles);
  const s = ease(Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0);
  const world = stepRotation(model, step, s)
    .multiply(anchorFor(model, step))
    .multiply(T[cur.fixedFace].clone().invert());

  const point = new Vector3();
  return model.faces.map((face, f) => {
    const m = world.clone().multiply(T[f]);
    return face.map((v) => point.set(model.vertices[v][0], model.vertices[v][1], 0).applyMatrix4(m).toArray() as Vec3);
  });
}

/** At the end of `step`, does every crease off the spanning tree agree with it? (Unclamped angles.) */
export function checkConsistency(model: Model, step: number): { ok: true } | { ok: false; edges: number[] } {
  assertStep(model, step);
  const { angles } = model.steps[step];
  const { treeEdges } = tree(model);
  const T = rootTransforms(model, angles);
  const bad: number[] = [];
  const p = new Vector3();
  const q = new Vector3();
  model.edgeFaces.forEach((faces, e) => {
    if (faces.length !== 2 || treeEdges.has(e)) return;
    const [f, g] = faces;
    const viaEdge = T[f].clone().multiply(hinge(model, e, g, angles[e]));
    const off = model.faces[g].some((v) => {
      p.set(model.vertices[v][0], model.vertices[v][1], 0);
      q.copy(p).applyMatrix4(viaEdge);
      return p.applyMatrix4(T[g]).distanceTo(q) > EPSILON;
    });
    if (off) bad.push(e);
  });
  return bad.length ? { ok: false, edges: bad } : { ok: true };
}
