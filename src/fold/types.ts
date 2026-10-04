export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Edge = [number, number];
export type Assignment = 'M' | 'V' | 'B' | 'F' | 'U';

export type Step = {
  /** Fold angle of every edge at the end of the step, in degrees (+valley, −mountain). */
  angles: number[];
  instruction: string;
  /** Face that stays still during the step. */
  fixedFace: number;
  /** Whole-model rotation at the end of the step, Euler XYZ in degrees. */
  rotation: Vec3;
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
  faceCentroids: Vec2[];
  /** Bounding-box centre of the flat paper. */
  center: Vec2;
  /** steps[0] is the flat sheet; steps[k] comes from file_frames[k - 1]. */
  steps: Step[];
};
