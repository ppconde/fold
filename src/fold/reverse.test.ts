import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fixture } from './fixtures';
import { foldedPositions, movingFaces } from './fold';
import { loadModel } from './load-model';
import { arrowOpacity, isReverseFold, pinchArrows, pinchOpacity, pinchSides, tuckArrow } from './reverse';

const committed = (id: string) =>
  loadModel(JSON.parse(readFileSync(new URL(`../../public/models/${id}.fold`, import.meta.url), 'utf8')));
const crane = committed('crane');
const neck = crane.steps.findIndex((s) => s.instruction.en.startsWith('Reverse-fold the left flap'));

describe('isReverseFold', () => {
  it('finds exactly the neck, tail and head', () => {
    const found = crane.steps.map((_, k) => k).filter((k) => isReverseFold(crane, k));
    expect(found.map((k) => crane.steps[k].instruction.en.slice(0, 13))).toEqual(Array(3).fill('Reverse-fold '));
  });

  it('finds no reverse fold in models without one', () => {
    for (const m of [loadModel(fixture('fold-in-quarters')), committed('tulip'), committed('dog-face')]) {
      expect(m.steps.some((_, k) => isReverseFold(m, k))).toBe(false);
    }
    expect(isReverseFold(crane, 0)).toBe(false);
  });
});

describe('tuckArrow', () => {
  const dist = (p: number[], q: number[]) => Math.hypot(...p.map((x, i) => x - q[i]));
  // the leg's tip: the corner of the swinging faces that travels farthest
  const tip = (t: number) => {
    const [from, to] = [foldedPositions(crane, neck, 0), foldedPositions(crane, neck, 1)];
    const moved = [...movingFaces(crane, neck)].flatMap((f) => from[f].map((p, i) => [p, to[f][i]]));
    const far = moved.reduce((best, m) => (dist(m[0], m[1]) > dist(best[0], best[1]) ? m : best));
    return far[t];
  };

  it('runs from the leg where it is to where it tucks in', () => {
    const arrow = tuckArrow(crane, neck);
    if (!arrow) throw new Error('no tuck arrow on the neck');
    const [start, end] = [arrow.shaft[0], arrow.shaft[arrow.shaft.length - 1]];
    const span = dist(tip(0), tip(1));
    expect(dist(start, tip(0))).toBeLessThan(0.2 * span);
    expect(dist(end, tip(1))).toBeLessThan(0.2 * span);
    expect(arrow.head).toHaveLength(2);
  });

  it('curves, like a diagram arrow', () => {
    const shaft = tuckArrow(crane, neck)?.shaft ?? [];
    const [start, mid, end] = [shaft[0], shaft[Math.floor(shaft.length / 2)], shaft[shaft.length - 1]];
    const chord = [0, 1, 2].map((i) => (start[i] + end[i]) / 2);
    expect(dist(mid, chord)).toBeGreaterThan(0.1 * dist(start, end));
  });

  it('is only for reverse folds', () => {
    expect(tuckArrow(crane, neck - 1)).toBeNull();
    expect(tuckArrow(crane, 0)).toBeNull();
  });
});

describe('arrowOpacity', () => {
  it('shows until three quarters through, then fades out by the end', () => {
    expect(arrowOpacity(0)).toBe(1);
    expect(arrowOpacity(0.75)).toBe(1);
    expect(arrowOpacity(0.875)).toBeCloseTo(0.5);
    expect(arrowOpacity(1)).toBe(0);
  });
});

describe('pinchArrows', () => {
  const reverse = crane.steps.flatMap((_, k) => (isReverseFold(crane, k) ? [k] : []));
  const sub = (p: number[], q: number[]) => p.map((x, i) => x - q[i]);
  const len = (p: number[]) => Math.hypot(...p);
  const cross = (a: number[], b: number[]) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];

  it('pinches the flap at its spine from both sides of the body, for the neck, tail and head', () => {
    expect(reverse).toHaveLength(3);
    for (const k of reverse) {
      const arrows = pinchArrows(crane, k);
      if (!arrows) throw new Error(`no pinch arrows at step ${k}`);
      expect(arrows).toHaveLength(2);
      // the flap as it starts: its pivot stays put through the step, its tip is the corner farthest from there
      const [start, end] = [foldedPositions(crane, k, 0), foldedPositions(crane, k, 1)];
      const corners = [...movingFaces(crane, k)].flatMap((f) => start[f].map((p, i) => [p, end[f][i]]));
      const pivot = corners.reduce((a, b) => (len(sub(b[0], b[1])) < len(sub(a[0], a[1])) ? b : a))[0];
      const tip = corners.reduce((a, b) => (len(sub(b[0], pivot)) > len(sub(a[0], pivot)) ? b : a))[0];
      const flap = len(sub(tip, pivot));
      const spine = pivot.map((x, i) => x + 0.25 * (tip[i] - x));
      for (const a of arrows) expect(len(sub(a.to, spine))).toBeLessThan(0.2 * flap);
      const [p, q, r] = start[crane.steps[k].fixedFace];
      const n = cross(sub(q, p), sub(r, p));
      const [d0, d1] = arrows.map((a) => sub(a.from, a.to));
      const dot = (x: number[], y: number[]) => x.reduce((acc, c, i) => acc + c * y[i], 0);
      const spineDir = sub(tip, pivot);
      // the flap's layers sit a hair off the plane: take the spine's in-plane part
      const axis = spineDir.map((x, i) => x - (dot(spineDir, n) / dot(n, n)) * n[i]);
      for (const d of [d0, d1]) {
        // 45 degrees off the normal, and its in-plane part is perpendicular to the spine
        expect(Math.abs(dot(d, n)) / (len(d) * len(n))).toBeCloseTo(Math.SQRT1_2, 9);
        expect(dot(d, axis) / (len(d) * len(axis))).toBeCloseTo(0, 9);
      }
      // opposite normal parts and opposite in-plane parts: they lean in from either side of the spine
      expect(dot(d0, n) * dot(d1, n)).toBeLessThan(0);
      for (let i = 0; i < 3; i++) expect(d0[i]).toBeCloseTo(-d1[i], 9);
    }
  });

  it('is only for reverse folds', () => {
    expect(pinchArrows(crane, 0)).toBeNull();
    expect(pinchArrows(crane, neck - 1)).toBeNull();
    const tulip = committed('tulip');
    expect(tulip.steps.some((_, k) => pinchArrows(tulip, k))).toBe(false);
  });
});

describe('pinchSides', () => {
  it('puts one arrow each side even when the spine is the outermost layer', () => {
    expect(pinchSides([-0.004, 0, 0.002])).toEqual([
      [0.002, 1],
      [-0.004, -1]
    ]);
    // the spine on top, or at the bottom, of every layer around it
    expect(pinchSides([0, -0.002, -0.004]).map(([, side]) => side)).toEqual([1, -1]);
    expect(pinchSides([0, 0.002, 0.004]).map(([, side]) => side)).toEqual([1, -1]);
  });
});

describe('pinchOpacity', () => {
  it('shows from the first frame and is gone by the first sixth of the step', () => {
    expect([0, 1 / 12, 1 / 8, 1 / 6, 1].map(pinchOpacity)).toEqual([1, 1, expect.closeTo(0.5, 9), 0, 0]);
  });
});
