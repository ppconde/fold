import { type Matrix4, Vector3 } from 'three';
import { pathAngles, rootTransforms, treeEdges } from '../src/fold/fold';
import { loadModel } from '../src/fold/load-model';
import type { FaceOrder, Model, Vec2 } from '../src/fold/types';
import { signedArea } from './arrange';
import type { Tuck } from './build';

type Frame = { edges_foldAngle: number[]; 'foldapp:path'?: number[][]; faceOrders?: FaceOrder[] };
type Fold = { faces_vertices: number[][]; file_frames: Frame[] };

const DEG = Math.PI / 180;
/** Keyframes solved inside a step that moves creases which don't fold as one line. */
const KNOTS = 9;
/** Weight of staying near the straight path, against keeping the paper joined (radians vs paper units). */
const STRAIGHT = 0.02;
/** A vertex gap halfway between two knots that bridged() fills in. */
const BRIDGE = 0.01;

/** Where every vertex copy lands (3 numbers per face corner), relative to face 0. */
function corners(model: Model, T: Matrix4[]): number[] {
  const p = new Vector3();
  return model.faces.flatMap((face, f) =>
    face.flatMap((v) => p.set(model.vertices[v][0], model.vertices[v][1], 0).applyMatrix4(T[f]).toArray())
  );
}

/** Gaps between copies of each vertex: zero when the paper is joined everywhere. */
function gaps(model: Model, T: Matrix4[]): number[] {
  const at = corners(model, T);
  const first = new Map<number, number>();
  const out: number[] = [];
  let i = 0;
  for (const face of model.faces) {
    for (const v of face) {
      const j = first.get(v);
      if (j === undefined) first.set(v, i);
      else for (let c = 0; c < 3; c++) out.push(at[i + c] - at[j + c]);
      i += 3;
    }
  }
  return out;
}

/** Solve A x = b (A symmetric positive definite, small) by Gaussian elimination with pivoting. */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let best = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[best][c])) best = r;
    [M[c], M[best]] = [M[best], M[c]];
    for (let r = c + 1; r < n; r++) {
      const k = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let j = r + 1; j < n; j++) s -= M[r][j] * x[j];
    x[r] = s / M[r][r];
  }
  return x;
}

/**
 * The angles nearest `straight` (in the moving creases `vars`) that keep the paper joined, from `guess`.
 * Levenberg–Marquardt on the vertex gaps plus a pull toward the straight path.
 */
function project(model: Model, step: number, vars: number[], straight: number[], guess: number[]): number[] {
  // only creases on the engine's tree place faces; every crease's angle is read off the folded paper
  const tree = treeEdges(model, step);
  const free = vars.filter((e) => tree.has(e));
  const residual = (a: number[]) => {
    const T = rootTransforms(model, a, step);
    return [
      ...gaps(model, T),
      ...vars.map((e) => {
        const angle = tree.has(e) || model.edgeFaces[e].length < 2 ? a[e] : measure(model, T, e, straight[e]);
        return STRAIGHT * (angle - straight[e]) * DEG;
      })
    ];
  };
  const cost = (r: number[]) => r.reduce((s, x) => s + x * x, 0);
  let angles = [...guess];
  let r = residual(angles);
  let damping = 1e-3;
  for (let it = 0; it < 60; it++) {
    const h = 1e-4;
    const J = free.map((e) => {
      const a = [...angles];
      a[e] += h;
      return residual(a).map((x, i) => (x - r[i]) / (h * DEG));
    });
    const JTJ = free.map((_, i) => free.map((_, j) => J[i].reduce((s, x, k) => s + x * J[j][k], 0)));
    const JTr = free.map((_, i) => J[i].reduce((s, x, k) => s + x * r[k], 0));
    let improved = false;
    while (damping < 1e6) {
      const A = JTJ.map((row, i) => row.map((x, j) => (i === j ? x * (1 + damping) + 1e-12 : x)));
      const dx = solveLinear(
        A,
        JTr.map((x) => -x)
      );
      const next = [...angles];
      free.forEach((e, i) => {
        next[e] = Math.max(-180, Math.min(180, next[e] + dx[i] / DEG));
      });
      const nr = residual(next);
      if (cost(nr) < cost(r)) {
        const done = cost(r) - cost(nr) < 1e-14;
        angles = next;
        r = nr;
        damping = Math.max(1e-9, damping / 3);
        improved = !done;
        break;
      }
      damping *= 4;
    }
    if (!improved) break;
  }
  return angles;
}

