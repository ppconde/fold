import { cornerKeys } from '../src/fold/cuts';
import {
  checkConsistency,
  foldedPositions,
  isReverseFold,
  layerHeights,
  movingFaces,
  reverseFan
} from '../src/fold/fold';
import type { Model, Vec2, Vec3 } from '../src/fold/types';
import { overlap } from './arrange';

/** Largest allowed gap between copies of one vertex, as a fraction of the paper's side (spec §8). */
export const SEAM_BUDGET = 0.06;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const centre = (face: Vec3[]) =>
  face.reduce(
    (s, p): Vec3 => [s[0] + p[0] / face.length, s[1] + p[1] / face.length, s[2] + p[2] / face.length],
    [0, 0, 0]
  );

/** Largest distance between two copies of a vertex that must lie together: a tear mid-step, a seam at rest. */
export function spread(model: Model, step: number, t: number): number {
  const faces = foldedPositions(model, step, t);
  const keys = cornerKeys(model, step);
  // a reverse fold breaks into three pieces mid-step, the fanned flap and the body's two opening sides: only each
  // piece's own seams are held
  const group = reverseFan(model, step)?.group;
  const first = new Map<string, Vec3>();
  let worst = 0;
  model.faces.forEach((face, f) => {
    face.forEach((_, c) => {
      const p = faces[f][c];
      const key = `${keys[f][c]} ${group ? group[f] : 0}`;
      const q = first.get(key);
      if (q) worst = Math.max(worst, Math.hypot(...sub(p, q)));
      else first.set(key, p);
    });
  });
  return worst;
}

/** Does segment pq pass through the inside of triangle abc? Touching (within 1e-6) does not count. */
function pierces(p: Vec3, q: Vec3, a: Vec3, b: Vec3, c: Vec3): boolean {
  const m = 1e-6;
  const d = sub(q, p);
  const e1 = sub(b, a);
  const e2 = sub(c, a);
  const h = cross(d, e2);
  const det = dot(e1, h);
  if (Math.abs(det) < 1e-12) return false;
  const s = sub(p, a);
  const u = dot(s, h) / det;
  if (u < m || u > 1 - m) return false;
  const k = cross(s, e1);
  const v = dot(d, k) / det;
  if (v < m || u + v > 1 - m) return false;
  const t = dot(e2, k) / det;
  return t > m && t < 1 - m;
}

/** Pairs [f, g] where face f passes through face g at progress t. Faces sharing a vertex are skipped. */
export function crossings(model: Model, step: number, t: number): [number, number][] {
  const faces = foldedPositions(model, step, t);
  const found: [number, number][] = [];
  faces.forEach((P, f) => {
    faces.forEach((G, g) => {
      if (f === g || model.faces[f].some((v) => model.faces[g].includes(v))) return;
      // the sides, plus spokes from the centre: two faces can cut through each other along a line that
      // runs from side to side, where no side pierces the other face but a spoke does
      const c = centre(P);
      const segments = P.flatMap((p, i): [Vec3, Vec3][] => [
        [p, P[(i + 1) % P.length]],
        [c, p]
      ]);
      const hit = segments.some(([p, q]) => {
        for (let k = 1; k + 1 < G.length; k++) if (pierces(p, q, G[0], G[k], G[k + 1])) return true;
        return false;
      });
      if (hit) found.push([f, g]);
    });
  });
  return found;
}

/** Unit normal of a planar polygon (Newell's method: corners in a line don't matter). */
function normalOf(face: Vec3[]): Vec3 {
  const n = face.reduce(
    (s, p, i): Vec3 => {
      const q = face[(i + 1) % face.length];
      return [
        s[0] + (p[1] - q[1]) * (p[2] + q[2]),
        s[1] + (p[2] - q[2]) * (p[0] + q[0]),
        s[2] + (p[0] - q[0]) * (p[1] + q[1])
      ];
    },
    [0, 0, 0]
  );
  const l = Math.hypot(...n);
  return [n[0] / l, n[1] / l, n[2] / l];
}

