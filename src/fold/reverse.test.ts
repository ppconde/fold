import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fixture } from './fixtures';
import { foldedPositions, movingFaces } from './fold';
import { loadModel } from './load-model';
import { arrowOpacity, isReverseFold, pushArrows, pushOpacity, pushSides, tuckArrow } from './reverse';

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
    expect(dist(mid, chord)).toBeGreaterThan(0.05 * dist(start, end));
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

describe('pushArrows', () => {
  const reverse = crane.steps.flatMap((_, k) => (isReverseFold(crane, k) ? [k] : []));
  const sub = (p: number[], q: number[]) => p.map((x, i) => x - q[i]);
  const len = (p: number[]) => Math.hypot(...p);
  const dot = (x: number[], y: number[]) => x.reduce((acc, c, i) => acc + c * y[i], 0);
  const cross = (a: number[], b: number[]) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];

  it('pushes the flap in at its spine, by the fold line, from outside the flap on both sides, for the neck, tail and head', () => {
    expect(reverse).toHaveLength(3);
    for (const k of reverse) {
      const marks = pushArrows(crane, k);
      if (!marks) throw new Error(`no push marks at step ${k}`);
      expect(marks).toHaveLength(2);
      // the flap as it starts: its pivot stays put through the step, its tip is the corner farthest from there
      const [start, end] = [foldedPositions(crane, k, 0), foldedPositions(crane, k, 1)];
      const corners = [...movingFaces(crane, k)].flatMap((f) => start[f].map((p, i) => [p, end[f][i]]));
      const pivot = corners.reduce((a, b) => (len(sub(b[0], b[1])) < len(sub(a[0], a[1])) ? b : a))[0];
      const tip = corners.reduce((a, b) => (len(sub(b[0], pivot)) > len(sub(a[0], pivot)) ? b : a))[0];
      const flap = len(sub(tip, pivot));
      const spine = pivot.map((x, i) => x + 0.1 * (tip[i] - x));
      const [p, q, r] = start[crane.steps[k].fixedFace];
      const n = cross(sub(q, p), sub(r, p));
      const middle = [0, 1, 2].map((i) => corners.reduce((acc, [c]) => acc + c[i], 0) / corners.length);
      const tails: number[][] = [];
      for (const { outline, facing } of marks) {
        expect(dot(facing, n)).not.toBe(0);
        // a closed outline, its point at the spine (seen from the front: just off the paper)
        expect(outline[0]).toEqual(outline[outline.length - 1]);
        const off = sub(outline[0], spine);
        const inPlane = off.map((x, i) => x - (dot(off, n) / dot(n, n)) * n[i]);
        expect(len(inPlane)).toBeLessThan(0.02 * flap);
        // flat in the paper's plane, so it faces you
        for (const x of outline) expect(Math.abs(dot(sub(x, outline[0]), n)) / len(n)).toBeLessThan(1e-9);
        const tail = sub(outline[3], outline[0]);
        tails.push(tail);
        // its tail sits on the side of the spine away from the flap
        expect(dot(tail, sub(middle, spine))).toBeLessThan(0);
      }
      // the two point the same way, one each side of the body
      expect(dot(tails[0], tails[1])).toBeGreaterThan(0);
      expect(dot(sub(marks[0].outline[0], marks[1].outline[0]), n)).toBeGreaterThan(0);
      expect(dot(marks[0].facing, marks[1].facing)).toBeLessThan(0);
    }
  });

  it('is only for reverse folds', () => {
    expect(pushArrows(crane, 0)).toBeNull();
    expect(pushArrows(crane, neck - 1)).toBeNull();
    const tulip = committed('tulip');
    expect(tulip.steps.some((_, k) => pushArrows(tulip, k))).toBe(false);
  });
});

describe('pushSides', () => {
  it('puts one mark each side even when the spine is the outermost layer', () => {
    expect(pushSides([-0.004, 0, 0.002])).toEqual([
      [0.002, 1],
      [-0.004, -1]
    ]);
    // the spine on top, or at the bottom, of every layer around it
    expect(pushSides([0, -0.002, -0.004]).map(([, side]) => side)).toEqual([1, -1]);
    expect(pushSides([0, 0.002, 0.004]).map(([, side]) => side)).toEqual([1, -1]);
  });
});

describe('pushOpacity', () => {
  it('shows from the first frame and is gone by the first sixth of the step', () => {
    expect([0, 1 / 12, 1 / 8, 1 / 6, 1].map(pushOpacity)).toEqual([1, 1, expect.closeTo(0.5, 9), 0, 0]);
  });
});
