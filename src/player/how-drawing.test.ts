import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { foldedPositions, isReverseFold, movingFaces, reverseFan } from '../fold/fold';
import { loadModel } from '../fold/load-model';
import type { Vec2 } from '../fold/types';
import { howDrawing } from './how-drawing';
import { lineGroups } from './paper-geometry';

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
      expect(d.frames[1].fold.length).toBeGreaterThan(0);
      expect(d.frames[2].fold).toEqual([]);
    }
  });

  it('draws the push as the stage has it: the flap where it is then, its tip on the path it takes', () => {
    for (const k of reverse) {
      const d = draw(k);
      const arrow = d.frames[1].arrow;
      if (!arrow) throw new Error('no arrow');
      const toPath = (p: Vec2) =>
        Math.min(
          ...arrow.slice(1).map((b, j) => {
            const a = arrow[j];
            const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
            const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
            return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
          })
        );
      const flap = d.frames[1].faces.filter((f) => f.subject).flatMap((f) => f.points);
      expect(Math.min(...flap.map(toPath))).toBeLessThan(1e-3 * d.frames[1].box[2]);
      // it bends, as the flap swings round on stage, rather than cutting straight across
      const [a, b] = [arrow[0], arrow[arrow.length - 1]];
      const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const off = Math.max(
        ...arrow.map((p) => Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / chord)
      );
      expect(off).toBeGreaterThan(0.05 * chord);
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

  it('frames each drawing at one size that holds its flap and every mark, and not much more', () => {
    for (const k of reverse) {
      const d = draw(k);
      const size = d.frames[0].box[2];
      for (const frame of d.frames) {
        const [x, y, w, h] = frame.box;
        expect([w, h]).toEqual([size, size]);
        const held = [...frame.spine.flatMap((s) => [s.from, s.to]), ...(frame.arrow ?? []), ...(frame.landing ?? [])];
        for (const [px, py] of held) {
          expect(px).toBeGreaterThanOrEqual(x - 1e-9);
          expect(px).toBeLessThanOrEqual(x + size + 1e-9);
          expect(py).toBeGreaterThanOrEqual(y - 1e-9);
          expect(py).toBeLessThanOrEqual(y + size + 1e-9);
        }
      }
      const pts = [...d.flapStart, ...d.flapEnd];
      const extent = Math.max(
        Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0])),
        Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]))
      );
      expect(size).toBeLessThanOrEqual(2.5 * extent);
    }
  });

  it('centres the tail’s finished drawing across on the paper it shows', () => {
    const d = draw(reverse[1]);
    const [x, y, size] = d.frames[2].box;
    const inside = d.frames[2].faces
      .flatMap((f) => f.points)
      .filter(([px, py]) => px >= x && px <= x + size && py >= y && py <= y + size);
    // across; up and down, the dotted edge where it was holds the frame where it can still show it
    const [lo, hi] = [Math.min(...inside.map((p) => p[0])), Math.max(...inside.map((p) => p[0]))];
    expect(Math.abs(lo - x - (x + size - hi))).toBeLessThan(0.02 * size);
    expect(y).toBeLessThanOrEqual(Math.min(...inside.map((p) => p[1])));
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

  it('picks out the flap in the first two drawings, and shows the whole paper at full tone in the last', () => {
    for (const k of reverse) {
      const d = draw(k);
      const moving = movingFaces(crane, k).size;
      for (const frame of d.frames.slice(0, 2)) {
        expect(frame.faces.filter((f) => f.subject)).toHaveLength(moving);
        expect(frame.faces.some((f) => !f.subject)).toBe(true);
      }
      expect(d.frames[2].faces.every((f) => f.subject)).toBe(true);
    }
  });
});

describe('the 3D spine', () => {
  it('draws the How drawings’ yellow edge on the paper, on reverse folds only', () => {
    const g = (k: number, highlight = true) =>
      lineGroups(crane, foldedPositions(crane, k, 0.5), k, 0.5, highlight).spine;
    // two points of three numbers per face that owns the edge, as many as the drawing has spine segments
    for (const k of reverse) expect(g(k).length).toBeGreaterThanOrEqual(draw(k).frames[0].spine.length * 6);
    expect(g(neck - 1)).toEqual([]);
    expect(g(neck, false)).toEqual([]);
  });
});
