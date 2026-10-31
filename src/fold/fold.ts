import { Box3, Euler, MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { assertStep } from './assert-step';
import type { Model, Vec3 } from './types';

const DEG = MathUtils.DEG2RAD;
const EPSILON = 1e-6;
/** Rise per layer of a stack, as a fraction of the paper's side. */
export const LAYER_GAP = 0.001;
/** Degrees a reverse fold's body opens at its peak, mid-step: each side turns half of it about the far edge. */
export const REVERSE_OPEN_DEG = 28;
/** Share of a step at each end in which a travelling flap rises off, and settles back onto, the stack. */
const LIFT_SPAN = 0.15;

const ease = (t: number) => t * t * (3 - 2 * t);
export const progress = (t: number) => ease(Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0);

/** Rotation of face `g` about edge `e` by `angle` degrees, in flat-paper coordinates. */
function hinge(model: Model, e: number, g: number, angle: number): Matrix4 {
  const [a, b] = model.edges[e];
  const [ax, ay] = model.vertices[a];
  const [bx, by] = model.vertices[b];
  const axis = new Vector3(bx - ax, by - ay, 0).normalize();
  const [cx, cy] = model.faceCentroids[g];
  // Valley (+) lifts the face toward +z whichever side of the crease it is on.
  const side = axis.x * (cy - ay) - axis.y * (cx - ax) > 0 ? 1 : -1;
  return turnAbout(new Vector3(ax, ay, 0), axis, side * angle * DEG);
}

/** Rotation by `angle` radians about the line through `pivot` along the unit `axis`. */
const turnAbout = (pivot: Vector3, axis: Vector3, angle: number) =>
  new Matrix4()
    .makeTranslation(pivot)
    .multiply(new Matrix4().makeRotationAxis(axis, angle))
    .multiply(new Matrix4().makeTranslation(pivot.clone().negate()));

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
  const list = trees.get(model) ?? [];
  trees.set(model, list);
  if (list[step]) return list[step];
  const moves = (k: number, e: number) =>
    k > 0 && [...model.steps[k].path, model.steps[k].angles].some((a) => a[e] !== model.steps[k - 1].angles[e]);
  // a step that moves no crease (a turn, a new held face) keeps the previous tree, so it joins exactly; one that
  // cuts gets its own, without the slit
  let from = step;
  while (
    from > 0 &&
    !list[from] &&
    !model.steps[from].cuts.length &&
    model.steps[from].angles.every((_, e) => !moves(from, e))
  ) {
    from--;
  }
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
    for (const e of model.faceEdges[f]) {
      // a cut edge is no hinge: the paper either side of a slit is joined only around it
      if (model.cutAt[e] <= from) continue;
      for (const g of model.edgeFaces[e]) buckets[+moves(from, e)].push([f, e, g]);
    }
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

/** Creases the engine joins faces through in `step`; the others follow from these. */
export const treeEdges = (model: Model, step: number): ReadonlySet<number> => tree(model, step).treeEdges;

/** Transform of every face relative to face 0, for the given fold angles. */
export function rootTransforms(model: Model, angles: number[], step: number): Matrix4[] {
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
  const list = anchors.get(model) ?? [new Matrix4(), new Matrix4()];
  anchors.set(model, list);
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
  const list = corrections.get(model) ?? [];
  corrections.set(model, list);
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

/** Eased, unclamped angle of every edge at progress `t` through `step` (all zeros at step 0), along the step's path. */
export function anglesAt(model: Model, step: number, t: number): number[] {
  assertStep(model, step);
  if (step === 0) return model.steps[0].angles.map(() => 0);
  return pathAngles(model, step, progress(t));
}

/** Angles at un-eased progress `s`: straight from the previous step's angles to this one's, through its path. */
export function pathAngles(model: Model, step: number, s: number): number[] {
  const knots = [model.steps[step - 1].angles, ...model.steps[step].path, model.steps[step].angles];
  const x = Math.max(0, Math.min(1, s)) * (knots.length - 1);
  const i = Math.min(knots.length - 2, Math.floor(x));
  const [a, b] = [knots[i], knots[i + 1]];
  // +180° and −180° are one pose: a crease going from one to the other stays put, only its layers change sides
  return a.map((v, e) => (Math.abs(v) === 180 && b[e] === -v && x < knots.length - 1 ? v : v + (b[e] - v) * (x - i)));
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
  const list = rotations.get(model) ?? [new Matrix4()];
  rotations.set(model, list);
  for (let k = list.length; k <= step; k++) list[k] = stepRotation(model, k, 1);
  return list[step];
}

type Layers = { heights: number[]; up: number[] };
const layers = new WeakMap<Model, Layers[]>();
const landedLayers = new WeakMap<Model, Layers[]>();

/**
 * The stack at the end of `step`, before the whole-model turn. `heights[f]` is face f's place in its stack
 * (0 = bottom, along +z); `up[f]` is +1 when its front faces +z, −1 when it faces −z, 0 when it stands on edge.
 * From the step's faceOrders: [f, g, s] puts f on the side of g's normal (s = 1) or against it (s = −1);
 * a face sits one above the highest face its sheet must cover. Contradictory orders throw a RangeError.
 */
function stackAt(model: Model, step: number, landed = false): Layers {
  const cache = landed ? landedLayers : layers;
  const list = cache.get(model) ?? [];
  cache.set(model, list);
  if (list[step]) return list[step];
  // a step that inherits its faceOrders (a turn, or opening out) keeps the stack it was given
  if (!landed && step > 1 && model.steps[step].faceOrders === model.steps[step - 1].faceOrders) {
    list[step] = stackAt(model, step - 1);
    return list[step];
  }
  let up = model.faces.map(() => 1);
  const below = model.faces.map((): number[] => []);
  const angles = model.steps[step].orderedAt ?? model.steps[step].angles;
  if (step > 0) {
    const T = rootTransforms(model, angles, step);
    const base = anchorFor(model, step).clone().multiply(T[model.steps[step].fixedFace].clone().invert());
    up = T.map((m) => Math.sign(Math.round(base.clone().multiply(m).elements[10] * 1e6)));
    for (const [f, g, s] of (landed && model.steps[step].landedOrders) || model.steps[step].faceOrders) {
      const side = s * up[g];
      if (side > 0) below[f].push(g);
      if (side < 0) below[g].push(f);
    }
  }
  // Faces joined by a flat crease are one sheet of paper: they share a height wherever the orders allow, so a
  // layer has no steps along it. ponytail: not across a crease turned, from this stack, by a fold that ends flat
  // (in a later step that keeps the stack, or the step after them): its flaps turn about unlifted hinges, so two
  // lifted with their sheet and meeting at a point cross mid-turn. Lifting those hinges (as flapRoots does for
  // steps that end open) would lift the limit.
  const turns = (e: number) => {
    for (let k = step + 1; model.steps[k]; k++) {
      const [s, before] = [model.steps[k], model.steps[k - 1].angles];
      if (!isReverseFold(model, k) && !endsOpen(model, k) && [s.angles, ...s.path].some((a) => a[e] !== before[e]))
        return true;
      if (s.faceOrders !== model.steps[step].faceOrders) return false;
    }
    return false;
  };
  const group = model.faces.map((_, f) => f);
  const find = (f: number): number => (group[f] === f ? f : find(group[f]));
  let heights = sheetHeights(below, find, step);
  model.edgeFaces.forEach((faces, e) => {
    if (faces.length !== 2 || Math.abs(angles[e]) > EPSILON || model.cutAt[e] <= step || turns(e)) return;
    const [a, b] = faces.map(find);
    if (a === b) return;
    group[a] = b;
    try {
      heights = sheetHeights(below, find, step);
    } catch {
      group[a] = a; // joining them would put the sheet above and below the same paper
    }
  });
  list[step] = { heights, up };
  return list[step];
}

/** Each face's height: one above the highest face below any face of its sheet (`sheet(f)`), cycles throw. */
function sheetHeights(below: number[][], sheet: (f: number) => number, step: number): number[] {
  const faces = below.map((): number[] => []);
  below.forEach((_, f) => {
    faces[sheet(f)].push(f);
  });
  const heights: number[] = [];
  const visiting = new Set<number>();
  const visit = (r: number): number => {
    if (heights[r] !== undefined) return heights[r];
    if (visiting.has(r)) throw new RangeError(`Step ${step} faceOrders contradict each other at face ${r}.`);
    visiting.add(r);
    heights[r] = Math.max(0, ...faces[r].flatMap((f) => below[f].map((g) => visit(sheet(g)) + 1)));
    return heights[r];
  };
  return below.map((_, f) => visit(sheet(f)));
}

/** Each face's place in the stack at the end of `step` (0 = bottom), along +z before the whole-model turn. */
export function layerHeights(model: Model, step: number): number[] {
  assertStep(model, step);
  return stackAt(model, step).heights;
}

/** Eased progress through `step` at which a tuck has landed and its layers start changing places (1: no tuck). */
export const landingAt = (model: Model, step: number): number =>
  model.steps[step].landedOrders ? 1 - 1 / (model.steps[step].path.length + 1) : 1;

/** Corners of every face (in `model.faces` order) at progress `t` through `step`. */
export function foldedPositions(model: Model, step: number, t: number): Vec3[][] {
  assertStep(model, step);
  const fan = reverseFan(model, step);
  const s = progress(t);
  return fan && s > 0 && s < 1 ? fanned(fan, plainPositions(model, step, t), s) : plainPositions(model, step, t);
}

/** foldedPositions without a reverse fold's fan: each face where its creases' angles put it. */
function plainPositions(model: Model, step: number, t: number): Vec3[][] {
  if (step === 0) return model.faces.map((f) => f.map((v): Vec3 => [...model.vertices[v], 0]));

  const cur = model.steps[step];
  const s = progress(t);
  const turn = stepRotation(model, step, s);
  // Each face is lifted along its own normal by height × facing, blended with the fold itself: a stack that
  // turns over keeps its inner order and ends at exactly its new heights, and stacks carried by a turn or an
  // opening fold stay apart. While a flap travels, the moving faces also shift together, straight up or down,
  // to pass the paper that stays put, then settle.
  const from = stackAt(model, step - 1);
  const to = stackAt(model, step);
  const clearance = travel(model, step);
  const rise = progress(t / LIFT_SPAN) * progress((1 - t) / LIFT_SPAN);

  const C = treeChange(model, step);
  const reverse = isReverseFold(model, step);
  const posesAt = (at: number, eased: number) => {
    const T = rootTransforms(model, anglesAt(model, step, at), step);
    const pose = anchorFor(model, step).clone().multiply(T[cur.fixedFace].clone().invert());
    return model.faces.map((_, f) => {
      const m = pose.clone().multiply(T[f]);
      return C ? m.multiply(fade(C[f], eased)) : m;
    });
  };
  const poses = posesAt(t, s);
  // a tuck lands on the stack its motion makes, then its layers change places while the paper holds still
  const landing = reverse ? 1 : landingAt(model, step);
  const mid = cur.landedOrders && !reverse ? stackAt(model, step, true) : to;
  const [a0, a1, u] = s <= landing ? [from, mid, s / landing] : [mid, to, (s - landing) / (1 - landing)];
  const lifts = model.faces.map((_, f) => {
    const a = a0.heights[f] * a0.up[f];
    return LAYER_GAP * (a + (a1.heights[f] * a1.up[f] - a) * u);
  });
  // only in a step that ends open (a flap standing out of the stack); flat steps blend their heights alone
  const open = endsOpen(model, step);
  const roots = open ? flapRoots(model, poses, lifts, cur.fixedFace) : lifts.map(() => 0);
  const up = new Vector3(0, 0, 1).transformDirection(poses[cur.fixedFace]);
  // a flap turning over in a fold that ends flat turns about the edges of the layers it wraps, like a page about
  // a book's spine: about an axis lifted halfway between where its layer starts and ends. Its lift turns with it,
  // so it keeps to its hinge and needs no lift to clear the paper it passes.
  const turned =
    cur.pivot && s > 0 && s < 1 ? pivotLifts(model, step, poses, posesAt(0, 0), posesAt(1, 1), from, to) : [];
  const point = new Vector3();
  const normal = new Vector3();
  const facing = new Vector3();
  return model.faces.map((face, f) => {
    const m = poses[f];
    const root = roots[f];
    // a flap standing out of the stack keeps its root at its height in the stack; its own layers part along its
    // normal, and each layer's root rises with it, so none sinks below the layers beside it (for faces lying in
    // the stack all three are the same)
    const lift = Math.sign(lifts[f]) * (Math.abs(lifts[f]) - root);
    normal.copy(up).multiplyScalar(root);
    if (open) {
      facing.set(0, 0, 1).transformDirection(m);
      normal.addScaledVector(up.clone().addScaledVector(facing, -up.dot(facing)), Math.abs(lift));
    }
    const shift = turned[f] ? 0 : LAYER_GAP * clearance[f] * rise;
    if (turned[f]) normal.copy(turned[f]);
    return face.map((v) => {
      point
        .set(model.vertices[v][0], model.vertices[v][1], turned[f] ? 0 : lift)
        .applyMatrix4(m)
        .add(normal);
      point.z += shift;
      return point.applyMatrix4(turn).toArray() as Vec3;
    });
  });
}

/**
 * For each face that moves this step, its offset off the paper turned about the edges it wraps: its lift as the step
 * starts (`poses0`, `from`) and ends (`poses1`, `to`) are the two ends of a half-turn about their midpoint, and it
 * turns as the face has turned since the start. Undefined for faces that stay or don't turn over.
 */
function pivotLifts(
  model: Model,
  step: number,
  poses: Matrix4[],
  poses0: Matrix4[],
  poses1: Matrix4[],
  from: Layers,
  to: Layers
): (Vector3 | undefined)[] {
  const moving = movingFaces(model, step);
  const lift = (m: Matrix4, layers: Layers, f: number) =>
    new Vector3(0, 0, 1).transformDirection(m).multiplyScalar(LAYER_GAP * layers.heights[f] * layers.up[f]);
  // only a face that turns over in one half-turn (the paper's up turned to its down) has its ends on one arc
  const flips = (f: number) =>
    new Vector3(0, 0, 1).transformDirection(poses1[f]).dot(new Vector3(0, 0, 1).transformDirection(poses0[f])) <
    -1 + EPSILON;
  return poses.map((m, f) => {
    if (!moving.has(f) || !flips(f)) return undefined;
    const start = lift(poses0[f], from, f);
    const centre = start
      .clone()
      .add(lift(poses1[f], to, f))
      .multiplyScalar(0.5);
    const since = new Quaternion()
      .setFromRotationMatrix(m)
      .multiply(new Quaternion().setFromRotationMatrix(poses0[f]).invert());
    return start.sub(centre).applyQuaternion(since).add(centre);
  });
}

const opens = new WeakMap<Model, boolean[]>();

/** Does `step` end with some face out of the stack's plane (e.g. wings opened out)? */
function endsOpen(model: Model, step: number): boolean {
  const list = opens.get(model) ?? [];
  opens.set(model, list);
  list[step] ??= rootTransforms(model, model.steps[step].angles, step).some(
    (m) => Math.abs(Math.abs(m.elements[10]) - 1) > 1e-9
  );
  return list[step];
}

/**
 * For each face standing out of the stack's plane (the `held` face's), the lowest lift among the faces sharing
 * its plane on the same side of the stack: the height the flap's root sits at. 0 for faces lying in the stack.
 */
function flapRoots(model: Model, poses: Matrix4[], lifts: number[], held: number): number[] {
  const up = new Vector3(0, 0, 1).transformDirection(poses[held]);
  const base = up.dot(new Vector3().setFromMatrixPosition(poses[held]));
  const planes = poses.map((m, f) => {
    const n = new Vector3(0, 0, 1).transformDirection(m);
    const o = new Vector3().setFromMatrixPosition(m);
    if (Math.abs(n.dot(up)) > 1 - 1e-6) return undefined;
    // one sign per plane, so faces back to back share it
    if (n.toArray().reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a)) < 0) n.negate();
    const [x, y] = model.faceCentroids[f];
    const side = Math.sign(new Vector3(x, y, 0).applyMatrix4(m).dot(up) - base);
    return { n, d: n.dot(o), side };
  });
  return planes.map((p, f) => {
    if (!p) return 0;
    let root = Math.abs(lifts[f]);
    planes.forEach((q, g) => {
      if (q && q.side === p.side && Math.abs(p.d - q.d) < 1e-6 && p.n.distanceTo(q.n) < 1e-6)
        root = Math.min(root, Math.abs(lifts[g]));
    });
    return root;
  });
}

