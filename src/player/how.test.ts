import { describe, expect, it } from 'vitest';
import { progress } from '../fold/fold';
import { sketchFrame, sketchT } from './how';

describe('sketchFrame', () => {
  it('follows the step to its landing, then holds the last sketch', () => {
    expect([0, 0.29, 0.31, 0.61, 0.95, 1].map((s) => sketchFrame(s, 0.9))).toEqual([0, 0, 1, 2, 2, 2]);
  });
});

describe('sketchT', () => {
  it('lands on the sketch it was asked for', () => {
    for (const landing of [0.75, 1])
      expect(([0, 1, 2] as const).map((i) => sketchFrame(progress(sketchT(i, landing)), landing))).toEqual([0, 1, 2]);
  });
});
