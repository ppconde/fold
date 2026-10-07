import type { Vec2, Vec3 } from '../src/fold/types';
import type { ModelEntry } from '../src/models/catalog';
import { arrange, type Crease } from './arrange';

export type SourceStep = {
  en: string;
  pt: string;
  /** Crease name → fold angle in degrees from this step on (+valley, −mountain). Unlisted creases keep their angle. */
  fold?: Record<string, number>;
  /** A point (flat-paper coordinates) inside the face that stays still. */
  hold?: Vec2;
  /** Whole-model rotation from this step on, Euler XYZ in degrees. */
  rotation?: Vec3;
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

/** The FOLD file for `src`, in the shape `loadModel` reads. */
export function buildFold(src: ModelSource) {
  const { vertices, edges, assignments, edgeCrease, faces } = arrange(src.creases);
  const angles: Record<string, number> = {};
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
    return {
      edges_foldAngle: edgeCrease.map((name) => (name && angles[name]) || 0),
      'foldapp:instruction': { en: step.en, pt: step.pt },
      ...(held === undefined ? {} : { 'foldapp:fixedFace': held }),
      ...(step.rotation ? { 'foldapp:rotation': step.rotation } : {})
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