/**
 * Pairs [f, g] of layers lying in the stack that change places mid-step and change back: at some progress in `ts`
 * they lie parallel and overlap, in an order along f's normal that is neither their order as the step starts nor as
 * it ends. Faces that move and turn (a flap swinging over) are left to crossings(); two parallel layers trading places
 * pass through each other with no edge piercing the other face, which crossings() can't see. First `t` per pair.
 */
export function tradesPlaces(
  model: Model,
  step: number,
  ts: number[],
  at = (t: number) => foldedPositions(model, step, t)
): { t: number; pair: [number, number] }[] {
  const frame = (t: number) => {
    const faces = at(t);
    return { faces, normals: faces.map(normalOf) };
  };
  const frames = [0, ...ts, 1].map(frame);
  const [start, end] = [frames[0], frames.at(-1) as (typeof frames)[0]];
  const fixed = model.steps[step].fixedFace;
  const tilt = ({ normals }: (typeof frames)[0], f: number) => dot(normals[f], normals[fixed]);
  const moving = movingFaces(model, step);
  const turns = new Set([...moving].filter((f) => frames.some((fr) => Math.abs(tilt(fr, f) - tilt(start, f)) > 1e-6)));
  /** Order of g along f's normal (±1, 0 level), or null unless parallel (and overlapping, if `within`). */
  const order = ({ faces, normals }: (typeof frames)[0], f: number, g: number, within: boolean) => {
    const n = normals[f];
    if (Math.abs(dot(n, normals[g])) < 1 - 1e-6) return null;
    if (within) {
      const u = sub(faces[f][1], faces[f][0]);
      const l = Math.hypot(...u);
      const x: Vec3 = [u[0] / l, u[1] / l, u[2] / l];
      const y = cross(n, x);
      const flat = (face: Vec3[]) => face.map((p): Vec2 => [dot(p, x), dot(p, y)]);
      if (overlap(flat(faces[f]), flat(faces[g])).area < 1e-6) return null;
    }
    const d = dot(n, sub(centre(faces[g]), centre(faces[f])));
    return Math.abs(d) < 1e-9 ? 0 : Math.sign(d);
  };
  const found: { t: number; pair: [number, number] }[] = [];
  model.faces.forEach((_, f) => {
    for (let g = f + 1; g < model.faces.length; g++) {
      if (turns.has(f) || turns.has(g)) continue;
      const ends = [order(start, f, g, false), order(end, f, g, false)];
      const i = ts.findIndex((_, i) => {
        const o = order(frames[i + 1], f, g, true);
        return o !== null && ends.every((e) => e !== null && e !== o);
      });
      if (i >= 0) found.push({ t: ts[i], pair: [f, g] });
    }
  });
  return found;
}

/** Which side of face f's plane face g's centre lies on at the end of `step` (+1 front, −1 back). */
function sideOf(faces: Vec3[][], f: number, g: number): number {
  const [a, b, c] = faces[f];
  const n = cross(sub(b, a), sub(c, a));
  return Math.sign(dot(n, sub(centre(faces[g]), a)));
}

/**
 * Flaps already folded (90° or more) that end a later step on the other side of their neighbour across the
 * crease, although that crease didn't move. A later step can re-route the engine's spanning tree, and the
 * clamped 178° wedges then add up differently: a thin stack flips and z-fights. crossings() skips these
 * faces because they share a crease.
 */
export function flapFlips(model: Model): string[] {
  const ends = model.steps.map((_, k) => (k ? foldedPositions(model, k, 1) : []));
  const found: string[] = [];
  model.edgeFaces.forEach(([f, g], e) => {
    if (g === undefined) return;
    for (let k = 1; k + 1 < model.steps.length; k++) {
      const angle = model.steps[k].angles[e];
      if (Math.abs(angle) < 90 || model.steps[k + 1].angles[e] !== angle) continue;
      if (sideOf(ends[k], f, g) !== sideOf(ends[k + 1], f, g)) {
        found.push(`Step ${k + 1}: face ${g} flips to the other side of face ${f} across edge ${e}.`);
      }
    }
  });
  return found;
}

