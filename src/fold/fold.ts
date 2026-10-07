import { Box3, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { assertStep } from './assert-step';
import type { Model, Vec3 } from './types';

const DEG = Math.PI / 180;
const EPSILON = 1e-6;
/** Rise per layer of a stack, as a fraction of the paper's side. */
export const LAYER_GAP = 0.002;
/** Share of a step at each end in which a travelling flap rises off, and settles back onto, the stack. */
const LIFT_SPAN = 0.15;

const ease = (t: number) => t * t * (3 - 2 * t);
const progress = (t: number) => ease(Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0);

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

const trees = new WeakMap<Model, Tree[]>();
// Models from loadModel are frozen, so cached anchors stay valid; an edit must create a new Model.
const anchors = new WeakMap<Model, Matrix4[]>();

/**
 * Spanning tree from face 0 for `step`, preferring creases this step leaves alone (0-1 Prim, FIFO).
 * Layers stacked by an earlier fold then hang off each other through that fold, so a stack joined by
 * a crease this step leaves alone turns as one rigid piece, instead of each layer pivoting on its own
 * copy of the crease and passing through its neighbour mid-fold. Stacks whose moving pieces share no
 * unmoved crease (fold in half, then fold the free corner) still pass through; that needs layer order.
 */
function tree(model: Model, step: number): Tree {
  let list = trees.get(model);
  if (!list) {
    list = [];
    trees.set(model, list);
  }
  if (list[step]) return list[step];
  const moves = (k: number, e: number) => k > 0 && model.steps[k - 1].angles[e] !== model.steps[k].angles[e];
  // a step that moves no crease (a turn, a new held face) keeps the previous tree, so it joins exactly
  let from = step;
  while (from > 0 && !list[from] && model.steps[from].angles.every((_, e) => !moves(from, e))) from--;
  if (list[from]) {
    for (let k = from + 1; k <= step; k++) list[k] = list[from];
    return list[step];
  }
  const parent: number[] = [];
  const parentEdge: number[] = [];
  const treeEdges = new Set<number>();
  const seen = new Set<number>();
  const order: number[] = [];
  const buckets: [number, number, number][][] = [[], []];
  const add = (f: number) => {
    seen.add(f);
    order.push(f);
    for (const e of model.faceEdges[f]) for (const g of model.edgeFaces[e]) buckets[+moves(from, e)].push([f, e, g]);
  };
  add(0);
  for (let next = buckets[0].shift() ?? buckets[1].shift(); next; next = buckets[0].shift() ?? buckets[1].shift()) {
    const [f, e, g] = next;
    if (seen.has(g)) continue;
    parent[g] = f;
    parentEdge[g] = e;
    treeEdges.add(e);
    add(g);
  }
  const built = { order, parent, parentEdge, treeEdges };
  for (let k = from; k <= step; k++) list[k] = built;
  return list[step];
}

/** Transform of every face relative to face 0, for the given fold angles. */
function rootTransforms(model: Model, angles: number[], step: number): Matrix4[] {
  const { order, parent, parentEdge } = tree(model, step);
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
    const T = rootTransforms(model, model.steps[k].angles, k);
    list[k + 1] = list[k]
      .clone()
      .multiply(T[model.steps[k].fixedFace].clone().invert())
      .multiply(T[model.steps[k + 1].fixedFace]);
  }
  return list[step];
}

const corrections = new WeakMap<Model, (Matrix4[] | null)[]>();

/**
 * Per face, `C_f = R_f⁻¹ · Q_f`: the start-of-step pose under the previous step's tree (Q) relative to
 * this step's tree (R), both taken relative to this step's fixed face at the previous step's angles.
 * Changing the tree across a non-collinear vertex can leave a partly folded cycle open, so the two trees
 * place faces apart. Fading C from full at s = 0 to identity at s = 1 makes each step start
 * exactly where the last one ended and still end at pure T_k. Null when the trees match (no cost).
 */
function treeChange(model: Model, step: number): Matrix4[] | null {
  let list = corrections.get(model);
  if (!list) {
    list = [];
    corrections.set(model, list);
  }
  if (list[step] !== undefined) return list[step];
  const now = tree(model, step).parentEdge;
  const before = tree(model, step - 1).parentEdge;
  let c: Matrix4[] | null = null;
  if (now.some((e, g) => e !== before[g])) {
    const angles = model.steps[step - 1].angles;
    const fixed = model.steps[step].fixedFace;
    const R = rootTransforms(model, angles, step);
    const Q = rootTransforms(model, angles, step - 1);
    const r = R[fixed].clone().invert();
    const q = Q[fixed].clone().invert();
    c = R.map((m, f) => r.clone().multiply(m).invert().multiply(q.clone().multiply(Q[f])));
  }
  list[step] = c;
  return c;
}

