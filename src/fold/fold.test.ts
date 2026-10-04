import { describe, expect, it } from 'vitest';
import { fixture } from './fixtures';
import { checkConsistency, foldedPositions } from './fold';
import { loadModel } from './load-model';
import type { Vec3 } from './types';

const half = () => loadModel(fixture('fold-in-half'));
const quarters = () => loadModel(fixture('fold-in-quarters'));

function expectClose(actual: Vec3, expected: Vec3, digits = 3) {
  actual.forEach((v, i) => {
    expect(v).toBeCloseTo(expected[i], digits);
  });
}

describe('foldedPositions', () => {
  it('step 0 is the flat sheet', () => {
    const faces = foldedPositions(half(), 0, 0);
    expect(faces[0]).toEqual([
      [0, 0, 0],
      [0.5, 0, 0],
      [0.5, 1, 0],
      [0, 1, 0]
    ]);
  });

  it('starts flat at t = 0', () => {
    expectClose(foldedPositions(half(), 1, 0)[0][0], [0, 0, 0]);
  });

  it('stands the moving half upright at t = 0.5, toward +z for a valley fold', () => {
    expectClose(foldedPositions(half(), 1, 0.5)[0][0], [0.5, 0, 0.5]);
  });

  it('lays the half on top at t = 1, stopping just short of flat (178°)', () => {
    const [x, y, z] = foldedPositions(half(), 1, 1)[0][0];
    expect(x).toBeCloseTo(0.5 + 0.5 * Math.cos((2 * Math.PI) / 180), 4);
    expect(y).toBeCloseTo(0);
    expect(z).toBeGreaterThan(0);
    expect(z).toBeCloseTo(0.5 * Math.sin((2 * Math.PI) / 180), 4);
  });

  it('never moves the fixed face', () => {
    const flat: Vec3[] = [
      [0.5, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0.5, 1, 0]
    ];
    for (const t of [0, 0.3, 0.7, 1]) {
      foldedPositions(half(), 1, t)[1].forEach((corner, i) => {
        expectClose(corner, flat[i], 9);
      });
    }
  });

  it('folds through two layers in the second quarters step', () => {
    const faces = foldedPositions(quarters(), 2, 1);
    // top-right corner (vertex 4, face 2) lands near the bottom-right corner
    expectClose(faces[2][2], [1, 0, 0], 1);
    // top-left corner (vertex 6, face 3) was folded right in step 1, now also lands near (1, 0)
    expectClose(faces[3][3], [1, 0, 0], 1);
  });

  it('anchors the new fixed face where the previous step left it', () => {
    const model = quarters();
    model.steps[2].fixedFace = 0; // hold the face that moved in step 1
    const endOfStep1 = foldedPositions(model, 1, 1);
    const startOfStep2 = foldedPositions(model, 2, 0);
    startOfStep2.forEach((face, f) => {
      face.forEach((corner, c) => {
        expectClose(corner, endOfStep1[f][c], 6);
      });
    });
  });

  it('turns the model over with a rotation step, and keeps it turned in later steps', () => {
    const model = half();
    model.steps[1] = { ...model.steps[1], angles: model.steps[1].angles.map(() => 0), rotation: [0, 180, 0] };
    model.steps.push({ ...model.steps[1], instruction: 'Look at it.' });
    expectClose(foldedPositions(model, 1, 1)[0][0], [1, 0, 0]);
    expectClose(foldedPositions(model, 2, 0)[0][0], [1, 0, 0]);
    expectClose(foldedPositions(model, 2, 1)[0][0], [1, 0, 0]);
  });

  it('throws RangeError for a step that does not exist', () => {
    expect(() => foldedPositions(half(), 2, 0)).toThrow(RangeError);
    expect(() => foldedPositions(half(), -1, 0)).toThrow(RangeError);
  });
});

describe('checkConsistency', () => {
  it('passes valid steps', () => {
    expect(checkConsistency(quarters(), 1)).toEqual({ ok: true });
    expect(checkConsistency(quarters(), 2)).toEqual({ ok: true });
  });

  it('flags folding only half of a crease line', () => {
    const model = quarters();
    model.steps[1].angles = model.steps[1].angles.map((a, e) => (e === 9 ? 0 : a));
    const result = checkConsistency(model, 1);
    expect(result.ok).toBe(false);
  });

  it('flags a half-folded second crease with mountain and valley swapped', () => {
    const model = quarters();
    model.steps[2].angles = model.steps[2].angles.map((a, e) => (e === 10 ? 90 : e === 11 ? 90 : a));
    expect(checkConsistency(model, 2).ok).toBe(false);
    model.steps[2].angles = model.steps[2].angles.map((a, e) => (e === 10 ? -90 : a));
    expect(checkConsistency(model, 2)).toEqual({ ok: true });
  });
});

describe('step joins', () => {
  it('joins every face exactly when the held face changes after a clamped fold', () => {
    const model = quarters();
    model.steps.push({ ...model.steps[2], fixedFace: 0, instruction: 'Hold the other side.' });
    const end = foldedPositions(model, 2, 1);
    const start = foldedPositions(model, 3, 0);
    end.forEach((face, f) => {
      face.forEach((corner, c) => {
        expectClose(corner, start[f][c], 9);
      });
    });
    const rest = foldedPositions(model, 3, 0)[0];
    for (const t of [0.5, 1]) {
      foldedPositions(model, 3, t)[0].forEach((corner, c) => {
        expectClose(corner, rest[c], 9);
      });
    }
  });

  it('inherits a non-zero rotation into later steps from the file', () => {
    const json = JSON.parse(JSON.stringify(fixture('fold-in-half')));
    json.file_frames[0]['foldapp:rotation'] = [0, 180, 0];
    const { 'foldapp:rotation': _, ...rest } = json.file_frames[0];
    json.file_frames.push({ ...rest, 'foldapp:instruction': 'Keep it turned over.' });
    const model = loadModel(json);
    const a = foldedPositions(model, 1, 1);
    foldedPositions(model, 2, 0).forEach((face, f) => {
      face.forEach((corner, c) => {
        expectClose(corner, a[f][c], 9);
      });
    });
  });

  it('treats a NaN t as 0', () => {
    expect(foldedPositions(half(), 1, Number.NaN)).toEqual(foldedPositions(half(), 1, 0));
  });
});