/** Per face, does it sit elsewhere at `angles` than as `step` starts? */
function movedTo(model: Model, step: number, angles: number[]): boolean[] {
  const start = startPose(model, step);
  const T = rootTransforms(model, angles, step);
  const base = anchorFor(model, step).clone().multiply(T[model.steps[step].fixedFace].clone().invert());
  return T.map((m, f) => {
    const end = base.clone().multiply(m).elements;
    return start[f].elements.some((x, i) => Math.abs(x - end[i]) > 1e-9);
  });
}

const movers = new WeakMap<Model, ReadonlySet<number>[]>();

/** Faces that end `step` elsewhere than they start it, relative to its fixed face (none at step 0). */
export function movingFaces(model: Model, step: number): ReadonlySet<number> {
  const list = movers.get(model) ?? [new Set()];
  movers.set(model, list);
  list[step] ??= new Set(movedTo(model, step, model.steps[step].angles).flatMap((m, f) => (m ? [f] : [])));
  return list[step];
}

/**
 * A reverse fold turns a flap's spine inside out: a crease already folded flat flips sign (+180 to −180 or
 * back), while new creases appear along one line. On a flap of two layers they share a sign (the spine's two
 * halves are already one valley and one mountain); a thicker flap has both.
 */
export function isReverseFold(model: Model, step: number): boolean {
  if (step === 0) return false;
  const before = model.steps[step - 1].angles;
  const after = model.steps[step].angles;
  const flips = after.some((a, e) => Math.abs(before[e]) === 180 && a === -before[e]);
  const made = after.filter((a, e) => before[e] === 0 && a !== 0);
  return flips && made.length > 0;
}

