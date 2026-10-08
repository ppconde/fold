export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Edge = [number, number];
export type Assignment = 'M' | 'V' | 'B' | 'F' | 'U' | 'C';

/** FOLD faceOrders triple: face f lies above (1) or below (-1) face g, along g's normal. */
export type FaceOrder = [number, number, 1 | -1];

/** A stretch of a slit cut in a step: edge `edge` is cut from its first vertex at `from` to its second at `to`, as shares (0 to 1) of the way along the scissors' cut. */
export type Cut = { edge: number; from: number; to: number };

export type Step = {
  /** Fold angle of every edge at the end of the step, in degrees (+valley, −mountain). */
  angles: number[];
  instruction: { en: string; pt?: string };
  /** Face that stays still during the step. */
  fixedFace: number;
  /** Whole-model rotation at the end of the step, Euler XYZ in degrees. */
  rotation: Vec3;
  /** How overlapping faces stack at the end of the step (FOLD faceOrders, unknown orders dropped). */
  faceOrders: FaceOrder[];
  /** Angles the faceOrders were given at, when not the step's own (the homepage's unfold ends with flaps on edge). */
  orderedAt?: number[];
  /** Angles of every edge partway through the step, evenly spaced (k of n at (k + 1) / (n + 1)). Empty: straight. */
  path: number[][];
  /** Slit edges cut in this step (a step that cuts moves no crease). */
  cuts: Cut[];
};

export type Model = {
  title: string;
  paperColor: string;
  vertices: Vec2[];
  edges: Edge[];
  assignments: Assignment[];
  faces: number[][];
  /** Per face, the edge index of each side (side j runs faces[f][j] → faces[f][j + 1]). */
  faceEdges: number[][];
  /** Per edge, the one or two faces that use it. */
  edgeFaces: number[][];
  /** Per edge, the step that cuts it (a "C" edge); Infinity for every other edge. */
  cutAt: number[];
  faceCentroids: Vec2[];
  /** Bounding-box centre of the flat paper. */
  center: Vec2;
  /** steps[0] is the flat sheet; steps[k] comes from file_frames[k - 1]. */
  steps: Step[];
  /** Angles partway from the flat sheet straight to the finished model, every crease at once (as `Step.path`). */
  unfold: number[][];
};
