import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fixture } from './fixtures';
import { landingAt } from './fold';
import { loadModel } from './load-model';
import { ghostFaces, isReverseFold } from './reverse';

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
