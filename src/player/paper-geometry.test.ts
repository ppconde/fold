import { describe, expect, it } from 'vitest';
import { fixture, slitFixture } from '../fold/fixtures';
import { foldedPositions, LAYER_GAP } from '../fold/fold';
import { loadModel } from '../fold/load-model';
import {
  endCentre,
  fillTriangles,
  fillUVs,
  frameReach,
  lineGroups,
  paperExtent,
  triangleCount
} from './paper-geometry';

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
      // on the hinge, give or take the moving half's one-layer lift
      expect(Math.abs(x - 0.5)).toBeLessThanOrEqual(LAYER_GAP + 1e-9);
      expect(Math.abs(z)).toBeLessThanOrEqual(LAYER_GAP + 1e-9);
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

describe('frameReach', () => {
  it('holds the sheet as its half turns about the centre line', () => {
    expect(frameReach(half(), 0, 1)).toBeCloseTo(Math.SQRT1_2, 2);
  });

  // the camera stays on the folded half while the step plays back, so the flat sheet has to fit around it
  it('reaches the far corner of the flat sheet from the folded half while the step plays', () => {
    expect(frameReach(half(), 1, 1)).toBeCloseTo(Math.hypot(0.75, 0.5), 2);
  });

  it('holds only the folded half at rest', () => {
    expect(frameReach(half(), 1)).toBeCloseTo(Math.hypot(0.25, 0.5), 2);
  });
});

describe('fillUVs', () => {
  it('maps flat paper coordinates into 0..1', () => {
    const model = quarters();
    const out = new Float32Array(triangleCount(model) * 6);
    fillUVs(model, out);
    expect([...out.slice(0, 6)]).toEqual([0, 0, 0.5, 0, 0.5, 0.5]);
  });
});

describe('slits', () => {
  const slit = () => loadModel(slitFixture());
  const round = (xs: number[]) => xs.map((x) => +x.toFixed(6));

  it('traces the cut from where the scissors go in', () => {
    const model = slit();
    const at = (t: number) => round(lineGroups(model, foldedPositions(model, 1, t), 1, t).cut);
    expect(at(0)).toEqual([]);
    // a quarter of the way: half of edge 7 (0 → 0.5 of the cut), drawn on both faces it joins
    expect(at(0.25)).toEqual([0, 0.5, 0, 0.125, 0.5, 0, 0, 0.5, 0, 0.125, 0.5, 0]);
    // half way: all of edge 7, none of edge 8 yet
    expect(at(0.5)).toEqual([0, 0.5, 0, 0.25, 0.5, 0, 0, 0.5, 0, 0.25, 0.5, 0]);
  });

  it('draws a slit as an edge of the paper once cut, one on each side', () => {
    const model = slit();
    const borders = (step: number) => lineGroups(model, foldedPositions(model, step, 0), step, 0).borders.length / 6;
    expect(borders(1)).toBe(7);
    expect(borders(2)).toBe(7 + 4);
  });
});