/** A reverse fold's spine: the flap's folded edges that turn inside out. None unless `isReverseFold`. */
export function spineEdges(model: Model, step: number): number[] {
  if (!isReverseFold(model, step)) return [];
  const moving = movingFaces(model, step);
  const before = model.steps[step - 1].angles;
  return model.steps[step].angles.flatMap((a, e) =>
    Math.abs(before[e]) === 180 && a === -before[e] && model.edgeFaces[e].every((f) => moving.has(f)) ? [e] : []
  );
}

export type ReverseFan = {
  /** Where the new crease meets the flap's spine. */
  pivot: Vec3;
  /** The body's plane normal (unit). */
  normal: Vec3;
  /** The fold line through the pivot, in the plane, pointing away from the body's middle: the way the flap goes round. */
  line: Vec3;
  /** Which way round a corner lying on the fold line's other half goes: the side most of the flap starts on. */
  side: 1 | -1;
  /** How far the body reaches from the pivot along `line`. */
  reach: number;
  /** The flap's length halfway, as a share of its length: just short enough to stay inside the body. */
  fit: number;
  /** The body's far edge, which its two sides open about. */
  hinge: { point: Vec3; dir: Vec3 };
  /** Per face: 0 for the flap, the side of the body it opens with (+1 above the flap, −1 below), or null for paper
   * that stays put: all of it when the flap tucks into only part of the model (the head into the neck). */
  group: (0 | 1 | -1 | null)[];
  /** Per side, the turn about `hinge.dir` that opens it. */
  sense: Record<1 | -1, 1 | -1>;
  /** Every face's corners as the step starts and as it ends, without the fan. */
  from: Vec3[][];
  to: Vec3[][];
};
const fans = new WeakMap<Model, (ReverseFan | null)[]>();

