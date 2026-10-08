import { type Matrix3, Vector2 } from 'three';
import type { Vec2, Vec3 } from '../src/fold/types';
import type { ModelEntry } from '../src/models/catalog';
import { arrange, type Crease, signedArea } from './arrange';
import { motionOrders, solvePaths } from './solve';

/** Keyframes on the homepage's all-at-once unfold: every crease travels far, so the solver needs small steps. */
const UNFOLD_KNOTS = 59;

/** A flat piece of paper at the end of a step: its outline in paper coordinates, where it lies in the view. */
export type StackPiece = { outline: Vec2[]; toView: Matrix3; frontUp: boolean };

/**
 * A reverse fold that swings its flaps over one group of `layers` as one stack, but ends tucked in: between
 * the two groups (inside whatever lies beyond the group passed), the flaps turning one way and the other
 * swapping sides of each other. Outlines on the flat sheet; each pair holds the layers whose flaps go behind,
 * then those whose flaps come forward (`layers`: what stays of them).
 */
export type Tuck<T = Vec2[]> = { layers: [T[], T[]]; flaps: [T[], T[]] };

export type SourceStep = {
  en: string;
  pt: string;
  /** Crease name → fold angle in degrees from this step on (+valley, −mountain). Unlisted creases keep their angle. */
  fold?: Record<string, number>;
  /** Angles partway through the step (crease name → degrees, evenly spaced), e.g. a fold that opens again. */
  path?: Record<string, number>[];
  /** A point (flat-paper coordinates) inside the face that stays still. */
  hold?: Vec2;
  /** Whole-model rotation from this step on, Euler XYZ in degrees. */
  rotation?: Vec3;
  /** The pieces at the end of the step, bottom to top as the viewer sees them (written by foldSequence). */
  stack?: StackPiece[];
  /** Layers that change places as the step lands (a reverse fold that swings over; written by foldSequence). */
  tuck?: Tuck;
  /** Slit crease name → how far along the cut its `from` and `to` ends lie (written by foldSequence's `slit`). */
  cut?: Record<string, [number, number]>;
};

export type ModelSource = Omit<ModelEntry, 'thumbnail'> & {
  paperColor: string;
  /** Collapses: solve each tearing step's path, and read the layer order off the motion (models/solve.ts). */
  solve?: boolean;
  creases: Record<string, Crease>;
  steps: SourceStep[];
};

/** Is p inside the polygon? (even-odd ray cast) */
export function inside(p: Vec2, poly: Vec2[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Clip convex polygon `a` by convex polygon `b` (Sutherland–Hodgman) and return the area left. */
function overlap(a: Vec2[], b: Vec2[]): number {
  const clip = signedArea(b) < 0 ? [...b].reverse() : b;
  let out = a;
  clip.forEach((p, i) => {
    const q = clip[(i + 1) % clip.length];
    const keep = (v: Vec2) => (q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0]) >= 0;
    const next: Vec2[] = [];
    out.forEach((v, j) => {
      const w = out[(j + 1) % out.length];
      if (keep(v)) next.push(v);
      if (keep(v) !== keep(w)) {
        const [dx, dy] = [w[0] - v[0], w[1] - v[1]];
        const t =
          ((q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0])) / ((q[1] - p[1]) * dx - (q[0] - p[0]) * dy);
        next.push([v[0] + dx * t, v[1] + dy * t]);
      }
    });
    out = next;
  });
  return out.length < 3 ? 0 : Math.abs(signedArea(out));
}

/**
 * FOLD faceOrders for a stack: [f, g, s] for every two faces whose pieces overlap in the view, with
 * s = +1 when f lies on the side g's normal points to. Faces of one piece lie side by side, never stacked.
 */
function faceOrdersOf(stack: StackPiece[], vertices: Vec2[], faces: number[][]): [number, number, 1 | -1][] {
  const at = faces.map((face) => {
    const poly = face.map((v) => vertices[v]);
    const c: Vec2 = [
      poly.reduce((s, p) => s + p[0], 0) / poly.length,
      poly.reduce((s, p) => s + p[1], 0) / poly.length
    ];
    const layer = stack.findIndex((piece) => inside(c, piece.outline));
    const toView = stack[layer].toView;
    const view = poly.map(([x, y]): Vec2 => {
      const p = new Vector2(x, y).applyMatrix3(toView);
      return [p.x, p.y];
    });
    return { layer, view };
  });
  const orders: [number, number, 1 | -1][] = [];
  for (let f = 0; f < faces.length; f++) {
    for (let g = f + 1; g < faces.length; g++) {
      const [a, b] = [at[f], at[g]];
      if (a.layer === b.layer || overlap(a.view, b.view) < 1e-9) continue;
      const above = a.layer > b.layer ? 1 : -1;
      orders.push([f, g, (above * (stack[b.layer].frontUp ? 1 : -1)) as 1 | -1]);
    }
  }
  return orders;
}

