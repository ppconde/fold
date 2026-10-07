# Layer-order Milestone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paper never passes through paper. Folds reach their exact angles, each face is lifted by its place in a recorded stack (FOLD `faceOrders`), and a travelling flap clears the stack on its way. This unblocks Milestone 4 part 2.

**Architecture:**
- The loader reads FOLD `faceOrders` per step.
- The engine (`src/fold/fold.ts`):
  - drops the 178° clamp;
  - sorts each step's faces into a stack (`stackAt`);
  - lifts every face along its own normal by height × facing, blended with the fold;
  - shifts a travelling flap clear of the faces that stay put.
- The fold-sequence builder (`models/sequence.ts`) records the physical stack after every step, and `models/build.ts` writes it as `faceOrders`.
- `foldedPositions` keeps its signature, so the player and `checkModel` need no change. The existing crossing and flap-flip checks now enforce the order.

**Tech Stack:** TypeScript, three (Matrix4/Vector3), Vitest, Playwright for the visual check. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-07-layer-order-design.md` (approved).

**How the code steps work:** every code change below is a patch validated during planning, on a scratch copy of this branch. Each one ran green: 183 unit tests, typecheck and Biome, and all six launch models passed `checkModel`. Apply each patch from the repo root with the `git apply` heredoc shown. If a patch doesn't apply (the file moved on), make the same edit by hand. The patch is the reference.

## Global Constraints

- **FOLD `faceOrders` sign:** `[f, g, s]` with `s = +1` means f lies on the side **g's** normal points to, and `s = −1` the opposite side. `s = 0` (unknown) is dropped. This follows edemaine/fold `doc/spec.md`.
- **Constants:** `LAYER_GAP = 0.002` of the paper's side per layer. `LIFT_SPAN = 0.15`, the share of a step at each end in which a travelling flap rises off and settles back onto the stack.
- **Signatures:** `foldedPositions(model, step, t)`, `anglesAt` and `checkConsistency` keep their signatures. New exports: `LAYER_GAP` and `layerHeights(model, step): number[]`.
- **Files without `faceOrders`** still load, with every lift at 0. Contradictory orders throw a `RangeError` that names the step.
- **Generated files** (`public/models/<id>.fold`, `<id>.svg`, `models.json`) are rebuilt with `pnpm models` and never hand-edited. The two hand-written fixtures (`fold-in-half.fold`, `fold-in-quarters.fold`) are edited by hand (Task 2).
- **Style and process:**
  - Biome style: single quotes, no trailing commas, 120 columns. Run `pnpm check` before each commit.
  - No new dependencies.
  - Commits use conventional style, each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Branch:** `feat/layer-order`, which already holds the spec commits.

## Review Focus

1. **A stack that turns over keeps its inner order mid-fold.** The crossing check is blind here, because the faces share a crease. Pinned by the `stacked layers` test in Task 2.
2. **A turn-over carries the stack:** after turning, the top layer is underneath. Pinned by the `turns the stack with the paper` test in Task 2.
3. **A step that opens a stack part way** (the plane's wings) keeps the layers apart and never re-sorts tilted faces. Pinned by the `keeps the stack through a step that inherits its faceOrders` test in Task 2. During planning, that test failed without the rule.
4. **A file without `faceOrders`** (a future import) loads and folds without errors, with flat layers. Pinned by `is all zeros without faceOrders` (Task 2) and the loader tests (Task 1).
5. **Contradictory `faceOrders`** throw a `RangeError` naming the step instead of rendering nonsense. Pinned by `throws a RangeError for faceOrders that contradict each other` (Task 2).

---

### Task 1: The loader reads `faceOrders`

**Files:**
- Modify: `src/fold/types.ts`, `src/fold/load-model.ts`
- Test: `src/fold/load-model.test.ts`

**Interfaces:**
- Produces:
  - `type FaceOrder = [number, number, 1 | -1]`
  - `Step.faceOrders: FaceOrder[]`: the step's orders, or the previous step's when the frame has none; `[]` for step 0.
  - The same array object is inherited, so `steps[k].faceOrders === steps[k − 1].faceOrders` means "this step didn't restack". Task 2 relies on that.

- [ ] **Step 1: Write the failing tests.**

```bash
git apply <<'PATCH'
diff --git a/src/fold/load-model.test.ts b/src/fold/load-model.test.ts
index 89bf02c..dc86c0d 100644
--- a/src/fold/load-model.test.ts
+++ b/src/fold/load-model.test.ts
@@ -62,6 +62,19 @@ describe('loadModel', () => {
     expect(loadModel(json).vertices[1]).toEqual([1, 0]);
   });
 
+  it('reads faceOrders per step, keeps them for steps without any, and drops unknown (0) orders', () => {
+    const json = fixture('fold-in-quarters') as Json;
+    json.file_frames[0].faceOrders = [
+      [0, 1, 1],
+      [1, 2, 0]
+    ];
+    delete json.file_frames[1].faceOrders;
+    const model = loadModel(json);
+    expect(model.steps[0].faceOrders).toEqual([]);
+    expect(model.steps[1].faceOrders).toEqual([[0, 1, 1]]);
+    expect(model.steps[2].faceOrders).toEqual([[0, 1, 1]]);
+  });
+
   const broken: [string, (j: Json) => unknown, RegExp][] = [
     ['not an object', () => 42, /not a FOLD object/],
     ['missing faces', (j) => ({ ...j, faces_vertices: undefined }), /faces_vertices/],
@@ -153,6 +166,26 @@ describe('loadModel', () => {
       (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], 'foldapp:rotation': [0, 180] }] }),
       /Step 1 rotation/
     ],
