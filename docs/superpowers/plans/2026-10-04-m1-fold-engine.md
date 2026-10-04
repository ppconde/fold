# Milestone 1 — Fold Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pure TypeScript engine in `src/fold/`. It loads a FOLD model with steps, computes the 3D pose of every face at any point within a step, reports which creases a step uses, checks that a step's angles close up, and remaps angles after crease edits.

**Architecture:**
- Each face is placed by walking a spanning tree of faces outward from the step's fixed face. A child face's transform is its parent's transform multiplied by a rotation about the shared crease. Faces never stretch.
- Steps chain together. Step k starts from the pose the fixed face had at the end of step k−1, and the whole-model rotation is slerped on top.
- The engine uses three.js only for matrix and quaternion maths. No React, no DOM.

**Tech Stack:** TypeScript, three (`Matrix4`, `Vector3`, `Quaternion`, `Euler`), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-04-fold-restart-design.md`, sections 5, 6, 12 and 13. Milestone 1 in section 14.

## Global Constraints

- `src/fold/` must not import React, the DOM, or anything from `src/routes` or `src/shell`.
- Angles are stored in degrees. Positive is valley, negative is mountain, 0 is flat. Valley folds move toward +z, the viewer's side of the paper's front.
- Render clamp: `MAX_RENDER_ANGLE = 178`. `checkConsistency` always uses unclamped angles.
- Steps: `model.steps[0]` is the implicit flat sheet. `model.steps[k]` for k ≥ 1 comes from `file_frames[k-1]`.
- `foldapp:fixedFace` and `foldapp:rotation` inherit the previous step's value when absent. The default fixed face is the face whose centroid is nearest the paper's bounding-box centre. The default rotation is `[0, 0, 0]`.
- Every error from `loadModel` is a `FoldError` with a plain-English message that can be shown to users.
- Biome style from M0 applies: single quotes, no trailing commas, 120 columns.
- Branch: `feat/fold-engine`, from `main` after M0 is merged.

## Review Focus

1. **The fixed face changes between steps** (common: "now hold the other side"). The paper must not jump at the step boundary. Tested by "anchors the new fixed face where the previous step left it" in Task 2.
2. **Malformed `.fold` files** (future uploads, hand edits). They must produce a readable `FoldError`, never a `TypeError` deep in the maths. Tested by the rejection table in Task 1.
3. **"Turn over" persists into later steps.** Rotation is inherited, so step k+1 must not flip back. Tested in Task 2.
4. **Out-of-range step numbers** from a stale or hand-typed `?step=`. They throw `RangeError` so the player can clamp them. Tested in Task 2.
5. **Float noise in crease coordinates** (thirds, √2 diagonals) when remapping after an edit. A split crease must still inherit its angle. Tested in Task 3.

---

### Task 1: Model types, fixtures and `loadModel`

**Files:**
- Create:
  - `src/fold/types.ts`, `src/fold/load-model.ts`, `src/fold/load-model.test.ts`
  - `src/fold/fixtures.ts` (test helper)
  - `public/models/fold-in-half.fold`, `public/models/fold-in-quarters.fold`

**Interfaces:**
- Consumes: nothing (Vitest config from M0).
- Produces:
  ```ts
  type Vec2 = [number, number];
  type Vec3 = [number, number, number];
  type Edge = [number, number];
  type Assignment = 'M' | 'V' | 'B' | 'F' | 'U';
  type Step = { angles: number[]; instruction: string; fixedFace: number; rotation: Vec3 };
  type Model = {
    title: string; paperColor: string;
    vertices: Vec2[]; edges: Edge[]; assignments: Assignment[]; faces: number[][];
    faceEdges: number[][];   // per face, edge index of each side (side j = faces[f][j] → faces[f][j+1])
    edgeFaces: number[][];   // per edge, the 1 or 2 faces using it
    faceCentroids: Vec2[];
    center: Vec2;            // bounding-box centre of the flat paper
    steps: Step[];           // steps[0] = flat sheet
  };
  class FoldError extends Error {}
  function loadModel(json: unknown): Model;
  function fixture(name: 'fold-in-half' | 'fold-in-quarters'): unknown;   // tests only
  ```

- [ ] **Step 1: Create the branch**

```bash
git switch main && git pull --ff-only
git switch -c feat/fold-engine
```

- [ ] **Step 2: Write the fixtures**

`public/models/fold-in-half.fold`. The vertical crease x = 0.5 is edge 6. Face 0 is the left half and face 1 the right.

```json
{
  "file_spec": 1.2,
  "file_creator": "fold.ppconde.com",
  "file_title": "Fold in half",
  "file_classes": ["singleModel"],
  "frame_classes": ["creasePattern"],
  "foldapp:paperColor": "#B8613F",
  "vertices_coords": [[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0], [0.5, 1]],
  "edges_vertices": [[0, 4], [4, 1], [1, 2], [2, 5], [5, 3], [3, 0], [4, 5]],
  "edges_assignment": ["B", "B", "B", "B", "B", "B", "V"],
  "faces_vertices": [[0, 4, 5, 3], [4, 1, 2, 5]],
  "file_frames": [
    {
      "frame_inherit": true,
      "frame_parent": 0,
      "edges_foldAngle": [0, 0, 0, 0, 0, 0, 180],
      "foldapp:instruction": "Fold the left half over onto the right half.",
      "foldapp:fixedFace": 1
    }
  ]
}
```

`public/models/fold-in-quarters.fold`. Vertex 8 is the centre. Edges 8–9 are the vertical crease, and edges 10–11 the horizontal crease (left half mountain, right half valley, because the left half is upside down after step 1). Face 1 is bottom-right.

```json
{
  "file_spec": 1.2,
  "file_creator": "fold.ppconde.com",
  "file_title": "Fold in quarters",
  "file_classes": ["singleModel"],
  "frame_classes": ["creasePattern"],
  "foldapp:paperColor": "#2E3A59",
  "vertices_coords": [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5], [0.5, 0.5]],
  "edges_vertices": [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
    [1, 8], [8, 5], [7, 8], [8, 3]
  ],
  "edges_assignment": ["B", "B", "B", "B", "B", "B", "B", "B", "V", "V", "M", "V"],
  "faces_vertices": [[0, 1, 8, 7], [1, 2, 3, 8], [8, 3, 4, 5], [7, 8, 5, 6]],
  "file_frames": [
    {
      "frame_inherit": true,
      "frame_parent": 0,
      "edges_foldAngle": [0, 0, 0, 0, 0, 0, 0, 0, 180, 180, 0, 0],
      "foldapp:instruction": "Fold the left half over onto the right half.",
      "foldapp:fixedFace": 1
    },
    {
      "frame_inherit": true,
      "frame_parent": 0,
      "edges_foldAngle": [0, 0, 0, 0, 0, 0, 0, 0, 180, 180, -180, 180],
      "foldapp:instruction": "Fold the top half down onto the bottom half."
    }
  ]
}
```

- [ ] **Step 3: Write `src/fold/fixtures.ts`**

```ts
import { readFileSync } from 'node:fs';

