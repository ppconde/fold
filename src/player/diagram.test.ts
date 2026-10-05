import { describe, expect, it } from 'vitest';
import { fixture } from '../fold/fixtures';
import { loadModel } from '../fold/load-model';
import { diagramLines } from './diagram';

const half = () => loadModel(fixture('fold-in-half'));
const quarters = () => loadModel(fixture('fold-in-quarters'));

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
});
