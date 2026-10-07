import { describe, expect, it } from 'vitest';
import { arrange } from './arrange';

describe('arrange', () => {
  it('is the bare square without creases', () => {
    const g = arrange({});
    expect(g.vertices).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1]
    ]);
    expect(g.faces).toEqual([[0, 1, 2, 3]]);
    expect(g.assignments).toEqual(['B', 'B', 'B', 'B']);
  });

  it('splits the border where a crease meets it and names each crease edge', () => {
    const g = arrange({ middle: { from: [0.5, 0], to: [0.5, 1], assignment: 'V' } });
    expect(g.vertices).toHaveLength(6);
    expect(g.faces).toHaveLength(2);
    expect(g.edgeCrease.filter((n) => n === 'middle')).toHaveLength(1);
    expect(g.edgeCrease.filter((n) => n === null)).toHaveLength(6);
  });

  it('splits two creases where they cross, into four counter-clockwise faces', () => {
    const g = arrange({
      a: { from: [0, 0], to: [1, 1], assignment: 'V' },
      b: { from: [1, 0], to: [0, 1], assignment: 'M' }
    });
    expect(g.faces).toHaveLength(4);
    expect(g.edgeCrease.filter((n) => n === 'a')).toHaveLength(2);
    for (const f of g.faces) {
      const area = f.reduce((s, v, i) => {
        const [x0, y0] = g.vertices[v];
        const [x1, y1] = g.vertices[f[(i + 1) % f.length]];
        return s + x0 * y1 - x1 * y0;
      }, 0);
      expect(area).toBeGreaterThan(0);
    }
  });

  it('joins a crease that ends on another crease (a T-junction)', () => {
    const g = arrange({
      middle: { from: [0.5, 0], to: [0.5, 1], assignment: 'V' },
      branch: { from: [0.5, 0.5], to: [1, 0.5], assignment: 'M' }
    });
    expect(g.faces).toHaveLength(3);
    expect(g.edgeCrease.filter((n) => n === 'middle')).toHaveLength(2);
  });

  it('rejects overlapping creases, creases that stop mid-paper and points off the paper', () => {
    expect(() =>
      arrange({
        a: { from: [0.5, 0], to: [0.5, 0.7], assignment: 'V' },
        b: { from: [0.5, 0.3], to: [0.5, 1], assignment: 'V' }
      })
    ).toThrow('a and b overlap.');
    expect(() => arrange({ stub: { from: [0.5, 0], to: [0.5, 0.5], assignment: 'V' } })).toThrow(
      'Crease stub ends in the middle of the paper.'
    );
    expect(() => arrange({ out: { from: [0.5, 0], to: [0.5, 1.2], assignment: 'V' } })).toThrow('off the paper');
  });
});
