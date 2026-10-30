import { Vector3 } from 'three';
import { anglesAt, foldedPositions, landingAt, movingFaces, reverseFan, spineEdges } from '../fold/fold';
import type { Model, Vec2, Vec3 } from '../fold/types';
import { sketchT } from './how';

export type Seg = { from: Vec2; to: Vec2 };
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
  /** The tip's path as the 3D model takes it, to where it lands, with a filled head at its end (second frame). */
  arrow: Vec2[] | null;
  /** A square viewBox centred on what this frame draws of the flap; every frame's is the same size, so they compare. */
  box: [x: number, y: number, w: number, h: number];
};
export type HowDrawing = {
  frames: [HowFrame, HowFrame, HowFrame];
  pivot: Vec2;
  flapStart: Vec2[];
  flapEnd: Vec2[];
};

const drawings = new WeakMap<Model, (HowDrawing | null)[]>();

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

/**
 * A reverse fold's "How", as a book draws it: three frames in the body's plane, seen from the side the player's
 * camera starts on (open the layers, push the folded edge in, flatten). Each is the 3D model's own pose at the moment
 * the stage shows that frame (`sketchT`), so a drawing and the paper on stage agree. Null unless the step is a
 * reverse fold.
 */
export function howDrawing(model: Model, step: number): HowDrawing | null {
  const list = drawings.get(model) ?? [];
  drawings.set(model, list);
  if (list[step] !== undefined) return list[step];
  list[step] = null;
  const fan = step > 0 ? reverseFan(model, step) : null;
  if (!fan) return null;

  const moving = movingFaces(model, step);
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

  // `all`: every face is the frame's subject, not just the flap's
  const drawFaces = (pose: Vec3[][], angles: number[], all: boolean) =>
    model.faces
      .flatMap((face, f): HowFace[] => {
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
        const edges = model.faceEdges[f].flatMap((e, i): [Vec2, Vec2][] => {
          const drawn = model.assignments[e] === 'B' || model.assignments[e] === 'C' || Math.abs(angles[e]) === 180;
          return drawn ? [[points[i], points[(i + 1) % face.length]]] : [];
        });
        const depth = pose[f].reduce((s, p) => s + depthOf(p), 0) / pose[f].length;
        return [{ points, side: facing > 0 ? 'front' : 'back', edges, depth, subject: all || moving.has(f) }];
      })
      .sort((a, b) => a.depth - b.depth);

  // a line, from the topmost face that carries it
  const marks = (pose: Vec3[][], keep: (e: number) => boolean): Seg[] =>
    model.edges.flatMap(([a, b], e) => {
      const owners = keep(e) ? model.edgeFaces[e].filter((f) => moving.has(f)) : [];
      if (!owners.length) return [];
      const f = owners.reduce((x, y) => (depthOf(pose[y][0]) > depthOf(pose[x][0]) ? y : x));
      return [{ from: at(pose[f][model.faces[f].indexOf(a)]), to: at(pose[f][model.faces[f].indexOf(b)]) }];
    });

  const spineSet = new Set(spineEdges(model, step));
  const isSpine = (e: number) => spineSet.has(e);
  const isFold = (e: number) => before[e] === 0 && after[e] !== 0;

  const landing = landingAt(model, step);
  const times = ([0, 1, 2] as const).map((i) => sketchT(i, landing));
  const poses = times.map((t) => foldedPositions(model, step, t));
  const frameFaces = poses.map((pose, i) => drawFaces(pose, anglesAt(model, step, times[i]), i === 2));
  const corners = (pose: Vec3[][]) => [...moving].flatMap((f) => pose[f].map(at));
  const [flapStart, flapEnd] = [hull(corners(fan.from)), hull(corners(fan.to))];
  const flaps = poses.map((pose) => hull(corners(pose)));
  const pivot = at(fan.pivot);

  // the tip: the flap's corner that travels farthest; its path is the one it takes on stage, up to the landing
  const [tf, ti] = [...moving]
    .flatMap((f) =>
      fan.from[f].map((p, i): [number, number, number] => [
        f,
        i,
        new Vector3(...p).distanceTo(new Vector3(...fan.to[f][i]))
      ])
    )
    .reduce((a, b) => (b[2] > a[2] ? b : a));
  const path = Array.from({ length: 33 }, (_, j) =>
    at(foldedPositions(model, step, times[2] * (0.04 + (0.92 * j) / 32))[tf][ti])
  );

  const spines = poses.map((pose) => marks(pose, isSpine));
  const [spineStart, spineEnd] = [marks(fan.from, isSpine), spines[2]];
  const folds = poses.map((pose) => marks(pose, isFold));

  // one size for every frame
  const ends = (segs: Seg[]) => segs.flatMap((g) => [g.from, g.to]);
  const marksOf = [
    [...ends(folds[0]), ...ends(spines[0])],
    [...flapEnd, ...path, ...ends(folds[1]), ...ends(spines[1]), ...ends(spineEnd)],
    [...ends(spineEnd), ...ends(spineStart)]
  ];
  const centres = flaps.map((flap): Vec2 => {
    const [xs, ys] = [flap.map((p) => p[0]), flap.map((p) => p[1])];
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  });
  const spread = (ps: Vec2[], a: 0 | 1) => Math.max(...ps.map((p) => p[a])) - Math.min(...ps.map((p) => p[a]));
  const helds = flaps.map((flap, i) => [...flap, ...marksOf[i]]);
  // close in: just room for the widest frame's flap and marks, and a little for the arrow head and strokes
  const size = Math.max(...helds.flatMap((ps) => [spread(ps, 0), spread(ps, 1)])) * 1.12;
  const square = (c: Vec2): HowFrame['box'] => [c[0] - size / 2, c[1] - size / 2, size, size];
  // then centred on the paper it shows when all of it fits, as far as the flap and marks still do; a close-up of a
  // bigger model, which can't fit, stays centred on the flap
  const boxes = centres.map((c, i) => {
    const ink = frameFaces[i].flatMap((f) => f.points);
    const cut = spread(ink, 0) > size || spread(ink, 1) > size;
    const held = helds[i];
    const centreOn = (axis: 0 | 1) => {
      const [lo, hi] = [Math.min(...held.map((p) => p[axis])), Math.max(...held.map((p) => p[axis]))];
      const inkMid = (Math.min(...ink.map((p) => p[axis])) + Math.max(...ink.map((p) => p[axis]))) / 2;
      return Math.min(lo + size / 2, Math.max(hi - size / 2, cut ? c[axis] : inkMid));
    };
    return square([centreOn(0), centreOn(1)]);
  });

  // in the plane, across the pose's spine, pointing into its flap
  const across = (spine: Seg[], flap: Vec2[]): Vec2 => {
    const far = spine
      .flatMap((g) => [g.from, g.to])
      .reduce((a, b) =>
        Math.hypot(b[0] - pivot[0], b[1] - pivot[1]) > Math.hypot(a[0] - pivot[0], a[1] - pivot[1]) ? b : a
      );
    const along = [far[0] - pivot[0], far[1] - pivot[1]];
    const centre = flap.reduce((c, p) => [c[0] + p[0] / flap.length, c[1] + p[1] / flap.length], [0, 0]);
    const dir: Vec2 = [-along[1] / Math.hypot(...along), along[0] / Math.hypot(...along)];
    return (centre[0] - pivot[0]) * dir[0] + (centre[1] - pivot[1]) * dir[1] < 0 ? [-dir[0], -dir[1]] : dir;
  };

  const ghost = (segs: Seg[]) => segs.map((g) => ({ ...g, ghost: true }));
  const solid = (segs: Seg[]) => segs.map((g) => ({ ...g, ghost: false }));
  const [peekDir, pushDir] = [across(spines[0], flaps[0]), across(spines[1], flaps[1])];
  const shift = 0.03 * size;
  const none = { peek: null, landing: null, push: null, arrow: null };
  list[step] = {
    pivot,
    flapStart,
    flapEnd,
    frames: [
      {
        ...none,
        box: boxes[0],
        faces: frameFaces[0],
        // books draw the layers parted in the plane; on stage they part out of it, which a drawing head-on can't show
        peek: flaps[0].map((p): Vec2 => [p[0] + peekDir[0] * shift, p[1] + peekDir[1] * shift]),
        fold: folds[0],
        spine: solid(spines[0])
      },
      {
        ...none,
        box: boxes[1],
        faces: frameFaces[1],
        fold: folds[1],
        spine: [...solid(spines[1]), ...ghost(spineEnd)],
        landing: flapEnd,
        push: { at: [pivot[0] - pushDir[0] * 0.04 * size, pivot[1] - pushDir[1] * 0.04 * size], dir: pushDir },
        arrow: path
      },
      { ...none, box: boxes[2], faces: frameFaces[2], fold: [], spine: [...solid(spineEnd), ...ghost(spineStart)] }
    ]
  };
  return list[step];
}
