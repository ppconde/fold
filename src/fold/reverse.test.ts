import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fixture } from './fixtures';
import { foldedPositions, landingAt, movingFaces, REVERSE_FLIP } from './fold';
import { loadModel } from './load-model';
import { arrowOpacity, ghostFaces, isReverseFold, pinchArrows, pinchOpacity, tuckArrow } from './reverse';

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

describe('ghostFaces', () => {
  it('ghosts the neck flap, not the body it passes between', () => {
    const g = ghostFaces(crane, neck, 0.5);
    // the leg's layers, and the body's inner layers it lands between (2026-10-13-reverse-fold-spike.md)
    for (const f of [2, 5, 34, 35]) expect(g.has(f)).toBe(true);
    for (const f of [25, 27]) expect(g.has(f)).toBe(false);
  });

  it('ghosts again when scrubbed back before the landing', () => {
    expect(landingAt(crane, neck)).toBeLessThan(1);
    expect(ghostFaces(crane, neck, 0.99).size).toBe(0);
    expect(ghostFaces(crane, neck, 1).size).toBe(0);
    expect(ghostFaces(crane, neck, 0.5).size).toBeGreaterThan(0);
  });

  it('ghosts nothing outside a reverse fold', () => {
    expect(ghostFaces(crane, neck - 1, 0.5).size).toBe(0);
  });
});

describe('tuckArrow', () => {
  const dist = (p: number[], q: number[]) => Math.hypot(...p.map((x, i) => x - q[i]));
  // the leg's tip: the corner of the swinging faces that travels farthest
  const tip = (t: number) => {
    const [from, to] = [foldedPositions(crane, neck, 0), foldedPositions(crane, neck, 1)];
    const moved = [...ghostFaces(crane, neck, 0.5)].flatMap((f) => from[f].map((p, i) => [p, to[f][i]]));
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
  it('shows through the swing and fades as the flap lands', () => {
    expect(arrowOpacity(0, 0.9)).toBe(1);
    expect(arrowOpacity(0.5, 0.9)).toBe(1);
    expect(arrowOpacity(0.8, 0.9)).toBeGreaterThan(0);
    expect(arrowOpacity(0.8, 0.9)).toBeLessThan(1);
    expect(arrowOpacity(0.9, 0.9)).toBe(0);
    expect(arrowOpacity(1, 0.9)).toBe(0);
  });
});

describe('pinchArrows', () => {
  const reverse = crane.steps.flatMap((_, k) => (isReverseFold(crane, k) ? [k] : []));
  const v = (p: number[]) => p.map((x) => x);
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
      const [p, q, r] = start[crane.steps[k].fixedFace].map(v);
      const n = cross(sub(q, p), sub(r, p));
      const [d0, d1] = arrows.map((a) => sub(a.from, a.to));
      expect(len(cross(d0, n)) / (len(d0) * len(n))).toBeLessThan(1e-6);
      expect(len(cross(d1, n)) / (len(d1) * len(n))).toBeLessThan(1e-6);
      expect(d0.reduce((acc, x, i) => acc + x * d1[i], 0)).toBeCloseTo(-len(d0) * len(d1), 9);
    }
  });

  it('is only for reverse folds', () => {
    expect(pinchArrows(crane, 0)).toBeNull();
    expect(pinchArrows(crane, neck - 1)).toBeNull();
    const tulip = committed('tulip');
    expect(tulip.steps.some((_, k) => pinchArrows(tulip, k))).toBe(false);
  });
});

describe('pinchOpacity', () => {
  it('shows from the first frame and fades out over the second half of the flip', () => {
    expect([0, REVERSE_FLIP / 2, 0.75 * REVERSE_FLIP, REVERSE_FLIP, 1].map(pinchOpacity)).toEqual([
      1,
      1,
      expect.closeTo(0.5, 9),
      0,
      0
    ]);
  });
});
