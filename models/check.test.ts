import { describe, expect, it } from 'vitest';
import { fixture } from '../src/fold/fixtures';
import { loadModel } from '../src/fold/load-model';
import { checkModel, crossings, spread } from './check';

const quarters = () => loadModel(fixture('fold-in-quarters'));

describe('checkModel', () => {
  it('passes both hand-written fixtures', () => {
    expect(checkModel(loadModel(fixture('fold-in-half')))).toEqual([]);
    expect(checkModel(quarters())).toEqual([]);
  });

  it('reports a seam over budget', () => {
    expect(checkModel(quarters(), 0.001)).toContainEqual(expect.stringMatching(/^Step 2 at 100% opens a 0\.0\d\d gap/));
  });

  it('reports a step that does not fold flat', () => {
    const json = fixture('fold-in-quarters') as { file_frames: { edges_foldAngle: number[] }[] };
    json.file_frames[1].edges_foldAngle[11] = 90; // half of the second crease line
    expect(checkModel(loadModel(json))).toContainEqual(expect.stringMatching(/^Step 2 does not fold flat/));
  });
});

describe('spread', () => {
  it('is zero on the flat sheet and small but non-zero at rest after a two-layer fold', () => {
    expect(spread(quarters(), 1, 0)).toBe(0);
    expect(spread(quarters(), 2, 1)).toBeGreaterThan(0.01);
    expect(spread(quarters(), 2, 1)).toBeLessThan(0.06);
  });
});

describe('crossings', () => {
  it('finds none while a single layer folds', () => {
    for (const t of [0.25, 0.5, 1]) expect(crossings(quarters(), 1, t)).toEqual([]);
  });

  it('finds two flaps folded through each other', () => {
    // a 3-panel strip whose outer panels both fold valley onto the narrower middle one
    const strip = loadModel({
      file_spec: 1.2,
      vertices_coords: [
        [0, 0],
        [0.4, 0],
        [0.6, 0],
        [1, 0],
        [1, 1],
        [0.6, 1],
        [0.4, 1],
        [0, 1]
      ],
      edges_vertices: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 0],
        [1, 6],
        [2, 5]
      ],
      edges_assignment: ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'V', 'V'],
      faces_vertices: [
        [0, 1, 6, 7],
        [1, 2, 5, 6],
        [2, 3, 4, 5]
      ],
      file_frames: [
        {
          edges_foldAngle: [0, 0, 0, 0, 0, 0, 0, 0, 180, 180],
          'foldapp:instruction': 'Both flaps in.',
          'foldapp:fixedFace': 1
        }
      ]
    });
    // each 0.4-wide flap overhangs the 0.2-wide middle, so they cut through each other from edge to edge
    expect(crossings(strip, 1, 1)).toContainEqual([0, 2]);
    expect(crossings(strip, 1, 0.25)).toEqual([]);
  });
});
