import { describe, expect, it } from 'vitest';
import { remapAngles, stepCreases } from './creases';
import { fixture } from './fixtures';
import { loadModel } from './load-model';
import type { Edge, Vec2 } from './types';

describe('stepCreases', () => {
  const model = loadModel(fixture('fold-in-quarters'));

  it('has nothing at step 0', () => {
    expect(stepCreases(model, 0)).toEqual({ active: [], past: [] });
  });

  it('throws RangeError for a step that does not exist', () => {
    for (const step of [3, -1, 1.5, Number.NaN]) expect(() => stepCreases(model, step)).toThrow(RangeError);
  });

  it('marks the first crease active in step 1', () => {
    expect(stepCreases(model, 1)).toEqual({ active: [8, 9], past: [] });
  });

  it('marks the second crease active and the first as past in step 2', () => {
    expect(stepCreases(model, 2)).toEqual({ active: [10, 11], past: [8, 9] });
  });
});

describe('remapAngles', () => {
  const square: Vec2[] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1]
  ];
  const borders: Edge[] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0]
  ];

  it('keeps the angle on both halves of a crease split by a new crossing crease', () => {
    // one vertical crease (edge 4) at x = 1/3, folded to 180
    const prev = { vertices: [...square, [1 / 3, 0], [1 / 3, 1]] as Vec2[], edges: [...borders, [4, 5]] as Edge[] };
    // add a horizontal crease at y = 0.5: vertical splits at (1/3, 0.5); new crease is edges 6 and 7
    const next = {
      vertices: [...square, [1 / 3, 0], [1 / 3, 1], [1 / 3, 0.5], [0, 0.5], [1, 0.5]] as Vec2[],
      edges: [...borders, [4, 6], [6, 5], [7, 6], [6, 8]] as Edge[]
    };
    expect(remapAngles(prev, next, [0, 0, 0, 0, 180])).toEqual([0, 0, 0, 0, 180, 180, 0, 0]);
  });

  it('tolerates float noise in coordinates', () => {
    const prev = {
      vertices: [
        [0, 0],
        [1, 1]
      ] as Vec2[],
      edges: [[0, 1]] as Edge[]
    };
    const next = {
      vertices: [
        [0, 0],
        [Math.SQRT1_2 * Math.SQRT1_2, 0.5 + 1e-12],
        [1, 1]
      ] as Vec2[],
      edges: [
        [0, 1],
        [1, 2]
      ] as Edge[]
    };
    expect(remapAngles(prev, next, [-180])).toEqual([-180, -180]);
  });

  it('drops angles of deleted edges', () => {
    const prev = { vertices: square, edges: [...borders, [0, 2]] as Edge[] };
    const next = { vertices: square, edges: borders };
    expect(remapAngles(prev, next, [0, 0, 0, 0, 90])).toEqual([0, 0, 0, 0]);
  });
});
