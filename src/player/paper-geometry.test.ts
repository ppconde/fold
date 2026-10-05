import { describe, expect, it } from 'vitest';
import { fixture } from '../fold/fixtures';
import { foldedPositions } from '../fold/fold';
import { loadModel } from '../fold/load-model';
import { fillTriangles, lineGroups, paperExtent, triangleCount } from './paper-geometry';

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
  });

  it('draws the active crease as folded once it moves', () => {
    const model = half();
    const g = lineGroups(model, foldedPositions(model, 1, 0.5), 1, 0.5);
    // the crease sits on the hinge, so it stays at x = 0.5 on the table
    const expected = [0.5, 0, 0, 0.5, 1, 0];
    expect(g.folded).toHaveLength(6);
    g.folded.forEach((v, i) => {
      expect(v).toBeCloseTo(expected[i], 9);
    });
    expect(g.flat).toEqual([]);
  });

  it('draws a crease that has not moved yet as flat, and earlier creases as folded', () => {
    const model = quarters();
    const g = lineGroups(model, foldedPositions(model, 2, 0), 2, 0);
    expect(g.folded).toHaveLength(2 * 6);
    expect(g.flat).toHaveLength(2 * 6);
  });
});