/** The angle crease e makes between its faces, signed as the engine folds it, nearest `hint`. */
function measure(model: Model, T: Matrix4[], e: number, hint: number): number {
  const [f, g] = model.edgeFaces[e];
  const [a, b] = model.edges[e].map((v) => new Vector3(...model.vertices[v], 0));
  const u = b.clone().sub(a).normalize();
  const [cx, cy] = model.faceCentroids[g];
  const p = new Vector3(cx, cy, 0);
  const rel = T[f].clone().invert().multiply(T[g]);
  const w0 = p.clone().sub(a);
  w0.sub(u.clone().multiplyScalar(w0.dot(u)));
  const w1 = p.clone().applyMatrix4(rel).sub(a);
  w1.sub(u.clone().multiplyScalar(w1.dot(u)));
  const phi = Math.atan2(u.dot(w0.clone().cross(w1)), w0.dot(w1)) / DEG;
  const side = u.x * (cy - a.y) - u.y * (cx - a.x) > 0 ? 1 : -1;
  let angle = side * phi;
  while (angle - hint > 180) angle -= 360;
  while (hint - angle > 180) angle += 360;
  return Math.max(-180, Math.min(180, angle));
}

/** Largest vertex gap at angles `a` in `step`. */
const worstGap = (model: Model, a: number[], step: number) => {
  const g = gaps(model, rootTransforms(model, a, step));
  let worst = 0;
  for (let i = 0; i < g.length; i += 3) worst = Math.max(worst, Math.hypot(g[i], g[i + 1], g[i + 2]));
  return worst;
};

/** Give every step whose straight path tears the paper a solved path (foldapp:path). Edits `fold`. */
export function solvePaths(fold: Fold, knots = KNOTS): void {
  const model = loadModel(fold);
  for (let k = 1; k < model.steps.length; k++) {
    const frame = fold.file_frames[k - 1];
    if (frame['foldapp:path']) continue;
    const prev = model.steps[k - 1].angles;
    const end = model.steps[k].angles;
    const lerp = (s: number) => prev.map((a, e) => a + (end[e] - a) * s);
    if ([0.25, 0.5, 0.75].every((s) => worstGap(model, lerp(s), k) < 1e-9)) continue;
    // only the creases the step changes move; the rest of the paper stays as it was
    const vars = model.edges.flatMap((_, e) => (end[e] !== prev[e] ? [e] : []));
    const path: number[][] = [];
    let guess = prev;
    for (let i = 1; i <= knots; i++) {
      const s = i / (knots + 1);
      const shift = lerp(s).map((a, e) => a - lerp((i - 1) / (knots + 1))[e]);
      const solved = project(
        model,
        k,
        vars,
        lerp(s),
        guess.map((a, e) => a + shift[e])
      );
      // angles only matter along the spanning tree; read the rest off the folded paper, so any tree agrees
      const T = rootTransforms(model, solved, k);
      const knot = solved.map((a, e) =>
        model.edgeFaces[e].length === 2 ? measure(model, T, e, a) : model.assignments[e] === 'B' ? 0 : a
      );
      // creases that don't move stay exactly where they were, so the step highlights only what moves
      path.push(knot.map((a, e) => (end[e] === prev[e] ? prev[e] : a)));
      guess = solved;
    }
    // knots the solver couldn't join are dropped, and bridged over from the joined ones either side
    const joined = path.filter((knot) => worstGap(model, knot, k) < BRIDGE);
    frame['foldapp:path'] = bridged(model, k, vars, [prev, ...joined, end]).slice(1, -1);
  }
}