+    [
+      'faceOrders that is not a list of triples',
+      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], faceOrders: [[0, 1]] }] }),
+      /Step 1 faceOrders needs \[f, g, s\] triples with s of -1, 0 or 1/
+    ],
+    [
+      'faceOrders with a bad sign',
+      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], faceOrders: [[0, 1, 2]] }] }),
+      /Step 1 faceOrders needs \[f, g, s\] triples with s of -1, 0 or 1/
+    ],
+    [
+      'faceOrders naming a missing face',
+      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], faceOrders: [[0, 9, 1]] }] }),
+      /Step 1 orders face 9, which does not exist/
+    ],
+    [
+      'faceOrders ordering a face against itself',
+      (j) => ({ ...j, file_frames: [{ ...j.file_frames[0], faceOrders: [[1, 1, 1]] }] }),
+      /Step 1 orders face 1 against itself/
+    ],
     [
       'paper in pieces',
       (j) => ({
PATCH
```

  Run `pnpm vitest run src/fold/load-model`. Expected: 5 failures (`faceOrders` is not read yet).

- [ ] **Step 2: Implement.** The new type:

```bash
git apply <<'PATCH'
diff --git a/src/fold/types.ts b/src/fold/types.ts
index f6894e0..aae492e 100644
--- a/src/fold/types.ts
+++ b/src/fold/types.ts
@@ -3,6 +3,9 @@ export type Vec3 = [number, number, number];
 export type Edge = [number, number];
 export type Assignment = 'M' | 'V' | 'B' | 'F' | 'U';
 
+/** FOLD faceOrders triple: face f lies above (1) or below (-1) face g, along g's normal. */
+export type FaceOrder = [number, number, 1 | -1];
+
 export type Step = {
   /** Fold angle of every edge at the end of the step, in degrees (+valley, −mountain). */
   angles: number[];
@@ -11,6 +14,8 @@ export type Step = {
   fixedFace: number;
   /** Whole-model rotation at the end of the step, Euler XYZ in degrees. */
   rotation: Vec3;
+  /** How overlapping faces stack at the end of the step (FOLD faceOrders, unknown orders dropped). */
+  faceOrders: FaceOrder[];
 };
 
 export type Model = {
PATCH
```

  The loader:

```bash
git apply <<'PATCH'
diff --git a/src/fold/load-model.ts b/src/fold/load-model.ts
index 5013822..d8f25c8 100644
--- a/src/fold/load-model.ts
+++ b/src/fold/load-model.ts
@@ -1,4 +1,4 @@
-import type { Assignment, Edge, Model, Step, Vec2, Vec3 } from './types';
+import type { Assignment, Edge, FaceOrder, Model, Step, Vec2, Vec3 } from './types';
 
 export class FoldError extends Error {
   override name = 'FoldError';
@@ -93,7 +93,13 @@ export function loadModel(json: unknown): Model {
   ).i;
 
   const steps: Step[] = [
-    { angles: edges.map(() => 0), instruction: { en: '' }, fixedFace: nearestToCenter, rotation: [0, 0, 0] }
+    {
+      angles: edges.map(() => 0),
+      instruction: { en: '' },
+      fixedFace: nearestToCenter,
+      rotation: [0, 0, 0],
+      faceOrders: []
+    }
   ];
   frames.forEach((frame, i) => {
     const n = i + 1;
@@ -130,7 +136,10 @@ export function loadModel(json: unknown): Model {
       throw new FoldError(`Step ${n} rotation must be three numbers.`);
     }
 
-    steps.push({ angles: [...angles], instruction, fixedFace, rotation: [...rotation] as Vec3 });
+    const faceOrders =
+      frame.faceOrders === undefined ? prev.faceOrders : readFaceOrders(frame.faceOrders, n, faces.length);
+
+    steps.push({ angles: [...angles], instruction, fixedFace, rotation: [...rotation] as Vec3, faceOrders });
   });
 
   return deepFreeze({
@@ -148,6 +157,20 @@ export function loadModel(json: unknown): Model {
   });
 }
 
+function readFaceOrders(raw: unknown, n: number, faceCount: number): FaceOrder[] {
+  const bad = () => new FoldError(`Step ${n} faceOrders needs [f, g, s] triples with s of -1, 0 or 1.`);
+  if (!Array.isArray(raw)) throw bad();
+  return raw.flatMap((order): FaceOrder[] => {
+    if (!Array.isArray(order) || order.length !== 3 || ![-1, 0, 1].includes(order[2])) throw bad();
+    const [f, g, s] = order;
+    for (const face of [f, g]) {
+      if (!isIndex(face, faceCount)) throw new FoldError(`Step ${n} orders face ${face}, which does not exist.`);
+    }
+    if (f === g) throw new FoldError(`Step ${n} orders face ${f} against itself.`);
+    return s === 0 ? [] : [[f, g, s]];
+  });
+}
+
 function deepFreeze<T>(value: T): T {
   if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
     Object.freeze(value);
PATCH
```

- [ ] **Step 3: Run the tests.** Run `pnpm vitest run` and `pnpm exec tsc --noEmit`. Expected: all pass, and the typecheck is clean.

- [ ] **Step 4: Commit.** `pnpm check`, then `git add src/fold && git commit -m "feat(fold): read FOLD faceOrders per step"` (with the trailer).

### Task 2: Exact folds, the stack, the lift and the clearance

**Files:**
- Modify: `src/fold/fold.ts`, `public/models/fold-in-half.fold`, `public/models/fold-in-quarters.fold`
- Test: `src/fold/fold.test.ts`, `src/player/paper-geometry.test.ts`, `models/check.test.ts`
- Regenerated: `public/models/dog-face.svg`, `public/models/tulip.svg`, and their `.fold` files if the output changes

**Interfaces:**
- Consumes: `Step.faceOrders` (Task 1).
- Produces:
  - `LAYER_GAP` (exported).
  - `layerHeights(model, step): number[]`: each face's place in the stack at the end of `step` (0 = bottom, along +z before the whole-model turn).
  - `foldedPositions(model, step, t)` with the lift and the clearance applied.

What changes in `fold.ts`:
- **Exact angles:** `MAX_RENDER_ANGLE` and `clampAngle` go.
- **`stackAt(model, step)`** computes `{ heights, up }` and caches it per model:
  - `up[f]` is the z-sign of face f's normal before the turn.
  - Each triple `[f, g, s]` puts f over g when `s × up[g] > 0`.
  - A face's height is one above the highest face it covers; a cycle throws a `RangeError`.
  - A step that inherits its `faceOrders` (the same array) reuses the previous stack.
- **`travel(model, step)`** finds the faces whose pose changes in the step, and the clearance in layers:
  - positive when the moving faces land over the stack, negative when they land under it;
  - 0 when the stacking doesn't change, or when nothing (or everything) moves.
- **`foldedPositions`** places each face at `LAYER_GAP × height × up` along its own normal, blended with the fold's eased progress. It shifts the moving faces by `LAYER_GAP × clearance × smoothstep(t/0.15) × smoothstep((1−t)/0.15)` along +z. Both happen before the whole-model turn.

- [ ] **Step 1: Give the fixtures their stacks.** fold-in-half: the left half (face 0) lies over the right (face 1). fold-in-quarters ends with faces 1, 0, 3, 2 from bottom to top, with faces 0 and 2 front-down.

```bash
git apply <<'PATCH'
diff --git a/public/models/fold-in-half.fold b/public/models/fold-in-half.fold
index 5b3f15e..190afa1 100644
--- a/public/models/fold-in-half.fold
+++ b/public/models/fold-in-half.fold
@@ -14,6 +14,7 @@
       "frame_inherit": true,
       "frame_parent": 0,
       "edges_foldAngle": [0, 0, 0, 0, 0, 0, 180],
+      "faceOrders": [[0, 1, 1]],
       "foldapp:instruction": { "en": "Fold the left half over onto the right half.", "pt": "Dobra a metade esquerda sobre a metade direita." },
       "foldapp:fixedFace": 1
     }
diff --git a/public/models/fold-in-quarters.fold b/public/models/fold-in-quarters.fold
index bb7f877..80de410 100644
--- a/public/models/fold-in-quarters.fold
+++ b/public/models/fold-in-quarters.fold
@@ -17,6 +17,7 @@
       "frame_inherit": true,
       "frame_parent": 0,
       "edges_foldAngle": [0, 0, 0, 0, 0, 0, 0, 0, 180, 180, 0, 0],
+      "faceOrders": [[0, 1, 1], [3, 2, 1]],
       "foldapp:instruction": { "en": "Fold the left half over onto the right half.", "pt": "Dobra a metade esquerda sobre a metade direita." },
       "foldapp:fixedFace": 1
     },
@@ -24,6 +25,7 @@
       "frame_inherit": true,
       "frame_parent": 0,
       "edges_foldAngle": [0, 0, 0, 0, 0, 0, 0, 0, 180, 180, -180, 180],
+      "faceOrders": [[0, 1, 1], [3, 1, 1], [2, 1, 1], [3, 0, -1], [2, 0, -1], [2, 3, 1]],
       "foldapp:instruction": { "en": "Fold the top half down onto the bottom half.", "pt": "Dobra a metade de cima para baixo, sobre a metade de baixo." }
     }
   ]
PATCH
```

- [ ] **Step 2: Write the failing tests.**
  - The engine tests replace the 178° assertions with exact angles and lift. They add `layer heights` tests (follows `faceOrders`, the sign is read along g's normal, zero without orders, keeps the stack through an inherited step, throws on contradictions, stacks one gap apart at rest, carries a travelling flap one layer clear, turns with the paper). The `it.todo` for disconnected stacks moves to Task 3's builder tests.

```bash
git apply <<'PATCH'
diff --git a/src/fold/fold.test.ts b/src/fold/fold.test.ts
index 1ba4146..8508068 100644
--- a/src/fold/fold.test.ts
+++ b/src/fold/fold.test.ts
@@ -1,7 +1,7 @@
 import { Euler, Quaternion, Vector3 } from 'three';
 import { describe, expect, it } from 'vitest';
 import { fixture } from './fixtures';
-import { anglesAt, checkConsistency, foldedPositions } from './fold';
+import { anglesAt, checkConsistency, foldedPositions, LAYER_GAP, layerHeights } from './fold';
 import { loadModel } from './load-model';
 import type { Model, Step, Vec3 } from './types';
 
@@ -36,15 +36,13 @@ describe('foldedPositions', () => {
   });
 
   it('stands the moving half upright at t = 0.5, toward +z for a valley fold', () => {
-    expectClose(foldedPositions(half(), 1, 0.5)[0][0], [0.5, 0, 0.5]);
+    // half way to its new layer along its own normal (−x at 90°), and carried one layer clear of the stack
+    expectClose(foldedPositions(half(), 1, 0.5)[0][0], [0.5 - LAYER_GAP / 2, 0, 0.5 + LAYER_GAP], 9);
   });
 
-  it('lays the half on top at t = 1, stopping just short of flat (178°)', () => {
-    const [x, y, z] = foldedPositions(half(), 1, 1)[0][0];
-    expect(x).toBeCloseTo(0.5 + 0.5 * Math.cos((2 * Math.PI) / 180), 4);
-    expect(y).toBeCloseTo(0);
-    expect(z).toBeGreaterThan(0);
-    expect(z).toBeCloseTo(0.5 * Math.sin((2 * Math.PI) / 180), 4);
+  it('lays the half exactly flat on top at t = 1, one layer gap above the held half', () => {
+    expectClose(foldedPositions(half(), 1, 1)[0][0], [1, 0, LAYER_GAP], 9);
+    expectClose(foldedPositions(half(), 1, 1)[1][0], [0.5, 0, 0], 9);
   });
 
   it('never moves the fixed face', () => {
@@ -85,7 +83,7 @@ describe('foldedPositions', () => {
 
   it('turns the model over with a rotation step, and keeps it turned in later steps', () => {
     const model = withSteps(half(), (s) => {
-      const turned = { ...s[1], angles: s[1].angles.map(() => 0), rotation: [0, 180, 0] as Vec3 };
+      const turned = { ...s[1], angles: s[1].angles.map(() => 0), rotation: [0, 180, 0] as Vec3, faceOrders: [] };
       return [s[0], turned, { ...turned, instruction: { en: 'Look at it.' } }];
     });
     expectClose(foldedPositions(model, 1, 1)[0][0], [1, 0, 0]);
@@ -350,27 +348,24 @@ describe('creases meeting at a corner', () => {
 });
 
 describe('stacked layers', () => {
-  // A zero-thickness stack folded about one crease must keep its layer order: hinging each layer
-  // on its own copy of the crease made them coplanar at 90° and swap sides (z-fighting mid-fold).
+  // A stack folded about one crease must keep its layer order all through the fold, not only at rest.
   it('keeps the step 1 flap on the same side of the layer under it all through step 2', () => {
     const model = quarters();
     for (const t of [0, 0.25, 0.5, 0.75, 1]) {
       const [, a, b, c] = foldedPositions(model, 2, t)[2];
       const n = new Vector3(...b).sub(new Vector3(...a)).cross(new Vector3(...c).sub(new Vector3(...a)));
       const far = foldedPositions(model, 2, t)[3][0];
-      expect(n.normalize().dot(new Vector3(...far).sub(new Vector3(...a)))).toBeGreaterThan(0.01);
+      expect(n.normalize().dot(new Vector3(...far).sub(new Vector3(...a)))).toBeGreaterThan(LAYER_GAP / 2);
     }
   });
-
-  // Known limit: the two tips share no crease the step leaves alone, so no spanning tree joins them; the M3 layer-order solver must.
-  it.todo('a stack whose pieces share no unmoved crease (fold in half, then fold the free corner) turns as one piece');
+  // Two tips that share no unmoved crease (fold in half, then fold the free corner) are covered in
+  // models/sequence.test.ts, where checkModel proves they no longer pass through each other.
 });
 
-describe('seam gap from the 178° clamp', () => {
-  // Regression guard: copies of the same vertex on different faces may drift apart
-  // mid-step because angles are clamped. A rigidly turning stack opens the inner crease by two
-  // wedges: today's maximum is ~0.035; fail if it grows. This only covers fold-in-quarters; see the 3-column guard below.
-  it('stays under 4% of the paper while folding through two layers', () => {
+describe('seam between the layers of a stack', () => {
+  // Folds reach their exact angles, so copies of a vertex only part by the layer lift, never by a gap:
+  // at most both copies' lifts (up to 3 layers each), along two different normals mid-fold.
+  it('stays within the stack thickness while folding through two layers', () => {
     const model = quarters();
     let worst = 0;
     for (const t of [0.25, 0.5, 0.75, 1]) {
@@ -385,7 +380,7 @@ describe('seam gap from the 178° clamp', () => {
         for (const p of pts) worst = Math.max(worst, Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1], p[2] - pts[0][2]));
       }
     }
-    expect(worst).toBeLessThan(0.04);
+    expect(worst).toBeLessThanOrEqual(6 * LAYER_GAP + 1e-9);
   });
 });
 
@@ -443,9 +438,8 @@ describe('several turns', () => {
   });
 });
 
-describe('at-rest seam gap on a 3-column model', () => {
-  // Known clamp-wedge artifact: the seam grows with distance from the stack (~0.047 on 3 panels, ~0.052 on 4).
-  // Awaiting the M3 layer-order solver; this only guards against it getting worse.
+describe('seam on a 3-column model without faceOrders', () => {
+  // The 178° clamp used to open this seam by up to 0.0465; exact angles close it.
   const grid3 = () => {
     const nx = 3;
     const verts: number[][] = [];
@@ -486,7 +480,7 @@ describe('at-rest seam gap on a 3-column model', () => {
     });
   };
 
-  it('does not grow beyond the measured 0.033 (t=0.5) and 0.0465 (t=1)', () => {
+  it('closes completely mid-step and at rest', () => {
     const model = grid3();
     const worstAt = (t: number) => {
       const F = foldedPositions(model, 2, t);
@@ -501,7 +495,75 @@ describe('at-rest seam gap on a 3-column model', () => {
         for (const p of pts) worst = Math.max(worst, Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1], p[2] - pts[0][2]));
       return worst;
     };
-    expect(worstAt(0.5)).toBeLessThan(0.033 * 1.1);
-    expect(worstAt(1)).toBeLessThan(0.0465 * 1.1);
+    expect(worstAt(0.5)).toBeLessThan(1e-9);
+    expect(worstAt(1)).toBeLessThan(1e-9);
+  });
+});
+
+describe('layer heights', () => {
+  /** fold-in-quarters with step 2's faceOrders replaced, its angles unchanged. */
+  const reordered = (faceOrders: number[][]) => {
+    const json = fixture('fold-in-quarters') as { file_frames: Record<string, unknown>[] };
+    json.file_frames[1].faceOrders = faceOrders;
+    return loadModel(json);
+  };
+
+  it('follows faceOrders through each step', () => {
+    expect(layerHeights(quarters(), 0)).toEqual([0, 0, 0, 0]);
+    expect(layerHeights(quarters(), 1)).toEqual([1, 0, 0, 1]);
+    expect(layerHeights(quarters(), 2)).toEqual([1, 0, 3, 2]);
+  });
+
+  it('reads s along the normal of g, so a face lying front-down flips it', () => {
+    // at step 2 face 0 lies front-down: [3, 0, -1] puts face 3 above it
+    expect(layerHeights(quarters(), 2)[3]).toBeGreaterThan(layerHeights(quarters(), 2)[0]);
+  });
+
+  it('is all zeros without faceOrders', () => {
+    const json = fixture('fold-in-quarters') as { file_frames: Record<string, unknown>[] };
+    for (const frame of json.file_frames) delete frame.faceOrders;
+    expect(layerHeights(loadModel(json), 2)).toEqual([0, 0, 0, 0]);
+  });
+
+  it('keeps the stack through a step that inherits its faceOrders, even with faces standing on edge', () => {
+    // a third step opens the second fold to 90°: the faces stand up, but nothing restacks
+    const model = withSteps(quarters(), (steps) => [
+      ...steps,
+      { ...steps[2], angles: steps[2].angles.map((a, e) => (e === 10 || e === 11 ? a / 2 : a)) }
+    ]);
+    expect(layerHeights(model, 3)).toEqual(layerHeights(model, 2));
+  });
+
+  it('throws a RangeError for faceOrders that contradict each other', () => {
+    expect(() =>
+      layerHeights(
+        reordered([
+          [0, 1, 1],
+          [1, 0, -1]
+        ]),
+        2
+      )
+    ).toThrow(RangeError);
+  });
+
+  it('stacks the layers one gap apart at rest', () => {
+    const faces = foldedPositions(quarters(), 2, 1);
+    layerHeights(quarters(), 2).forEach((h, f) => {
+      for (const [, , z] of faces[f]) expect(z).toBeCloseTo(h * LAYER_GAP, 9);
+    });
+  });
+
+  it('carries a travelling flap one layer clear of the paper it passes, and sets it down exactly', () => {
+    // the hinge corner of fold-in-half's moving half
+    const hinge = (t: number) => foldedPositions(half(), 1, t)[0][1];
+    expectClose(hinge(0), [0.5, 0, 0], 9);
+    expectClose(hinge(0.5), [0.5 - LAYER_GAP / 2, 0, LAYER_GAP], 9);
+    expectClose(hinge(1), [0.5, 0, LAYER_GAP], 9);
+  });
+
+  it('turns the stack with the paper: after a turn-over the top layer is at the bottom', () => {
+    const model = withSteps(half(), (steps) => [...steps, { ...steps[1], rotation: [0, 180, 0] }]);
+    const faces = foldedPositions(model, 2, 1);
+    expect(faces[0][0][2]).toBeLessThan(faces[1][0][2]);
   });
 });
PATCH
```

  - The active crease now sits within one layer of the hinge:

```bash
git apply <<'PATCH'
diff --git a/src/player/paper-geometry.test.ts b/src/player/paper-geometry.test.ts
index c50b4be..b90c3ab 100644
--- a/src/player/paper-geometry.test.ts
+++ b/src/player/paper-geometry.test.ts
@@ -1,6 +1,6 @@
 import { describe, expect, it } from 'vitest';
 import { fixture } from '../fold/fixtures';
-import { foldedPositions } from '../fold/fold';
+import { foldedPositions, LAYER_GAP } from '../fold/fold';
 import { loadModel } from '../fold/load-model';
 import { endCentre, fillTriangles, fillUVs, lineGroups, paperExtent, triangleCount } from './paper-geometry';
 
@@ -55,8 +55,9 @@ describe('lineGroups', () => {
     const g = lineGroups(model, foldedPositions(model, 1, 0.5), 1, 0.5);
     for (let i = 0; i < g.active.length; i += 3) {
       const [x, y, z] = g.active.slice(i, i + 3);
-      expect(x).toBeCloseTo(0.5, 9);
-      expect(z).toBeCloseTo(0, 9);
+      // on the hinge, give or take the moving half's one-layer lift
+      expect(Math.abs(x - 0.5)).toBeLessThanOrEqual(LAYER_GAP + 1e-9);
+      expect(Math.abs(z)).toBeLessThanOrEqual(LAYER_GAP + 1e-9);
       expect([0, 1]).toContain(Math.round(y * 1e9) / 1e9);
     }
   });
PATCH
```

  - In `models/check.test.ts`, the at-rest spread is now the layer lift, not a gap. The crossing fixture stops at 178° explicitly, so it keeps its wedge.

```bash
git apply <<'PATCH'
diff --git a/models/check.test.ts b/models/check.test.ts
index e8f6b8c..8ae1972 100644
--- a/models/check.test.ts
+++ b/models/check.test.ts
@@ -1,5 +1,6 @@
 import { describe, expect, it } from 'vitest';
 import { fixture } from '../src/fold/fixtures';
+import { LAYER_GAP } from '../src/fold/fold';
 import { loadModel } from '../src/fold/load-model';
 import { buildFold } from './build';
 import { checkModel, crossings, flapFlips, spread } from './check';
@@ -25,10 +26,10 @@ describe('checkModel', () => {
 });
 
 describe('spread', () => {
-  it('is zero on the flat sheet and small but non-zero at rest after a two-layer fold', () => {
+  it('is zero on the flat sheet and only the layer lift at rest after a two-layer fold', () => {
     expect(spread(quarters(), 1, 0)).toBe(0);
-    expect(spread(quarters(), 2, 1)).toBeGreaterThan(0.01);
-    expect(spread(quarters(), 2, 1)).toBeLessThan(0.06);
+    expect(spread(quarters(), 2, 1)).toBeGreaterThan(0);
+    expect(spread(quarters(), 2, 1)).toBeLessThanOrEqual(6 * LAYER_GAP + 1e-9);
   });
 });
 
@@ -38,7 +39,8 @@ describe('crossings', () => {
   });
 
   it('finds two flaps folded through each other', () => {
-    // a 3-panel strip whose outer panels both fold valley onto the narrower middle one
+    // a 3-panel strip whose outer panels both fold valley onto the narrower middle one, stopping at 178°
+    // without faceOrders: each flap rests on its own wedge, so they cut through each other
     const strip = loadModel({
       file_spec: 1.2,
       vertices_coords: [
@@ -71,7 +73,7 @@ describe('crossings', () => {
       ],
       file_frames: [
         {
-          edges_foldAngle: [0, 0, 0, 0, 0, 0, 0, 0, 180, 180],
+          edges_foldAngle: [0, 0, 0, 0, 0, 0, 0, 0, 178, 178],
           'foldapp:instruction': 'Both flaps in.',
           'foldapp:fixedFace': 1
         }
PATCH
```

  Run `pnpm vitest run`. Expected: failures in `fold.test.ts`, `paper-geometry.test.ts` and `check.test.ts`, because `LAYER_GAP` and `layerHeights` don't exist yet. The suite may fail to import until Step 3.

- [ ] **Step 3: Implement the engine.**

```bash
git apply <<'PATCH'
diff --git a/src/fold/fold.ts b/src/fold/fold.ts
index 2797478..0f08929 100644
--- a/src/fold/fold.ts
+++ b/src/fold/fold.ts
@@ -2,13 +2,15 @@ import { Box3, Euler, Matrix4, Quaternion, Vector3 } from 'three';
 import { assertStep } from './assert-step';
 import type { Model, Vec3 } from './types';
 
-export const MAX_RENDER_ANGLE = 178;
 const DEG = Math.PI / 180;
 const EPSILON = 1e-6;
+/** Rise per layer of a stack, as a fraction of the paper's side. */
+export const LAYER_GAP = 0.002;
+/** Share of a step at each end in which a travelling flap rises off, and settles back onto, the stack. */
+const LIFT_SPAN = 0.15;
 
 const ease = (t: number) => t * t * (3 - 2 * t);
 const progress = (t: number) => ease(Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0);
-const clampAngle = (a: number) => Math.max(-MAX_RENDER_ANGLE, Math.min(MAX_RENDER_ANGLE, a));
 
 /** Rotation of face `g` about edge `e` by `angle` degrees, in flat-paper coordinates. */
 function hinge(model: Model, e: number, g: number, angle: number): Matrix4 {
@@ -46,8 +48,7 @@ function tree(model: Model, step: number): Tree {
     trees.set(model, list);
   }
   if (list[step]) return list[step];
-  const moves = (k: number, e: number) =>
-    k > 0 && clampAngle(model.steps[k - 1].angles[e]) !== clampAngle(model.steps[k].angles[e]);
+  const moves = (k: number, e: number) => k > 0 && model.steps[k - 1].angles[e] !== model.steps[k].angles[e];
   // a step that moves no crease (a turn, a new held face) keeps the previous tree, so it joins exactly
   let from = step;
   while (from > 0 && !list[from] && model.steps[from].angles.every((_, e) => !moves(from, e))) from--;
@@ -99,7 +100,7 @@ function anchorFor(model: Model, step: number): Matrix4 {
     anchors.set(model, list);
   }
   for (let k = list.length - 1; k < step; k++) {
-    const T = rootTransforms(model, model.steps[k].angles.map(clampAngle), k);
+    const T = rootTransforms(model, model.steps[k].angles, k);
     list[k + 1] = list[k]
       .clone()
       .multiply(T[model.steps[k].fixedFace].clone().invert())
@@ -112,9 +113,9 @@ const corrections = new WeakMap<Model, (Matrix4[] | null)[]>();
 
 /**
  * Per face, `C_f = R_f⁻¹ · Q_f`: the start-of-step pose under the previous step's tree (Q) relative to
- * this step's tree (R), both taken relative to this step's fixed face at the previous step's clamped angles.
- * Changing the tree across a non-collinear vertex leaves the clamped cycles open, so the two trees place
- * faces up to ~0.035 apart. Fading C from full at s = 0 to identity at s = 1 makes each step start
+ * this step's tree (R), both taken relative to this step's fixed face at the previous step's angles.
+ * Changing the tree across a non-collinear vertex can leave a partly folded cycle open, so the two trees
+ * place faces apart. Fading C from full at s = 0 to identity at s = 1 makes each step start
  * exactly where the last one ended and still end at pure T_k. Null when the trees match (no cost).
  */
 function treeChange(model: Model, step: number): Matrix4[] | null {
@@ -128,7 +129,7 @@ function treeChange(model: Model, step: number): Matrix4[] | null {
   const before = tree(model, step - 1).parentEdge;
   let c: Matrix4[] | null = null;
   if (now.some((e, g) => e !== before[g])) {
-    const angles = model.steps[step - 1].angles.map(clampAngle);
+    const angles = model.steps[step - 1].angles;
     const fixed = model.steps[step].fixedFace;
     const R = rootTransforms(model, angles, step);
     const Q = rootTransforms(model, angles, step - 1);
@@ -162,9 +163,9 @@ const rotations = new WeakMap<Model, Matrix4[]>();
 
 const toQuaternion = (r: Vec3) => new Quaternion().setFromEuler(new Euler(r[0] * DEG, r[1] * DEG, r[2] * DEG));
 
-/** Unrotated pose of every face at the start of `step` (clamped angles, anchored). */
+/** Unrotated pose of every face at the start of `step` (anchored, no layer lift). */
 function startPose(model: Model, step: number): Matrix4[] {
-  const T = rootTransforms(model, model.steps[step - 1].angles.map(clampAngle), step);
+  const T = rootTransforms(model, model.steps[step - 1].angles, step);
   const base = anchorFor(model, step).clone().multiply(T[model.steps[step].fixedFace].clone().invert());
   const C = treeChange(model, step);
   return T.map((m, f) =>
@@ -217,26 +218,138 @@ function rotationAfter(model: Model, step: number): Matrix4 {
   return list[step];
 }
 
+type Layers = { heights: number[]; up: number[] };
+const layers = new WeakMap<Model, Layers[]>();
+
+/**
+ * The stack at the end of `step`, before the whole-model turn. `heights[f]` is face f's place in its stack
+ * (0 = bottom, along +z); `up[f]` is +1 when its front faces +z, −1 when it faces −z, 0 when it stands on edge.
+ * From the step's faceOrders: [f, g, s] puts f on the side of g's normal (s = 1) or against it (s = −1);
+ * a face sits one above the highest face it must cover. Contradictory orders throw a RangeError.
+ */
+function stackAt(model: Model, step: number): Layers {
+  let list = layers.get(model);
+  if (!list) {
+    list = [];
+    layers.set(model, list);
+  }
+  if (list[step]) return list[step];
+  // a step that inherits its faceOrders (a turn, or opening out) keeps the stack it was given
+  if (step > 1 && model.steps[step].faceOrders === model.steps[step - 1].faceOrders) {
+    list[step] = stackAt(model, step - 1);
+    return list[step];
+  }
+  let up = model.faces.map(() => 1);
+  const below = model.faces.map((): number[] => []);
+  if (step > 0) {
+    const T = rootTransforms(model, model.steps[step].angles, step);
+    const base = anchorFor(model, step).clone().multiply(T[model.steps[step].fixedFace].clone().invert());
+    up = T.map((m) => Math.sign(Math.round(base.clone().multiply(m).elements[10] * 1e6)));
+    for (const [f, g, s] of model.steps[step].faceOrders) {
+      const side = s * up[g];
+      if (side > 0) below[f].push(g);
+      if (side < 0) below[g].push(f);
+    }
+  }
+  const heights: number[] = [];
+  const visiting = new Set<number>();
+  const visit = (f: number): number => {
+    if (heights[f] !== undefined) return heights[f];
+    if (visiting.has(f)) throw new RangeError(`Step ${step} faceOrders contradict each other at face ${f}.`);
+    visiting.add(f);
+    heights[f] = Math.max(0, ...below[f].map((g) => visit(g) + 1));
+    return heights[f];
+  };
+  model.faces.forEach((_, f) => {
+    visit(f);
+  });
+  list[step] = { heights, up };
+  return list[step];
+}
+
+/** Each face's place in the stack at the end of `step` (0 = bottom), along +z before the whole-model turn. */
+export function layerHeights(model: Model, step: number): number[] {
+  assertStep(model, step);
+  return stackAt(model, step).heights;
+}
+
 /** Corners of every face (in `model.faces` order) at progress `t` through `step`. */
 export function foldedPositions(model: Model, step: number, t: number): Vec3[][] {
   assertStep(model, step);
   if (step === 0) return model.faces.map((f) => f.map((v): Vec3 => [...model.vertices[v], 0]));
 
   const cur = model.steps[step];
-  const angles = anglesAt(model, step, t).map(clampAngle);
+  const angles = anglesAt(model, step, t);
   const T = rootTransforms(model, angles, step);
   const s = progress(t);
-  const world = stepRotation(model, step, s)
-    .multiply(anchorFor(model, step))
-    .multiply(T[cur.fixedFace].clone().invert());
+  const turn = stepRotation(model, step, s);
+  const pose = anchorFor(model, step).clone().multiply(T[cur.fixedFace].clone().invert());
+  // Each face is lifted along its own normal by height × facing, blended with the fold itself: a stack that
+  // turns over keeps its inner order and ends at exactly its new heights, and stacks carried by a turn or an
+  // opening fold stay apart. While a flap travels, the moving faces also shift together, straight up or down,
+  // to pass the paper that stays put, then settle.
+  const from = stackAt(model, step - 1);
+  const to = stackAt(model, step);
+  const { moving, clearance } = travel(model, step);
+  const rise = clearance * progress(t / LIFT_SPAN) * progress((1 - t) / LIFT_SPAN);
 
   const C = treeChange(model, step);
   const point = new Vector3();
   return model.faces.map((face, f) => {
-    const m = world.clone().multiply(T[f]);
+    const m = pose.clone().multiply(T[f]);
     if (C) m.multiply(fade(C[f], s));
-    return face.map((v) => point.set(model.vertices[v][0], model.vertices[v][1], 0).applyMatrix4(m).toArray() as Vec3);
+    const a = from.heights[f] * from.up[f];
+    const lift = LAYER_GAP * (a + (to.heights[f] * to.up[f] - a) * s);
+    const shift = moving[f] ? LAYER_GAP * rise : 0;
+    return face.map((v) => {
+      point.set(model.vertices[v][0], model.vertices[v][1], lift).applyMatrix4(m);
+      point.z += shift;
+      return point.applyMatrix4(turn).toArray() as Vec3;
+    });
+  });
+}
+
+const travels = new WeakMap<Model, { moving: boolean[]; clearance: number }[]>();
+
+/**
+ * Which faces move in `step`, and how many layers (+ over, − under) they must shift to pass every face that
+ * stays put on their way to the side of the stack they land on. They shift together, so it never reorders them.
+ */
+function travel(model: Model, step: number): { moving: boolean[]; clearance: number } {
+  let list = travels.get(model);
+  if (!list) {
+    list = [];
+    travels.set(model, list);
+  }
+  if (list[step]) return list[step];
+  const start = startPose(model, step);
+  const T = rootTransforms(model, model.steps[step].angles, step);
+  const base = anchorFor(model, step).clone().multiply(T[model.steps[step].fixedFace].clone().invert());
+  const moving = T.map((m, f) => {
+    const end = base.clone().multiply(m).elements;
+    return start[f].elements.some((x, i) => Math.abs(x - end[i]) > 1e-9);
   });
+  const from = stackAt(model, step - 1).heights;
+  const to = stackAt(model, step).heights;
+  const range = (pick: boolean) => {
+    const hs = moving.flatMap((m, f) => (m === pick ? [from[f], to[f]] : []));
+    const ends = moving.flatMap((m, f) => (m === pick ? [to[f]] : []));
+    return { min: Math.min(...hs), max: Math.max(...hs), end: ends.reduce((a, h) => a + h, 0) / ends.length };
+  };
+  const go = range(true);
+  const stay = range(false);
+  // the flap travels toward the side of the stack it lands on: over it (+) or under it (−)
+  const over = go.end >= stay.end;
+  // a step that keeps the stacking (a turn, or opening a model out) has no flap to carry over the stack
+  const restack = to.some((h, f) => h !== from[f]);
+  const clearance =
+    !restack || !moving.includes(true) || !moving.includes(false)
+      ? 0
+      : over
+        ? Math.max(0, stay.max + 1 - go.min)
+        : -Math.max(0, go.max + 1 - stay.min);
+  list[step] = { moving, clearance };
+  return list[step];
 }
 
 /** At the end of `step`, does every crease off the spanning tree agree with it? (Unclamped angles.) */
PATCH
```

- [ ] **Step 4: Rebuild the generated models.** Run `pnpm models`. Expected: `✓ dog-face` and `✓ tulip`. Their thumbnails change, because folds are now exact.

- [ ] **Step 5: Run everything.** Run `pnpm vitest run`, `pnpm exec tsc --noEmit` and `pnpm biome ci`. Expected: all green.

  Dog and tulip have no `faceOrders` yet, so in the player their layers lie flat together until Task 3. That's expected for this one commit.

- [ ] **Step 6: Commit.** `pnpm check`, then `git add src public models && git commit -m "feat(fold): exact folds with a layer lift and a travel clearance from faceOrders"` (with the trailer).

### Task 3: The builder records the stack and writes `faceOrders`

**Files:**
- Modify: `models/build.ts`, `models/sequence.ts`, `models/thumbnail.ts`
- Test: `models/sequence.test.ts`, `models/check.test.ts`
- Regenerated: `public/models/dog-face.fold`, `.svg`, `public/models/tulip.fold`, `.svg`

**Interfaces:**
- Consumes: `layerHeights`, `LAYER_GAP` (Task 2); `inside`, `signedArea` (existing, in `models/build.ts` and `models/arrange.ts`).
- Produces:
  - `type StackPiece = { outline: Vec2[]; toView: Matrix3; frontUp: boolean }`
  - `SourceStep.stack?: StackPiece[]`: the pieces from bottom to top as the viewer sees them.
  - `foldSequence().set(fold, text, rotation?)`, back again.
  - `buildFold` writes `faceOrders` on frames whose stacking changed.

How it works:
- `fold()` keeps the pieces that stay put in order. It reverses the moving pieces, then puts them on top for a valley fold or underneath for a mountain fold. Every step records `stack`.
- `buildFold` maps each face to the piece holding its centroid, and maps the face into the view with that piece's `toView`.
  - For every two faces whose pieces differ and whose view polygons overlap (Sutherland–Hodgman area above 1e-9), it emits `[f, g, s]` with s = (f above g ? 1 : −1) × (g's piece frontUp ? 1 : −1).
  - It writes `faceOrders` only when the triples differ from the previous frame's.

- [ ] **Step 1: Write the failing tests.**
  - The builder tests cover: a valley fold stacks on top and a mountain fold underneath; a two-layer flap turns over as one; two tips that share no unmoved crease don't cross (this replaces the old `it.todo`); `faceOrders` is written only on change.

```bash
git apply <<'PATCH'
diff --git a/models/sequence.test.ts b/models/sequence.test.ts
index 7c42215..d219eb2 100644
--- a/models/sequence.test.ts
+++ b/models/sequence.test.ts
@@ -1,4 +1,5 @@
 import { describe, expect, it } from 'vitest';
+import { layerHeights } from '../src/fold/fold';
 import { loadModel } from '../src/fold/load-model';
 import { buildFold } from './build';
 import { checkModel } from './check';
@@ -20,7 +21,7 @@ describe('foldSequence', () => {
     s.fold('middle', [0.5, 0], [0.5, 1], { valley: true, hold: [0.75, 0.5], ...text });
     const src = s.source({ ...entry, tags: [] });
     expect(src.creases).toEqual({ middle1: { from: [0.5, 0], to: [0.5, 1], assignment: 'V' } });
-    expect(src.steps).toEqual([{ fold: { middle1: 180 }, hold: [0.75, 0.5], ...text }]);
+    expect(src.steps).toEqual([{ fold: { middle1: 180 }, hold: [0.75, 0.5], ...text, stack: expect.any(Array) }]);
   });
 
   it('creases both layers of a two-layer fold, valley on one and mountain on the flipped one', () => {
@@ -59,4 +60,44 @@ describe('foldSequence', () => {
       'Fold half holds a point that is not on a piece that stays still.'
     );
   });
+
+  it('stacks a valley fold on top of the held paper, and a mountain fold under it', () => {
+    for (const valley of [true, false]) {
+      const s = foldSequence();
+      s.fold('half', [0.5, 0], [0.5, 1], { valley, hold: [0.75, 0.5], ...text });
+      const model = loadModel(buildFold(s.source({ ...entry, tags: [] })));
+      const held = model.steps[1].fixedFace;
+      const flap = 1 - held;
+      expect(layerHeights(model, 1)[flap]).toBe(valley ? 1 : 0);
+      expect(layerHeights(model, 1)[held]).toBe(valley ? 0 : 1);
+    }
+  });
+
+  it('turns a two-layer flap over as one, reversing it on top of the stack', () => {
+    const s = foldSequence();
+    s.fold('half', [0.5, 0], [0.5, 1], { valley: true, hold: [0.75, 0.25], ...text });
+    s.fold('quarter', [0, 0.5], [1, 0.5], { valley: true, ...text });
+    const model = loadModel(buildFold(s.source({ ...entry, tags: [] })));
+    // four distinct layers, the held quarter at the bottom
+    expect([...layerHeights(model, 2)].sort()).toEqual([0, 1, 2, 3]);
+    expect(layerHeights(model, 2)[model.steps[2].fixedFace]).toBe(0);
+    expect(checkModel(model)).toEqual([]);
+  });
+
+  it('keeps two tips that share no unmoved crease from passing through each other', () => {
+    // fold in half, then fold the free corner through both layers (the old engine let the tips cross)
+    const s = foldSequence();
+    s.fold('half', [0.5, 0], [0.5, 1], { valley: true, hold: [0.75, 0.5], ...text });
+    s.fold('corner', [0.7, 1], [1, 0.7], { valley: true, ...text });
+    expect(checkModel(loadModel(buildFold(s.source({ ...entry, tags: [] }))))).toEqual([]);
+  });
+
+  it('writes faceOrders only where the stacking changes', () => {
+    const s = foldSequence();
+    s.fold('half', [0.5, 0], [0.5, 1], { valley: true, hold: [0.75, 0.5], ...text });
+    s.turn([0, 180, 0], text);
+    const frames = buildFold(s.source({ ...entry, tags: [] })).file_frames;
+    expect(frames[0].faceOrders).toHaveLength(1);
+    expect(frames[1]).not.toHaveProperty('faceOrders');
+  });
 });
PATCH
```

  - The flap-flip test now builds an explicit order flip. The first dog face, which flipped an ear under the 178° clamp, now passes `checkModel`.

```bash
git apply <<'PATCH'
diff --git a/models/check.test.ts b/models/check.test.ts
index 8ae1972..190e84e 100644
--- a/models/check.test.ts
+++ b/models/check.test.ts
@@ -86,8 +86,8 @@ describe('crossings', () => {
 });
 
 describe('flapFlips', () => {
-  // The first dog face: its nose fold re-routed the engine's spanning tree, and the clamped 178° wedges
-  // then put the right ear's front layer on top of its back layer (white side showing, z-fighting).
+  // The first dog face: under the old 178° clamp its nose fold re-routed the spanning tree and the
+  // wedges put the right ear's front layer on top of its back layer (white side showing, z-fighting).
   const firstDog = () => {
     const s = diamondSequence();
     const text = { en: 'x', pt: 'x' };
@@ -101,10 +101,16 @@ describe('flapFlips', () => {
   };
 
   it('finds a folded flap that changes side in a later step', () => {
-    expect(flapFlips(firstDog())).toContainEqual(
-      expect.stringMatching(/^Step 5: face \d+ flips to the other side of face \d+/)
+    // fold-in-half, then a step that keeps the angles but puts the flap under the held half
+    const json = fixture('fold-in-half') as { file_frames: Record<string, unknown>[] };
+    json.file_frames.push({ ...json.file_frames[0], faceOrders: [[0, 1, -1]] });
+    expect(flapFlips(loadModel(json))).toContainEqual(
+      expect.stringMatching(/^Step 2: face \d+ flips to the other side of face \d+/)
     );
-    expect(checkModel(firstDog())).toContainEqual(expect.stringMatching(/flips to the other side/));
+  });
+
+  it('passes the first dog face now that layers are ordered', () => {
+    expect(checkModel(firstDog())).toEqual([]);
   });
 
   it('finds none in the fixtures', () => {
PATCH
```

  Run `pnpm vitest run models`. Expected: failures (no `stack`, no `faceOrders` and no `set()` yet).

- [ ] **Step 2: Implement the builder.**

```bash
git apply <<'PATCH'
diff --git a/models/sequence.ts b/models/sequence.ts
index c5d7513..6760c9a 100644
--- a/models/sequence.ts
+++ b/models/sequence.ts
@@ -1,7 +1,7 @@
 import { Euler, Matrix3, Matrix4, Vector2 } from 'three';
 import type { Vec2, Vec3 } from '../src/fold/types';
 import { type Crease, signedArea } from './arrange';
-import { inside, type ModelSource, type SourceStep } from './build';
+import { inside, type ModelSource, type SourceStep, type StackPiece } from './build';
 
 type Text = { en: string; pt: string };
 /** A flat piece of paper: its outline in paper coordinates, where it lies in the view, and which way it faces. */
@@ -88,11 +88,17 @@ export function foldSequence(start: Vec3 = [0, 0, 0]) {
   ];
   const creases: Record<string, Crease> = {};
   const steps: SourceStep[] = [];
+  // pieces run bottom to top as the viewer sees them; every step records that stack
+  const stack = (): StackPiece[] => pieces.map(({ outline, toView, frontUp }) => ({ outline, toView, frontUp }));
 
   return {
     /** A step that only turns the model (absolute Euler XYZ, degrees). Pieces keep their view positions. */
     turn(rotation: Vec3, text: Text) {
-      steps.push({ rotation, ...text });
+      steps.push({ rotation, ...text, stack: stack() });
+    },
+    /** A step that sets existing creases to new angles, e.g. to open a model out at the end. The stack stays as it was. */
+    set(fold: Record<string, number>, text: Text, rotation?: Vec3) {
+      steps.push({ fold, ...text, ...(rotation ? { rotation } : {}), stack: stack() });
     },
     /** The creases the fold called `name` made, one per layer it cut (name1, name2, …), with their angles. */
     angles(name: string): Record<string, number> {
@@ -103,6 +109,7 @@ export function foldSequence(start: Vec3 = [0, 0, 0]) {
     fold(name: string, p: Vec2, q: Vec2, opts: FoldOptions) {
       const fold: Record<string, number> = {};
       const next: Piece[] = [];
+      const flaps: Piece[] = [];
       const moved = new Set<Piece>();
       const flip = mirror(p, q);
       for (const piece of pieces) {
@@ -135,10 +142,12 @@ export function foldSequence(start: Vec3 = [0, 0, 0]) {
           tags: opts.tag ? [...piece.tags, opts.tag] : piece.tags
         };
         moved.add(flap);
-        next.push(flap);
+        flaps.push(flap);
       }
       if (!Object.keys(fold).length) throw new Error(`Fold ${name} doesn't fold anything.`);
-      pieces = next;
+      // a simple fold turns the moving layers over as one: they reverse, and land on top (valley) or underneath
+      flaps.reverse();
+      pieces = opts.valley ? [...next, ...flaps] : [...flaps, ...next];
       let hold: Vec2 | undefined;
       if (opts.hold) {
         const still = pieces.find(
@@ -152,7 +161,7 @@ export function foldSequence(start: Vec3 = [0, 0, 0]) {
         if (!still) throw new Error(`Fold ${name} holds a point that is not on a piece that stays still.`);
         hold = centroid(still.outline);
       }
-      steps.push({ fold, en: opts.en, pt: opts.pt, ...(hold ? { hold } : {}) });
+      steps.push({ fold, en: opts.en, pt: opts.pt, ...(hold ? { hold } : {}), stack: stack() });
     },
     source(entry: Omit<ModelSource, 'creases' | 'steps'>): ModelSource {
       return { ...entry, creases, steps };
PATCH
```

```bash
git apply <<'PATCH'
diff --git a/models/build.ts b/models/build.ts
index 1105a86..f23c696 100644
--- a/models/build.ts
+++ b/models/build.ts
@@ -1,6 +1,10 @@
+import { type Matrix3, Vector2 } from 'three';
 import type { Vec2, Vec3 } from '../src/fold/types';
 import type { ModelEntry } from '../src/models/catalog';
-import { arrange, type Crease } from './arrange';
+import { arrange, type Crease, signedArea } from './arrange';
+
+/** A flat piece of paper at the end of a step: its outline in paper coordinates, where it lies in the view. */
+export type StackPiece = { outline: Vec2[]; toView: Matrix3; frontUp: boolean };
 
 export type SourceStep = {
   en: string;
@@ -11,6 +15,8 @@ export type SourceStep = {
   hold?: Vec2;
   /** Whole-model rotation from this step on, Euler XYZ in degrees. */
   rotation?: Vec3;
+  /** The pieces at the end of the step, bottom to top as the viewer sees them (written by foldSequence). */
+  stack?: StackPiece[];
 };
 
 export type ModelSource = Omit<ModelEntry, 'thumbnail'> & {
@@ -30,10 +36,65 @@ export function inside(p: Vec2, poly: Vec2[]): boolean {
   return hit;
 }
 
+/** Clip convex polygon `a` by convex polygon `b` (Sutherland–Hodgman) and return the area left. */
+function overlap(a: Vec2[], b: Vec2[]): number {
+  const clip = signedArea(b) < 0 ? [...b].reverse() : b;
+  let out = a;
+  clip.forEach((p, i) => {
+    const q = clip[(i + 1) % clip.length];
+    const keep = (v: Vec2) => (q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0]) >= 0;
+    const next: Vec2[] = [];
+    out.forEach((v, j) => {
+      const w = out[(j + 1) % out.length];
+      if (keep(v)) next.push(v);
+      if (keep(v) !== keep(w)) {
+        const [dx, dy] = [w[0] - v[0], w[1] - v[1]];
+        const t =
+          ((q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0])) / ((q[1] - p[1]) * dx - (q[0] - p[0]) * dy);
+        next.push([v[0] + dx * t, v[1] + dy * t]);
+      }
+    });
+    out = next;
+  });
+  return out.length < 3 ? 0 : Math.abs(signedArea(out));
+}
+
+/**
+ * FOLD faceOrders for a stack: [f, g, s] for every two faces whose pieces overlap in the view, with
+ * s = +1 when f lies on the side g's normal points to. Faces of one piece lie side by side, never stacked.
+ */
+function faceOrdersOf(stack: StackPiece[], vertices: Vec2[], faces: number[][]): [number, number, 1 | -1][] {
+  const at = faces.map((face) => {
+    const poly = face.map((v) => vertices[v]);
+    const c: Vec2 = [
+      poly.reduce((s, p) => s + p[0], 0) / poly.length,
+      poly.reduce((s, p) => s + p[1], 0) / poly.length
+    ];
+    const layer = stack.findIndex((piece) => inside(c, piece.outline));
+    const toView = stack[layer].toView;
+    const view = poly.map(([x, y]): Vec2 => {
+      const p = new Vector2(x, y).applyMatrix3(toView);
+      return [p.x, p.y];
+    });
+    return { layer, view };
+  });
+  const orders: [number, number, 1 | -1][] = [];
+  for (let f = 0; f < faces.length; f++) {
+    for (let g = f + 1; g < faces.length; g++) {
+      const [a, b] = [at[f], at[g]];
+      if (a.layer === b.layer || overlap(a.view, b.view) < 1e-9) continue;
+      const above = a.layer > b.layer ? 1 : -1;
+      orders.push([f, g, (above * (stack[b.layer].frontUp ? 1 : -1)) as 1 | -1]);
+    }
+  }
+  return orders;
+}
+
 /** The FOLD file for `src`, in the shape `loadModel` reads. */
 export function buildFold(src: ModelSource) {
   const { vertices, edges, assignments, edgeCrease, faces } = arrange(src.creases);
   const angles: Record<string, number> = {};
+  let orders = '[]';
   const frames = src.steps.map((step, i) => {
     for (const [name, angle] of Object.entries(step.fold ?? {})) {
       if (!src.creases[name]) throw new Error(`${src.id} step ${i + 1} folds ${name}, which is not a crease.`);
@@ -48,11 +109,16 @@ export function buildFold(src: ModelSource) {
         )
       );
     if (held === -1) throw new Error(`${src.id} step ${i + 1} holds a point outside the paper.`);
+    // faceOrders only where the stacking changes; the loader carries it into later steps
+    const faceOrders = step.stack && faceOrdersOf(step.stack, vertices, faces);
+    const changed = faceOrders !== undefined && JSON.stringify(faceOrders) !== orders;
+    if (changed) orders = JSON.stringify(faceOrders);
     return {
       edges_foldAngle: edgeCrease.map((name) => (name && angles[name]) || 0),
       'foldapp:instruction': { en: step.en, pt: step.pt },
       ...(held === undefined ? {} : { 'foldapp:fixedFace': held }),
-      ...(step.rotation ? { 'foldapp:rotation': step.rotation } : {})
+      ...(step.rotation ? { 'foldapp:rotation': step.rotation } : {}),
+      ...(changed ? { faceOrders } : {})
     };
   });
   return {
PATCH
```

  The thumbnail's caveat goes. Mean height now follows the stack, so the dog's ears draw the same.

```bash
git apply <<'PATCH'
diff --git a/models/thumbnail.ts b/models/thumbnail.ts
index 1b8d293..7ac30a7 100644
--- a/models/thumbnail.ts
+++ b/models/thumbnail.ts
@@ -5,9 +5,8 @@ const BACK = '#F3EDE2';
 const INK = '#33302C';
 
 /**
- * The paper at the end of `step` seen from above, as a small washi-grain SVG.
- * ponytail: faces are painted far-to-near by mean height, which can misorder stacked flaps; use the
- * layer order from the layer-order milestone once it exists.
+ * The paper at the end of `step` seen from above, as a small washi-grain SVG. Faces are painted far to near
+ * by mean height, which follows the stack because every layer is lifted by its place in it.
  */
 export function thumbnail(model: Model, step = model.steps.length - 1): string {
   const faces = foldedPositions(model, step, 1);
PATCH
```

- [ ] **Step 3: Rebuild and run everything.** Run `pnpm models` (expected `✓ dog-face` and `✓ tulip`, and both `.fold` files gain `faceOrders`). Then `pnpm vitest run` (expected 183 passed, 0 failed), `pnpm exec tsc --noEmit` and `pnpm biome ci`.

- [ ] **Step 4: Commit.** `pnpm check`, then `git add models public && git commit -m "feat(models): record the stack and write faceOrders; set() is back"` (with the trailer).

### Task 4: Prove it on all six launch models, then the notes and the PR

**Files:**
- Modify: `docs/superpowers/plans/carry-forward.md`, `docs/superpowers/specs/2026-10-06-wabi-sabi-i18n-design.md` (§9 table)
- Temporary only, not committed: the four M4 part 2 model files

- [ ] **Step 1: Run the four held-back models through the checks.**
  1. Create `models/src/cup.ts`, `models/src/fox-face.ts`, `models/src/kabuto.ts` and `models/src/paper-plane.ts` exactly as written in `docs/superpowers/plans/2026-10-07-m4-library.md` → Task 11 → Step 1.
  2. In `models/src/index.ts`, add them to `sources` as in that task's Step 2. Keep `DEFAULT_MODEL` as it is.
  3. Run `pnpm models`. Expected: six ✓ lines.

  During planning, the same engine and builder gave:

  ```
  ✓ cup: 8 faces, 6 steps
  ✓ fox-face: 10 faces, 7 steps
  ✓ dog-face: 8 faces, 6 steps
  ✓ tulip: 6 faces, 4 steps
  ✓ kabuto: 18 faces, 11 steps
  ✓ paper-plane: 16 faces, 9 steps
  ```

  If any line shows ✗, stop and report it. Don't loosen a check.

- [ ] **Step 2: Look at them in the player.**
  1. Run `pnpm build && pnpm preview --port 4173`.
  2. Take screenshots of the canvas at 1000×760 and on Pixel 7: `/fold/cup?step=4`, `/fold/cup?step=6`, `/fold/fox-face?step=7`, `/fold/kabuto?step=11`, `/fold/paper-plane?step=9` and `/fold/dog-face?step=6`.
  3. Repeat `cup?step=4` with the camera dragged about 160px upward, to see it from the side and underneath.
  4. Check that no paper shows through other paper. Both dog ears must show the coloured side. The flap edges show a hairline step of thickness.

  The plane can overlap the dock. That's the known camera-framing item in carry-forward, not a layer problem.

- [ ] **Step 3: Put the M4 part 2 files back.** Run `git checkout models/src/index.ts public/models`, then `rm models/src/{cup,fox-face,kabuto,paper-plane}.ts public/models/{cup,fox-face,kabuto,paper-plane}.*`. Then run `git status`. Expected: clean, apart from the docs edits to come. Those models ship in M4 part 2 (its Task 11), which this milestone unblocks.

- [ ] **Step 4: Update the notes.**
  - `carry-forward.md`:
    - Replace the section "Layer-order milestone (inserted before M4 part 2)" with "Resolved in the layer-order milestone". Under it, give one line per item: flaps through flaps, the thumbnail paint order, disconnected stacks, and the seam gap at rest. Each line says what fixed it: `faceOrders`, the lift and clearance, mean height now following the stack, and exact angles.
    - Delete the bullet "M4 part 2 needs `foldSequence().set()` back"; it's back.
    - Add under "Editor (later)": "**A layer-order solver for imported files.** Files without `faceOrders` render with flat, coplanar layers. A solver fills `faceOrders` for them when import arrives."
  - In `2026-10-06-wabi-sabi-i18n-design.md` §9, mark row L as this PR, and 4b as next.

- [ ] **Step 5: Final checks.** Run `pnpm biome ci` and `pnpm vitest run`. Then run `lsof -ti:4173 | xargs kill 2>/dev/null; pnpm test:e2e`. All green; the e2e suite runs against dog and tulip with layers.

- [ ] **Step 6: Commit, push and open the PR.** The controller does the push and the PR; the implementer stops after the commit.
  - Commit: `docs: layer-order milestone done; carry-forward and roadmap` (with the trailer).
  - PR title: "Layer order: exact folds with recorded faceOrders". The body says:
    - what changed (engine, builder, data);
    - the six-model `checkModel` result;
    - the screenshots from Step 2;
    - that M4 part 2 is now unblocked.

    End the body with the 🤖 Claude Code line.
