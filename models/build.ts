import { type Matrix3, Vector2 } from 'three';
import type { Vec2, Vec3 } from '../src/fold/types';
import type { ModelEntry } from '../src/models/catalog';
import { arrange, type Crease, signedArea } from './arrange';

/** A flat piece of paper at the end of a step: its outline in paper coordinates, where it lies in the view. */
export type StackPiece = { outline: Vec2[]; toView: Matrix3; frontUp: boolean };

export type SourceStep = {
  en: string;
  pt: string;
  /** Crease name → fold angle in degrees from this step on (+valley, −mountain). Unlisted creases keep their angle. */
  fold?: Record<string, number>;
  /** A point (flat-paper coordinates) inside the face that stays still. */
  hold?: Vec2;
  /** Whole-model rotation from this step on, Euler XYZ in degrees. */
  rotation?: Vec3;
  /** The pieces at the end of the step, bottom to top as the viewer sees them (written by foldSequence). */
  stack?: StackPiece[];
};

export type ModelSource = Omit<ModelEntry, 'thumbnail'> & {
  paperColor: string;
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
    const faceOrders = step.stack && faceOrdersOf(step.stack, vertices, faces);
    const changed = faceOrders !== undefined && JSON.stringify(faceOrders) !== orders;
    if (changed) orders = JSON.stringify(faceOrders);
    return {
      edges_foldAngle: edgeCrease.map((name) => (name && angles[name]) || 0),
      'foldapp:instruction': { en: step.en, pt: step.pt },
      ...(held === undefined ? {} : { 'foldapp:fixedFace': held }),
      ...(step.rotation ? { 'foldapp:rotation': step.rotation } : {}),
      ...(changed ? { faceOrders } : {})
    };
  });
  return {
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
