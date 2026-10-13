# Movement Arrows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Steps whose animation stands in for a hand move (reverse folds, squashes) show book-style arrows on the 3D paper: a hollow *push* arrow and a curved *swing* arrow, drawn on the step's starting pose and fading out before the paper lands.

**Architecture:** A new per-step FOLD frame field `foldapp:cues` lists arrows, each anchored on a face with two flat-sheet points in that face's plane. The builder takes cues in view coordinates and converts them through the top layer under the anchor point. A pure player module turns a step's cues into line segments on its starting pose and gives the fade; `Paper.tsx` draws them with one more drei `Line`. The crane's three reverse folds get the first cues.

**Tech Stack:** TypeScript, React, three.js / @react-three/fiber / drei, Vitest, Playwright, Biome, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-13-movement-arrows-design.md`

## Global Constraints

- Two kinds only: `push` and `swing`. No "press flat", no arrows in the crease diagram, none on ordinary folds. (Revised 2026-10-13: push dropped; a cue is now just a swing, `{ face, from, to, bend? }` with no `kind` — see the spec.)
- `foldapp:cues` entries: `{ kind: 'push' | 'swing', face, from: [x, y], to: [x, y] }`, flat-sheet points, 6 decimals; on its own frame only (not inherited).
- Anchor: the top layer under `to` for a push, under `from` for a swing.
- Arrows: highlight colour `#A5633F`, `lineWidth` 2.2, `depthTest={false}`, drawn `3 × LAYER_GAP` above their face.
- Push outline: shaft width 0.18 × length, head width 0.45 × length, head length 0.35 × length. Swing: quadratic arc, control 0.35 × length up the face normal, 16 segments, V head strokes 0.18 × length at 25°.
- Fade: opacity 1 for t ≤ 0.1, linear to 0 at t = 0.5, 0 after.
- `pnpm models`: only `public/models/crane.fold` changes, only by gaining `foldapp:cues` on its three reverse-fold frames. Dog face, tulip and every SVG stay byte-identical.
- No new dependencies. Match surrounding style: short JSDoc on exports, lowercase `//` comments that say why, `FoldError` messages as full sentences naming the step.
- Branch `feat/arrows` in `../fold-arrows`. Run `graphify update .` after code changes. Stop any `pnpm preview`/`pnpm dev` server you start (Playwright reuses port 4173).

## Review Focus

1. A cue on a step shown at its end pose (jumped to, or replayed to the end): no arrows (Task 3 `cueOpacity(1) === 0`; Task 4 hides the line at opacity 0).
2. A push whose tail starts off the paper (the usual book drawing): it anchors on `to` and builds (Task 2 test).
3. Faces with a vertex in the middle of a side (collinear corners): the flat→3D map still works (Task 3 test with a face whose first three corners are collinear).
4. The homepage unfold never shows arrows (Task 1: `unfoldAll` clears `cues`).
5. Models without cues build byte-identically (Task 5 `pnpm models` check).

## Files

- Modify `src/fold/types.ts`: `Cue`, `Step.cues`.
- Modify `src/fold/load-model.ts`: `readCues`.
- Modify `src/home/unfold.ts`: no cues on the homepage unfold.
- Modify `models/build.ts`: `SourceStep.cues`, `foldapp:cues` in frames.
- Modify `models/sequence.ts`: `CueSpec`, `cues` on `fold`/`crease`/`collapse`, kept by `together`.
- Create `src/player/cues.ts`, `src/player/cues.test.ts`.
- Modify `src/player/Paper.tsx`: the cue line.
- Modify `models/src/crane.ts`; rebuild `public/models/crane.fold`.
- Tests: `src/fold/load-model.test.ts`, `src/home/unfold.test.ts`, `models/sequence.test.ts`.

---

### Task 1: Load cues

**Files:**
- Modify: `src/fold/types.ts`, `src/fold/load-model.ts`, `src/home/unfold.ts`
- Test: `src/fold/load-model.test.ts`, `src/home/unfold.test.ts`

