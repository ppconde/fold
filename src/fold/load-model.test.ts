import { describe, expect, it } from 'vitest';
import { fixture } from './fixtures';
import { FoldError, loadModel } from './load-model';

type Json = Record<string, unknown> & { file_frames: Record<string, unknown>[] };
const half = () => fixture('fold-in-half') as Json;

describe('loadModel', () => {
  it('loads fold-in-half with an implicit flat step 0', () => {
    const model = loadModel(fixture('fold-in-half'));
    expect(model.title).toBe('Fold in half');
    expect(model.paperColor).toBe('#B8613F');
    expect(model.steps).toHaveLength(2);
    expect(model.steps[0].angles).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(model.steps[1].instruction).toBe('Fold the left half over onto the right half.');
    expect(model.steps[1].fixedFace).toBe(1);
    expect(model.edgeFaces[6]).toEqual([0, 1]);
    expect(model.faceEdges[0]).toEqual([0, 6, 4, 5]);
    expect(model.center).toEqual([0.5, 0.5]);
  });

  it('inherits fixedFace and rotation from the previous step', () => {
    const model = loadModel(fixture('fold-in-quarters'));
    expect(model.steps[2].fixedFace).toBe(1);
    expect(model.steps[2].rotation).toEqual([0, 0, 0]);
  });

  it('defaults the fixed face to the face nearest the paper centre', () => {
    const json = half();
    delete json.file_frames[0]['foldapp:fixedFace'];
    expect(loadModel(json).steps[1].fixedFace).toBe(0);
  });

  it('accepts 3D vertex coordinates by dropping z', () => {
    const json = half();
    json.vertices_coords = (json.vertices_coords as number[][]).map(([x, y]) => [x, y, 0]);
    expect(loadModel(json).vertices[1]).toEqual([1, 0]);
  });

  const broken: [string, (j: Json) => unknown, RegExp][] = [
    ['not an object', () => 42, /not a FOLD object/],
    ['missing faces', (j) => ({ ...j, faces_vertices: undefined }), /faces_vertices/],
    ['bad vertex', (j) => ({ ...j, vertices_coords: [[0, 'x']] }), /Vertex 0/],
    ['edge to missing vertex', (j) => ({ ...j, edges_vertices: [[0, 99]] }), /Edge 0/],
    ['assignment count', (j) => ({ ...j, edges_assignment: ['B'] }), /edges_assignment/],
    [
      'face side not an edge',
      (j) => ({
        ...j,
        faces_vertices: [
          [0, 1, 2, 3],
          [4, 1, 2, 5]
        ]
      }),
      /Face 0/
    ],
    ['no steps', (j) => ({ ...j, file_frames: [] }), /no steps/],
    [
      'angle count',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], edges_foldAngle: [0, 180] }] }),
      /Step 1 needs one fold angle per edge \(7\)/
    ],
    [
      'missing instruction',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], 'foldapp:instruction': ' ' }] }),
      /Step 1 has no instruction/
    ],
    [
      'fixed face out of range',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], 'foldapp:fixedFace': 5 }] }),
      /Step 1 holds face 5/
    ],
    [
      'bad rotation',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], 'foldapp:rotation': [0, 180] }] }),
      /Step 1 rotation/
    ],
    [
      'paper in pieces',
      (j) => ({
        ...j,
        vertices_coords: [
          [0, 0],
          [1, 0],
          [1, 1],
          [3, 0],
          [4, 0],
          [4, 1]
        ],
        edges_vertices: [
          [0, 1],
          [1, 2],
          [2, 0],
          [3, 4],
          [4, 5],
          [5, 3],
          [0, 3]
        ],
        faces_vertices: [
          [0, 1, 2],
          [3, 4, 5]
        ]
      }),
      /separate pieces/
    ]
  ];

  for (const [name, mutate, message] of broken) {
    it(`rejects ${name} with a readable FoldError`, () => {
      const run = () => loadModel(mutate(half()));
      expect(run).toThrow(FoldError);
      expect(run).toThrow(message);
    });
  }
});