/** Test helper: raw JSON of a model in public/models. */
export function fixture(name: 'fold-in-half' | 'fold-in-quarters'): unknown {
  return JSON.parse(readFileSync(new URL(`../../public/models/${name}.fold`, import.meta.url), 'utf8'));
}
```

- [ ] **Step 4: Write the failing tests in `src/fold/load-model.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { fixture } from './fixtures';
import { FoldError, loadModel } from './load-model';

type Json = Record<string, unknown> & { file_frames: Record<string, unknown>[] };
const half = () => fixture('fold-in-half') as Json;

describe('loadModel', () => {
  it('loads fold-in-half with an implicit flat step 0', () => {
    const model = loadModel(fixture('fold-in-half'));
    expect(model.title).toBe('Fold in half');
    expect(model.paperColor).toBe('#B8613F');
    expect(model.steps).toHaveLength(2);
    expect(model.steps[0].angles).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(model.steps[1].instruction).toBe('Fold the left half over onto the right half.');
    expect(model.steps[1].fixedFace).toBe(1);
    expect(model.edgeFaces[6]).toEqual([0, 1]);
    expect(model.faceEdges[0]).toEqual([0, 6, 4, 5]);
    expect(model.center).toEqual([0.5, 0.5]);
  });

  it('inherits fixedFace and rotation from the previous step', () => {
    const model = loadModel(fixture('fold-in-quarters'));
    expect(model.steps[2].fixedFace).toBe(1);
    expect(model.steps[2].rotation).toEqual([0, 0, 0]);
  });

  it('defaults the fixed face to the face nearest the paper centre', () => {
    const json = half();
    delete json.file_frames[0]['foldapp:fixedFace'];
    expect(loadModel(json).steps[1].fixedFace).toBe(0);
  });

  it('accepts 3D vertex coordinates by dropping z', () => {
    const json = half();
    json.vertices_coords = (json.vertices_coords as number[][]).map(([x, y]) => [x, y, 0]);
    expect(loadModel(json).vertices[1]).toEqual([1, 0]);
  });

  const broken: [string, (j: Json) => unknown, RegExp][] = [
    ['not an object', () => 42, /not a FOLD object/],
    ['missing faces', (j) => ({ ...j, faces_vertices: undefined }), /faces_vertices/],
    ['bad vertex', (j) => ({ ...j, vertices_coords: [[0, 'x']] }), /Vertex 0/],
    ['edge to missing vertex', (j) => ({ ...j, edges_vertices: [[0, 99]] }), /Edge 0/],
    ['assignment count', (j) => ({ ...j, edges_assignment: ['B'] }), /edges_assignment/],
    ['face side not an edge', (j) => ({ ...j, faces_vertices: [[0, 1, 2, 3], [4, 1, 2, 5]] }), /Face 0/],
    ['no steps', (j) => ({ ...j, file_frames: [] }), /no steps/],
    [
      'angle count',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], edges_foldAngle: [0, 180] }] }),
      /Step 1 needs one fold angle per edge \(7\)/
    ],
    [
      'missing instruction',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], 'foldapp:instruction': ' ' }] }),
      /Step 1 has no instruction/
    ],
    [
      'fixed face out of range',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], 'foldapp:fixedFace': 5 }] }),
      /Step 1 holds face 5/
    ],
    [
      'bad rotation',
      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], 'foldapp:rotation': [0, 180] }] }),
      /Step 1 rotation/
    ],
    [
      'paper in pieces',
      (j) => ({
        ...j,
        vertices_coords: [[0, 0], [1, 0], [1, 1], [3, 0], [4, 0], [4, 1]],
        edges_vertices: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3]],
        faces_vertices: [[0, 1, 2], [3, 4, 5]]
      }),
      /separate pieces/
    ]
  ];

  for (const [name, mutate, message] of broken) {
    it(`rejects ${name} with a readable FoldError`, () => {
      const run = () => loadModel(mutate(half()));
      expect(run).toThrow(FoldError);
      expect(run).toThrow(message);
    });
  }
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `pnpm vitest run src/fold`
Expected: FAIL with "Failed to resolve import './load-model'".

