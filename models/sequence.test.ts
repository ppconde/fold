import { describe, expect, it } from 'vitest';
import { foldedPositions, layerHeights } from '../src/fold/fold';
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
    expect(src.steps).toEqual([{ fold: { middle1: 180 }, hold: [0.75, 0.5], ...text, stack: expect.any(Array) }]);
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

  it('stacks a valley fold on top of the held paper, and a mountain fold under it', () => {
    for (const valley of [true, false]) {
      const s = foldSequence();
      s.fold('half', [0.5, 0], [0.5, 1], { valley, hold: [0.75, 0.5], ...text });
      const model = loadModel(buildFold(s.source({ ...entry, tags: [] })));
      const held = model.steps[1].fixedFace;
      const flap = 1 - held;
      expect(layerHeights(model, 1)[flap]).toBe(valley ? 1 : 0);
      expect(layerHeights(model, 1)[held]).toBe(valley ? 0 : 1);
    }
  });

  it('turns a two-layer flap over as one, reversing it on top of the stack', () => {
    const s = foldSequence();
    s.fold('half', [0.5, 0], [0.5, 1], { valley: true, hold: [0.75, 0.25], ...text });
    s.fold('quarter', [0, 0.5], [1, 0.5], { valley: true, ...text });
    const model = loadModel(buildFold(s.source({ ...entry, tags: [] })));
    // four distinct layers, the held quarter at the bottom
    expect([...layerHeights(model, 2)].sort()).toEqual([0, 1, 2, 3]);
    expect(layerHeights(model, 2)[model.steps[2].fixedFace]).toBe(0);
    expect(checkModel(model)).toEqual([]);
  });

  it('keeps two tips that share no unmoved crease from passing through each other', () => {
    // fold in half, then fold the free corner through both layers (the old engine let the tips cross)
    const s = foldSequence();
    s.fold('half', [0.5, 0], [0.5, 1], { valley: true, hold: [0.75, 0.5], ...text });
    s.fold('corner', [0.7, 1], [1, 0.7], { valley: true, ...text });
    expect(checkModel(loadModel(buildFold(s.source({ ...entry, tags: [] }))))).toEqual([]);
  });

  it('writes faceOrders only where the stacking changes', () => {
    const s = foldSequence();
    s.fold('half', [0.5, 0], [0.5, 1], { valley: true, hold: [0.75, 0.5], ...text });
    s.turn([0, 180, 0], text);
    const frames = buildFold(s.source({ ...entry, tags: [] })).file_frames;
    expect(frames[0].faceOrders).toHaveLength(1);
    expect(frames[1]).not.toHaveProperty('faceOrders');
  });

  it('carries a valley flap over the paper it lands on, even when a thicker stack lies elsewhere', () => {
    // a thick strip on the left, then a corner folded on the thin right side (once through one layer, once through two)
    for (const halved of [false, true]) {
      const s = foldSequence();
      if (halved) s.fold('half', [0, 0.5], [1, 0.5], { valley: true, hold: [0.8, 0.25], ...text });
      for (const x of [0.3, 0.45, 0.55])
        s.fold(`strip${x}`, [x, 0], [x, 1], { valley: true, hold: [0.8, 0.25], ...text });
      s.fold('corner', halved ? [1, 0.25] : [1, 0.2], halved ? [0.75, 0] : [0.8, 0], { valley: true, ...text });
      const model = loadModel(buildFold(s.source({ ...entry, tags: [] })));
      const last = model.steps.length - 1;
      for (const t of [0.1, 0.3, 0.5, 0.7, 0.85, 0.9]) {
        // no turn: the table is z = 0, and a valley fold only ever rises off it
        const lowest = Math.min(...foldedPositions(model, last, t).flatMap((face) => face.map((p) => p[2])));
        expect(lowest).toBeGreaterThanOrEqual(-1e-9);
      }
    }
  });

  it('creases and unfolds in one step: the crease peaks short of flat and ends flat', () => {
    const s = foldSequence();
    s.crease('middle', [0.5, 0], [0.5, 1], { valley: true, hold: [0.75, 0.5], ...text });
    const src = s.source({ ...entry, tags: [] });
    expect(src.steps[0].fold).toEqual({ middle1: 0 });
    expect(src.steps[0].path?.[0].middle1).toBeGreaterThan(170);
    expect(checkModel(loadModel(buildFold(src)))).toEqual([]);
  });

  it('collapses fold-and-unfold creases into a square base that passes every check', () => {
    const s = foldSequence();
    for (const [name, p, q] of [
      ['d', [0, 0], [1, 1]],
      ['e', [1, 0], [0, 1]],
      ['v', [0.5, 0], [0.5, 1]],
      ['h', [0, 0.5], [1, 0.5]]
    ] as const)
      s.crease(name, [...p], [...q], { valley: name === 'd' || name === 'e', hold: [0.9, 0.2], ...text });
    s.collapse({ d1: 180, e1: 0, v1: -180, h1: -180 }, { hold: [0.6, 0.1], ...text });
    const src = s.source({ ...entry, tags: [], solve: true });
    const model = loadModel(buildFold(src));
    expect(model.steps[5].path.length).toBeGreaterThan(0);
    expect(checkModel(model)).toEqual([]);
  });
});