/**
 * Creases folded flat that lie along the same line, their flaps on the same side, at the end of `step`, whose
 * layers interleave in the stack: paper can only nest one fold inside the other or keep them apart. Also pairs
 * of creases left open (0°) on one line whose layers swap order across it: they pass through each other there.
 * crossings() can't see either, since each pair's faces share the crease. Steps that end with a face out of the
 * stack's plane (a flap standing out, wings opened) are skipped.
 */
export function interleaved(model: Model, step: number): [number, number][] {
  const faces = foldedPositions(model, step, 1);
  const heights = layerHeights(model, step);
  const unit = (v: Vec3): Vec3 => {
    const l = Math.hypot(...v);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const [a, b] = faces[model.steps[step].fixedFace];
  const normal = normalOf(faces[model.steps[step].fixedFace]);
  if (faces.some((face) => Math.abs(dot(normalOf(face), normal)) < 1 - 1e-6)) return [];
  // the stack's plane, as 2D coordinates
  const u = unit(sub(b, a));
  const v = cross(normal, u);
  const at = (p: Vec3): [number, number] => [dot(sub(p, a), u), dot(sub(p, a), v)];
  const angles = model.steps[step].angles;
  const folds = model.edges.flatMap(([i, j], e) => {
    const open = angles[e] === 0;
    if ((!open && Math.abs(angles[e]) !== 180) || model.edgeFaces[e].length !== 2 || model.cutAt[e] <= step) return [];
    const [f, g] = model.edgeFaces[e];
    const [p, q] = [i, j].map((w) => at(faces[f][model.faces[f].indexOf(w)]));
    const m = at(centre(faces[f]));
    const side = Math.sign((q[0] - p[0]) * (m[1] - p[1]) - (q[1] - p[1]) * (m[0] - p[0]));
    // open: the layer's height on each side of the line (f's side, then g's)
    return [
      {
        e,
        p,
        q,
        side,
        open,
        lo: Math.min(heights[f], heights[g]),
        hi: Math.max(heights[f], heights[g]),
        by: [heights[f], heights[g]]
      }
    ];
  });
  const found: [number, number][] = [];
  folds.forEach((A, i) => {
    const d = [A.q[0] - A.p[0], A.q[1] - A.p[1]];
    const l2 = d[0] * d[0] + d[1] * d[1];
    const off = (r: [number, number]) => Math.abs(d[0] * (r[1] - A.p[1]) - d[1] * (r[0] - A.p[0])) / Math.sqrt(l2);
    const along = (r: [number, number]) => (d[0] * (r[0] - A.p[0]) + d[1] * (r[1] - A.p[1])) / l2;
    for (const B of folds.slice(i + 1)) {
      if (off(B.p) > 1e-6 || off(B.q) > 1e-6) continue;
      const [s, t] = [along(B.p), along(B.q)];
      // overlapping by more than a point, with B's flaps on A's side (B's side turned to A's direction)
      if (Math.min(1, Math.max(s, t)) - Math.max(0, Math.min(s, t)) < 1e-6) continue;
      if (A.open !== B.open) continue;
      if (A.open) {
        // B's f on A's f side or across, by the way B's line runs against A's
        const [bf, bg] = Math.sign(t - s) * B.side === A.side ? B.by : [B.by[1], B.by[0]];
        if ((A.by[0] - bf) * (A.by[1] - bg) < 0) found.push([A.e, B.e]);
        continue;
      }
      if (Math.sign(t - s) * B.side !== A.side) continue;
      const nested = (A.lo < B.lo && B.hi < A.hi) || (B.lo < A.lo && A.hi < B.hi);
      const apart = A.hi < B.lo || B.hi < A.lo;
      if (!nested && !apart) found.push([A.e, B.e]);
    }
  });
  return found;
}

/**
 * Creases folded flat at the end of `step` whose faces lie on the wrong side of each other for the crease: a
 * valley puts its second face on the first face's front (the flat sheet's +z side), a mountain on its back. The
 * ±180° labels are one pose, so only the stack can tell them apart. Slit edges are skipped.
 */
export function wrongSides(model: Model, step: number): number[] {
  const faces = foldedPositions(model, step, 1);
  /** Face f's front, from its widest corner triple (split edges leave corners in a line). */
  const front = (f: number): Vec3 => {
    const flat = model.faces[f].map((v) => model.vertices[v]);
    let best: [number, number, number] = [0, 1, 2];
    let widest = 0;
    for (let i = 0; i < flat.length; i++)
      for (let j = i + 1; j < flat.length; j++)
        for (let k = j + 1; k < flat.length; k++) {
          const [a, b, c] = [flat[i], flat[j], flat[k]];
          const z = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
          if (Math.abs(z) > Math.abs(widest)) [widest, best] = [z, [i, j, k]];
        }
    const [p, q, r] = best.map((i) => faces[f][i]);
    const n = cross(sub(q, p), sub(r, p));
    return widest > 0 ? n : [-n[0], -n[1], -n[2]];
  };
  const angles = model.steps[step].angles;
  return model.edges.flatMap((_, e) => {
    if (Math.abs(angles[e]) !== 180 || model.edgeFaces[e].length !== 2 || model.cutAt[e] <= step) return [];
    const [f, g] = model.edgeFaces[e];
    const side = Math.sign(dot(front(f), sub(centre(faces[g]), faces[f][0])));
    return side === Math.sign(angles[e]) ? [] : [e];
  });
}

/** Everything wrong with a model, one sentence each; empty when it may ship. */
export function checkModel(model: Model, budget = SEAM_BUDGET): string[] {
  const problems: string[] = [];
  for (let k = 1; k < model.steps.length; k++) {
    const c = checkConsistency(model, k);
    if (!c.ok) problems.push(`Step ${k} does not fold flat: edges ${c.edges.join(', ')} disagree.`);
    if (k + 1 < model.steps.length) {
      const end = foldedPositions(model, k, 1);
      const jump = Math.max(
        ...foldedPositions(model, k + 1, 0).flatMap((face, f) => face.map((p, i) => Math.hypot(...sub(p, end[f][i]))))
      );
      if (jump > 1e-9) problems.push(`Step ${k + 1} starts ${jump.toExponential(1)} away from where step ${k} ended.`);
    }
    for (let i = 1; i <= 10; i++) {
      const gap = spread(model, k, i / 10);
      if (gap > budget) problems.push(`Step ${k} at ${i * 10}% opens a ${gap.toFixed(3)} gap (budget ${budget}).`);
    }
    for (const e of wrongSides(model, k)) {
      problems.push(`Step ${k}: the faces at edge ${e} lie on the wrong side of each other for its mountain/valley.`);
    }
    for (const [a, b] of interleaved(model, k)) {
      problems.push(
        model.steps[k].angles[a] === 0
          ? `Step ${k}: the layers at edges ${a} and ${b} cross each other along their line.`
          : `Step ${k}: the folds at edges ${a} and ${b} interleave in the stack (paper can only nest them).`
      );
    }
    // a reverse fold's flap fans through the body: sample it finely
    const n = isReverseFold(model, k) ? 40 : 10;
    const ts = Array.from({ length: n }, (_, i) => (i + 1) / n);
    const at = (t: number) => `Step ${k} at ${Math.round(t * 100)}%`;
    for (const t of ts) {
      const hits = crossings(model, k, t);
      if (hits.length) {
        const pairs = hits.filter(([f, g]) => f < g).map(([f, g]) => `${f}×${g}`);
        problems.push(
          `${at(t)}: faces ${(pairs.length ? pairs : hits.map((h) => h.join('×'))).join(', ')} pass through each other.`
        );
        break;
      }
    }
    const traded = tradesPlaces(model, k, ts);
    if (traded.length) {
      const t = Math.min(...traded.map((s) => s.t));
      const pairs = traded.filter((s) => s.t === t).map((s) => s.pair.join('×'));
      problems.push(`${at(t)}: faces ${pairs.join(', ')} change places mid-step.`);
    }
  }
  problems.push(...flapFlips(model));
  return problems;
}