- [ ] **Step 6: Write `src/fold/types.ts`**

```ts
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Edge = [number, number];
export type Assignment = 'M' | 'V' | 'B' | 'F' | 'U';

export type Step = {
  /** Fold angle of every edge at the end of the step, in degrees (+valley, −mountain). */
  angles: number[];
  instruction: string;
  /** Face that stays still during the step. */
  fixedFace: number;
  /** Whole-model rotation at the end of the step, Euler XYZ in degrees. */
  rotation: Vec3;
};

export type Model = {
  title: string;
  paperColor: string;
  vertices: Vec2[];
  edges: Edge[];
  assignments: Assignment[];
  faces: number[][];
  /** Per face, the edge index of each side (side j runs faces[f][j] → faces[f][j + 1]). */
  faceEdges: number[][];
  /** Per edge, the one or two faces that use it. */
  edgeFaces: number[][];
  faceCentroids: Vec2[];
  /** Bounding-box centre of the flat paper. */
  center: Vec2;
  /** steps[0] is the flat sheet; steps[k] comes from file_frames[k - 1]. */
  steps: Step[];
};
```

- [ ] **Step 7: Write `src/fold/load-model.ts`**

```ts
import type { Assignment, Edge, Model, Step, Vec2, Vec3 } from './types';

export class FoldError extends Error {
  override name = 'FoldError';
}

const ASSIGNMENTS = new Set(['M', 'V', 'B', 'F', 'U']);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const edgeKey = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);

function readArray(json: Record<string, unknown>, field: string): unknown[] {
  const value = json[field];
  if (!Array.isArray(value)) throw new FoldError(`The file is missing ${field}.`);
  return value;
}

function isIndex(v: unknown, length: number): v is number {
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) < length;
}

export function loadModel(json: unknown): Model {
  if (!isRecord(json)) throw new FoldError('The file is not a FOLD object.');

  const vertices = readArray(json, 'vertices_coords').map((v, i): Vec2 => {
    if (!Array.isArray(v) || v.length < 2 || !isNum(v[0]) || !isNum(v[1])) {
      throw new FoldError(`Vertex ${i} must have x and y numbers.`);
    }
    return [v[0], v[1]];
  });

  const edges = readArray(json, 'edges_vertices').map((e, i): Edge => {
    if (!Array.isArray(e) || e.length !== 2 || !e.every((v) => isIndex(v, vertices.length))) {
      throw new FoldError(`Edge ${i} must join two existing vertices.`);
    }
    return [e[0], e[1]];
  });

  const assignments = readArray(json, 'edges_assignment');
  if (assignments.length !== edges.length || !assignments.every((a) => ASSIGNMENTS.has(a as string))) {
    throw new FoldError(`edges_assignment needs one of M, V, B, F, U for each of the ${edges.length} edges.`);
  }

  const faces = readArray(json, 'faces_vertices').map((f, i) => {
    if (!Array.isArray(f) || f.length < 3 || !f.every((v) => isIndex(v, vertices.length))) {
      throw new FoldError(`Face ${i} must list at least three existing vertices.`);
    }
    return f as number[];
  });

  const edgeIndex = new Map(edges.map(([a, b], i) => [edgeKey(a, b), i]));
  const faceEdges = faces.map((f, i) =>
    f.map((v, j) => {
      const e = edgeIndex.get(edgeKey(v, f[(j + 1) % f.length]));
      if (e === undefined) throw new FoldError(`Face ${i} has a side that is not an edge.`);
      return e;
    })
  );
  const edgeFaces = edges.map((): number[] => []);
  faceEdges.forEach((es, f) => {
    for (const e of es) edgeFaces[e].push(f);
  });

  const faceCentroids = faces.map((f): Vec2 => [
    f.reduce((s, v) => s + vertices[v][0], 0) / f.length,
    f.reduce((s, v) => s + vertices[v][1], 0) / f.length
  ]);
  const xs = vertices.map((v) => v[0]);
  const ys = vertices.map((v) => v[1]);
  const center: Vec2 = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];

  assertConnected(faces.length, faceEdges, edgeFaces);

  const frames = readArray(json, 'file_frames');
  if (frames.length === 0) throw new FoldError('The model has no steps.');

  const nearestToCenter = faceCentroids.reduce(
    (best, c, i) => (Math.hypot(c[0] - center[0], c[1] - center[1]) < best.d ? { i, d: Math.hypot(c[0] - center[0], c[1] - center[1]) } : best),
    { i: 0, d: Number.POSITIVE_INFINITY }
  ).i;

  const steps: Step[] = [{ angles: edges.map(() => 0), instruction: '', fixedFace: nearestToCenter, rotation: [0, 0, 0] }];
  frames.forEach((frame, i) => {
    const n = i + 1;
    const prev = steps[i];
    if (!isRecord(frame)) throw new FoldError(`Step ${n} is not an object.`);

    const angles = frame.edges_foldAngle;
    if (!Array.isArray(angles) || angles.length !== edges.length || !angles.every(isNum)) {
      throw new FoldError(`Step ${n} needs one fold angle per edge (${edges.length}).`);
    }

    const instruction = frame['foldapp:instruction'];
    if (typeof instruction !== 'string' || !instruction.trim()) throw new FoldError(`Step ${n} has no instruction.`);

    const fixedFace = frame['foldapp:fixedFace'] ?? prev.fixedFace;
    if (!isIndex(fixedFace, faces.length)) throw new FoldError(`Step ${n} holds face ${fixedFace}, which does not exist.`);

    const rotation = frame['foldapp:rotation'] ?? prev.rotation;
    if (!Array.isArray(rotation) || rotation.length !== 3 || !rotation.every(isNum)) {
      throw new FoldError(`Step ${n} rotation must be three numbers.`);
    }

    steps.push({ angles, instruction: instruction.trim(), fixedFace, rotation: rotation as Vec3 });
  });

  return {
    title: typeof json.file_title === 'string' ? json.file_title : 'Untitled',
    paperColor: typeof json['foldapp:paperColor'] === 'string' ? json['foldapp:paperColor'] : '#B8613F',
    vertices,
    edges,
    assignments: assignments as Assignment[],
    faces,
    faceEdges,
    edgeFaces,
    faceCentroids,
    center,
    steps
  };
}

function assertConnected(faceCount: number, faceEdges: number[][], edgeFaces: number[][]) {
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const f = queue.shift() as number;
    for (const e of faceEdges[f]) {
      for (const g of edgeFaces[e]) {
        if (!seen.has(g)) {
          seen.add(g);
          queue.push(g);
        }
      }
    }
  }
  if (seen.size !== faceCount) throw new FoldError('The paper is in separate pieces.');
}
```

