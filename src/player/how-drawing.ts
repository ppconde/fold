import { Vector3 } from 'three';
import { LAYER_GAP, movingFaces, reverseFan } from '../fold/fold';
import type { Model, Vec2, Vec3 } from '../fold/types';

export type Seg = { from: Vec2; to: Vec2; hidden: boolean };
/** `subject`: the paper the frame is about, at full tone; the rest is drawn lighter, as books set the subject apart. */
export type HowFace = {
  points: Vec2[];
  side: 'front' | 'back';
  edges: [Vec2, Vec2][];
  depth: number;
  subject: boolean;
};
export type HowFrame = {
  /** Painter order, back to front. */
  faces: HowFace[];
  /** The layer behind the flap, parted a little: its white side peeks out (first frame only). */
  peek: Vec2[] | null;
  /** The fold line, a mountain line (first two frames). */
  fold: Seg[];
  /** The flap's flipping edge; a ghost is where it goes (second frame) or where it was (third). */
  spine: (Seg & { ghost: boolean })[];
  /** Where the flap lands, dotted (second frame). */
  landing: Vec2[] | null;
  /** The broad push arrow at the spine; `dir` is unit and points in (second frame). */
  push: { at: Vec2; dir: Vec2 } | null;
  /** The tip's path, a quadratic curve with a filled head at `to` (second frame). */
  arrow: { from: Vec2; to: Vec2; control: Vec2 } | null;
};
export type HowDrawing = {
  /** A square viewBox around the flap, as it starts and as it ends. */
  box: [x: number, y: number, w: number, h: number];
  frames: [HowFrame, HowFrame, HowFrame];
  pivot: Vec2;
  /** The way the flap fans round, in the drawing's plane (unit). */
  line: Vec2;
  flapStart: Vec2[];
  flapEnd: Vec2[];
};

const drawings = new WeakMap<Model, (HowDrawing | null)[]>();
const edgeIndexes = new WeakMap<Model, Map<string, number>>();
const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function edgeIndex(model: Model): Map<string, number> {
  let index = edgeIndexes.get(model);
  if (!index) {
    index = new Map(model.edges.map(([a, b], e) => [key(a, b), e]));
    edgeIndexes.set(model, index);
  }
  return index;
}

/** Convex hull (monotone chain), counter-clockwise. */
function hull(points: Vec2[]): Vec2[] {
  const ps = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Vec2[]) => {
    const out: Vec2[] = [];
    for (const p of list) {
      while (out.length >= 2 && turn(out[out.length - 2], out[out.length - 1], p) <= 1e-12) out.pop();
      out.push(p);
    }
    return out.slice(0, -1);
  };
  return [...half(ps), ...half([...ps].reverse())];
}

/** Strictly inside a convex polygon. */
function inside(p: Vec2, poly: Vec2[]): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [a, b] = [poly[i], poly[(i + 1) % poly.length]];
    const c = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (Math.abs(c) < 1e-9) return false;
    if (sign && Math.sign(c) !== sign) return false;
    sign = Math.sign(c);
  }
  return true;
}

const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * A reverse fold's "How", as a book draws it: three frames in the body's plane, seen from the side the player's
 * camera starts on (open the layers, push the folded edge in, flatten), from the model's own faces. Null unless the
 * step is a reverse fold.
 */