/**
 * `knots` with knots added between any two the paper tears between: where the solver jumped from one way of
 * folding to another, bisected (up to `depth` times) along the joined poses nearest the straight line.
 */
function bridged(model: Model, k: number, vars: number[], knots: number[][], depth = 6): number[][] {
  const out = [knots[0]];
  for (let i = 1; i < knots.length; i++) {
    const [a, b] = [knots[i - 1], knots[i]];
    const mid = a.map((x, e) => (x + b[e]) / 2);
    if (depth && worstGap(model, mid, k) > BRIDGE) {
      const m = project(model, k, vars, mid, mid);
      const T = rootTransforms(model, m, k);
      const knot = m.map((x, e) =>
        vars.includes(e) && model.edgeFaces[e].length === 2 ? measure(model, T, e, x) : mid[e]
      );
      out.push(...bridged(model, k, vars, [a, knot, b], depth - 1).slice(1));
    } else out.push(b);
  }
  return out;
}

/** Largest vertex gap along step k's path, at its knots and halfway between them. */
export function pathTear(fold: Fold, k = 1): number {
  const model = loadModel(fold);
  const n = 2 * (model.steps[k].path.length + 1);
  let worst = 0;
  for (let i = 1; i < n; i++) worst = Math.max(worst, worstGap(model, pathAngles(model, k, i / n), k));
  return worst;
}

/** Area of the overlap of two convex polygons (Sutherland–Hodgman) and its centroid. */
function overlap(a: Vec2[], b: Vec2[]): { area: number; centre: Vec2 } {
  const clip = signedArea(b) < 0 ? [...b].reverse() : b;
  let out = a;
  clip.forEach((p, i) => {
    const q = clip[(i + 1) % clip.length];
    const keep = (v: Vec2) => (q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0]) >= 0;
    const next: Vec2[] = [];
    out.forEach((v, j) => {
      const w = out[(j + 1) % out.length];
      if (keep(v)) next.push(v);
      if (keep(v) !== keep(w)) {
        const [dx, dy] = [w[0] - v[0], w[1] - v[1]];
        const t =
          ((q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0])) / ((q[1] - p[1]) * dx - (q[0] - p[0]) * dy);
        next.push([v[0] + dx * t, v[1] + dy * t]);
      }
    });
    out = next;
  });
  if (out.length < 3) return { area: 0, centre: [0, 0] };
  const area = Math.abs(signedArea(out));
  return {
    area,
    centre: [out.reduce((s, v) => s + v[0], 0) / out.length, out.reduce((s, v) => s + v[1], 0) / out.length]
  };
}

/**
 * FOLD faceOrders for every step, read off the motion: two faces that lie on each other at the end of a
 * step keep their order if they moved as one; otherwise the side one approaches the other from, just before
 * the step lands, is the side it ends on; a tuck (`tucks[k - 1]` for step k) then moves its flaps inside.
 * Written only where the stacking changes. Edits `fold`.
 */