Run `pnpm biome check --write src/fold` to reformat the long `reduce` line.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pnpm vitest run src/fold`
Expected: PASS, 16 tests.

- [ ] **Step 9: Commit**

```bash
git add public/models src/fold
git commit -m "feat(fold): load FOLD models with steps and readable errors

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `foldedPositions` and `checkConsistency`

**Files:**
- Create: `src/fold/fold.ts`, `src/fold/fold.test.ts`

**Interfaces:**
- Consumes: `Model`, `Vec3` from `./types`; `loadModel` and `fixture` from Task 1.
- Produces:
  ```ts
  const MAX_RENDER_ANGLE = 178;
  function foldedPositions(model: Model, step: number, t: number): Vec3[][]; // per face, corners in faces[f] order
  function checkConsistency(model: Model, step: number): { ok: true } | { ok: false; edges: number[] };
  ```
  `step` is in `0..model.steps.length - 1`. Step 0 returns the flat sheet. `t` is in `[0, 1]` and is eased internally (smoothstep). Out-of-range `step` throws `RangeError`.

- [ ] **Step 1: Install three**

```bash
pnpm add three
pnpm add -D @types/three
```

- [ ] **Step 2: Write the failing tests in `src/fold/fold.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { checkConsistency, foldedPositions } from './fold';
import { fixture } from './fixtures';
import { loadModel } from './load-model';
import type { Vec3 } from './types';

const half = () => loadModel(fixture('fold-in-half'));
const quarters = () => loadModel(fixture('fold-in-quarters'));

function expectClose(actual: Vec3, expected: Vec3, digits = 3) {
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], digits));
}

describe('foldedPositions', () => {
  it('step 0 is the flat sheet', () => {
    const faces = foldedPositions(half(), 0, 0);
    expect(faces[0]).toEqual([[0, 0, 0], [0.5, 0, 0], [0.5, 1, 0], [0, 1, 0]]);
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
    const flat: Vec3[] = [[0.5, 0, 0], [1, 0, 0], [1, 1, 0], [0.5, 1, 0]];
    for (const t of [0, 0.3, 0.7, 1]) {
      foldedPositions(half(), 1, t)[1].forEach((corner, i) => expectClose(corner, flat[i], 9));
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
      face.forEach((corner, c) => expectClose(corner, endOfStep1[f][c], 6));
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run src/fold/fold.test.ts`
Expected: FAIL with "Failed to resolve import './fold'".

