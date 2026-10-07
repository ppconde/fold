import { describe, expect, it } from 'vitest';
import { softenTowardIvory } from './washi';

describe('softenTowardIvory', () => {
  it('mixes toward ivory', () => {
    expect(softenTowardIvory('#000000')).toBe('#242422');
  });
  it('leaves ivory alone', () => {
    expect(softenTowardIvory('#F3EDE2')).toBe('#f3ede2');
  });
  it('always returns 7 characters', () => {
    for (const h of ['#000000', '#ffffff', '#2E3A59']) expect(softenTowardIvory(h)).toHaveLength(7);
  });
});
