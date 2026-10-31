import { MathUtils, Vector3 } from 'three';
import { stepCreases } from '../fold/creases';
import { anglesAt, paperExtent } from '../fold/fold';
import { reverseFold } from '../fold/reverse';
import type { Model, Vec3 } from '../fold/types';

/** A crease is drawn as folded once it has moved more than this many degrees. */
const FOLDED_DEGREES = 0.5;

/** How far the paper's lowest point goes below the table (z = 0); 0 while it stays on or above it. */
export function depthBelowTable(faces: Vec3[][]): number {
  let low = 0;
  for (const face of faces) for (const p of face) low = Math.min(low, p[2]);
  return low < 0 ? -low : 0;
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

type Group = 'borders' | 'folded' | 'flat' | 'active' | 'cut';

/** `highlight` false draws the step's creases as past ones, in ink, as a finished model shows them. `edges` holds each
 * segment's crease (or border), in the same order as its group's segments. `spine`: a reverse fold's flipping edge on
 * every face, as the How drawings pick it out (none when `highlight` is false). */
export function lineGroups(
  model: Model,
  faces: Vec3[][],
  step: number,
  t: number,
  highlight = true
): Record<Group, number[]> & { edges: Record<Group, number[]>; spine: number[] } {
  const creases = stepCreases(model, step);
  const active = highlight ? creases.active : [];
  const past = highlight ? creases.past : [...creases.past, ...creases.active];
  const angles = anglesAt(model, step, t);
  const lines: Record<Group, number[]> = { borders: [], folded: [], flat: [], active: [], cut: [] };
  const edges: Record<Group, number[]> = { borders: [], folded: [], flat: [], active: [], cut: [] };
  const add = (group: Group, e: number, points: number[]) => {
    lines[group].push(...points);
    edges[group].push(e);
  };
  model.assignments.forEach((a, e) => {
    if (a === 'B') add('borders', e, segment(model, faces, e));
    // once cut, a slit is an edge of the paper on each side, and the sides may have parted
    if (a === 'C' && model.cutAt[e] < step)
      for (const f of model.edgeFaces[e]) add('borders', e, segment(model, faces, e, f));
  });
  // every face's copy of a crease: copies drift apart under the 178° clamp or sit on different layers, and one may hide
  for (const e of active) for (const f of model.edgeFaces[e]) add('active', e, segment(model, faces, e, f));
  for (const e of past)
    for (const f of model.edgeFaces[e])
      add(Math.abs(angles[e]) > FOLDED_DEGREES ? 'folded' : 'flat', e, segment(model, faces, e, f));
  // the slit this step cuts, from where the scissors go in to as far as they've got, on every layer
  const reach = MathUtils.clamp(t, 0, 1);
  for (const { edge, from, to } of model.steps[step].cuts) {
    const [lo, hi] = from < to ? [from, to] : [to, from];
    if (reach <= lo) continue;
    const share = (Math.min(reach, hi) - lo) / (hi - lo);
    for (const f of model.edgeFaces[edge]) {
      const corner = (v: number) => faces[f][model.faces[f].indexOf(v)];
      const [a, b] = model.edges[edge].map(corner);
      const [p, q] = from < to ? [a, b] : [b, a];
      add('cut', edge, [...p, ...p.map((x, i) => x + (q[i] - x) * share)]);
    }
  }
  const spine = highlight
    ? (reverseFold(model, step)?.spine ?? []).flatMap((e) =>
        model.edgeFaces[e].flatMap((f) => segment(model, faces, e, f))
      )
    : [];
  return { ...lines, edges, spine };
}

/** Flat segments cut into a mountain line's dash-dot (dash 8, gap 3, dot 2, gap 3, as the crease diagram's), `unit`
 * long per step of it. Its phase is taken along the line, so a crease repeated on stacked layers dashes as one. */
export function dashDot(flat: number[], unit: number): number[] {
  const steps = [8, 3, 2, 3].map((x) => x * unit);
  const period = 16 * unit;
  const out: number[] = [];
  for (let i = 0; i < flat.length; i += 6) {
    let [a, b] = [new Vector3(...flat.slice(i, i + 3)), new Vector3(...flat.slice(i + 3, i + 6))];
    const d = b.clone().sub(a);
    const major = d.toArray().map(Math.abs);
    if (d.getComponent(major.indexOf(Math.max(...major))) < 0) {
      [a, b] = [b, a];
      d.negate();
    }
    const length = d.length();
    const dir = d.normalize();
    const at = (s: number) => a.clone().addScaledVector(dir, s).toArray();
    for (let s = -(((a.dot(dir) % period) + period) % period), k = 0; s < length; k++) {
      const e = s + steps[k % 4];
      if (k % 2 === 0 && e > 0) out.push(...at(Math.max(s, 0)), ...at(Math.min(e, length)));
      s = e;
    }
  }
  return out;
}