/** The FOLD file for `src`, in the shape `loadModel` reads. */
export function buildFold(src: ModelSource) {
  const { vertices, edges, assignments, edgeCrease, faces } = arrange(src.creases);
  const angles: Record<string, number> = {};
  let orders = '[]';
  const frames = src.steps.map((step, i) => {
    const before = { ...angles };
    for (const [name, angle] of Object.entries(step.fold ?? {})) {
      if (!src.creases[name]) throw new Error(`${src.id} step ${i + 1} folds ${name}, which is not a crease.`);
      angles[name] = angle;
    }
    const held =
      step.hold &&
      faces.findIndex((f) =>
        inside(
          step.hold as Vec2,
          f.map((v) => vertices[v])
        )
      );
    if (held === -1) throw new Error(`${src.id} step ${i + 1} holds a point outside the paper.`);
    // faceOrders only where the stacking changes; the loader carries it into later steps
    const path = (step.path ?? []).map((knot) => edgeCrease.map((name) => (name && (knot[name] ?? before[name])) || 0));
    const faceOrders = !src.solve && step.stack ? faceOrdersOf(step.stack, vertices, faces) : undefined;
    const changed = faceOrders !== undefined && JSON.stringify(faceOrders) !== orders;
    if (changed) orders = JSON.stringify(faceOrders);
    // each slit edge, with how far along the cut its two vertices lie (the player traces the cut that way)
    const cut = edges.flatMap(([a, b], e) => {
      const name = edgeCrease[e];
      const span = name ? step.cut?.[name] : undefined;
      if (!name || !span) return [];
      const c = src.creases[name];
      const [dx, dy] = [c.to[0] - c.from[0], c.to[1] - c.from[1]];
      const at = (v: number) => {
        const s = ((vertices[v][0] - c.from[0]) * dx + (vertices[v][1] - c.from[1]) * dy) / (dx * dx + dy * dy);
        return +Math.max(0, Math.min(1, span[0] + (span[1] - span[0]) * s)).toFixed(6);
      };
      return [[e, at(a), at(b)]];
    });
    return {
      edges_foldAngle: edgeCrease.map((name) => (name && angles[name]) || 0),
      'foldapp:instruction': { en: step.en, pt: step.pt },
      ...(held === undefined ? {} : { 'foldapp:fixedFace': held }),
      ...(step.rotation ? { 'foldapp:rotation': step.rotation } : {}),
      ...(path.length ? { 'foldapp:path': path } : {}),
      ...(cut.length ? { 'foldapp:cut': cut } : {}),
      ...(changed ? { faceOrders } : {})
    };
  });
  const fold = {
    file_spec: 1.2,
    file_creator: 'fold.ppconde.com',
    file_title: src.name.en,
    file_classes: ['singleModel'],
    frame_classes: ['creasePattern'],
    'foldapp:paperColor': src.paperColor,
    vertices_coords: vertices,
    edges_vertices: edges,
    edges_assignment: assignments,
    faces_vertices: faces,
    file_frames: frames
  };
  if (src.solve) {
    solvePaths(fold);
    // a tuck's outlines as the faces inside them
    const facesIn = (outlines: Vec2[][]) =>
      faces.flatMap((f, i) => {
        const c: Vec2 = [0, 1].map((j) => f.reduce((s, v) => s + vertices[v][j], 0) / f.length) as Vec2;
        return outlines.some((o) => inside(c, o)) ? [i] : [];
      });
    const tucks = src.steps.map(
      (st) =>
        st.tuck && {
          layers: st.tuck.layers.map(facesIn),
          flaps: st.tuck.flaps.map(facesIn)
        }
    );
    motionOrders(fold, tucks as (Tuck<number> | undefined)[]);
  }
  // the homepage opens the finished model out all at once; finely, so the paper stays joined
  // toward the angles as the swings of tucks left them (the same pose), then the tucks' last relabel
  const swung = frames.reduce((at: number[], frame, i) => {
    const knot = frame['foldapp:path']?.at(-1);
    return frame.edges_foldAngle.map((a, e) => {
      if (src.steps[i].tuck && knot && Math.abs(a) === 180 && knot[e] === -a) return knot[e];
      return i && a === frames[i - 1].edges_foldAngle[e] ? at[e] : a;
    });
  }, []);
  const end = frames[frames.length - 1].edges_foldAngle;
  const last: { edges_foldAngle: number[]; 'foldapp:path'?: number[][]; 'foldapp:cut'?: number[][] } = {
    ...frames[frames.length - 1],
    edges_foldAngle: swung,
    'foldapp:path': undefined,
    'foldapp:cut': undefined
  };
  // the sheet the model unfolds to has every slit cut already
  const cuts = frames.flatMap((frame) => frame['foldapp:cut'] ?? []);
  const cutFirst = { edges_foldAngle: end.map(() => 0), 'foldapp:instruction': 'Cut.', 'foldapp:cut': cuts };
  solvePaths({ ...fold, file_frames: cuts.length ? [cutFirst, last] : [last] }, UNFOLD_KNOTS);
  const knots = [...(last['foldapp:path'] ?? []), ...(swung.some((a, e) => a !== end[e]) ? [swung] : [])];
  const unfold = knots.map((knot) => knot.map((a) => Math.round(a * 100) / 100));
  return unfold.length ? { ...fold, 'foldapp:unfold': unfold } : fold;
}

/** The library entry for `src`. */
export function entryOf({ id, name, japaneseName, category, difficulty, tags }: ModelSource): ModelEntry {
  return {
    id,
    name,
    ...(japaneseName ? { japaneseName } : {}),
    category,
    difficulty,
    tags,
    thumbnail: `/models/${id}.svg`
  };
}