export function howDrawing(model: Model, step: number): HowDrawing | null {
  const list = drawings.get(model) ?? [];
  drawings.set(model, list);
  if (list[step] !== undefined) return list[step];
  list[step] = null;
  const fan = step > 0 ? reverseFan(model, step) : null;
  if (!fan) return null;

  const moving = movingFaces(model, step);
  const index = edgeIndex(model);
  const before = model.steps[step - 1].angles;
  const after = model.steps[step].angles;
  const pivot3 = new Vector3(...fan.pivot);
  // the camera starts above the paper's front (+z) with +x to the right: draw the plane as it sees it
  const view = new Vector3(...fan.normal);
  if (view.z < 0) view.negate();
  const ex = Math.abs(view.x) > 0.8 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  ex.addScaledVector(view, -ex.dot(view)).normalize();
  const ey = view.clone().cross(ex);
  const at = (p: Vec3): Vec2 => {
    const d = new Vector3(...p).sub(pivot3);
    return [d.dot(ex), -d.dot(ey)];
  };
  const depthOf = (p: Vec3) => new Vector3(...p).sub(pivot3).dot(view);

  const drawFaces = (pose: Vec3[][], angles: number[]) =>
    model.faces
      .flatMap((face, f): (Omit<HowFace, 'subject'> & { face: number })[] => {
        const ps = pose[f].map((p) => new Vector3(...p));
        const n = new Vector3();
        for (let i = 1; i + 1 < ps.length; i++)
          n.add(
            ps[i]
              .clone()
              .sub(ps[0])
              .cross(ps[i + 1].clone().sub(ps[0]))
          );
        const facing = n.normalize().dot(view);
        // edge-on: a sliver, not worth drawing
        if (Math.abs(facing) < 0.2) return [];
        const points = pose[f].map(at);
        const edges = face.flatMap((v, i): [Vec2, Vec2][] => {
          const e = index.get(key(v, face[(i + 1) % face.length]));
          if (e === undefined) return [];
          const drawn = model.assignments[e] === 'B' || model.assignments[e] === 'C' || Math.abs(angles[e]) === 180;
          return drawn ? [[points[i], points[(i + 1) % face.length]]] : [];
        });
        const depth = pose[f].reduce((s, p) => s + depthOf(p), 0) / pose[f].length;
        return [{ points, side: facing > 0 ? 'front' : 'back', edges, depth, face: f }];
      })
      .sort((a, b) => a.depth - b.depth);

  // a line on the topmost face that carries it; runs under a face above it are hidden
  const marks = (pose: Vec3[][], faces: ReturnType<typeof drawFaces>, keep: (e: number) => boolean): Seg[] =>
    model.edges.flatMap(([a, b], e) => {
      if (!keep(e)) return [];
      const owners = model.edgeFaces[e].filter((f) => moving.has(f));
      if (!owners.length) return [];
      const f = owners.reduce((x, y) => (depthOf(pose[y][0]) > depthOf(pose[x][0]) ? y : x));
      const [from, to] = [at(pose[f][model.faces[f].indexOf(a)]), at(pose[f][model.faces[f].indexOf(b)])];
      const own = model.faces[f].reduce((s, _, i) => s + depthOf(pose[f][i]), 0) / model.faces[f].length;
      const covered = (p: Vec2) => faces.some((x) => x.depth > own + LAYER_GAP / 2 && inside(p, x.points));
      const N = 32;
      const segs: Seg[] = [];
      let start = from;
      let hidden = covered(lerp(from, to, 0.5 / N));
      for (let i = 1; i <= N; i++) {
        const next = i < N ? covered(lerp(from, to, (i + 0.5) / N)) : !hidden;
        if (next !== hidden) {
          const end = i < N ? lerp(from, to, i / N) : to;
          segs.push({ from: start, to: end, hidden });
          [start, hidden] = [end, next];
        }
      }
      return segs;
    });

  const isSpine = (e: number) =>
    Math.abs(before[e]) === 180 && after[e] === -before[e] && model.edgeFaces[e].every((f) => moving.has(f));
  const isFold = (e: number) => before[e] === 0 && after[e] !== 0;

  const startFaces = drawFaces(fan.from, before);
  const endFaces = drawFaces(fan.to, after);
  const corners = (pose: Vec3[][]) => [...moving].flatMap((f) => pose[f].map(at));
  const [flapStart, flapEnd] = [hull(corners(fan.from)), hull(corners(fan.to))];
  const pivot = at(fan.pivot);
  const lineRaw: Vec2 = [new Vector3(...fan.line).dot(ex), -new Vector3(...fan.line).dot(ey)];
  const line: Vec2 = [lineRaw[0] / Math.hypot(...lineRaw), lineRaw[1] / Math.hypot(...lineRaw)];

  // the frame: around the flap as it starts and ends, square, with a margin
  const all = [...flapStart, ...flapEnd];
  const [x0, x1] = [Math.min(...all.map((p) => p[0])), Math.max(...all.map((p) => p[0]))];
  const [y0, y1] = [Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[1]))];
  const size = Math.max(x1 - x0, y1 - y0) * 1.45;
  const box: HowDrawing['box'] = [(x0 + x1) / 2 - size / 2, (y0 + y1) / 2 - size / 2, size, size];

  // in the plane, across the spine, pointing into the flap
  const spineStart = marks(fan.from, startFaces, isSpine);
  const far = spineStart
    .flatMap((s) => [s.from, s.to])
    .reduce((a, b) =>
      Math.hypot(b[0] - pivot[0], b[1] - pivot[1]) > Math.hypot(a[0] - pivot[0], a[1] - pivot[1]) ? b : a
    );
  const along = [far[0] - pivot[0], far[1] - pivot[1]];
  const centre = flapStart.reduce((c, p) => [c[0] + p[0] / flapStart.length, c[1] + p[1] / flapStart.length], [0, 0]);
  let dir: Vec2 = [-along[1] / Math.hypot(...along), along[0] / Math.hypot(...along)];
  if ((centre[0] - pivot[0]) * dir[0] + (centre[1] - pivot[1]) * dir[1] < 0) dir = [-dir[0], -dir[1]];

  // the tip: the flap's corner that travels farthest; its path bows the way the flap fans
  const [tipFrom, tipTo] = [...moving]
    .flatMap((f) => fan.from[f].map((p, i): [Vec2, Vec2] => [at(p), at(fan.to[f][i])]))
    .reduce((a, b) =>
      Math.hypot(b[1][0] - b[0][0], b[1][1] - b[0][1]) > Math.hypot(a[1][0] - a[0][0], a[1][1] - a[0][1]) ? b : a
    );
  const [from, to] = [lerp(tipFrom, tipTo, 0.08), lerp(tipTo, tipFrom, 0.08)];
  const span = Math.hypot(to[0] - from[0], to[1] - from[1]);
  let bow: Vec2 = [-(to[1] - from[1]) / span, (to[0] - from[0]) / span];
  if (bow[0] * line[0] + bow[1] * line[1] < 0) bow = [-bow[0], -bow[1]];
  const mid = lerp(from, to, 0.5);
  const control: Vec2 = [mid[0] + bow[0] * 0.35 * span, mid[1] + bow[1] * 0.35 * span];

  const fold = marks(fan.from, startFaces, isFold);
  const spineEnd = marks(fan.to, endFaces, isSpine);
  const ghost = (segs: Seg[]) => segs.map((s) => ({ ...s, hidden: true, ghost: true }));
  const solid = (segs: Seg[]) => segs.map((s) => ({ ...s, ghost: false }));
  // the first two frames are about the flap; the last shows the paper as it ends, all of it
  const plain = (faces: ReturnType<typeof drawFaces>, all: boolean): HowFace[] =>
    faces.map(({ points, side, edges, depth, face }) => ({
      points,
      side,
      edges,
      depth,
      subject: all || moving.has(face)
    }));
  const shift = 0.03 * size;
  const none = { peek: null, landing: null, push: null, arrow: null };
  list[step] = {
    box,
    pivot,
    line,
    flapStart,
    flapEnd,
    frames: [
      {
        ...none,
        faces: plain(startFaces, false),
        peek: flapStart.map((p): Vec2 => [p[0] + dir[0] * shift, p[1] + dir[1] * shift]),
        fold,
        spine: solid(spineStart)
      },
      {
        ...none,
        faces: plain(startFaces, false),
        fold,
        spine: [...solid(spineStart), ...ghost(spineEnd)],
        landing: flapEnd,
        push: { at: [pivot[0] - dir[0] * 0.04 * size, pivot[1] - dir[1] * 0.04 * size], dir },
        arrow: { from, to, control }
      },
      { ...none, faces: plain(endFaces, true), fold: [], spine: [...solid(spineEnd), ...ghost(spineStart)] }
    ]
  };
  return list[step];
}