- [ ] **Step 4: Write `src/fold/fold.ts`**

```ts
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { Model, Vec3 } from './types';

export const MAX_RENDER_ANGLE = 178;
const DEG = Math.PI / 180;
const EPSILON = 1e-6;

const ease = (t: number) => t * t * (3 - 2 * t);
const clampAngle = (a: number) => Math.max(-MAX_RENDER_ANGLE, Math.min(MAX_RENDER_ANGLE, a));

/** Rotation of face `g` about edge `e` by `angle` degrees, in flat-paper coordinates. */
function hinge(model: Model, e: number, g: number, angle: number): Matrix4 {
  const [a, b] = model.edges[e];
  const [ax, ay] = model.vertices[a];
  const [bx, by] = model.vertices[b];
  const axis = new Vector3(bx - ax, by - ay, 0).normalize();
  const [cx, cy] = model.faceCentroids[g];
  // Valley (+) lifts the face toward +z whichever side of the crease it is on.
  const side = axis.x * (cy - ay) - axis.y * (cx - ax) > 0 ? 1 : -1;
  const pivot = new Vector3(ax, ay, 0);
  return new Matrix4()
    .makeTranslation(pivot)
    .multiply(new Matrix4().makeRotationAxis(axis, side * angle * DEG))
    .multiply(new Matrix4().makeTranslation(pivot.clone().negate()));
}

/** Transform of every face relative to `fixed`, walking a BFS spanning tree of faces. */
function layout(model: Model, angles: number[], fixed: number) {
  const transforms: Matrix4[] = [];
  const tree = new Set<number>();
  transforms[fixed] = new Matrix4();
  const queue = [fixed];
  while (queue.length) {
    const f = queue.shift() as number;
    for (const e of model.faceEdges[f]) {
      for (const g of model.edgeFaces[e]) {
        if (transforms[g]) continue;
        transforms[g] = transforms[f].clone().multiply(hinge(model, e, g, angles[e]));
        tree.add(e);
        queue.push(g);
      }
    }
  }
  return { transforms, tree };
}

/** Pose of step `step`'s fixed face at the end of step `step - 1`, so steps join without a jump. */
// ponytail: recomputes every earlier step per call, O(steps × faces); memoize per model if long models stutter.
function anchor(model: Model, step: number): Matrix4 {
  let pose = new Matrix4();
  for (let k = 1; k < step; k++) {
    const { transforms } = layout(model, model.steps[k].angles.map(clampAngle), model.steps[k].fixedFace);
    pose = pose.clone().multiply(transforms[model.steps[k + 1].fixedFace]);
  }
  return pose;
}

function modelRotation(model: Model, from: Vec3, to: Vec3, s: number): Matrix4 {
  const q0 = new Quaternion().setFromEuler(new Euler(from[0] * DEG, from[1] * DEG, from[2] * DEG));
  const q1 = new Quaternion().setFromEuler(new Euler(to[0] * DEG, to[1] * DEG, to[2] * DEG));
  const centre = new Vector3(model.center[0], model.center[1], 0);
  return new Matrix4()
    .makeTranslation(centre)
    .multiply(new Matrix4().makeRotationFromQuaternion(q0.slerp(q1, s)))
    .multiply(new Matrix4().makeTranslation(centre.clone().negate()));
}

function assertStep(model: Model, step: number) {
  if (!Number.isInteger(step) || step < 0 || step >= model.steps.length) {
    throw new RangeError(`Step ${step} does not exist (0–${model.steps.length - 1}).`);
  }
}

/** Corners of every face (in `model.faces` order) at progress `t` through `step`. */
export function foldedPositions(model: Model, step: number, t: number): Vec3[][] {
  assertStep(model, step);
  if (step === 0) return model.faces.map((f) => f.map((v): Vec3 => [...model.vertices[v], 0]));

  const prev = model.steps[step - 1];
  const cur = model.steps[step];
  const s = ease(Math.max(0, Math.min(1, t)));
  const angles = prev.angles.map((a, e) => clampAngle(a + (cur.angles[e] - a) * s));
  const { transforms } = layout(model, angles, cur.fixedFace);
  const world = modelRotation(model, prev.rotation, cur.rotation, s).multiply(anchor(model, step));

  const point = new Vector3();
  return model.faces.map((face, f) => {
    const m = world.clone().multiply(transforms[f]);
    return face.map((v) => point.set(model.vertices[v][0], model.vertices[v][1], 0).applyMatrix4(m).toArray() as Vec3);
  });
}

/** At the end of `step`, does every crease off the spanning tree agree with it? (Unclamped angles.) */
export function checkConsistency(model: Model, step: number): { ok: true } | { ok: false; edges: number[] } {
  assertStep(model, step);
  const { angles, fixedFace } = model.steps[step];
  const { transforms, tree } = layout(model, angles, fixedFace);
  const bad: number[] = [];
  model.edgeFaces.forEach((faces, e) => {
    if (faces.length !== 2 || tree.has(e)) return;
    const [f, g] = faces;
    const [cx, cy] = model.faceCentroids[g];
    const viaTree = new Vector3(cx, cy, 0).applyMatrix4(transforms[g]);
    const viaEdge = new Vector3(cx, cy, 0).applyMatrix4(transforms[f].clone().multiply(hinge(model, e, g, angles[e])));
    if (viaTree.distanceTo(viaEdge) > EPSILON) bad.push(e);
  });
  return bad.length ? { ok: false, edges: bad } : { ok: true };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/fold`
