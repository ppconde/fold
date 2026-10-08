import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fixture } from '../fold/fixtures';
import { foldedPositions } from '../fold/fold';
import { loadModel } from '../fold/load-model';
import { evenPace, unfoldAll } from './unfold';

describe('unfoldAll', () => {
  it('goes from the flat sheet to the finished shape in one step', () => {
    const model = loadModel(fixture('fold-in-half'));
    const once = unfoldAll(model);
    expect(once.steps).toHaveLength(2);
    expect(once.steps[1].angles).toEqual(model.steps.at(-1)?.angles);
    expect(foldedPositions(once, 1, 0)).toEqual(foldedPositions(model, 0, 0));
  });

  it("ends with the lesson's layers, even where flaps end on edge", () => {
    const model = loadModel(JSON.parse(readFileSync('public/models/crane.fold', 'utf8')));
    const [a, b] = [foldedPositions(model, model.steps.length - 1, 1), foldedPositions(unfoldAll(model), 1, 1)];
    // the same shape up to the turn: every corner the same distance from the first
    const reach = (P: number[][][]) => P.flat().map((p) => Math.hypot(...p.map((x, i) => x - P[0][0][i])));
    reach(b).forEach((d, i) => {
      expect(d).toBeCloseTo(reach(a)[i], 6);
    });
  });

  it('paces the unfold evenly, from flat to finished', () => {
    const pace = evenPace(unfoldAll(loadModel(fixture('fold-in-half'))));
    expect(pace(0)).toBe(0);
    expect(pace(1)).toBeCloseTo(1);
    const ts = [0.1, 0.3, 0.5, 0.7, 0.9].map(pace);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
  });
});