**Interfaces:**
- Produces: `type Cue = { kind: 'push' | 'swing'; face: number; from: Vec2; to: Vec2 }` exported from `src/fold/types.ts`; `Step.cues: Cue[]` (empty when the frame has none).

- [ ] **Step 1: Write the failing tests**

In `src/fold/load-model.test.ts`, inside `describe('loadModel', ...)`, after the faceOrders test:

```ts
  it('reads cues for their own step only', () => {
    const json = fixture('fold-in-quarters') as Json;
    json.file_frames[0]['foldapp:cues'] = [
      { kind: 'push', face: 0, from: [0.1, 0.2], to: [0.3, 0.2] },
      { kind: 'swing', face: 1, from: [0.6, 0.1], to: [0.6, 0.9] }
    ];
    const model = loadModel(json);
    expect(model.steps[0].cues).toEqual([]);
    expect(model.steps[1].cues).toEqual([
      { kind: 'push', face: 0, from: [0.1, 0.2], to: [0.3, 0.2] },
      { kind: 'swing', face: 1, from: [0.6, 0.1], to: [0.6, 0.9] }
    ]);
    expect(model.steps[2].cues).toEqual([]);
  });

  it.each([
    ['an unknown kind', { kind: 'pull', face: 0, from: [0, 0], to: [1, 0] }],
    ['a missing face', { kind: 'push', face: 99, from: [0, 0], to: [1, 0] }],
    ['a bad point', { kind: 'push', face: 0, from: [0], to: [1, 0] }],
    ['the same point twice', { kind: 'swing', face: 0, from: [0.5, 0.5], to: [0.5, 0.5] }]
  ])('rejects a cue with %s', (_, cue) => {
    const json = fixture('fold-in-quarters') as Json;
    json.file_frames[1]['foldapp:cues'] = [cue];
    expect(() => loadModel(json)).toThrow('Step 2 foldapp:cues needs {kind: push|swing, face, from: [x, y], to: [x, y]} with from and to apart.');
  });
```

In `src/home/unfold.test.ts`, inside `describe('unfoldAll', ...)`:

```ts
  it('shows no movement arrows', () => {
    const json = fixture('fold-in-quarters') as Record<string, unknown> & { file_frames: Record<string, unknown>[] };
    json.file_frames[1]['foldapp:cues'] = [{ kind: 'push', face: 0, from: [0.1, 0.2], to: [0.3, 0.2] }];
    expect(unfoldAll(loadModel(json)).steps[1].cues).toEqual([]);
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/fold/load-model.test.ts src/home/unfold.test.ts`
Expected: FAIL — `cues` is `undefined`, and the malformed cues don't throw.

- [ ] **Step 3: Implement**

`src/fold/types.ts`, next to `Cut`:

```ts
/** A book arrow drawn on a step's starting pose: push (hollow, a finger goes in here) or swing (a flap travels). */
export type Cue = { kind: 'push' | 'swing'; face: number; from: Vec2; to: Vec2 };
```

and in `Step`, after `cuts`:

```ts
  /** Movement arrows for this step, anchored on a face, as flat-sheet points in its plane. */
  cues: Cue[];
```

`src/fold/load-model.ts`: import `Cue` with the other types; add `cues: []` to the step-0 literal after `cuts: []`; after `const cuts = readCuts(...)` and its check:

```ts
    const cues = readCues(frame['foldapp:cues'], n, faces.length);
```

push it with the step (`cuts,` then `cues`), and add after `readCuts`:

```ts
/** A frame's movement arrows; none when absent. */
function readCues(raw: unknown, n: number, faceCount: number): Cue[] {
  if (raw === undefined) return [];
  const bad = () =>
    new FoldError(
      `Step ${n} foldapp:cues needs {kind: push|swing, face, from: [x, y], to: [x, y]} with from and to apart.`
    );
  const point = (p: unknown): p is Vec2 => Array.isArray(p) && p.length === 2 && p.every(isNum);
  if (!Array.isArray(raw)) throw bad();
  return raw.map((c): Cue => {
    if (
      !isRecord(c) ||
      (c.kind !== 'push' && c.kind !== 'swing') ||
      !isIndex(c.face, faceCount) ||
      !point(c.from) ||
      !point(c.to) ||
      (c.from[0] === c.to[0] && c.from[1] === c.to[1])
    ) {
      throw bad();
    }
    return { kind: c.kind, face: c.face, from: [c.from[0], c.from[1]], to: [c.to[0], c.to[1]] };
  });
}
```

`src/home/unfold.ts`: in the unfold step literal, after `cuts: []`, add `cues: []`.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run src/fold src/home`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/fold/types.ts src/fold/load-model.ts src/fold/load-model.test.ts src/home/unfold.ts src/home/unfold.test.ts
git commit -m "Loader: movement arrows (foldapp:cues)"
```

### Task 2: Cues in the builder

**Files:**
- Modify: `models/sequence.ts`, `models/build.ts`
- Test: `models/sequence.test.ts`

**Interfaces:**
- Consumes: `Cue` (Task 1), `inside` from `models/build.ts`.
- Produces: `export type CueSpec = { push: [Vec2, Vec2] } | { swing: [Vec2, Vec2] }` from `models/sequence.ts`; `FoldOptions.cues?: CueSpec[]`; `collapse` opts `cues?: CueSpec[]`; `SourceStep.cues?: { kind: 'push' | 'swing'; from: Vec2; to: Vec2 }[]`; frames gain `foldapp:cues`.

- [ ] **Step 1: Write the failing tests**

In `models/sequence.test.ts`, inside `describe('foldSequence', ...)` (add `inside` to the `./build` import):

```ts
  it('reads cues through the top layer under their anchor, and builds them on its face', () => {
    const s = foldSequence();
    // the left half over the right: at x > 0.5 the top layer is the flap, mirrored about x = 0.5
    s.fold('half', [0.5, 0], [0.5, 1], { valley: true, hold: [0.75, 0.5], ...text });
    s.fold('quarter', [1, 0.5], [0, 0.5], {
      valley: true,
      hold: [0.75, 0.75],
      ...text,
      // the push starts off the paper: it anchors on its head
      cues: [{ swing: [[0.7, 0.2], [0.7, 0.8]] }, { push: [[1.2, 0.3], [0.6, 0.3]] }]
    });
    const src = s.source({ ...entry, tags: [] });
    const round = (p: Vec2) => p.map((x) => +x.toFixed(6));
    expect(src.steps[1].cues?.map((c) => ({ ...c, from: round(c.from), to: round(c.to) }))).toEqual([
      { kind: 'swing', from: [0.3, 0.2], to: [0.3, 0.8] },
      { kind: 'push', from: [-0.2, 0.3], to: [0.4, 0.3] }
    ]);
    const fold = buildFold(src);
    const cues = fold.file_frames[1]['foldapp:cues'] as { face: number; from: Vec2; to: Vec2 }[];
    const poly = (f: number) => fold.faces_vertices[f].map((v) => fold.vertices_coords[v] as Vec2);
    expect(inside([0.3, 0.2], poly(cues[0].face))).toBe(true);
    expect(inside([0.4, 0.3], poly(cues[1].face))).toBe(true);
    expect(checkModel(loadModel(fold))).toEqual([]);
  });

  it('names a cue whose anchor is off the paper, and keeps cues through together', () => {
    const s = foldSequence();
    expect(() =>
      s.fold('a', [0.5, 0], [0.5, 1], { valley: true, ...text, cues: [{ swing: [[2, 2], [0.5, 0.5]] }] })
    ).toThrow("Step 1's swing cue starts off the paper.");
    expect(() =>
      s.fold('b', [0.5, 0], [0.5, 1], { valley: true, ...text, cues: [{ push: [[0.5, 0.5], [2, 2]] }] })
    ).toThrow("Step 1's push cue points off the paper.");
    const t = foldSequence();
    t.together(text, () => {
      t.fold('l', [0.25, 0], [0.25, 1], { valley: true, hold: [0.5, 0.5], ...text, cues: [{ swing: [[0.1, 0.5], [0.4, 0.5]] }] });
      t.fold('r', [0.75, 1], [0.75, 0], { valley: true, ...text, cues: [{ swing: [[0.9, 0.5], [0.6, 0.5]] }] });
    });
    expect(t.source({ ...entry, tags: [] }).steps[0].cues).toHaveLength(2);
  });
```