Expected: PASS. All `fold.test.ts` tests (12) plus Task 1's 16.

If "folds through two layers" fails, print `foldedPositions(quarters(), 2, 1)` and compare it with the reference values these angles were verified against: at unclamped ±180°, face 2's corners are `[0.5,0.5,0] [1,0.5,0] [1,0,0] [0.5,0,0]`.

- [ ] **Step 6: Commit**

```bash
pnpm biome check --write src/fold
git add src/fold package.json pnpm-lock.yaml
git commit -m "feat(fold): rigid face folding, step anchoring, rotation and consistency check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `stepCreases`, `remapAngles` and the PR

**Files:**
- Create: `src/fold/creases.ts`, `src/fold/creases.test.ts`

**Interfaces:**
- Consumes: `Model`, `Vec2`, `Edge` from `./types`; `loadModel` and `fixture`.
- Produces:
  ```ts
  function stepCreases(model: Model, step: number): { active: number[]; past: number[] };
  function remapAngles(
    prev: { vertices: Vec2[]; edges: Edge[] },
    next: { vertices: Vec2[]; edges: Edge[] },
    angles: number[]
  ): number[];
  ```
  `active` lists the edges whose angle changes in `step`. `past` lists the edges that are non-zero in any earlier step and not active. Both are sorted ascending. Step 0 returns empty lists.

- [ ] **Step 1: Write the failing tests in `src/fold/creases.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { remapAngles, stepCreases } from './creases';
import { fixture } from './fixtures';
import { loadModel } from './load-model';
import type { Edge, Vec2 } from './types';

