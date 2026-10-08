import { readFileSync } from 'node:fs';

/** Test helper: raw JSON of a model in public/models. */
export function fixture(name: 'fold-in-half' | 'fold-in-quarters'): unknown {
  return JSON.parse(readFileSync(new URL(`../../public/models/${name}.fold`, import.meta.url), 'utf8'));
}

export type SlitJson = { edges_assignment: string[]; file_frames: Record<string, unknown>[]; [key: string]: unknown };

/**
 * Test helper: a square slit from the middle of its left edge to its centre (edges 7 and 8), carried on to the
 * right edge as a flat line (edge 9), then the top-left corner folded over x = 0.25 (edge 10). Faces: 0 the
 * bottom half, 1 the top-left corner, 2 the top right.
 */
export function slitFixture(): SlitJson {
  const zeros = Array.from({ length: 11 }, () => 0);
  return {
    file_spec: 1.2,
    vertices_coords: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0.5],
      [0.25, 0.5],
      [0.5, 0.5],
      [1, 0.5],
      [0.25, 1]
    ],
    edges_vertices: [
      [0, 1],
      [1, 7],
      [7, 2],
      [2, 8],
      [8, 3],
      [3, 4],
      [4, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [5, 8]
    ],
    edges_assignment: ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'C', 'C', 'F', 'V'],
    faces_vertices: [
      [0, 1, 7, 6, 5, 4],
      [4, 5, 8, 3],
      [5, 6, 7, 2, 8]
    ],
    file_frames: [
      {
        edges_foldAngle: zeros,
        'foldapp:instruction': 'Cut from the left edge to the middle.',
        'foldapp:cut': [
          [7, 0, 0.5],
          [8, 0.5, 1]
        ]
      },
      {
        edges_foldAngle: [...zeros.slice(0, 10), 180],
        'foldapp:instruction': 'Fold the top-left corner over.',
        faceOrders: [[1, 2, 1]]
      }
    ]
  };
}
