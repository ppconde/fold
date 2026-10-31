import { describe, expect, it } from 'vitest';
import { stepCreases } from './creases';
import { fixture } from './fixtures';
import { loadModel } from './load-model';

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
