import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isReverseFold, movingFaces, reverseFan } from '../fold/fold';
import { loadModel } from '../fold/load-model';
import type { Vec2 } from '../fold/types';
import { howDrawing } from './how-drawing';

const crane = loadModel(JSON.parse(readFileSync(new URL('../../public/models/crane.fold', import.meta.url), 'utf8')));
const reverse = crane.steps.flatMap((_, k) => (isReverseFold(crane, k) ? [k] : []));
const [neck] = reverse;

const draw = (k: number) => {
  const d = howDrawing(crane, k);
  if (!d) throw new Error(`no drawing at step ${k}`);
  return d;
};
const area = (poly: Vec2[]) =>
  poly.reduce((s, p, i) => s + p[0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * p[1], 0) / 2;
const near = (p: Vec2, q: Vec2) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-9;
/** Inside a convex polygon, or on its edge. */
const within = (p: Vec2, poly: Vec2[]) => {
  const s = Math.sign(area(poly));
  return poly.every((a, i) => {
    const b = poly[(i + 1) % poly.length];
    return s * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= -1e-9;
  });
};

describe('howDrawing', () => {
  it('draws only reverse folds', () => {
    expect(howDrawing(crane, neck - 1)).toBeNull();
    expect(howDrawing(crane, 0)).toBeNull();
    for (const k of reverse) expect(draw(k).frames).toHaveLength(3);
  });

  it('starts the flipping edge at the pivot, as it is and as it ends', () => {
    for (const k of reverse) {
      const d = draw(k);
      for (const frame of [d.frames[0], d.frames[2]]) {
        const solid = frame.spine.filter((s) => !s.ghost);
        expect(solid.length).toBeGreaterThan(0);
        expect(solid.some((s) => near(s.from, d.pivot) || near(s.to, d.pivot))).toBe(true);
      }
    }
  });

  it('draws the fold line within the flap, as a mountain line in the first two frames', () => {
    for (const k of reverse) {
      const d = draw(k);
      expect(d.frames[0].fold.length).toBeGreaterThan(0);
      for (const s of d.frames[0].fold) {
        expect(within(s.from, d.flapStart)).toBe(true);
        expect(within(s.to, d.flapStart)).toBe(true);
      }
      expect(d.frames[1].fold).toEqual(d.frames[0].fold);
      expect(d.frames[2].fold).toEqual([]);
    }
  });

  it('bows the tip arrow the way the flap fans', () => {
    for (const k of reverse) {
      const d = draw(k);
      const arrow = d.frames[1].arrow;
      if (!arrow) throw new Error('no arrow');
      const mid: Vec2 = [(arrow.from[0] + arrow.to[0]) / 2, (arrow.from[1] + arrow.to[1]) / 2];
      expect((arrow.control[0] - mid[0]) * d.line[0] + (arrow.control[1] - mid[1]) * d.line[1]).toBeGreaterThan(0);
    }
  });

  it('draws each fold as the default 3D view sees it, not mirrored', () => {
    // the camera looks at the paper's front (+z) with +x to the right and +y up; the drawing's y runs down
    for (const k of reverse) {
      const fan = reverseFan(crane, k);
      if (!fan) throw new Error('no fan');
      const d = draw(k);
      const corners = [...movingFaces(crane, k)].flatMap((f) => fan.from[f]);
      for (const axis of [0, 1]) {
        const far = corners.reduce((a, b) =>
          Math.abs(b[axis] - fan.pivot[axis]) > Math.abs(a[axis] - fan.pivot[axis]) ? b : a
        );
        const drawn = Math.max(...d.flapStart.map((p) => Math.abs(p[axis] - d.pivot[axis])));
        const point = d.flapStart.find((p) => Math.abs(Math.abs(p[axis] - d.pivot[axis]) - drawn) < 1e-9);
        if (!point) throw new Error('no far corner');
        const sign = axis === 0 ? 1 : -1;
        expect(Math.sign(point[axis] - d.pivot[axis])).toBe(sign * Math.sign(far[axis] - fan.pivot[axis]));
      }
    }
  });

  it('zooms onto the flap: the box holds it, and not much more', () => {
    for (const k of reverse) {
      const d = draw(k);
      const [x, y, w, h] = d.box;
      const pts = [...d.flapStart, ...d.flapEnd];
      for (const [px, py] of pts) {
        expect(px).toBeGreaterThanOrEqual(x);
        expect(px).toBeLessThanOrEqual(x + w);
        expect(py).toBeGreaterThanOrEqual(y);
        expect(py).toBeLessThanOrEqual(y + h);
      }
      const extent = Math.max(
        Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0])),
        Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]))
      );
      expect(w).toBe(h);
      expect(w).toBeLessThanOrEqual(1.6 * extent);
    }
  });

  it('draws no face edge-on, and the flap under the layers that cover it', () => {
    for (const k of reverse)
      for (const frame of draw(k).frames)
        for (const f of frame.faces) expect(Math.abs(area(f.points))).toBeGreaterThan(1e-9);
    // painter order: each face drawn after every face below it
    const d = draw(neck);
    for (const frame of d.frames) {
      const depths = frame.faces.map((f) => f.depth);
      expect(depths).toEqual([...depths].sort((a, b) => a - b));
    }
  });
});