/**
 * A reverse fold's fan: its flap swings round the pivot, across the fold line that mirrors it onto where it ends,
 * through the side away from the body's middle, shortened halfway just enough to stay inside the body; the body
 * opens like a book to take it. Null unless `isReverseFold`.
 */
export function reverseFan(model: Model, step: number): ReverseFan | null {
  const list = fans.get(model) ?? [];
  fans.set(model, list);
  if (list[step] !== undefined) return list[step];
  list[step] = null;
  if (!isReverseFold(model, step)) return null;
  // ponytail: the fan works in world coordinates from the plain start and end, so it assumes the whole model doesn't
  // turn during the step (the crane's reverse folds don't); blend the turn in here if a model ever needs that
  const moving = movingFaces(model, step);
  const before = model.steps[step - 1].angles;
  const after = model.steps[step].angles;
  const ends = (keep: (e: number) => boolean) => new Set(model.edges.flatMap((ab, e) => (keep(e) ? ab : [])));
  const spine = new Set(spineEdges(model, step).flatMap((e) => model.edges[e]));
  const crease = ends((e) => before[e] === 0 && after[e] !== 0);
  const at = [...spine].find((v) => crease.has(v));
  if (at === undefined) return null;
  const from = plainPositions(model, step, 0);
  const to = plainPositions(model, step, 1);
  const V = (p: Vec3) => new Vector3(...p);
  const corners = (faces: Vec3[][], pick: (f: number) => boolean) =>
    faces.flatMap((face, f) => (pick(f) ? face.map(V) : []));
  const mean = (ps: Vector3[]) => ps.reduce((c, p) => c.addScaledVector(p, 1 / ps.length), new Vector3());
  const still = (f: number) => !moving.has(f);
  const flap = (f: number) => moving.has(f);

  const pivotFace = [...moving].find((f) => model.faces[f].includes(at)) as number;
  const pivot = V(from[pivotFace][model.faces[pivotFace].indexOf(at)]);
  const [p, q, r] = from[model.steps[step].fixedFace].map(V);
  const n = q.sub(p).cross(r.sub(p)).normalize();
  const flat = (x: Vector3) => {
    const d = x.clone().sub(pivot);
    return d.addScaledVector(n, -d.dot(n));
  };
  // the line through the pivot, in the plane, that best mirrors the flap as it starts onto where it ends
  const u = new Vector3(1, 0, 0).cross(n).lengthSq() > 1e-6 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  u.addScaledVector(n, -u.dot(n)).normalize();
  const w = n.clone().cross(u);
  let [cos2, sin2] = [0, 0];
  for (const f of moving)
    from[f].forEach((x, i) => {
      const [a, b] = [flat(V(x)), flat(V(to[f][i]))];
      const [vx, vy, gx, gy] = [a.dot(u), a.dot(w), b.dot(u), b.dot(w)];
      cos2 += vx * gx - vy * gy;
      sin2 += vx * gy + vy * gx;
    });
  const half = Math.atan2(sin2, cos2) / 2;
  const line = u.clone().multiplyScalar(Math.cos(half)).addScaledVector(w, Math.sin(half));
  // it goes round through the side away from the body's middle, the way its tuck arrow bows
  if (flat(mean(corners(to, still))).dot(line) > 0) line.negate();
  const across = n.clone().cross(line);
  const angles = corners(from, flap).map((x) => Math.atan2(flat(x).dot(across), flat(x).dot(line)));
  const side = angles.reduce((sum, a) => sum + Math.sign(a), 0) < 0 ? -1 : 1;
  const reach = Math.max(...corners(to, still).map((x) => flat(x).dot(line)));
  const longest = Math.max(...corners(from, flap).map((x) => flat(x).length()));
  const fit = Math.min(1, (0.9 * reach) / longest);

  // the body's far edge: along the flap's spine as it starts, through the still corner farthest across from the flap
  const tip = [...spine]
    .flatMap((v) =>
      [...moving].flatMap((f) => (model.faces[f].includes(v) ? [V(from[f][model.faces[f].indexOf(v)])] : []))
    )
    .reduce((a, b) => (flat(b).length() > flat(a).length() ? b : a));
  const dir = flat(tip).normalize();
  const perp = n.clone().cross(dir);
  const flapSide = flat(mean(corners(to, flap))).dot(perp) < 0 ? -1 : 1;
  // across the spine, how far `pick`'s corners reach on the far side from the flap (or the flap's own side)
  const edge = (pick: (f: number) => boolean, far: boolean) => {
    const offs = corners(to, pick).map((x) => flat(x).dot(perp));
    return flapSide > 0 === far ? Math.min(...offs) : Math.max(...offs);
  };
  const hinge = pivot.clone().addScaledVector(perp, edge(still, true));
  // the body opens only when the layers the flap tucks between span the model on the flap's side: a flap tucking into
  // part of it (the head into the neck) leaves it shut, or the whole bird would swing open about the neck
  const between = new Set(
    model.steps[step].faceOrders.flatMap(([f, g]) => (moving.has(f) === moving.has(g) ? [] : [moving.has(f) ? g : f]))
  );
  const opens = Math.abs(edge((f) => between.has(f), false) - edge(still, false)) < 1e-6;
  const height = (x: Vector3) => x.clone().sub(pivot).dot(n);
  const middle = height(mean(corners(to, flap)));
  const group = model.faces.map((_, f): 0 | 1 | -1 | null =>
    moving.has(f) ? 0 : !opens ? null : height(mean(to[f].map(V))) > middle ? 1 : -1
  );
  // each side turns the way that takes it away from the flap
  const away = (g: 1 | -1): 1 | -1 => {
    const ps = corners(to, (f) => group[f] === g);
    if (!ps.length) return 1;
    const c = mean(ps);
    const turned = c.clone().applyMatrix4(turnAbout(hinge, dir, 0.2));
    return (height(turned) - middle) * g > (height(c) - middle) * g ? 1 : -1;
  };
  list[step] = {
    pivot: pivot.toArray() as Vec3,
    normal: n.toArray() as Vec3,
    line: line.toArray() as Vec3,
    side,
    reach,
    fit,
    hinge: { point: hinge.toArray() as Vec3, dir: dir.toArray() as Vec3 },
    group,
    sense: { 1: away(1), [-1]: away(-1) } as Record<1 | -1, 1 | -1>,
    from,
    to
  };
  return list[step];
}

