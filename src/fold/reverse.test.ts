import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fixture } from './fixtures';
import { foldedPositions, landingAt } from './fold';
import { loadModel } from './load-model';
import { arrowOpacity, ghostFaces, isReverseFold, tuckArrow } from './reverse';

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