Also import the type: `import type { Vec2 } from '../src/fold/types';` (if not already imported).

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run models/sequence.test.ts -t "cue"`
Expected: FAIL — `cues` is `undefined` and nothing throws.

- [ ] **Step 3: Implement**

`models/build.ts`, in `SourceStep` after `cut`:

```ts
  /** Movement arrows, as flat-sheet points through the layer under each one's anchor (written by foldSequence). */
  cues?: { kind: 'push' | 'swing'; from: Vec2; to: Vec2 }[];
```

In `buildFold`'s frame map, after the `cut` computation:

```ts
    // each arrow on the face under its anchor: a push's head, a swing's tail
    const cues = (step.cues ?? []).map((c) => {
      const anchor = c.kind === 'push' ? c.to : c.from;
      const face = faces.findIndex((f) =>
        inside(
          anchor,
          f.map((v) => vertices[v])
        )
      );
      if (face === -1) throw new Error(`${src.id} step ${i + 1}'s ${c.kind} cue is off the paper.`);
      const r = (p: Vec2) => p.map((x) => +x.toFixed(6));
      return { kind: c.kind, face, from: r(c.from), to: r(c.to) };
    });
```

and in the returned frame object, after the `foldapp:cut` line:

```ts
      ...(cues.length ? { 'foldapp:cues': cues } : {}),
```

`models/sequence.ts`:

```ts
/** A book arrow in view coordinates: push (hollow, from p to the paper at q) or swing (a flap travels p → q). */
export type CueSpec = { push: [Vec2, Vec2] } | { swing: [Vec2, Vec2] };
```

next to `FoldOptions`, and in `FoldOptions`:

```ts
  /** Movement arrows for this step, drawn on the paper as it lies before it. */
  cues?: CueSpec[];
```

Inside `foldSequence`, after `relayer`:

```ts
  /** Cues as flat-sheet points through the top piece under each one's anchor, on the pieces before the step. */
  const cuesOf = (specs: CueSpec[] | undefined): SourceStep['cues'] =>
    specs?.map((spec) => {
      const [kind, [p, q]] = 'push' in spec ? (['push', spec.push] as const) : (['swing', spec.swing] as const);
      const anchor = kind === 'push' ? q : p;
      const piece = [...pieces].reverse().find((pc) =>
        inside(
          anchor,
          pc.outline.map((v) => apply(pc.toView, v))
        )
      );
      if (!piece) {
        throw new Error(`Step ${steps.length + 1}'s ${kind} cue ${kind === 'push' ? 'points' : 'starts'} off the paper.`);
      }
      const back = piece.toView.clone().invert();
      return { kind, from: apply(back, p), to: apply(back, q) };
    });
```

In `fold`, first line of its body: `const cues = cuesOf(opts.cues);` and add `...(cues ? { cues } : {})` to the object passed to `push(...)`.

In `push`, inside the gathering branch after `gathering.hold ??= step.hold;`:

```ts
    if (step.cues) gathering.cues = [...(gathering.cues ?? []), ...step.cues];
```

In `collapse`, widen its opts type to `Text & { hold: Vec2; cues?: CueSpec[] }`, compute `const cues = cuesOf(opts.cues);` before `pieces = relayer(...)`, and add `...(cues ? { cues } : {})` to its `steps.push`.

(`crease` calls `api.fold` with the same opts, so its cues come for free.)

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run models`
Expected: PASS (every committed model still builds as committed).

