import { Euler, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { fixture, slitFixture } from './fixtures';
import { anglesAt, checkConsistency, foldedPositions, LAYER_GAP, layerHeights } from './fold';
import { loadModel } from './load-model';
import type { Model, Step, Vec3 } from './types';

const half = () => loadModel(fixture('fold-in-half'));
const quarters = () => loadModel(fixture('fold-in-quarters'));

/** A new model with `edit` applied to a copy of each step (loaded models are frozen). */
const withSteps = (model: Model, edit: (steps: Step[]) => Step[]): Model => ({
  ...model,
  steps: edit([...model.steps])
});

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
    // half way to its new layer along its own normal (−x at 90°), and carried one layer clear of the stack
    expectClose(foldedPositions(half(), 1, 0.5)[0][0], [0.5 - LAYER_GAP / 2, 0, 0.5 + LAYER_GAP], 9);
  });

  it('lays the half exactly flat on top at t = 1, one layer gap above the held half', () => {
    expectClose(foldedPositions(half(), 1, 1)[0][0], [1, 0, LAYER_GAP], 9);
    expectClose(foldedPositions(half(), 1, 1)[1][0], [0.5, 0, 0], 9);
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
    expect(Math.hypot(faces[2][2][0] - 1, faces[2][2][1], faces[2][2][2])).toBeLessThan(0.06);
    // top-left corner (vertex 6, face 3) was folded right in step 1, now also lands near (1, 0),
    // one wedge (~0.035) inside the outer layer because the stack turns as one piece
    expect(Math.hypot(faces[3][3][0] - 1, faces[3][3][1], faces[3][3][2])).toBeLessThan(0.06);
  });

  it('anchors the new fixed face where the previous step left it', () => {
    const base = quarters();
    // hold the face that moved in step 1
    const model = withSteps(base, (s) => [s[0], s[1], { ...s[2], fixedFace: 0 }]);
    const endOfStep1 = foldedPositions(model, 1, 1);
    const startOfStep2 = foldedPositions(model, 2, 0);
    startOfStep2.forEach((face, f) => {
      face.forEach((corner, c) => {
        expectClose(corner, endOfStep1[f][c], 6);
      });
    });
  });

  it('turns the model over with a rotation step, and keeps it turned in later steps', () => {
    const model = withSteps(half(), (s) => {
      const turned = { ...s[1], angles: s[1].angles.map(() => 0), rotation: [0, 180, 0] as Vec3, faceOrders: [] };
      return [s[0], turned, { ...turned, instruction: { en: 'Look at it.' } }];
    });
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
    const model = withSteps(quarters(), (s) => [
      s[0],
      { ...s[1], angles: s[1].angles.map((a, e) => (e === 9 ? 0 : a)) },
      s[2]
    ]);
    const result = checkConsistency(model, 1);
    expect(result.ok).toBe(false);
  });

  it('flags a half-folded second crease with mountain and valley swapped', () => {
    const base = quarters();
    const swapped = (a10: number) =>
      withSteps(base, (s) => [
        s[0],
        s[1],
        { ...s[2], angles: s[2].angles.map((a, e) => (e === 10 ? a10 : e === 11 ? 90 : a)) }
      ]);
    expect(checkConsistency(swapped(90), 2).ok).toBe(false);
    expect(checkConsistency(swapped(-90), 2)).toEqual({ ok: true });
  });
});

