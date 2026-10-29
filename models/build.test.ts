import { describe, expect, it } from 'vitest';
import { fixture } from '../src/fold/fixtures';
import { loadModel } from '../src/fold/load-model';
import { buildFold, entryOf, type ModelSource } from './build';

const half: ModelSource = {
  id: 'half',
  name: { en: 'Half', pt: 'Metade' },
  category: 'bases',
  difficulty: 'easy',
  tags: ['basic'],
  paperColor: '#2E3A59',
  creases: { middle: { from: [0.5, 0], to: [0.5, 1], assignment: 'V' } },
  steps: [{ fold: { middle: 180 }, hold: [0.75, 0.5], en: 'Fold in half.', pt: 'Dobra ao meio.' }]
};

describe('buildFold', () => {
  it('builds a file that loads like the hand-written fold-in-half fixture', () => {
    const built = loadModel(buildFold(half));
    const original = loadModel(fixture('fold-in-half'));
    expect(built.faces).toHaveLength(original.faces.length);
    expect(built.steps[1].angles.filter((a) => a === 180)).toHaveLength(1);
    // the held face is the right half
    expect(built.faceCentroids[built.steps[1].fixedFace][0]).toBeGreaterThan(0.5);
    expect(built.steps[1].instruction).toEqual({ en: 'Fold in half.', pt: 'Dobra ao meio.' });
  });

  it('carries each crease angle forward until a later step changes it', () => {
    const model = loadModel(
      buildFold({
        ...half,
        steps: [
          { fold: { middle: 90 }, en: 'Half way.', pt: 'A meio.' },
          { rotation: [0, 180, 0], en: 'Turn over.', pt: 'Vira.' },
          { fold: { middle: 0 }, en: 'Unfold.', pt: 'Desdobra.' }
        ]
      })
    );
    expect(model.steps.map((s) => Math.max(...s.angles))).toEqual([0, 90, 90, 0]);
    expect(model.steps[3].rotation).toEqual([0, 180, 0]);
  });

  it('names the mistake when a step folds an unknown crease or holds a point off the paper', () => {
    expect(() => buildFold({ ...half, steps: [{ fold: { nope: 180 }, en: 'x', pt: 'x' }] })).toThrow(
      'half step 1 folds nope, which is not a crease.'
    );
    expect(() => buildFold({ ...half, steps: [{ hold: [2, 2], en: 'x', pt: 'x' }] })).toThrow(
      'half step 1 holds a point outside the paper.'
    );
  });
});

describe('entryOf', () => {
  it('is the library entry with a thumbnail path', () => {
    expect(entryOf(half, [half])).toEqual({
      id: 'half',
      name: { en: 'Half', pt: 'Metade' },
      category: 'bases',
      difficulty: 'easy',
      tags: ['basic'],
      thumbnail: '/models/half.svg'
    });
  });

  it('opens a model that builds on a base at the end of its base', () => {
    const quarter: ModelSource = {
      ...half,
      id: 'quarter',
      category: 'objects',
      buildsOn: 'half',
      steps: [...half.steps, { fold: { middle: 0 }, en: 'Unfold.', pt: 'Desdobra.' }]
    };
    expect(entryOf(quarter, [half, quarter])).toMatchObject({ buildsOn: 'half', startStep: 1 });
  });

  it('refuses a base the model does not start with', () => {
    const other: ModelSource = { ...half, id: 'other', buildsOn: 'half', steps: [{ ...half.steps[0], en: 'Fold.' }] };
    expect(() => entryOf(other, [half, other])).toThrow(/half/);
    expect(() => entryOf({ ...half, buildsOn: 'nope' }, [half])).toThrow(/nope/);
  });
});