/** `plain` (every face's corners at eased progress `s`, 0 < s < 1) with the flap fanned and the body opened. */
function fanned(fan: ReverseFan, plain: Vec3[][], s: number): Vec3[][] {
  const [pivot, n, line] = [new Vector3(...fan.pivot), new Vector3(...fan.normal), new Vector3(...fan.line)];
  const across = n.clone().cross(line);
  const k = 1 - (1 - fan.fit) * Math.sin(Math.PI * s);
  const open = (REVERSE_OPEN_DEG / 2) * DEG * Math.sin(Math.PI * s);
  const [hinge, dir] = [new Vector3(...fan.hinge.point), new Vector3(...fan.hinge.dir)];
  const turns = { 1: turnAbout(hinge, dir, fan.sense[1] * open), [-1]: turnAbout(hinge, dir, fan.sense[-1] * open) };
  const point = new Vector3();
  return plain.map((face, f) => {
    const g = fan.group[f];
    if (g === null) return face;
    if (g)
      return face.map(
        (x) =>
          point
            .set(...x)
            .applyMatrix4(turns[g])
            .toArray() as Vec3
      );
    return face.map((_, i) => {
      const start = new Vector3(...fan.from[f][i]).sub(pivot);
      const end = new Vector3(...fan.to[f][i]).sub(pivot);
      const [a, b] = [start.dot(line), start.dot(across)];
      const at = Math.atan2(b, a);
      // a corner on the fold line's other half goes round with the rest of the flap
      const phi = (Math.PI - Math.abs(at) < 1e-9 ? fan.side * Math.PI : at) * (1 - 2 * s);
      const r = k * Math.hypot(a, b);
      const h = start.dot(n) + (end.dot(n) - start.dot(n)) * s;
      return point
        .copy(pivot)
        .addScaledVector(line, r * Math.cos(phi))
        .addScaledVector(across, r * Math.sin(phi))
        .addScaledVector(n, h)
        .toArray() as Vec3;
    });
  });
}