describe('step joins', () => {
  it('joins every face exactly when the held face changes after a clamped fold', () => {
    const base = quarters();
    const model = withSteps(base, (s) => [
      ...s,
      { ...s[2], fixedFace: 0, instruction: { en: 'Hold the other side.' } }
    ]);
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
    expect(model.steps[2].rotation).toEqual([0, 180, 0]);
    const a = foldedPositions(model, 1, 1);
    for (const [f, face] of foldedPositions(model, 2, 1).entries()) {
      face.forEach((corner, c) => {
        expectClose(corner, a[f][c], 9);
      });
    }
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

describe('anglesAt', () => {
  it('is all zeros at step 0', () => {
    expect(anglesAt(half(), 0, 0.5)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('eases each crease from the previous step to this one', () => {
    expect(anglesAt(half(), 1, 0)[6]).toBeCloseTo(0);
    expect(anglesAt(half(), 1, 0.5)[6]).toBeCloseTo(90);
    expect(anglesAt(half(), 1, 1)[6]).toBeCloseTo(180);
  });

  it('goes through the step path, evenly spaced, so a fold can open again', () => {
    const creased = withSteps(half(), (s) => [s[0], { ...s[1], angles: s[0].angles, path: [s[1].angles] }]);
    expect(anglesAt(creased, 1, 0.5)[6]).toBeCloseTo(180);
    expect(anglesAt(creased, 1, 1)[6]).toBeCloseTo(0);
  });

  it('throws RangeError for a missing step', () => {
    expect(() => anglesAt(half(), 5, 0)).toThrow(RangeError);
  });
});

describe('turning over a folded model', () => {
  // step 1 folds the left half over; step 2 turns the whole thing over
  const turned = () =>
    withSteps(half(), (s) => [s[0], s[1], { ...s[1], rotation: [0, 180, 0], instruction: { en: 'Turn it over.' } }]);

  const xRange = (faces: Vec3[][]) => {
    const xs = faces.flat().map((p) => p[0]);
    return [Math.min(...xs), Math.max(...xs)];
  };

  it('stays in place instead of sliding across the flat paper centre', () => {
    const [min, max] = xRange(foldedPositions(turned(), 2, 1));
    expect(min).toBeCloseTo(0.5, 1);
    expect(max).toBeCloseTo(1, 1);
  });

  it('still joins exactly at both ends of the turn', () => {
    const model = withSteps(turned(), (s) => [...s, { ...s[2], instruction: { en: 'Look at the back.' } }]);
    const pairs: [number, number, number, number][] = [
      [1, 1, 2, 0],
      [2, 1, 3, 0]
    ];
    for (const [a, ta, b, tb] of pairs) {
      const end = foldedPositions(model, a, ta);
      foldedPositions(model, b, tb).forEach((face, f) => {
        face.forEach((corner, c) => {
          expectClose(corner, end[f][c], 9);
        });
      });
    }
  });

  it('ends with the back of the paper facing the viewer', () => {
    // the fixed face's front normal (+z when flat) points to −z after turning over
    const [a, b, c] = foldedPositions(turned(), 2, 1)[1];
    const n = [
      (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
      (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    ];
    expect(n[2]).toBeLessThan(0);
  });
});

describe('creases meeting at a corner', () => {
  // Unit square with both diagonals and the vertical midline; faces fan CCW around the centre (vertex 6):
  // 0 bottom-left, 1 bottom-right, 2 right, 3 top-right, 4 top-left, 5 left.
  // 1: left half over the right (midline, edges 10 + 11). 2: fold the stacked top triangle down along
  // the diagonal from the centre to (1, 1): edge 7 on the lower layer, edge 9 on the flipped upper one.
  // 3: turn over. 4: unfold step 2. The held face changes every step.
  const flat = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const step1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 180, 180];
  const step2 = [0, 0, 0, 0, 0, 0, 0, 180, 0, -180, 180, 180];
  type Frame = { angles: number[]; fixedFace: number; rotation?: Vec3 };
  const build = (frames: Frame[]) =>
    loadModel({
      file_spec: 1.2,
      vertices_coords: [
        [0, 0],
        [0.5, 0],
        [1, 0],
        [1, 1],
        [0.5, 1],
        [0, 1],
        [0.5, 0.5]
      ],
      edges_vertices: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 0],
        [0, 6],
        [6, 3],
        [2, 6],
        [6, 5],
        [1, 6],
        [6, 4]
      ],
      edges_assignment: ['B', 'B', 'B', 'B', 'B', 'B', 'F', 'V', 'F', 'M', 'V', 'V'],
      faces_vertices: [
        [0, 1, 6],
        [1, 2, 6],
        [2, 3, 6],
        [3, 4, 6],
        [4, 5, 6],
        [5, 0, 6]
      ],
      file_frames: frames.map(({ angles, fixedFace, rotation }) => ({
        edges_foldAngle: angles,
        'foldapp:instruction': 'Fold.',
        'foldapp:fixedFace': fixedFace,
        ...(rotation ? { 'foldapp:rotation': rotation } : {})
      }))
    });
  const corner = () =>
    build([
      { angles: step1, fixedFace: 1 },
      { angles: step2, fixedFace: 2 },
      { angles: step2, fixedFace: 3, rotation: [0, 180, 0] },
      { angles: step1, fixedFace: 0 }
    ]);

  const expectJoins = (m: Model) => {
    for (let k = 1; k < m.steps.length - 1; k++) {
      const end = foldedPositions(m, k, 1);
      foldedPositions(m, k + 1, 0).forEach((face, f) => {
        face.forEach((corner, c) => {
          expectClose(corner, end[f][c], 9);
        });
      });
    }
  };

  it('is a consistent model at every step', () => {
    const m = corner();
    for (let k = 1; k < m.steps.length; k++) expect(checkConsistency(m, k)).toEqual({ ok: true });
  });

  it('joins every corner of every face exactly at each step boundary', () => {
    expectJoins(corner());
  });

  // The cases below change the spanning tree across a non-collinear vertex, where the clamped angles leave
  // the differing cycles open: without a correction the faces jump by ~0.035 at the boundary.
  it('joins exactly when everything unfolds after the corner fold', () => {
    expectJoins(
      build([
        { angles: step1, fixedFace: 1 },
        { angles: step2, fixedFace: 2 },
        { angles: flat, fixedFace: 0 }
      ])
    );
  });

  it('joins exactly when a turned-over corner fold unfolds completely', () => {
    expectJoins(
      build([
        { angles: step1, fixedFace: 1 },
        { angles: step2, fixedFace: 2 },
        { angles: step2, fixedFace: 3, rotation: [0, 180, 0] },
        { angles: flat, fixedFace: 4 }
      ])
    );
  });

  it('joins exactly when only the corner unfolds after folding all four creases at once', () => {
    expectJoins(
      build([
        { angles: step2, fixedFace: 1 },
        { angles: step1, fixedFace: 2 },
        { angles: flat, fixedFace: 5 }
      ])
    );
  });
});

describe('stacked layers', () => {
  // A stack folded about one crease must keep its layer order all through the fold, not only at rest.
  it('keeps the step 1 flap on the same side of the layer under it all through step 2', () => {
    const model = quarters();
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const [, a, b, c] = foldedPositions(model, 2, t)[2];
      const n = new Vector3(...b).sub(new Vector3(...a)).cross(new Vector3(...c).sub(new Vector3(...a)));
      const far = foldedPositions(model, 2, t)[3][0];
      expect(n.normalize().dot(new Vector3(...far).sub(new Vector3(...a)))).toBeGreaterThan(LAYER_GAP / 2);
    }
  });
  // Two tips that share no unmoved crease (fold in half, then fold the free corner) are covered in
  // models/sequence.test.ts, where checkModel proves they no longer pass through each other.
});

describe('seam between the layers of a stack', () => {
  // Folds reach their exact angles, so copies of a vertex only part by the layer lift, never by a gap:
  // at most both copies' lifts (up to 3 layers each), along two different normals mid-fold.
  it('stays within the stack thickness while folding through two layers', () => {
    const model = quarters();
    let worst = 0;
    for (const t of [0.25, 0.5, 0.75, 1]) {
      const faces = foldedPositions(model, 2, t);
      const copies = new Map<number, Vec3[]>();
      model.faces.forEach((face, f) => {
        face.forEach((v, c) => {
          copies.set(v, [...(copies.get(v) ?? []), faces[f][c]]);
        });
      });
      for (const pts of copies.values()) {
        for (const p of pts) worst = Math.max(worst, Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1], p[2] - pts[0][2]));
      }
    }
    expect(worst).toBeLessThanOrEqual(6 * LAYER_GAP + 1e-9);
  });
});

describe('several turns', () => {
  const build = (rot: (r: Vec3) => Vec3) =>
    withSteps(quarters(), (s) => {
      const r = (v: Vec3) => rot(v);
      return [
        s[0],
        { ...s[1], angles: s[0].angles, rotation: r([0, 180, 0]), fixedFace: 1, instruction: { en: 'Turn over.' } },
        { ...s[1], rotation: r([0, 180, 0]), fixedFace: 2, instruction: { en: 'Fold.' } },
        { ...s[1], rotation: r([90, 0, 30]), fixedFace: 3, instruction: { en: 'Tilt.' } },
        { ...s[1], rotation: r([0, 0, 0]), fixedFace: 0, instruction: { en: 'Turn back.' } }
      ];
    });
  const turned = () => build((v) => v);
  const normal = ([a, b, c]: Vec3[]) =>
    new Vector3(...b)
      .sub(new Vector3(...a))
      .cross(new Vector3(...c).sub(new Vector3(...a)))
      .normalize();

  it('joins exactly at every step boundary', () => {
    const m = turned();
    for (let k = 1; k <= 3; k++) {
      const end = foldedPositions(m, k, 1);
      foldedPositions(m, k + 1, 0).forEach((face, f) => {
        face.forEach((corner, c) => {
          expectClose(corner, end[f][c], 9);
        });
      });
    }
  });

  it('ends each step at the file rotation', () => {
    const ref = build(() => [0, 0, 0]);
    const q = new Quaternion().setFromEuler(new Euler(Math.PI / 2, 0, (30 * Math.PI) / 180));
    const a = foldedPositions(turned(), 3, 1);
    const b = foldedPositions(ref, 3, 1);
    a.forEach((face, f) => {
      const want = normal(b[f]).applyQuaternion(q);
      expect(normal(face).distanceTo(want)).toBeLessThan(1e-9);
    });
  });

  it('does not depend on request order', () => {
    const cold = foldedPositions(turned(), 4, 1);
    const m = turned();
    for (let k = 1; k <= 3; k++) foldedPositions(m, k, 1);
    foldedPositions(m, 4, 1).forEach((face, f) => {
      face.forEach((corner, c) => {
        expectClose(corner, cold[f][c], 12);
      });
    });
  });
});

describe('seam on a 3-column model without faceOrders', () => {
  // The 178° clamp used to open this seam by up to 0.0465; exact angles close it.
  const grid3 = () => {
    const nx = 3;
    const verts: number[][] = [];
    for (let j = 0; j < 3; j++) for (let i = 0; i <= nx; i++) verts.push([i / nx, j / 2]);
    const v = (i: number, j: number) => j * (nx + 1) + i;
    const edges: number[][] = [];
    const asg: string[] = [];
    const key: Record<string, number> = {};
    const add = (a: number, b: number, n: string, border: boolean) => {
      key[n] = edges.length;
      edges.push([a, b]);
      asg.push(border ? 'B' : 'V');
    };
    for (let j = 0; j < 3; j++) for (let i = 0; i < nx; i++) add(v(i, j), v(i + 1, j), `h${i}${j}`, j !== 1);
    for (let i = 0; i <= nx; i++)
      for (let j = 0; j < 2; j++) add(v(i, j), v(i, j + 1), `v${i}${j}`, i === 0 || i === nx);
    const faces: number[][] = [];
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < nx; i++) faces.push([v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)]);
    const angles = (o: Record<string, number>) => {
      const a = edges.map(() => 0);
      for (const k in o) a[key[k]] = o[k];
      return a;
    };
    const s1 = { v10: 180, v11: 180 };
    const s2 = { ...s1, h01: -180, h11: 180, h21: 180 };
    return loadModel({
      file_spec: 1.2,
      vertices_coords: verts,
      edges_vertices: edges,
      edges_assignment: asg,
      faces_vertices: faces,
      file_frames: [angles(s1), angles(s2)].map((a) => ({
        edges_foldAngle: a,
        'foldapp:instruction': 'x',
        'foldapp:fixedFace': 1
      }))
    });
  };

  it('closes completely mid-step and at rest', () => {
    const model = grid3();
    const worstAt = (t: number) => {
      const F = foldedPositions(model, 2, t);
      const copies = new Map<number, Vec3[]>();
      model.faces.forEach((face, f) => {
        face.forEach((v, c) => {
          copies.set(v, [...(copies.get(v) ?? []), F[f][c]]);
        });
      });
      let worst = 0;
      for (const pts of copies.values())
        for (const p of pts) worst = Math.max(worst, Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1], p[2] - pts[0][2]));
      return worst;
    };
    expect(worstAt(0.5)).toBeLessThan(1e-9);
    expect(worstAt(1)).toBeLessThan(1e-9);
  });
});

