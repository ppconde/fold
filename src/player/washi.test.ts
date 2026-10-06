import { describe, expect, it } from 'vitest';
import { softenTowardIvory } from './washi';

describe('softenTowardIvory', () => {
  it('mixes toward ivory', () => {
    expect(softenTowardIvory('#000000', 0.5)).toBe('#7a7771');
  });
  it('leaves ivory alone', () => {
    for (const a of [0, 0.15, 1]) expect(softenTowardIvory('#F3EDE2', a)).toBe('#f3ede2');
  });
  it('always returns 7 characters', () => {
    for (const h of ['#000000', '#ffffff', '#2E3A59']) expect(softenTowardIvory(h)).toHaveLength(7);
  });
});
