import { foldedPositions, LAYER_GAP } from '../fold/fold';
import type { Cue, Model, Vec2, Vec3 } from '../fold/types';

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
const unit = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(...a));

/**
 * The map from a face's flat-sheet points to where they sit on `pose` (faces are rigid, so three corners fix
 * it), and the face's normal turned up (+z).
 */
function faceMap(model: Model, pose: Vec3[][], f: number): { at: (p: Vec2) => Vec3; up: Vec3 } {
  const flat = model.faces[f].map((v) => model.vertices[v]);
  const a = 0;
  // the corner farthest from the first, then the one farthest off that line: corners mid-side are collinear
  const b = flat.reduce(
    (best, v, i) =>
      Math.hypot(v[0] - flat[a][0], v[1] - flat[a][1]) >
      Math.hypot(flat[best][0] - flat[a][0], flat[best][1] - flat[a][1])
        ? i
        : best,
    1
  );
  const off = (v: Vec2) =>
    Math.abs((flat[b][0] - flat[a][0]) * (v[1] - flat[a][1]) - (flat[b][1] - flat[a][1]) * (v[0] - flat[a][0]));
  const c = flat.reduce((best, v, i) => (off(v) > off(flat[best]) ? i : best), 0);
  const [u, w] = [sub([...flat[b], 0], [...flat[a], 0]), sub([...flat[c], 0], [...flat[a], 0])];
  const det = u[0] * w[1] - u[1] * w[0];
  const [A, U, W] = [pose[f][a], sub(pose[f][b], pose[f][a]), sub(pose[f][c], pose[f][a])];
  const n = unit(cross(U, W));
  return {
    at: ([x, y]) => {
      const [dx, dy] = [x - flat[a][0], y - flat[a][1]];
      const s = (dx * w[1] - dy * w[0]) / det;
      const t = (u[0] * dy - u[1] * dx) / det;
      return add(A, add(scale(U, s), scale(W, t)));
    },
    up: n[2] < 0 ? scale(n, -1) : n
  };
}

/** One cue's line segments (two points each), lifted off its face. */
function cueLines(cue: Cue, map: ReturnType<typeof faceMap>): Vec3[] {
  const lift = scale(map.up, 3 * LAYER_GAP);
  const [from, to] = [add(map.at(cue.from), lift), add(map.at(cue.to), lift)];
  const length = Math.hypot(...sub(to, from));
  const along = unit(sub(to, from));
  if (cue.kind === 'push') {
    // a hollow arrow lying on the face: shaft, then head
    const side = unit(cross(map.up, along));
    const neck = add(from, scale(along, 0.65 * length));
    const corners = [
      add(from, scale(side, 0.09 * length)),
      add(neck, scale(side, 0.09 * length)),
      add(neck, scale(side, 0.225 * length)),
      to,
      add(neck, scale(side, -0.225 * length)),
      add(neck, scale(side, -0.09 * length)),
      add(from, scale(side, -0.09 * length))
    ];
    return corners.flatMap((v, i) => [v, corners[(i + 1) % corners.length]]);
  }
  // an arc rising off the paper, then a V head along its last tangent
  const control = add(scale(add(from, to), 0.5), scale(map.up, 0.35 * length));
  const arc = Array.from({ length: 17 }, (_, i) => {
    const t = i / 16;
    return add(add(scale(from, (1 - t) ** 2), scale(control, 2 * (1 - t) * t)), scale(to, t * t));
  });
  const back = unit(sub(control, to));
  const across = unit(sub(map.up, scale(back, dot(map.up, back))));
  const [c, s] = [Math.cos((25 * Math.PI) / 180), Math.sin((25 * Math.PI) / 180)];
  const head = [1, -1].map((k) => add(to, scale(add(scale(back, c), scale(across, k * s)), 0.18 * length)));
  return [...arc.slice(1).flatMap((v, i) => [arc[i], v]), to, head[0], to, head[1]];
}

/** Line segments (x, y, z per point, two points per segment) of `step`'s movement arrows, on its starting pose. */
export function cueSegments(model: Model, step: number): number[] {
  const cues = model.steps[step]?.cues ?? [];
  if (!step || !cues.length) return [];
  const pose = foldedPositions(model, step, 0);
  return cues.flatMap((cue) => cueLines(cue, faceMap(model, pose, cue.face)).flat());
}

/** The arrows' opacity at progress `t` through their step: full at the start, gone halfway. */
export const cueOpacity = (t: number) => Math.max(0, Math.min(1, 1 - (t - 0.1) / 0.4));