export function motionOrders(fold: Fold, tucks: (Tuck<number> | undefined)[] = []): void {
  const model = loadModel(fold);
  const near = (a: Matrix4, b: Matrix4) => a.elements.every((x, i) => Math.abs(x - b.elements[i]) < 1e-7);
  let before: Matrix4[] = rootTransforms(model, model.steps[0].angles, 0);
  let orders = new Map<string, 1 | -1>();
  let last = '[]';
  for (let k = 1; k < model.steps.length; k++) {
    const E = rootTransforms(model, model.steps[k].angles, k);
    // a step that doesn't end flat (opening out) keeps the order it was given
    if (E.some((m) => Math.abs(Math.abs(m.elements[10]) - 1) > 1e-9)) {
      delete fold.file_frames[k - 1].faceOrders;
      before = E;
      continue;
    }
    // just before landing; a tuck's last stretch only relabels its creases, so just before that
    const landing = tucks[k - 1] ? 1 - 1 / (model.steps[k].path.length + 1) : 1;
    const soon = rootTransforms(model, pathAngles(model, k, landing - 1e-3), k);
    // turns of +180° and −180° end alike: a pair only keeps its order if it also moved together on the way
    const half = rootTransforms(model, pathAngles(model, k, 0.5), k);
    const next = new Map<string, 1 | -1>();
    const p = new Vector3();
    for (let g = 0; g < model.faces.length; g++) {
      const toG = E[g].clone().invert();
      const G = model.faces[g].map((v) => model.vertices[v]);
      for (let f = 0; f < model.faces.length; f++) {
        if (f === g) continue;
        const rel = toG.clone().multiply(E[f]);
        const F = model.faces[f].map((v): [number, number, number] => {
          p.set(model.vertices[v][0], model.vertices[v][1], 0).applyMatrix4(rel);
          return [p.x, p.y, p.z];
        });
        if (F.some((v) => Math.abs(v[2]) > 1e-6)) continue;
        const { area, centre } = overlap(
          F.map((v): Vec2 => [v[0], v[1]]),
          G
        );
        if (area < 1e-9) continue;
        const key = `${f},${g}`;
        const kept = orders.get(key);
        const same =
          near(before[g].clone().invert().multiply(before[f]), rel) &&
          near(half[g].clone().invert().multiply(half[f]), rel);
        if (same && kept) {
          next.set(key, kept);
          continue;
        }
        // the shared point on each face, just before landing
        const onG = new Vector3(centre[0], centre[1], 0);
        const onF = onG.clone().applyMatrix4(rel.clone().invert());
        const pf = onF.applyMatrix4(soon[f]);
        const pg = onG.clone().applyMatrix4(soon[g]);
        const normal = new Vector3(0, 0, 1).transformDirection(soon[g]);
        const d = pf.sub(pg).dot(normal);
        if (Math.abs(d) < 1e-9) {
          throw new Error(
            `Step ${k}: faces ${f} and ${g} (at ${model.faceCentroids[f].map((x) => x.toFixed(3))} and ${model.faceCentroids[g].map((x) => x.toFixed(3))}) land together; their order is unknown.`
          );
        }
        next.set(key, d > 0 ? 1 : -1);
      }
    }
    const tuck = tucks[k - 1];
    if (tuck) tuckIn(next, tuck);
    orders = next;
    before = E;
    const list: FaceOrder[] = [...next].flatMap(([key, s]) => {
      const [f, g] = key.split(',').map(Number);
      return f < g ? [[f, g, s] as FaceOrder] : [];
    });
    const json = JSON.stringify(list);
    if (json !== last) fold.file_frames[k - 1].faceOrders = list;
    else delete fold.file_frames[k - 1].faceOrders;
    last = json;
  }
}

/** Move a tuck's flaps, which landed outside the layers they passed, inside them (see `Tuck`). Edits `orders`. */
function tuckIn(orders: Map<string, 1 | -1>, { layers, flaps }: Tuck<number>): void {
  const moved = flaps.flat();
  const landed = (p: number) => moved.map((x) => orders.get(`${x},${p}`)).find(Boolean);
  // the group passed: the one lying on the other's side the flaps landed on
  let past = layers[0];
  for (const q of layers[1]) {
    const s = layers[0].map((p) => orders.get(`${p},${q}`)).find(Boolean);
    if (s && landed(q)) past = s === landed(q) ? layers[0] : layers[1];
  }
  const flip = (f: number, g: number) => {
    for (const key of [`${f},${g}`, `${g},${f}`]) {
      const s = orders.get(key);
      if (s) orders.set(key, -s as 1 | -1);
    }
  };
  // the layers passed, and every still face lying on the side of one that the flaps landed on
  const outside = new Set(past);
  for (const p of past) {
    const side = landed(p);
    for (const [key, s] of orders) {
      const [g, q] = key.split(',').map(Number);
      if (q === p && s === side && !moved.includes(g)) outside.add(g);
    }
  }
  for (const x of moved) for (const g of outside) flip(x, g);
  for (const a of flaps[0]) for (const b of flaps[1]) flip(a, b);
}
