import { cornerKeys } from '../src/fold/cuts';
import { checkConsistency, foldedPositions, layerHeights } from '../src/fold/fold';
import type { Model, Vec3 } from '../src/fold/types';

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
  const first = new Map<number, Vec3>();
  let worst = 0;
  model.faces.forEach((face, f) => {
    face.forEach((_, c) => {
      const p = faces[f][c];
      const q = first.get(keys[f][c]);
      if (q) worst = Math.max(worst, Math.hypot(...sub(p, q)));
      else first.set(keys[f][c], p);
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
  const normalOf = ([p, q, r]: Vec3[]) => unit(cross(sub(q, p), sub(r, p)));
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
    for (let i = 1; i <= 10; i++) {
      const hits = crossings(model, k, i / 10);
      if (hits.length) {
        const pairs = hits.filter(([f, g]) => f < g).map(([f, g]) => `${f}×${g}`);
        problems.push(
          `Step ${k} at ${i * 10}%: faces ${(pairs.length ? pairs : hits.map((h) => h.join('×'))).join(', ')} pass through each other.`
        );
        break;
      }
    }
  }
  problems.push(...flapFlips(model));
  return problems;
}
