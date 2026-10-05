import { stepCreases } from '../fold/creases';
import { anglesAt } from '../fold/fold';
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

function segment(model: Model, faces: Vec3[][], e: number): number[] {
  const f = model.edgeFaces[e][0];
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
): { borders: number[]; folded: number[]; flat: number[] } {
  const { active, past } = stepCreases(model, step);
  const angles = anglesAt(model, step, t);
  const borders: number[] = [];
  const folded: number[] = [];
  const flat: number[] = [];
  model.assignments.forEach((a, e) => {
    if (a === 'B') borders.push(...segment(model, faces, e));
  });
  for (const e of [...active, ...past].sort((x, y) => x - y)) {
    (Math.abs(angles[e]) > FOLDED_DEGREES ? folded : flat).push(...segment(model, faces, e));
  }
  return { borders, folded, flat };
}
