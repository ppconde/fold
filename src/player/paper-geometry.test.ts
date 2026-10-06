import { describe, expect, it } from 'vitest';
import { fixture } from '../fold/fixtures';
import { foldedPositions } from '../fold/fold';
import { loadModel } from '../fold/load-model';
import { endCentre, fillTriangles, lineGroups, paperExtent, triangleCount } from './paper-geometry';

const half = () => loadModel(fixture('fold-in-half'));
const quarters = () => loadModel(fixture('fold-in-quarters'));

describe('paperExtent', () => {
  it('measures the flat paper', () => {
    expect(paperExtent(half())).toEqual({
      minX: 0,
      minY: 0,
      maxX: 1,
      maxY: 1,
      width: 1,
      height: 1,
      size: 1,
      center: [0.5, 0.5]
    });
  });
});

describe('fillTriangles', () => {
  it('fans every face into triangles', () => {
    const model = quarters();
    expect(triangleCount(model)).toBe(8);
    const out = new Float32Array(triangleCount(model) * 9);
    fillTriangles(foldedPositions(model, 0, 0), out);
    expect([...out.slice(0, 9)]).toEqual([0, 0, 0, 0.5, 0, 0, 0.5, 0.5, 0]);
    expect([...out.slice(9, 18)]).toEqual([0, 0, 0, 0.5, 0.5, 0, 0, 0.5, 0]);
  });
});

describe('lineGroups', () => {
  it('shows only borders on the flat sheet', () => {
    const model = half();
    const g = lineGroups(model, foldedPositions(model, 0, 0), 0, 0);
    expect(g.borders).toHaveLength(6 * 6);
    expect(g.folded).toEqual([]);
    expect(g.flat).toEqual([]);
    expect(g.active).toEqual([]);
  });

  it('puts this step’s crease in the active group, before and after it moves', () => {
    const model = half();
    for (const t of [0, 0.5, 1]) {
      const g = lineGroups(model, foldedPositions(model, 1, t), 1, t);
      // one copy per face that owns the crease, so it stays visible if the copies drift apart
      expect(g.active).toHaveLength(2 * 6);
      expect(g.folded).toEqual([]);
      expect(g.flat).toEqual([]);
    }
    const g = lineGroups(model, foldedPositions(model, 1, 0.5), 1, 0.5);
    for (let i = 0; i < g.active.length; i += 3) {
      const [x, y, z] = g.active.slice(i, i + 3);
      expect(x).toBeCloseTo(0.5, 9);
      expect(z).toBeCloseTo(0, 9);
      expect([0, 1]).toContain(Math.round(y * 1e9) / 1e9);
    }
  });

  it('keeps earlier creases out of the active group', () => {
    const model = quarters();
    const g = lineGroups(model, foldedPositions(model, 2, 0), 2, 0);
    expect(g.active).toHaveLength(2 * 2 * 6);
    expect(g.folded).toHaveLength(2 * 6);
    expect(g.flat).toEqual([]);
  });
});

describe('endCentre', () => {
  it('centres the flat sheet on the origin', () => {
    const [x, z] = endCentre(half(), 0);
    expect(x).toBeCloseTo(0, 9);
    expect(z).toBeCloseTo(0, 9);
  });

  it('follows the paper onto the right half once folded', () => {
    const [x, z] = endCentre(half(), 1);
    expect(x).toBeCloseTo(0.25, 6);
    expect(z).toBeCloseTo(0, 6);
  });
});