describe('layer heights', () => {
  /** fold-in-quarters with step 2's faceOrders replaced, its angles unchanged. */
  const reordered = (faceOrders: number[][]) => {
    const json = fixture('fold-in-quarters') as { file_frames: Record<string, unknown>[] };
    json.file_frames[1].faceOrders = faceOrders;
    return loadModel(json);
  };

  it('follows faceOrders through each step', () => {
    expect(layerHeights(quarters(), 0)).toEqual([0, 0, 0, 0]);
    expect(layerHeights(quarters(), 1)).toEqual([1, 0, 0, 1]);
    expect(layerHeights(quarters(), 2)).toEqual([1, 0, 3, 2]);
  });

  it('reads s along the normal of g, so a face lying front-down flips it', () => {
    // at step 2 face 0 lies front-down: [3, 0, -1] puts face 3 above it
    expect(layerHeights(quarters(), 2)[3]).toBeGreaterThan(layerHeights(quarters(), 2)[0]);
  });

  it('is all zeros without faceOrders', () => {
    const json = fixture('fold-in-quarters') as { file_frames: Record<string, unknown>[] };
    for (const frame of json.file_frames) delete frame.faceOrders;
    expect(layerHeights(loadModel(json), 2)).toEqual([0, 0, 0, 0]);
  });

  it('keeps the stack through a step that inherits its faceOrders, even with faces standing on edge', () => {
    // a third step opens the second fold to 90°: the faces stand up, but nothing restacks
    const model = withSteps(quarters(), (steps) => [
      ...steps,
      { ...steps[2], angles: steps[2].angles.map((a, e) => (e === 10 || e === 11 ? a / 2 : a)) }
    ]);
    expect(layerHeights(model, 3)).toEqual(layerHeights(model, 2));
  });

  it('throws a RangeError for faceOrders that contradict each other', () => {
    expect(() =>
      layerHeights(
        reordered([
          [0, 1, 1],
          [1, 0, -1]
        ]),
        2
      )
    ).toThrow(RangeError);
  });

  it('stacks the layers one gap apart at rest', () => {
    const faces = foldedPositions(quarters(), 2, 1);
    layerHeights(quarters(), 2).forEach((h, f) => {
      for (const [, , z] of faces[f]) expect(z).toBeCloseTo(h * LAYER_GAP, 9);
    });
  });

  it('carries a travelling flap one layer clear of the paper it passes, and sets it down exactly', () => {
    // the hinge corner of fold-in-half's moving half
    const hinge = (t: number) => foldedPositions(half(), 1, t)[0][1];
    expectClose(hinge(0), [0.5, 0, 0], 9);
    expectClose(hinge(0.5), [0.5 - LAYER_GAP / 2, 0, LAYER_GAP], 9);
    expectClose(hinge(1), [0.5, 0, LAYER_GAP], 9);
  });

  it('turns the stack with the paper: after a turn-over the top layer is at the bottom', () => {
    const model = withSteps(half(), (steps) => [...steps, { ...steps[1], rotation: [0, 180, 0] }]);
    const faces = foldedPositions(model, 2, 1);
    expect(faces[0][0][2]).toBeLessThan(faces[1][0][2]);
  });
});