- [ ] **Step 5: Commit**

```bash
git add models/sequence.ts models/build.ts models/sequence.test.ts
git commit -m "Builder: movement arrows on fold, crease and collapse"
```

### Task 3: Arrow geometry and fade

**Files:**
- Create: `src/player/cues.ts`, `src/player/cues.test.ts`

**Interfaces:**
- Consumes: `Step.cues` (Task 1), `foldedPositions`, `LAYER_GAP` from `src/fold/fold.ts`.
- Produces: `cueSegments(model: Model, step: number): number[]` (x, y, z per point, two points per segment; `[]` when the step has no cues) and `cueOpacity(t: number): number`.

- [ ] **Step 1: Write the failing tests**

`src/player/cues.test.ts`:

```ts
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
const points = (flat: number[]): P[] => Array.from({ length: flat.length / 3 }, (_, i) => flat.slice(i * 3, i * 3 + 3) as P);
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
```

Before relying on the third test, confirm the fixture: `loadModel(slitFixture()).faces[0]` must include the vertex at (0.5, 0.5) between two others on y = 0.5. If it doesn't, pick the fixture face that has a mid-side corner and adjust the points to lie inside it.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/player/cues.test.ts`
Expected: FAIL — module `./cues` not found.

- [ ] **Step 3: Implement**

`src/player/cues.ts`:

```ts
import { foldedPositions, LAYER_GAP } from '../fold/fold';
import type { Cue, Model, Vec2, Vec3 } from '../fold/types';

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(...a));

/**
 * The map from a face's flat-sheet points to where they sit on `pose` (faces are rigid, so three corners fix
 * it), and the face's normal turned up (+z).
 */
function faceMap(model: Model, pose: Vec3[][], f: number): { at: (p: Vec2) => Vec3; up: Vec3 } {
  const flat = model.faces[f].map((v) => model.vertices[v]);
  const a = 0;
  // the corner farthest from the first, then the one farthest off that line: corners mid-side are collinear
  const b = flat.reduce((best, v, i) => (Math.hypot(v[0] - flat[a][0], v[1] - flat[a][1]) > Math.hypot(flat[best][0] - flat[a][0], flat[best][1] - flat[a][1]) ? i : best), 1);
  const off = (v: Vec2) => Math.abs((flat[b][0] - flat[a][0]) * (v[1] - flat[a][1]) - (flat[b][1] - flat[a][1]) * (v[0] - flat[a][0]));
  const c = flat.reduce((best, v, i) => (off(v) > off(flat[best]) ? i : best), 0);
  const [u, w] = [sub([...flat[b], 0], [...flat[a], 0]), sub([...flat[c], 0], [...flat[a], 0])];
  const det = u[0] * w[1] - u[1] * w[0];
  const [A, U, W] = [pose[f][a], sub(pose[f][b], pose[f][a]), sub(pose[f][c], pose[f][a])];
  const n = unit(cross(U, W));
  return {
    at: ([x, y]) => {
      const [dx, dy] = [x - flat[a][0], y - flat[a][1]];
      const s = (dx * w[1] - dy * w[0]) / det;
      const t = (u[0] * dy - u[1] * dx) / det;
      return add(A, add(scale(U, s), scale(W, t)));
    },
    up: n[2] < 0 ? scale(n, -1) : n
  };
}

/** One cue's line segments (two points each), lifted off its face. */
function cueLines(cue: Cue, map: ReturnType<typeof faceMap>): Vec3[] {
  const lift = scale(map.up, 3 * LAYER_GAP);
  const [from, to] = [add(map.at(cue.from), lift), add(map.at(cue.to), lift)];
  const length = Math.hypot(...sub(to, from));
  const along = unit(sub(to, from));
  if (cue.kind === 'push') {
    // a hollow arrow lying on the face: shaft, then head
    const side = unit(cross(map.up, along));
    const neck = add(from, scale(along, 0.65 * length));
    const corners = [
      add(from, scale(side, 0.09 * length)),
      add(neck, scale(side, 0.09 * length)),
      add(neck, scale(side, 0.225 * length)),
      to,
      add(neck, scale(side, -0.225 * length)),
      add(neck, scale(side, -0.09 * length)),
      add(from, scale(side, -0.09 * length))
    ];
    return corners.flatMap((v, i) => [v, corners[(i + 1) % corners.length]]);
  }
  // an arc rising off the paper, then a V head along its last tangent
  const control = add(scale(add(from, to), 0.5), scale(map.up, 0.35 * length));
  const arc = Array.from({ length: 17 }, (_, i) => {
    const t = i / 16;
    return add(add(scale(from, (1 - t) ** 2), scale(control, 2 * (1 - t) * t)), scale(to, t * t));
  });
  const back = unit(sub(control, to));
  const across = unit(sub(map.up, scale(back, dot(map.up, back))));
  const [c, s] = [Math.cos((25 * Math.PI) / 180), Math.sin((25 * Math.PI) / 180)];
  const head = [1, -1].map((k) => add(to, scale(add(scale(back, c), scale(across, k * s)), 0.18 * length)));
  return [...arc.slice(1).flatMap((v, i) => [arc[i], v]), to, head[0], to, head[1]];
}

/** Line segments (x, y, z per point, two points per segment) of `step`'s movement arrows, on its starting pose. */
export function cueSegments(model: Model, step: number): number[] {
  const cues = model.steps[step]?.cues ?? [];
  if (!step || !cues.length) return [];
  const pose = foldedPositions(model, step, 0);
  return cues.flatMap((cue) => cueLines(cue, faceMap(model, pose, cue.face)).flat());
}

/** The arrows' opacity at progress `t` through their step: full at the start, gone halfway. */
export const cueOpacity = (t: number) => Math.max(0, Math.min(1, 1 - (t - 0.1) / 0.4));
```

