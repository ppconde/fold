import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fixture, slitFixture } from '../src/fold/fixtures';
import { LAYER_GAP } from '../src/fold/fold';
import { loadModel } from '../src/fold/load-model';
import { buildFold } from './build';
import { checkModel, crossings, flapFlips, interleaved, spread, wrongSides } from './check';
import { diamond as d, diamondSequence, has, lacks } from './sequence';

const quarters = () => loadModel(fixture('fold-in-quarters'));
const crane = () =>
  loadModel(JSON.parse(readFileSync(new URL('../public/models/crane.fold', import.meta.url), 'utf8')));

describe('checkModel', () => {
  it('passes both hand-written fixtures', () => {
    expect(checkModel(loadModel(fixture('fold-in-half')))).toEqual([]);
    expect(checkModel(quarters())).toEqual([]);
  });

  it('reports a seam over budget', () => {
    expect(checkModel(quarters(), 0.001)).toContainEqual(expect.stringMatching(/^Step 2 at 100% opens a 0\.0\d\d gap/));
  });

  it('reports a step that does not fold flat', () => {
    const json = fixture('fold-in-quarters') as { file_frames: { edges_foldAngle: number[] }[] };
    json.file_frames[1].edges_foldAngle[11] = 90; // half of the second crease line
    expect(checkModel(loadModel(json))).toContainEqual(expect.stringMatching(/^Step 2 does not fold flat/));
  });
});

describe('spread', () => {
  it('is zero on the flat sheet and only the layer lift at rest after a two-layer fold', () => {
    expect(spread(quarters(), 1, 0)).toBe(0);
    expect(spread(quarters(), 2, 1)).toBeGreaterThan(0);
    expect(spread(quarters(), 2, 1)).toBeLessThanOrEqual(6 * LAYER_GAP + 1e-9);
  });
});

describe('crossings', () => {
  it('finds none while a single layer folds', () => {
    for (const t of [0.25, 0.5, 1]) expect(crossings(quarters(), 1, t)).toEqual([]);
  });

  it('finds two flaps folded through each other', () => {
    // a 3-panel strip whose outer panels both fold valley onto the narrower middle one, stopping at 178°
    // without faceOrders: each flap rests on its own wedge, so they cut through each other
    const strip = loadModel({
      file_spec: 1.2,
      vertices_coords: [
        [0, 0],
        [0.4, 0],
        [0.6, 0],
        [1, 0],
        [1, 1],
        [0.6, 1],
        [0.4, 1],
        [0, 1]
      ],
      edges_vertices: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 0],
        [1, 6],
        [2, 5]
      ],
      edges_assignment: ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'V', 'V'],
      faces_vertices: [
        [0, 1, 6, 7],
        [1, 2, 5, 6],
        [2, 3, 4, 5]
      ],
      file_frames: [
        {
          edges_foldAngle: [0, 0, 0, 0, 0, 0, 0, 0, 178, 178],
          'foldapp:instruction': 'Both flaps in.',
          'foldapp:fixedFace': 1
        }
      ]
    });
    // each 0.4-wide flap overhangs the 0.2-wide middle, so they cut through each other from edge to edge
    expect(crossings(strip, 1, 1)).toContainEqual([0, 2]);
    expect(crossings(strip, 1, 0.25)).toEqual([]);
  });
});

describe('flapFlips', () => {
  // The first dog face: under the old 178° clamp its nose fold re-routed the spanning tree and the
  // wedges put the right ear's front layer on top of its back layer (white side showing, z-fighting).
  const firstDog = () => {
    const s = diamondSequence();
    const text = { en: 'x', pt: 'x' };
    s.fold('diagonal', d(0, 0), d(2, 0), { valley: true, tag: 'front', hold: d(1, -0.5), ...text });
    s.fold('leftEar', d(0.25, -0.25), d(0.65, 0), { valley: true, hold: d(1, -0.4), ...text });
    s.fold('rightEar', d(1.35, 0), d(1.75, -0.25), { valley: true, ...text });
    s.fold('nose', d(1.25, -0.75), d(0.75, -0.75), { valley: true, only: has('front'), ...text });
    s.fold('chin', d(1.25, -0.75), d(0.75, -0.75), { valley: false, only: lacks('front'), ...text });
    const entry = { id: 'dog', name: { en: 'Dog' }, category: 'animals', difficulty: 'easy', tags: [] } as const;
    return loadModel(buildFold(s.source({ ...entry, tags: [], paperColor: '#B08A6A' })));
  };

  it('finds a folded flap that changes side in a later step', () => {
    // fold-in-half, then a step that keeps the angles but puts the flap under the held half
    const json = fixture('fold-in-half') as { file_frames: Record<string, unknown>[] };
    json.file_frames.push({ ...json.file_frames[0], faceOrders: [[0, 1, -1]] });
    expect(flapFlips(loadModel(json))).toContainEqual(
      expect.stringMatching(/^Step 2: face \d+ flips to the other side of face \d+/)
    );
  });

  it('passes the first dog face now that layers are ordered', () => {
    expect(checkModel(firstDog())).toEqual([]);
  });

  it('finds none in the fixtures', () => {
    expect(flapFlips(quarters())).toEqual([]);
    expect(flapFlips(loadModel(fixture('fold-in-half')))).toEqual([]);
  });
});

