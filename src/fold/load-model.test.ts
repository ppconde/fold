import { describe, expect, it } from 'vitest';
import { fixture } from './fixtures';
import { FoldError, loadModel } from './load-model';

type Json = Record<string, unknown> & { file_frames: Record<string, unknown>[] };
const half = () => fixture('fold-in-half') as Json;

describe('loadModel', () => {
  it('loads a bilingual instruction as is and a plain string as English', () => {
    const load = (instruction: unknown) =>
      loadModel({ ...half(), file_frames: [{ ...half().file_frames[0], 'foldapp:instruction': instruction }] });
    expect(load({ en: 'Fold', pt: 'Dobra' }).steps[1].instruction).toEqual({ en: 'Fold', pt: 'Dobra' });
    expect(load('Fold').steps[1].instruction).toEqual({ en: 'Fold' });
  });

  it('loads fold-in-half with an implicit flat step 0', () => {
    const model = loadModel(fixture('fold-in-half'));
    expect(model.title).toBe('Fold in half');
    expect(model.paperColor).toBe('#B8613F');
    expect(model.steps).toHaveLength(2);
    expect(model.steps[0].angles).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(model.steps[1].instruction.en).toBe('Fold the left half over onto the right half.');
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
    const v = json.vertices_coords as number[][];
    v[4][0] = 0.3;
    v[5][0] = 0.3;
    delete json.file_frames[0]['foldapp:fixedFace'];
    expect(loadModel(json).steps[1].fixedFace).toBe(1);
  });

  it('breaks a centre tie toward the first face', () => {
    const json = half();
    delete json.file_frames[0]['foldapp:fixedFace'];
    expect(loadModel(json).steps[1].fixedFace).toBe(0);
  });

  it('does not alias the input and freezes the model', () => {
    const json = half();
    const model = loadModel(json);
    expect(model.steps[1].angles).not.toBe(json.file_frames[0].edges_foldAngle);
    expect(() => {
      model.steps[1].angles[0] = 90;
    }).toThrow(TypeError);
  });

  it('accepts 3D vertex coordinates by dropping z', () => {
    const json = half();
    json.vertices_coords = (json.vertices_coords as number[][]).map(([x, y]) => [x, y, 0]);
    expect(loadModel(json).vertices[1]).toEqual([1, 0]);
  });

  it('reads faceOrders per step, keeps them for steps without any, and drops unknown (0) orders', () => {
    const json = fixture('fold-in-quarters') as Json;
    json.file_frames[0].faceOrders = [
      [0, 1, 1],
      [1, 2, 0]
    ];
    delete json.file_frames[1].faceOrders;
    const model = loadModel(json);
    expect(model.steps[0].faceOrders).toEqual([]);
    expect(model.steps[1].faceOrders).toEqual([[0, 1, 1]]);
    expect(model.steps[2].faceOrders).toEqual([[0, 1, 1]]);
  });

  const broken: [string, (j: Json) => unknown, RegExp][] = [
    ['not an object', () => 42, /not a FOLD object/],
    ['missing faces', (j) => ({ ...j, faces_vertices: undefined }), /faces_vertices/],
    ['bad vertex', (j) => ({ ...j, vertices_coords: [[0, 'x']] }), /Vertex 0/],
    ['edge to missing vertex', (j) => ({ ...j, edges_vertices: [[0, 99]] }), /Edge 0/],
    ['non-flat vertex', (j) => ({ ...j, vertices_coords: [[0, 0, 5]] }), /Vertex 0 is not flat/],
    [
      'duplicate edge',
      (j) => ({
        ...j,
        edges_vertices: [...(j.edges_vertices as number[][]), [4, 5]],
        edges_assignment: [...(j.edges_assignment as string[]), 'V'],
        file_frames: [{ ...j.file_frames[0], edges_foldAngle: [0, 0, 0, 0, 0, 0, 180, 0] }]
      }),
      /Two edges join the same pair/
    ],
    [
      'angle past 180',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], edges_foldAngle: [0, 0, 0, 0, 0, 0, 200] }] }),
      /Step 1 folds edge 6 past 180°/
    ],
    [
      'angle on a border',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], edges_foldAngle: [90, 0, 0, 0, 0, 0, 180] }] }),
      /Step 1 folds edge 0, which is a border, not a crease/
    ],
    [
      'angle on a flat line',
      (j) => ({
        ...j,
        edges_assignment: ['F', 'B', 'B', 'B', 'B', 'B', 'V'],
        file_frames: [{ ...j.file_frames[0], edges_foldAngle: [90, 0, 0, 0, 0, 0, 180] }]
      }),
      /Step 1 folds edge 0, which is a flat line, not a crease/
    ],
    ['no faces', (j) => ({ ...j, faces_vertices: [] }), /no faces/],
    ['zero-length edge', (j) => ({ ...j, edges_vertices: [[0, 0]] }), /Edge 0 must join two different vertices/],
    [
      'edge shared by three faces',
      (j) => ({
        ...j,
        faces_vertices: [...(j.faces_vertices as number[][]), [4, 5, 1]],
        edges_vertices: [...(j.edges_vertices as number[][]), [5, 1]],
        edges_assignment: [...(j.edges_assignment as string[]), 'B'],
        file_frames: [{ ...j.file_frames[0], edges_foldAngle: [0, 0, 0, 0, 0, 0, 180, 0] }]
      }),
      /shared by more than two faces/
    ],
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
      'instruction object without en',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], 'foldapp:instruction': { pt: 'Dobra' } }] }),
      /Step 1 has no instruction/
    ],
    [
      'instruction with a non-string pt',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], 'foldapp:instruction': { en: 'Fold', pt: 3 } }] }),
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
      'faceOrders that is not a list of triples',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], faceOrders: [[0, 1]] }] }),
      /Step 1 faceOrders needs \[f, g, s\] triples with s of -1, 0 or 1/
    ],
    [
      'faceOrders with a bad sign',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], faceOrders: [[0, 1, 2]] }] }),
      /Step 1 faceOrders needs \[f, g, s\] triples with s of -1, 0 or 1/
    ],
    [
      'faceOrders naming a missing face',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], faceOrders: [[0, 9, 1]] }] }),
      /Step 1 orders face 9, which does not exist/
    ],
    [
      'faceOrders ordering a face against itself',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], faceOrders: [[1, 1, 1]] }] }),
      /Step 1 orders face 1 against itself/
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