Note on the push test's width check: the head spans 0.45 × length across, and the test arrow lies along x, so its y extent is the head width. The swing's points: 16 arc segments (32 points) then two head strokes (4 points); point 31 is the arc's end.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run src/player/cues.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/player/cues.ts src/player/cues.test.ts
git commit -m "Player: movement arrow geometry and fade"
```

### Task 4: Draw the arrows

**Files:**
- Modify: `src/player/Paper.tsx`

**Interfaces:**
- Consumes: `cueSegments`, `cueOpacity` (Task 3).

- [ ] **Step 1: Wire them in**

Import: `import { cueOpacity, cueSegments } from './cues';`. Add a colour beside `HIGHLIGHT` if not reusing it (reuse `HIGHLIGHT`). In `Paper`:

```ts
  const cue = useRef<LineRef>(null);
  const cuePoints = useMemo(() => cueSegments(model, step), [model, step]);
```

In the `useLayoutEffect`, after `setSegments(cut.current, groups.cut);`:

```ts
    // arrows sit on the step's starting pose and fade as the paper moves off it
    const opacity = cueOpacity(t);
    setSegments(cue.current, opacity > 0 ? cuePoints : []);
    if (cue.current) cue.current.material.opacity = opacity;
```

and add `cuePoints` to its dependency list. After the cut `<Line>`:

```tsx
        <Line
          ref={cue}
          points={PLACEHOLDER}
          segments
          color={HIGHLIGHT}
          lineWidth={2.2}
          transparent
          renderOrder={3}
          depthTest={false}
          frustumCulled={false}
          visible={false}
        />
```

- [ ] **Step 2: Type check and test**

Run: `pnpm build && pnpm vitest run`
Expected: build and `tsc --noEmit` succeed; all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/player/Paper.tsx
git commit -m "Player: draw movement arrows on the paper"
```

### Task 5: The crane's reverse folds get arrows

**Files:**
- Modify: `models/src/crane.ts`; rebuild `public/models/crane.fold`