describe('interleaved', () => {
  it('finds none when the folds on one line nest or lie apart', () => {
    // folded in quarters: the first fold's two halves lie apart in the stack, the second's nest
    expect(interleaved(quarters(), 2)).toEqual([]);
  });

  it('finds two folds on one line whose layers interleave', () => {
    // the same folds stacked 1, 3, 0, 2 from the bottom: the halves of the first fold (faces 0|1 and 2|3) interleave
    const json = fixture('fold-in-quarters') as { file_frames: { faceOrders: number[][] }[] };
    json.file_frames[1].faceOrders = json.file_frames[1].faceOrders.map(([f, g, s]) =>
      f === 3 && g === 0 ? [f, g, -s] : [f, g, s]
    );
    const model = loadModel(json);
    expect(interleaved(model, 2)).toEqual([[8, 9]]);
    expect(checkModel(model)).toContainEqual(expect.stringMatching(/^Step 2: the folds at edges 8 and 9 interleave/));
  });

  it('finds two layers that cross each other along a line they lie flat across', () => {
    // folded in half, the quarter line runs flat through both layers (edges 10 and 11); stacked 0 over 1 below
    // it but 2 over 3 above it, the layers pass through each other there
    const json = fixture('fold-in-quarters') as { file_frames: { faceOrders: number[][] }[] };
    json.file_frames[0].faceOrders = [
      [0, 1, 1],
      [3, 2, -1]
    ];
    const model = loadModel(json);
    expect(interleaved(quarters(), 1)).toEqual([]);
    expect(interleaved(model, 1)).toEqual([[10, 11]]);
    expect(checkModel(model)).toContainEqual(expect.stringMatching(/^Step 1: the layers at edges 10 and 11 cross/));
  });
});

describe('wrongSides', () => {
  it('finds none when each valley puts its flap on the front of the face it folds onto', () => {
    expect(wrongSides(loadModel(fixture('fold-in-half')), 1)).toEqual([]);
    expect(wrongSides(quarters(), 2)).toEqual([]);
  });

  it('finds a valley whose flap lies behind the half it folded onto', () => {
    // fold in half (edge 6, a valley), but stacked as a mountain would: the flap under the held half
    const json = fixture('fold-in-half') as { file_frames: { faceOrders: number[][] }[] };
    json.file_frames[0].faceOrders = [[0, 1, -1]];
    const model = loadModel(json);
    expect(wrongSides(model, 1)).toEqual([6]);
    expect(checkModel(model)).toContainEqual(
      expect.stringMatching(/^Step 1: the faces at edge 6 lie on the wrong side/)
    );
  });
});

describe('slits', () => {
  it('a slit parting is no tear', () => {
    const model = loadModel(slitFixture());
    expect(spread(model, 2, 0.5)).toBeLessThan(6 * LAYER_GAP + 1e-9);
    expect(checkModel(model)).toEqual([]);
  });
});

describe('a fold-and-unfold', () => {
  it("lifts its flap clear of the paper in front of it, though the step's stacking never changes", () => {
    // pre-crease the crane's left leg where the neck will reverse-fold: the leg swings as one stack, as the neck
    // step's swing does, short of flat, and back; it has to clear the other leg lying in front of it
    const model = crane();
    const neck = model.steps.findIndex((s) => s.instruction.en.startsWith('Reverse-fold the left flap'));
    const [prev, cur] = [model.steps[neck - 1], model.steps[neck]];
    const swing = cur.path[cur.path.length - 2].map((a, e) => (Math.abs(prev.angles[e]) === 180 ? prev.angles[e] : a));
    const pre = { ...prev, instruction: { en: 'Fold the left flap along this line, then unfold it.' }, path: [swing] };
    const steps = [...model.steps.slice(0, neck), pre, ...model.steps.slice(neck)];
    const problems = checkModel({ ...model, steps }).filter((p) => p.startsWith(`Step ${neck} `));
    expect(problems).toEqual([]);
  });
});