/**
 * A reverse fold's tuck, from the corners of every face as the flap was (`from`) and as it lands (`to`): the tip,
 * the moving corner that travels farthest, where it lands, and the unit direction the tuck bows out, away from the
 * middle of the model and across the tip's path.
 */
export function tuckBow(
  model: Model,
  step: number,
  from: Vec3[][],
  to: Vec3[][]
): { tip: Vector3; landed: Vector3; out: Vector3 } {
  const v = (p: Vec3) => new Vector3(...p);
  const [tip, landed] = [...movingFaces(model, step)]
    .flatMap((f) => from[f].map((p, i) => [v(p), v(to[f][i])]))
    .reduce((best, m) => (m[0].distanceTo(m[1]) > best[0].distanceTo(best[1]) ? m : best));
  const all = from.flat();
  const center = all.reduce((c, p) => c.add(v(p)), new Vector3()).divideScalar(all.length);
  const out = tip.clone().lerp(landed, 0.5).sub(center);
  const chord = landed.clone().sub(tip).normalize();
  return { tip, landed, out: out.addScaledVector(chord, -out.dot(chord)).normalize() };
}

const travels = new WeakMap<Model, number[][]>();

/**
 * How many layers (+ over, − under) each face shifts mid-step to pass every face that stays put on its way to
 * the side of the stack it lands on; 0 for faces that stay. Flaps that swing the same way shift together, so
 * it never reorders them; flaps swinging opposite ways (one over, one under) each clear the stack their way.
 */