describe('stepCreases', () => {
  const model = loadModel(fixture('fold-in-quarters'));

  it('has nothing at step 0', () => {
    expect(stepCreases(model, 0)).toEqual({ active: [], past: [] });
  });

  it('marks the first crease active in step 1', () => {
    expect(stepCreases(model, 1)).toEqual({ active: [8, 9], past: [] });
  });

  it('marks the second crease active and the first as past in step 2', () => {
    expect(stepCreases(model, 2)).toEqual({ active: [10, 11], past: [8, 9] });
  });
});

describe('remapAngles', () => {
  const square: Vec2[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const borders: Edge[] = [[0, 1], [1, 2], [2, 3], [3, 0]];

  it('keeps the angle on both halves of a crease split by a new crossing crease', () => {
    // one vertical crease (edge 4) at x = 1/3, folded to 180
    const prev = { vertices: [...square, [1 / 3, 0], [1 / 3, 1]] as Vec2[], edges: [...borders, [4, 5]] as Edge[] };
    // add a horizontal crease at y = 0.5: vertical splits at (1/3, 0.5); new crease is edges 6 and 7
    const next = {
      vertices: [...square, [1 / 3, 0], [1 / 3, 1], [1 / 3, 0.5], [0, 0.5], [1, 0.5]] as Vec2[],
      edges: [...borders, [4, 6], [6, 5], [7, 6], [6, 8]] as Edge[]
    };
    expect(remapAngles(prev, next, [0, 0, 0, 0, 180])).toEqual([0, 0, 0, 0, 180, 180, 0, 0]);
  });

  it('tolerates float noise in coordinates', () => {
    const prev = { vertices: [[0, 0], [1, 1]] as Vec2[], edges: [[0, 1]] as Edge[] };
    const next = {
      vertices: [[0, 0], [Math.SQRT1_2 * Math.SQRT1_2, 0.5 + 1e-12], [1, 1]] as Vec2[],
      edges: [[0, 1], [1, 2]] as Edge[]
    };
    expect(remapAngles(prev, next, [-180])).toEqual([-180, -180]);
  });

  it('drops angles of deleted edges', () => {
    const prev = { vertices: square, edges: [...borders, [0, 2]] as Edge[] };
    const next = { vertices: square, edges: borders };
    expect(remapAngles(prev, next, [0, 0, 0, 0, 90])).toEqual([0, 0, 0, 0]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/fold/creases.test.ts`
Expected: FAIL with "Failed to resolve import './creases'".

- [ ] **Step 3: Write `src/fold/creases.ts`**

```ts
import type { Edge, Model, Vec2 } from './types';

const EPSILON = 1e-9;

export function stepCreases(model: Model, step: number): { active: number[]; past: number[] } {
  if (step <= 0) return { active: [], past: [] };
  const prev = model.steps[step - 1].angles;
  const active = model.steps[step].angles.flatMap((a, e) => (a !== prev[e] ? [e] : []));
  const isActive = new Set(active);
  const past = model.edges.flatMap((_, e) =>
    !isActive.has(e) && model.steps.slice(1, step).some((s) => s.angles[e] !== 0) ? [e] : []
  );
  return { active, past };
}

function onSegment(p: Vec2, a: Vec2, b: Vec2): boolean {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const apx = p[0] - a[0];
  const apy = p[1] - a[1];
  const lengthSq = abx * abx + aby * aby;
  const cross = abx * apy - aby * apx;
  const dot = abx * apx + aby * apy;
  return Math.abs(cross) <= EPSILON * Math.sqrt(lengthSq) + EPSILON && dot >= -EPSILON && dot <= lengthSq + EPSILON;
}

/** Carry fold angles across a crease-pattern edit: each new edge takes the angle of the old edge it lies on. */
export function remapAngles(
  prev: { vertices: Vec2[]; edges: Edge[] },
  next: { vertices: Vec2[]; edges: Edge[] },
  angles: number[]
): number[] {
  return next.edges.map(([p, q]) => {
    const old = prev.edges.findIndex(([a, b]) => {
      const A = prev.vertices[a];
      const B = prev.vertices[b];
      return onSegment(next.vertices[p], A, B) && onSegment(next.vertices[q], A, B);
    });
    return old === -1 ? 0 : angles[old];
  });
}
```

- [ ] **Step 4: Run all unit tests**

Run: `pnpm vitest run`
Expected: PASS, 38 tests (M0's 4 + Task 1's 16 + Task 2's 12 + Task 3's 6).

- [ ] **Step 5: Commit, push and open the PR**

```bash
pnpm biome ci
git add src/fold
git commit -m "feat(fold): step crease classification and angle remapping

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feat/fold-engine
gh pr create --base main --title "Milestone 1: fold engine" --body "Pure TypeScript fold engine (src/fold/) per section 6 of the restart spec, with the fold-in-half and fold-in-quarters fixtures.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
```

Expected: CI is green. Merge when it passes.
