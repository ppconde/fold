import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fixture, slitFixture } from '../fold/fixtures';
import { loadModel } from '../fold/load-model';
import { diagramLines } from './diagram';

const half = () => loadModel(fixture('fold-in-half'));
const quarters = () => loadModel(fixture('fold-in-quarters'));
const committed = (id: string) =>
  loadModel(JSON.parse(readFileSync(new URL(`../../public/models/${id}.fold`, import.meta.url), 'utf8')));
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe('diagramLines', () => {
  it('shows only the outline on the flat sheet', () => {
    const lines = diagramLines(half(), 0);
    expect(lines).toHaveLength(6);
    expect(lines.every((l) => l.kind === 'border' && l.state === 'outline')).toBe(true);
  });

  it('highlights the crease folded in this step', () => {
    const crease = diagramLines(half(), 1).find((l) => l.kind !== 'border');
    expect(crease).toEqual({ edge: 6, from: [0.5, 0], to: [0.5, 1], kind: 'valley', state: 'active' });
  });

  it('keeps earlier creases faint and hides future ones', () => {
    const step1 = diagramLines(quarters(), 1).filter((l) => l.kind !== 'border');
    expect(step1.map((l) => [l.edge, l.state])).toEqual([
      [8, 'active'],
      [9, 'active']
    ]);
    const step2 = diagramLines(quarters(), 2).filter((l) => l.kind !== 'border');
    expect(step2.map((l) => [l.edge, l.kind, l.state])).toEqual([
      [8, 'valley', 'past'],
      [9, 'valley', 'past'],
      [10, 'mountain', 'active'],
      [11, 'valley', 'active']
    ]);
  });

  it('shows a slit as a cut, highlighted in the step that cuts it', () => {
    const model = loadModel(slitFixture());
    const cuts = (step: number) =>
      diagramLines(model, step)
        .filter((l) => l.kind === 'cut')
        .map((l) => [l.edge, l.state]);
    expect(cuts(0)).toEqual([]);
    expect(cuts(1)).toEqual([
      [7, 'active'],
      [8, 'active']
    ]);
    expect(cuts(2)).toEqual([
      [7, 'outline'],
      [8, 'outline']
    ]);
  });

  it('draws the sheet as it lies in the view, from the side facing you', () => {
    // the tulip lies white side up, a corner towards you; step 2 folds the bottom corner up to the top one
    const [fold] = diagramLines(committed('tulip'), 2).filter((l) => l.state === 'active');
    expect(close(fold.from[1], fold.to[1])).toBe(true); // across the view, not along the sheet's diagonal
    expect(fold.kind).toBe('valley');
  });

  it('keeps the last flat view while the model stands on edge', () => {
    const crane = committed('crane');
    const last = crane.steps.length - 1;
    const ys = diagramLines(crane, last).flatMap((l) => [l.from[1], l.to[1]]);
    const xs = diagramLines(crane, last).flatMap((l) => [l.from[0], l.to[0]]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.5);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.5);
  });
});