describe('slits', () => {
  const slit = () => loadModel(slitFixture());

  it('cutting moves nothing', () => {
    const [cut, flat] = [foldedPositions(slit(), 1, 1).flat(2), foldedPositions(slit(), 0, 0).flat(2)];
    cut.forEach((x, i) => {
      expect(x).toBeCloseTo(flat[i], 9);
    });
  });

  it('folds one side of a slit while the other stays', () => {
    const model = slit();
    expect(checkConsistency(model, 2)).toEqual({ ok: true });
    const faces = foldedPositions(model, 2, 1);
    // the top-left corner (face 1: vertices 4, 5, 8, 3) turns over x = 0.25
    expectClose(faces[1][0], [0.5, 0.5, faces[1][0][2]]);
    expectClose(faces[1][3], [0.5, 1, faces[1][3][2]]);
    // the bottom half (face 0) stays where it was, its copy of vertex 4 at the left edge
    expectClose(faces[0][5], [0, 0.5, 0]);
  });

  it('without the cut the same fold tears the paper', () => {
    const json = slitFixture();
    json.edges_assignment[7] = 'F';
    json.edges_assignment[8] = 'F';
    delete json.file_frames[0]['foldapp:cut'];
    expect(checkConsistency(loadModel(json), 2).ok).toBe(false);
  });
});
