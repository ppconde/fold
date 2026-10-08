import { checkConsistency, foldedPositions } from '../src/fold/fold';
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

/** Largest distance between two copies of the same vertex on different faces: a tear mid-step, a seam at rest. */
export function spread(model: Model, step: number, t: number): number {
  const faces = foldedPositions(model, step, t);
  const first = new Map<number, Vec3>();
  let worst = 0;
  model.faces.forEach((face, f) => {
    face.forEach((v, c) => {
      const p = faces[f][c];
      const q = first.get(v);
      if (q) worst = Math.max(worst, Math.hypot(...sub(p, q)));
      else first.set(v, p);
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
