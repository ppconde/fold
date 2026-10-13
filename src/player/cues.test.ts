import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fixture, slitFixture } from '../fold/fixtures';
import { foldedPositions, LAYER_GAP } from '../fold/fold';
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

  it('draws a push as a closed hollow arrow just above its face, its tip at `to`, a fixed 0.08 wide', () => {
    const model = withCues([{ kind: 'push', face: 0, from: [0.1, 0.25], to: [0.4, 0.25] }]);
    const p = points(cueSegments(model, 1));
    expect(p).toHaveLength(14); // 7 sides, 2 points each
    for (let i = 0; i < 14; i += 2) expect(near(p[i + 1], p[(i + 2) % 14])).toBe(true);
    for (const v of p) expect(v[2]).toBeCloseTo(3 * LAYER_GAP, 9);
    expect(p.some((v) => near(v, [0.4, 0.25, 3 * LAYER_GAP]))).toBe(true);
    const ys = p.map((v) => v[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.08, 9);
  });

  it('keeps a short push a full arrow: head 0.7 of its length, still 0.08 wide', () => {
    const model = withCues([{ kind: 'push', face: 0, from: [0.1, 0.25], to: [0.15, 0.25] }]);
    const p = points(cueSegments(model, 1));
    expect(p).toHaveLength(14);
    const ys = p.map((v) => v[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.08, 9);
    expect(p.some((v) => near(v, [0.15 - 0.035, 0.25 + 0.0175, 3 * LAYER_GAP]))).toBe(true); // the neck
  });

  const swingOf = (bend?: -1) => {
    const cue: Cue = { kind: 'swing', face: 0, from: [0.1, 0.25], to: [0.4, 0.25], ...(bend ? { bend } : {}) };
    return points(cueSegments(withCues([cue]), 1));
  };

  it.each([
    [undefined, 1],
    [-1 as const, -1]
  ])('draws a swing (bend %s) as an arc bulging in the paper, with a V head in its plane', (bend, sign) => {
    const p = swingOf(bend);
    const [lift, L] = [3 * LAYER_GAP, 0.3];
    expect(p).toHaveLength(36); // 16 arc segments and 2 head strokes
    expect(near(p[0], [0.1, 0.25, lift])).toBe(true);
    expect(near(p[31], [0.4, 0.25, lift])).toBe(true);
    const arc = p.slice(0, 32);
    expect(Math.max(...arc.map((v) => v[2]))).toBeCloseTo(lift + 0.05 * L, 6);
    const lateral = arc.map((v) => (v[1] - 0.25) * sign);
    expect(Math.max(...lateral)).toBeCloseTo(0.25 * L, 6);
    expect(Math.min(...lateral)).toBeGreaterThan(-1e-9);
    // the head: two strokes of 0.06 from `to`, flat in the face plane, 25 degrees either side of the way back
    const to = p[31];
    // the way back from `to` toward the control point (0.25, 0.25 + sign * 0.15), flattened into the plane
    const backAngle = Math.atan2(sign * 0.15, -0.15);
    for (const k of [32, 34]) {
      expect(near(p[k], to)).toBe(true);
      const d = [p[k + 1][0] - to[0], p[k + 1][1] - to[1]];
      expect(Math.hypot(...d)).toBeCloseTo(0.06, 9);
      expect(p[k + 1][2]).toBeCloseTo(lift, 9);
      expect(Math.abs(Math.atan2(d[1], d[0]) - backAngle) * (180 / Math.PI)).toBeCloseTo(25, 4);
    }
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

describe("the crane's cues, as the lesson shows them", () => {
  const crane = loadModel(JSON.parse(readFileSync('public/models/crane.fold', 'utf8')));
  const xy = (v: number[]) => [v[0], v[1]];
  const cross = (a: number[], b: number[]) => a[0] * b[1] - a[1] * b[0];
  const steps = crane.steps.flatMap((s, i) => (s.cues.length ? [i] : []));

  it('has cues on the neck, tail and head; the head only a swing', () => {
    expect(steps.map((i) => crane.steps[i].cues.map((c) => c.kind))).toEqual([
      ['push', 'swing'],
      ['push', 'swing'],
      ['swing']
    ]);
  });

  it.each(steps)('step %i: the swing ends where the tip lands, bulging outward, away from the body', (i) => {
    const [a, b] = [foldedPositions(crane, i, 0), foldedPositions(crane, i, 1)];
    // the tip: the vertex that travels farthest
    const tip = a
      .flatMap((f, k) => f.map((v, j) => ({ from: xy(v), to: xy(b[k][j]) })))
      .reduce((best, m) =>
        Math.hypot(m.to[0] - m.from[0], m.to[1] - m.from[1]) >
        Math.hypot(best.to[0] - best.from[0], best.to[1] - best.from[1])
          ? m
          : best
      );
    const p = points(cueSegments(crane, i)).slice(-36);
    const [start, end, mid] = [xy(p[0]), xy(p[31]), xy(p[16])];
    expect(Math.hypot(end[0] - tip.to[0], end[1] - tip.to[1])).toBeLessThan(0.06);
    const all = a.flat();
    const centre = [0, 1].map((d) => all.reduce((s, v) => s + v[d], 0) / all.length);
    const chord = [end[0] - start[0], end[1] - start[1]];
    const half = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    const bulge = cross(chord, [mid[0] - half[0], mid[1] - half[1]]);
    const body = cross(chord, [centre[0] - half[0], centre[1] - half[1]]);
    expect(Math.sign(bulge)).toBe(-Math.sign(body));
  });

  it.each(steps.slice(0, 2))('step %i: the push sits on the flap that moves, pointing at the spine', (i) => {
    const [a, b] = [foldedPositions(crane, i, 0), foldedPositions(crane, i, 1)];
    const moving = a.filter((f, k) => f.some((v, j) => Math.hypot(...v.map((x, d) => x - b[k][j][d])) > 1e-3));
    const spine = 0.5; // the legs part along the middle line, x = 0.5 in the lesson
    const flap = Math.sign(moving.flat().reduce((s, v) => s + v[0], 0) / moving.flat().length - spine);
    const p = points(cueSegments(crane, i));
    const [tail, head] = [(p[0][0] + p[12][0]) / 2, p[6][0]];
    expect(Math.sign(tail - spine)).toBe(flap);
    expect(Math.abs(head - spine)).toBeLessThan(Math.abs(tail - spine));
  });
});

describe('cueOpacity', () => {
  it('is full at the start, half by 0.3 and gone from 0.5', () => {
    expect([0, 0.1, 0.3, 0.5, 1].map((t) => +cueOpacity(t).toFixed(9))).toEqual([1, 1, 0.5, 0, 0]);
  });
});
