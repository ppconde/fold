import { Sphere, Vector3 } from 'three';
import { LAYER_GAP } from '../fold/fold';
import type { Model } from '../fold/types';

/** Paper closer to the eye than a line by less than this doesn't hide it: it's the line's own layer. */
const HIDES = LAYER_GAP / 2;
/** Samples per unit of line length (the paper's side is 1), and bisections where a line goes out of sight. */
const SAMPLES = 30;
const BISECTIONS = 6;

/** Which face each of fillTriangles' triangles belongs to. */
export const triangleFaces = (model: Model): number[] =>
  model.faces.flatMap((f, i) => Array.from({ length: f.length - 2 }, () => i));

/** Distance from `o` along unit `d` to triangle `t` of `tris` (9 floats each), either side, or Infinity. */
function hit(tris: ArrayLike<number>, t: number, o: Vector3, d: Vector3): number {
  const i = t * 9;
  const ax = tris[i];
  const ay = tris[i + 1];
  const az = tris[i + 2];
  const e1x = tris[i + 3] - ax;
  const e1y = tris[i + 4] - ay;
  const e1z = tris[i + 5] - az;
  const e2x = tris[i + 6] - ax;
  const e2y = tris[i + 7] - ay;
  const e2z = tris[i + 8] - az;
  // Möller–Trumbore
  const px = d.y * e2z - d.z * e2y;
  const py = d.z * e2x - d.x * e2z;
  const pz = d.x * e2y - d.y * e2x;
  const det = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(det) < 1e-12) return Infinity;
  const sx = o.x - ax;
  const sy = o.y - ay;
  const sz = o.z - az;
  const u = (sx * px + sy * py + sz * pz) / det;
  if (u < 0 || u > 1) return Infinity;
  const qx = sy * e1z - sz * e1y;
  const qy = sz * e1x - sx * e1z;
  const qz = sx * e1y - sy * e1x;
  const v = (d.x * qx + d.y * qy + d.z * qz) / det;
  if (v < 0 || u + v > 1) return Infinity;
  const dist = (e2x * qx + e2y * qy + e2z * qz) / det;
  return dist > 0 ? dist : Infinity;
}

const towards = new Vector3();

/**
 * The parts of `flat`'s segments (6 floats each) that `eye` sees past the paper (`tris`, as fillTriangles writes it),
 * all in paper coordinates. Segment i lies on edge `edges[i]`, whose faces never hide it: across a fold they can sit
 * a few layers apart and poke out over the line. Every other face hides the line wherever it's in front, so a crease
 * tucked under other layers isn't drawn through them.
 * `oneCopy`: the segments are copies of creases, one per face, and only the copy most in sight is drawn (the nearer of
 * two equally seen). They're one line in the paper; a fold's other copy sits layers away, where the bend our flat
 * faces leave out would hide it.
 */
export function visibleParts(
  flat: number[],
  edges: number[],
  edgeFaces: number[][],
  tris: ArrayLike<number>,
  faceOf: number[],
  eye: Vector3,
  oneCopy = false
): number[] {
  // each triangle's bounding sphere, so a segment only tests the triangles that could come between it and the eye;
  // ponytail: still segments × samples × triangles (~1 ms a redraw for the crane), a BVH if models grow much bigger
  const spheres = faceOf.map((_, t) => {
    const corners = [0, 3, 6].map((k) => new Vector3(tris[t * 9 + k], tris[t * 9 + k + 1], tris[t * 9 + k + 2]));
    const { center, radius } = new Sphere().setFromPoints(corners);
    return eye.distanceTo(center) - radius;
  });
  const parts = edges.map((e, j) => {
    const i = j * 6;
    const out: number[] = [];
    const own = edgeFaces[e];
    const a = new Vector3(...flat.slice(i, i + 3));
    const b = new Vector3(...flat.slice(i + 3, i + 6));
    const reach = Math.max(eye.distanceTo(a), eye.distanceTo(b)) - HIDES;
    const near = spheres.flatMap((d, t) => (d < reach && !own.includes(faceOf[t]) ? [t] : []));
    const at = (s: number) => a.clone().lerp(b, s);
    const seen = (s: number) => {
      // a hair in from the ends, where the faces round a corner meet the line
      const far =
        towards
          .copy(at(0.005 + 0.99 * s))
          .sub(eye)
          .length() - HIDES;
      towards.normalize();
      return near.every((t) => hit(tris, t, eye, towards) >= far);
    };
    // where the line goes in or out of sight between samples s0 (seen: v0) and s1
    const edge = (s0: number, s1: number, v0: boolean) => {
      for (let k = 0; k < BISECTIONS; k++) {
        const m = (s0 + s1) / 2;
        if (seen(m) === v0) s0 = m;
        else s1 = m;
      }
      return (s0 + s1) / 2;
    };
    const n = Math.max(1, Math.ceil(a.distanceTo(b) * SAMPLES));
    let from = seen(0) ? 0 : -1;
    let was = from === 0;
    for (let k = 1; k <= n; k++) {
      const s = k / n;
      const is = seen(s);
      if (is === was) continue;
      const cross = edge((k - 1) / n, s, was);
      if (is) from = cross;
      else out.push(...at(from).toArray(), ...at(cross).toArray());
      was = is;
    }
    if (was) out.push(...at(from).toArray(), ...b.toArray());
    return out;
  });
  if (!oneCopy) return parts.flat();
  // the copy of each crease to draw: most in sight, then nearest
  const score = (j: number) => {
    let seen = 0;
    for (let k = 0; k < parts[j].length; k += 6)
      seen += Math.hypot(...[0, 1, 2].map((c) => parts[j][k + c] - parts[j][k + 3 + c]));
    const middle = new Vector3(...flat.slice(j * 6, j * 6 + 3)).add(new Vector3(...flat.slice(j * 6 + 3, j * 6 + 6)));
    return Math.round(seen * 1e3) - eye.distanceTo(middle.divideScalar(2)) / 1e3;
  };
  const best = new Map<number, number>();
  edges.forEach((e, j) => {
    const k = best.get(e);
    if (k === undefined || score(j) > score(k)) best.set(e, j);
  });
  return [...best.values()].flatMap((j) => parts[j]);
}
