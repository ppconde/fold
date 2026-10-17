import { describe, expect, it } from 'vitest';
import { sketchFrame } from './how';

describe('sketchFrame', () => {
  it('follows the step to its landing, then holds the last sketch', () => {
    expect([0, 0.29, 0.31, 0.61, 0.95, 1].map((s) => sketchFrame(s, 0.9))).toEqual([0, 0, 1, 2, 2, 2]);
  });
});