/** `c` faded toward identity: full at s = 0, none at s = 1 (translation lerped, rotation slerped). */
function fade(c: Matrix4, s: number): Matrix4 {
  const p = new Vector3();
  const q = new Quaternion();
  c.decompose(p, q, new Vector3());
  return new Matrix4().compose(p.multiplyScalar(1 - s), new Quaternion().slerp(q, 1 - s), new Vector3(1, 1, 1));
}

/** Eased, unclamped angle of every edge at progress `t` through `step` (all zeros at step 0). */
export function anglesAt(model: Model, step: number, t: number): number[] {
  assertStep(model, step);
  if (step === 0) return model.steps[0].angles.map(() => 0);
  const prev = model.steps[step - 1].angles;
  const cur = model.steps[step].angles;
  const s = progress(t);
  return prev.map((a, e) => a + (cur[e] - a) * s);
}

const rotations = new WeakMap<Model, Matrix4[]>();

const toQuaternion = (r: Vec3) => new Quaternion().setFromEuler(new Euler(r[0] * DEG, r[1] * DEG, r[2] * DEG));

/** Unrotated pose of every face at the start of `step` (anchored, no layer lift). */
function startPose(model: Model, step: number): Matrix4[] {
  const T = rootTransforms(model, model.steps[step - 1].angles, step);
  const base = anchorFor(model, step).clone().multiply(T[model.steps[step].fixedFace].clone().invert());
  const C = treeChange(model, step);
  return T.map((m, f) =>
    base
      .clone()
      .multiply(m)
      .multiply(C ? C[f] : new Matrix4())
  );
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

type Layers = { heights: number[]; up: number[] };
const layers = new WeakMap<Model, Layers[]>();

/**
 * The stack at the end of `step`, before the whole-model turn. `heights[f]` is face f's place in its stack
 * (0 = bottom, along +z); `up[f]` is +1 when its front faces +z, −1 when it faces −z, 0 when it stands on edge.
 * From the step's faceOrders: [f, g, s] puts f on the side of g's normal (s = 1) or against it (s = −1);
 * a face sits one above the highest face it must cover. Contradictory orders throw a RangeError.
 */
function stackAt(model: Model, step: number): Layers {
  let list = layers.get(model);
  if (!list) {
    list = [];
    layers.set(model, list);
  }
  if (list[step]) return list[step];
  // a step that inherits its faceOrders (a turn, or opening out) keeps the stack it was given
  if (step > 1 && model.steps[step].faceOrders === model.steps[step - 1].faceOrders) {
    list[step] = stackAt(model, step - 1);
    return list[step];
  }
  let up = model.faces.map(() => 1);
  const below = model.faces.map((): number[] => []);
  if (step > 0) {
    const T = rootTransforms(model, model.steps[step].angles, step);
    const base = anchorFor(model, step).clone().multiply(T[model.steps[step].fixedFace].clone().invert());
    up = T.map((m) => Math.sign(Math.round(base.clone().multiply(m).elements[10] * 1e6)));
    for (const [f, g, s] of model.steps[step].faceOrders) {
      const side = s * up[g];
      if (side > 0) below[f].push(g);
      if (side < 0) below[g].push(f);
    }
  }
  const heights: number[] = [];
  const visiting = new Set<number>();
  const visit = (f: number): number => {
    if (heights[f] !== undefined) return heights[f];
    if (visiting.has(f)) throw new RangeError(`Step ${step} faceOrders contradict each other at face ${f}.`);
    visiting.add(f);
    heights[f] = Math.max(0, ...below[f].map((g) => visit(g) + 1));
    return heights[f];
  };
  model.faces.forEach((_, f) => {
    visit(f);
  });
  list[step] = { heights, up };
  return list[step];
}

/** Each face's place in the stack at the end of `step` (0 = bottom), along +z before the whole-model turn. */
export function layerHeights(model: Model, step: number): number[] {
  assertStep(model, step);
  return stackAt(model, step).heights;
}

/** Corners of every face (in `model.faces` order) at progress `t` through `step`. */
export function foldedPositions(model: Model, step: number, t: number): Vec3[][] {
  assertStep(model, step);
  if (step === 0) return model.faces.map((f) => f.map((v): Vec3 => [...model.vertices[v], 0]));

  const cur = model.steps[step];
  const angles = anglesAt(model, step, t);
  const T = rootTransforms(model, angles, step);
  const s = progress(t);
  const turn = stepRotation(model, step, s);
  const pose = anchorFor(model, step).clone().multiply(T[cur.fixedFace].clone().invert());
  // Each face is lifted along its own normal by height × facing, blended with the fold itself: a stack that
  // turns over keeps its inner order and ends at exactly its new heights, and stacks carried by a turn or an
  // opening fold stay apart. While a flap travels, the moving faces also shift together, straight up or down,
  // to pass the paper that stays put, then settle.
  const from = stackAt(model, step - 1);
  const to = stackAt(model, step);
  const { moving, clearance } = travel(model, step);
  const rise = clearance * progress(t / LIFT_SPAN) * progress((1 - t) / LIFT_SPAN);

  const C = treeChange(model, step);
  const point = new Vector3();
  return model.faces.map((face, f) => {
    const m = pose.clone().multiply(T[f]);
    if (C) m.multiply(fade(C[f], s));
    const a = from.heights[f] * from.up[f];
    const lift = LAYER_GAP * (a + (to.heights[f] * to.up[f] - a) * s);
    const shift = moving[f] ? LAYER_GAP * rise : 0;
    return face.map((v) => {
      point.set(model.vertices[v][0], model.vertices[v][1], lift).applyMatrix4(m);
      point.z += shift;
      return point.applyMatrix4(turn).toArray() as Vec3;
    });
  });
}

const travels = new WeakMap<Model, { moving: boolean[]; clearance: number }[]>();

/**
 * Which faces move in `step`, and how many layers (+ over, − under) they must shift to pass every face that
 * stays put on their way to the side of the stack they land on. They shift together, so it never reorders them.
 */
function travel(model: Model, step: number): { moving: boolean[]; clearance: number } {
  let list = travels.get(model);
  if (!list) {
    list = [];
    travels.set(model, list);
  }
  if (list[step]) return list[step];
  const start = startPose(model, step);
  const T = rootTransforms(model, model.steps[step].angles, step);
  const base = anchorFor(model, step).clone().multiply(T[model.steps[step].fixedFace].clone().invert());
  const moving = T.map((m, f) => {
    const end = base.clone().multiply(m).elements;
    return start[f].elements.some((x, i) => Math.abs(x - end[i]) > 1e-9);
  });
  const from = stackAt(model, step - 1).heights;
  const to = stackAt(model, step).heights;
  const range = (pick: boolean) => {
    const hs = moving.flatMap((m, f) => (m === pick ? [from[f], to[f]] : []));
    return { min: Math.min(...hs), max: Math.max(...hs) };
  };
  const go = range(true);
  const stay = range(false);
  // the flap passes over the stack (+) when it swings toward +z on its way, under it (−) when it swings toward −z
  const mid = rootTransforms(model, anglesAt(model, step, 0.5), step);
  const midBase = anchorFor(model, step).clone().multiply(mid[model.steps[step].fixedFace].clone().invert());
  const point = new Vector3();
  const rise = model.faces.reduce((sum, face, f) => {
    if (!moving[f]) return sum;
    const midPose = midBase.clone().multiply(mid[f]);
    return face.reduce((acc, v) => {
      const [x, y] = model.vertices[v];
      return acc + point.set(x, y, 0).applyMatrix4(midPose).z - point.set(x, y, 0).applyMatrix4(start[f]).z;
    }, sum);
  }, 0);
  const over = rise >= 0;
  // a step that keeps the stacking (a turn, or opening a model out) has no flap to carry over the stack
  const restack = to.some((h, f) => h !== from[f]);
  const clearance =
    !restack || !moving.includes(true) || !moving.includes(false)
      ? 0
      : over
        ? Math.max(0, stay.max + 1 - go.min)
        : -Math.max(0, go.max + 1 - stay.min);
  list[step] = { moving, clearance };
  return list[step];
}

/** At the end of `step`, does every crease off the spanning tree agree with it? (Unclamped angles.) */
export function checkConsistency(model: Model, step: number): { ok: true } | { ok: false; edges: number[] } {
  assertStep(model, step);
  const { angles } = model.steps[step];
  const { treeEdges } = tree(model, step);
  const T = rootTransforms(model, angles, step);
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