**Interfaces:**
- Consumes: `CueSpec` (Task 2), the crane's existing `turnFlap`, `mirror`, `base`, `B`, `neck`, `tail`, `tip`, `headAt`, `head`.

- [ ] **Step 1: Add the cues**

In `models/src/crane.ts`, import `type CueSpec` from `'../sequence'`, and after `mirror`:

```ts
/**
 * A book's arrows for a reverse fold along `line` through `at`, turning the flap whose tip is `tip`: a push at
 * the flap just past the line, coming in from `side` of it (1: its right looking from `at` to the tip, −1: its
 * left), and the tip's swing to where it lands.
 */
const reverseCues = (line: [At, At], at: At, tip: At, side: 1 | -1): CueSpec[] => {
  const [dx, dy] = [tip[0] - at[0], tip[1] - at[1]];
  const l = Math.hypot(dx, dy);
  const q: At = [at[0] + dx * 0.15, at[1] + dy * 0.15];
  const p: At = [q[0] + (side * 0.12 * dy) / l, q[1] - (side * 0.12 * dx) / l];
  const from: At = [tip[0] - dx * 0.05, tip[1] - dy * 0.05];
  return [{ push: [p, q] }, { swing: [from, mirror(from, line)] }];
};
```

Add to the three folds' options:
- neck: `cues: reverseCues(neck, base, B, -1),`
- tail: `cues: reverseCues(tail, base, B, 1),`
- head: `cues: reverseCues(head, headAt, tip, 1),`

- [ ] **Step 2: Rebuild and check what changed**

Run: `pnpm models && git status --short public/models`
Expected: only `public/models/crane.fold` changes. Then confirm it is only the new field:

```bash
python3 - <<'EOF'
import json, subprocess
old = json.loads(subprocess.check_output(['git', 'show', 'HEAD:public/models/crane.fold']))
new = json.load(open('public/models/crane.fold'))
assert {k: v for k, v in old.items() if k != 'file_frames'} == {k: v for k, v in new.items() if k != 'file_frames'}
for i, (a, b) in enumerate(zip(old['file_frames'], new['file_frames'])):
    if a != b:
        assert set(b) - set(a) == {'foldapp:cues'} and all(a[k] == b[k] for k in a), i
        print(i, len(b['foldapp:cues']), 'cues')
EOF
```

Expected: three frames (the neck, tail and head steps), 2 cues each.

- [ ] **Step 3: Look at it**

Start `pnpm dev`, open the crane, go to the neck step (the step before it, then *next*, so it plays from its start). Check: during the lead-in a hollow push arrow sits on the leg just below the fold line, and an arc runs from the leg's tip up to where the neck tip ends; they fade as the leg swings and are gone by mid-step; at the step's end pose (jump to it from the step menu) there are none. Repeat for the tail and the head. Take a screenshot of each at its start and show them to the user before going on: whether each push comes in from the right side of its flap is a judgement call (flip `side` if the user says so). Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add models/src/crane.ts public/models/crane.fold
git commit -m "Crane: movement arrows on its reverse folds"
```

### Task 6: Verify and open the PR

- [ ] **Step 1:** `pnpm vitest run && pnpm build && pnpm check` — all pass (the 2 Biome warnings already on main are fine); commit any formatting Biome applied.
- [ ] **Step 2:** `pnpm models && git status --short public/models` — no output.
- [ ] **Step 3:** `lsof -nP -iTCP:4173 -sTCP:LISTEN` shows nothing (stop a stale server only with the user's OK), then `pnpm test:e2e` — PASS; the port is free afterwards.
- [ ] **Step 4:** `graphify update .`
- [ ] **Step 5:** Push `feat/arrows`, open a draft PR against `main` ("Player: movement arrows on faked folds"), body: what the arrows are and when they show, the data field, the builder option, the crane's three steps, that only `crane.fold` changes (and that #445 also rebuilds it: whichever merges second reruns `pnpm models`), the screenshots. End with the Claude Code line. Then a ponytail review, apply what holds, mark ready.
