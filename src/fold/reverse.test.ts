import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fixture } from './fixtures';
import { foldedPositions, landingAt } from './fold';
import { loadModel } from './load-model';
import { ghostFaces, isReverseFold, pushArrow, pushOpacity } from './reverse';

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

describe('pushArrow', () => {
  const at = (f: number, v: number) => foldedPositions(crane, neck, 0)[f][crane.faces[f].indexOf(v)];
  const dist = (p: number[], q: number[]) => Math.hypot(...p.map((x, i) => x - q[i]));

  it("points at the neck's spine from outside, toward the layers it goes in between", () => {
    const arrow = pushArrow(crane, neck);
    expect(arrow).not.toBeNull();
    const [tail, head] = [arrow!.shaft[0], arrow!.shaft[arrow!.shaft.length - 1]];
    // the spine is the crease that flips; the head stops just short of it, the tail lies farther out
    const len = (e: number) => dist(crane.vertices[crane.edges[e][0]], crane.vertices[crane.edges[e][1]]);
    const spine = crane.steps[neck].angles
      .map((a, e) =>
        Math.abs(crane.steps[neck - 1].angles[e]) === 180 && a === -crane.steps[neck - 1].angles[e] ? e : -1
      )
      .filter((e) => e >= 0)
      .reduce((best, e) => (len(e) > len(best) ? e : best));
    const [f] = crane.edgeFaces[spine];
    const mid = [0, 1, 2].map((i) => (at(f, crane.edges[spine][0])[i] + at(f, crane.edges[spine][1])[i]) / 2);
    expect(dist(tail, mid)).toBeGreaterThan(dist(head, mid));
    expect(dist(head, mid)).toBeLessThan(0.08);
    expect(arrow!.head).toHaveLength(2);
  });

  it('is only for reverse folds', () => {
    expect(pushArrow(crane, neck - 1)).toBeNull();
    expect(pushArrow(crane, 0)).toBeNull();
  });
});

describe('pushOpacity', () => {
  it('shows at the start of the step and is gone before the flap has swung far from where it is pushed', () => {
    expect(pushOpacity(0, 0.9)).toBe(1);
    expect(pushOpacity(0.05, 0.9)).toBe(1);
    expect(pushOpacity(0.12, 0.9)).toBeGreaterThan(0);
    expect(pushOpacity(0.12, 0.9)).toBeLessThan(1);
    expect(pushOpacity(0.2, 0.9)).toBe(0);
    expect(pushOpacity(0.5, 0.9)).toBe(0);
  });
});
