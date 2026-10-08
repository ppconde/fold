import { stepCreases } from '../fold/creases';
import { anglesAt, foldedPositions } from '../fold/fold';
import type { Model, Vec2, Vec3 } from '../fold/types';

export type Extent = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  size: number;
  center: Vec2;
};

/** A crease is drawn as folded once it has moved more than this many degrees. */
const FOLDED_DEGREES = 0.5;

export function paperExtent(model: Model): Extent {
  const xs = model.vertices.map((v) => v[0]);
  const ys = model.vertices.map((v) => v[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const width = maxX - minX;
  const height = maxY - minY;
  return { minX, minY, maxX, maxY, width, height, size: Math.max(width, height), center: model.center };
}

/** The lesson stage's camera: vertical field of view in degrees, and its angle from straight down in radians. */
export const STAGE_FOV = 35;
export const STAGE_POLAR = 0.9;

/**
 * How far the stage's camera sits from the paper, per unit of the paper's reach, in a view `aspect` wide: far
 * enough that a ball holding the paper, with some room, fits the narrower side.
 */
export function stageDistance(aspect: number): number {
  const half = (STAGE_FOV / 2) * (Math.PI / 180);
  return 1.08 / Math.sin(Math.min(half, Math.atan(Math.tan(half) * aspect)));
}

/** World (x, z) centre of the paper's bounding box once `step` has settled; paper (x, y) maps to world (x − cx, −(y − cy)). */
export function endCentre(model: Model, step: number): [number, number] {
  const points = foldedPositions(model, step, step === 0 ? 0 : 1).flat();
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [cx, cy] = model.center;
  return [(Math.min(...xs) + Math.max(...xs)) / 2 - cx, -((Math.min(...ys) + Math.max(...ys)) / 2 - cy)];
}

/**
 * How far the paper reaches from the camera's centre (endCentre of `step`): the settled pose, or, while step
 * `playing` plays or is scrubbed, every pose it passes (a flap standing up, a turn-over). Sampled at quarter steps.
 */
export function frameReach(model: Model, step: number, playing?: number): number {
  const [cx, cz] = endCentre(model, step);
  const [x0, y0] = [cx + model.center[0], model.center[1] - cz];
  const poses =
    playing === undefined
      ? [foldedPositions(model, step, step === 0 ? 0 : 1)]
      : [0, 0.25, 0.5, 0.75, 1].map((t) => foldedPositions(model, playing, t));
  let reach = 0;
  for (const [x, y, z] of poses.flat(2)) reach = Math.max(reach, Math.hypot(x - x0, y - y0, z));
  return reach;
}

export function triangleCount(model: Model): number {
  return model.faces.reduce((n, f) => n + f.length - 2, 0);
}

/** Fan-triangulates every face (faces are convex) into `out`, 9 floats per triangle. */
export function fillTriangles(faces: Vec3[][], out: Float32Array): void {
  let i = 0;
  for (const face of faces) {
    for (let k = 1; k < face.length - 1; k++) {
      for (const p of [face[0], face[k], face[k + 1]]) {
        out[i++] = p[0];
        out[i++] = p[1];
        out[i++] = p[2];
      }
    }
  }
}

/** Flat-paper UVs (0..1) in the same triangle order as fillTriangles, 6 floats per triangle. */
export function fillUVs(model: Model, out: Float32Array): void {
  const { minX, minY, size } = paperExtent(model);
  let i = 0;
  for (const face of model.faces) {
    for (let k = 1; k < face.length - 1; k++) {
      for (const v of [face[0], face[k], face[k + 1]]) {
        out[i++] = (model.vertices[v][0] - minX) / size;
        out[i++] = (model.vertices[v][1] - minY) / size;
      }
    }
  }
}

/** Edge `e` as drawn on face `f` (default: the first face that owns it). */
function segment(model: Model, faces: Vec3[][], e: number, f = model.edgeFaces[e][0]): number[] {
  const j = model.faceEdges[f].indexOf(e);
  const a = faces[f][j];
  const b = faces[f][(j + 1) % faces[f].length];
  return [...a, ...b];
}

export function lineGroups(
  model: Model,
  faces: Vec3[][],
  step: number,
  t: number
): { borders: number[]; folded: number[]; flat: number[]; active: number[]; cut: number[] } {
  const { active, past } = stepCreases(model, step);
  const angles = anglesAt(model, step, t);
  const borders: number[] = [];
  const folded: number[] = [];
  const flat: number[] = [];
  const highlighted: number[] = [];
  model.assignments.forEach((a, e) => {
    if (a === 'B') borders.push(...segment(model, faces, e));
    // once cut, a slit is an edge of the paper on each side, and the sides may have parted
    if (a === 'C' && model.cutAt[e] < step)
      for (const f of model.edgeFaces[e]) borders.push(...segment(model, faces, e, f));
  });
  // every face's copy of the step's crease: copies can drift apart under the 178° clamp, and one may hide
  for (const e of active) for (const f of model.edgeFaces[e]) highlighted.push(...segment(model, faces, e, f));
  for (const e of past) (Math.abs(angles[e]) > FOLDED_DEGREES ? folded : flat).push(...segment(model, faces, e));
  // the slit this step cuts, from where the scissors go in to as far as they've got, on every layer
  const reach = Math.max(0, Math.min(1, t));
  const cut: number[] = [];
  for (const { edge, from, to } of model.steps[step].cuts) {
    const [lo, hi] = from < to ? [from, to] : [to, from];
    if (reach <= lo) continue;
    const share = (Math.min(reach, hi) - lo) / (hi - lo);
    for (const f of model.edgeFaces[edge]) {
      const corner = (v: number) => faces[f][model.faces[f].indexOf(v)];
      const [a, b] = model.edges[edge].map(corner);
      const [p, q] = from < to ? [a, b] : [b, a];
      cut.push(...p, ...p.map((x, i) => x + (q[i] - x) * share));
    }
  }
  return { borders, folded, flat, active: highlighted, cut };
}