function travel(model: Model, step: number): number[] {
  const list = travels.get(model) ?? [];
  travels.set(model, list);
  if (list[step]) return list[step];
  // a reverse fold's body opens about its far edge instead (see fanned)
  if (isReverseFold(model, step)) {
    list[step] = model.faces.map(() => 0);
    return list[step];
  }
  const start = startPose(model, step);
  const cur = model.steps[step];
  // a fold-and-unfold ends where it started: its flap is the paper that moves on the way, at the path's peak
  const peaks = cur.path.length > 0 && cur.angles.every((a, e) => a === model.steps[step - 1].angles[e]);
  const moving = movedTo(model, step, peaks ? cur.path[0] : cur.angles);
  const before = stackAt(model, step - 1);
  const after = stackAt(model, step);
  const [from, to] = [before.heights, after.heights];
  // each moving face passes over the stack when it swings toward +z on its way, under it when toward −z
  const mid = rootTransforms(model, anglesAt(model, step, 0.5), step);
  const midBase = anchorFor(model, step).clone().multiply(mid[model.steps[step].fixedFace].clone().invert());
  const point = new Vector3();
  const over = model.faces.map((face, f) => {
    const midPose = midBase.clone().multiply(mid[f]);
    const rise = face.reduce((acc, v) => {
      const [x, y] = model.vertices[v];
      return acc + point.set(x, y, 0).applyMatrix4(midPose).z - point.set(x, y, 0).applyMatrix4(start[f]).z;
    }, 0);
    return rise >= 0;
  });
  // a tuck swings over as one stack from where it starts, and only then do its layers slip in where they land
  const tuck = !!model.steps[step].landedOrders;
  const range = (pick: (f: number) => boolean) => {
    // a face that turns over has its lift blended through 0 on the way
    const hs = moving.flatMap((m, f) =>
      pick(f) ? [from[f], ...(tuck && m ? [] : [to[f]]), ...(before.up[f] !== after.up[f] ? [0] : [])] : []
    );
    return { min: Math.min(...hs), max: Math.max(...hs) };
  };
  // only the still faces a moving face lies against (as the step starts, lands or ends) are in its way: a small
  // flap swinging past a few layers clears those, not the whole stack, or it lifts off its hinge
  const near = new Set<number>();
  // a fold-and-unfold changes no stacking, so what its flap lies against was ordered in some earlier step
  const orders = peaks
    ? model.steps.slice(0, step + 1).flatMap((st) => st.faceOrders)
    : [...model.steps[step - 1].faceOrders, ...(cur.landedOrders ?? []), ...cur.faceOrders];
  for (const [f, g] of orders) {
    if (moving[f] !== moving[g]) near.add(moving[f] ? g : f);
  }
  const stay = range((f) => !moving[f] && near.has(f));
  const up = range((f) => moving[f] && over[f]);
  const down = range((f) => moving[f] && !over[f]);
  // a step that keeps the stacking (a turn, or opening a model out) has no flap to carry over the stack, nor
  // has the homepage's unfold, every crease moving at once
  const restack =
    model.steps[step].path !== model.unfold && (peaks || to.some((h, f) => h !== from[f])) && moving.includes(false);
  list[step] = moving.map((m, f) =>
    !restack || !m ? 0 : over[f] ? Math.max(0, stay.max + 1 - up.min) : -Math.max(0, down.max + 1 - stay.min)
  );
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
    if (faces.length !== 2 || treeEdges.has(e) || model.cutAt[e] <= step) return;
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
