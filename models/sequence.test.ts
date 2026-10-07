import { describe, expect, it } from 'vitest';
import { loadModel } from '../src/fold/load-model';
import { buildFold } from './build';
import { checkModel } from './check';
import { diamond, diamondSequence, foldSequence } from './sequence';

const entry = {
  id: 'test',
  name: { en: 'Test', pt: 'Teste' },
  category: 'geometric',
  difficulty: 'easy',
  tags: [],
  paperColor: '#2E3A59'
} as const;
const text = { en: 'Fold.', pt: 'Dobra.' };

describe('foldSequence', () => {
  it('turns one valley fold into one valley crease and a held point', () => {
    const s = foldSequence();
    s.fold('middle', [0.5, 0], [0.5, 1], { valley: true, hold: [0.75, 0.5], ...text });
    const src = s.source({ ...entry, tags: [] });
    expect(src.creases).toEqual({ middle1: { from: [0.5, 0], to: [0.5, 1], assignment: 'V' } });
    expect(src.steps).toEqual([{ fold: { middle1: 180 }, hold: [0.75, 0.5], ...text }]);
  });

  it('creases both layers of a two-layer fold, valley on one and mountain on the flipped one', () => {
    const s = foldSequence();
    s.fold('half', [0.5, 0], [0.5, 1], { valley: true, hold: [0.75, 0.5], ...text });
    s.fold('quarter', [0, 0.5], [1, 0.5], { valley: true, ...text });
    const src = s.source({ ...entry, tags: [] });
    expect(Object.values(s.angles('quarter')).sort()).toEqual([-180, 180]);
    expect(
      Object.keys(s.angles('quarter'))
        .map((k) => src.creases[k].assignment)
        .sort()
    ).toEqual(['M', 'V']);
    expect(checkModel(loadModel(buildFold(src)))).toEqual([]);
  });

  it('makes a fold toward the viewer a mountain crease once the paper is turned white side up', () => {
    const s = diamondSequence();
    s.fold('diagonal', diamond(2, 0), diamond(0, 0), { valley: true, hold: diamond(1, 0.5), ...text });
    const src = s.source({ ...entry, tags: [] });
    expect(src.creases.diagonal1.assignment).toBe('M');
    expect(src.steps[0].rotation).toEqual([0, 180, 45]);
  });

  it('folds only the tagged pieces when asked', () => {
    const s = foldSequence();
    s.fold('half', [0.5, 0], [0.5, 1], { valley: true, tag: 'flap', hold: [0.75, 0.5], ...text });
    s.fold('corner', [0.6, 1], [1, 0.6], { valley: true, only: (t) => t.includes('flap'), ...text });
    expect(Object.keys(s.angles('corner'))).toHaveLength(1);
  });

  it('names the mistake for a fold that misses the paper or a hold on a moving piece', () => {
    const s = foldSequence();
    expect(() => s.fold('none', [2, 0], [2, 1], { valley: true, ...text })).toThrow("Fold none doesn't fold anything.");
    expect(() => s.fold('half', [0.5, 0], [0.5, 1], { valley: true, hold: [0.25, 0.5], ...text })).toThrow(
      'Fold half holds a point that is not on a piece that stays still.'
    );
  });
});
