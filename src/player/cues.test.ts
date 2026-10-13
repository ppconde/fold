import { describe, expect, it } from 'vitest';
import { fixture, slitFixture } from '../fold/fixtures';
import { LAYER_GAP } from '../fold/fold';
import { loadModel } from '../fold/load-model';
import type { Cue } from '../fold/types';
import { cueOpacity, cueSegments } from './cues';

type Json = Record<string, unknown> & { file_frames: Record<string, unknown>[] };
type P = [number, number, number];

/** Fold in half, step 1 (still flat at its start), with the given cues. */
function withCues(cues: Cue[]) {
  const json = fixture('fold-in-half') as Json;
  json.file_frames[0]['foldapp:cues'] = cues;
  return loadModel(json);
}
const points = (flat: number[]): P[] =>
  Array.from({ length: flat.length / 3 }, (_, i) => flat.slice(i * 3, i * 3 + 3) as P);
const near = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-6;

describe('cueSegments', () => {
  it('draws nothing for a step without cues', () => {
    expect(cueSegments(withCues([]), 1)).toEqual([]);
  });

  it('draws a push as a closed hollow arrow just above its face, its tip at `to`', () => {
    const model = withCues([{ kind: 'push', face: 0, from: [0.1, 0.25], to: [0.4, 0.25] }]);
    const p = points(cueSegments(model, 1));
    expect(p).toHaveLength(14); // 7 sides, 2 points each
    for (let i = 0; i < 14; i += 2) expect(near(p[i + 1], p[(i + 2) % 14])).toBe(true);
    for (const v of p) expect(v[2]).toBeCloseTo(3 * LAYER_GAP, 9);
    expect(p.some((v) => near(v, [0.4, 0.25, 3 * LAYER_GAP]))).toBe(true);
    const ys = p.map((v) => v[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.45 * 0.3, 9);
  });

  it('draws a swing as an arc from `from` to `to`, peaking 0.175 × its length up, with a V head', () => {
    const model = withCues([{ kind: 'swing', face: 0, from: [0.1, 0.25], to: [0.4, 0.25] }]);
    const p = points(cueSegments(model, 1));
    expect(p).toHaveLength(36); // 16 arc segments and 2 head strokes
    expect(near(p[0], [0.1, 0.25, 3 * LAYER_GAP])).toBe(true);
    expect(near(p[31], [0.4, 0.25, 3 * LAYER_GAP])).toBe(true);
    expect(Math.max(...p.map((v) => v[2]))).toBeCloseTo(3 * LAYER_GAP + 0.175 * 0.3, 6);
  });

  it('maps through a face with a corner in the middle of a side', () => {
    // the slit fixture's face 0, the bottom half, has the slit's end (0.5, 0.5) as a corner on its top side
    const json = slitFixture();
    json.file_frames[0]['foldapp:cues'] = [{ kind: 'push', face: 0, from: [0.2, 0.25], to: [0.8, 0.25] }];
    const p = points(cueSegments(loadModel(json), 1));
    expect(p.some((v) => near(v, [0.8, 0.25, 3 * LAYER_GAP]))).toBe(true);
    for (const v of p) expect(v[2]).toBeCloseTo(3 * LAYER_GAP, 9);
  });
});

describe('cueOpacity', () => {
  it('is full at the start, half by 0.3 and gone from 0.5', () => {
    expect([0, 0.1, 0.3, 0.5, 1].map((t) => +cueOpacity(t).toFixed(9))).toEqual([1, 1, 0.5, 0, 0]);
  });
});
