# Fold — Layer-order milestone: flat folds with recorded layer order

Date: 2026-10-07
Status: approved
Builds on:
- `2026-10-04-fold-restart-design.md` (the "restart spec"). This milestone changes the fold engine from §6: folds now reach their exact angles, and faces get a layer lift.
- `2026-10-06-wabi-sabi-i18n-design.md` §8. This milestone is the "layer-order solver milestone" that §8's gate inserts before Milestone 4 ships.

Unblocks: Milestone 4 part 2 (`docs/superpowers/plans/2026-10-07-m4-library.md`, Task 11: the cup, fox face, samurai helmet and paper plane).

## 1. Purpose

Paper stacks. When a flap folds onto other paper, it must end up above or below that paper, never through it. Today the engine has no layer order. It stops every fold at 178° (`MAX_RENDER_ANGLE`), so stacked layers get a thin wedge between them. That wedge causes four known problems:
- **Flaps cut through flaps at rest.** In the cup at step 4, the left corner flap slices through the right one. The fox face, samurai helmet and paper plane do the same.
- **Seam gap.** Copies of one vertex sit apart even when a step is finished: 0.047 on a 3-panel model, 0.052 on 4 panels.
- **A stack can flip later.** A later step re-routes the spanning tree, and the clamped wedges add up differently. That's how the dog's right ear came to show its white side.
- **Disconnected stacks pass through each other.** Folding the free corner of a sheet folded in half makes the two tips cross mid-fold.

Success:
- all six launch models pass `checkModel` with no exceptions;
- in the player, no paper shows through other paper at any step, seen from above or from the side;
- the layer order lives in the standard FOLD format, so exports carry it, and a future importer or solver plugs into the same field.

## 2. Decisions log

| Topic | Decision |
|---|---|
| Which models | Models built by our fold-sequence builder (`models/sequence.ts`). That's every authored model now, and the future web editor, which will be a UI over the same builder. |
| Imported files | Out of scope. A file that carries `faceOrders` will just work. A file without it renders with coplanar layers until a solver milestone, which comes with import. |
| Where the order comes from | The builder simulates each physical fold, so it knows the stacking exactly. No solving from the crease pattern. |
| Storage | Standard FOLD `faceOrders`, per frame. No custom field. |
| Rendering | Exact fold angles, plus a small geometric lift per layer. Not a 178° wedge, and not draw-order or depth tricks, which break when the paper is turned to the side. |
| Layer gap | `LAYER_GAP = 0.002` of the paper's side per layer. A 15-layer kabuto stack is 0.03 thick. |
| Lift timing | A face moves from its old layer height to its new one in the first 15% of a step (smoothstep). A flap rises over the stack early instead of clipping it near the hinge. |

Probe (during planning, throwaway): with exact angles, `LAYER_GAP` 0.002 and the 15% lift, all six launch models passed every `checkModel` check: folds flat, steps join within 1e-9, no tear, no faces crossing, no flap flips. Without the early lift, the cup (steps 4 and 5) and the kabuto (step 10) still clipped mid-fold.

## 3. Data: `faceOrders` per frame

FOLD defines `faceOrders` as triples `[f, g, s]` for faces that overlap in the folded state:
- `s = +1`: face *f* lies above face *g*, on the side ***g*'s** normal points to (FOLD spec, checked against edemaine/fold `doc/spec.md`);
- `s = −1`: *f* lies below *g*, on the side opposite *g*'s normal;
- `s = 0`: unknown.

A face's normal comes from its vertex order in `faces_vertices`. Counter-clockwise in the flat sheet means the normal is +z, the front.

- Every frame in `file_frames` that ends in a different stacking carries its own `faceOrders`. A frame without `faceOrders` inherits the previous frame's. That matches how the loader already inherits `fixedFace` and `rotation`.
- **Loader** (`src/fold/load-model.ts`):
  - It reads each frame's `faceOrders` into `Step.faceOrders: [number, number, 1 | -1][]`. Triples with `s = 0` are dropped.
  - It raises a FoldError if a face number doesn't exist, if *f* = *g*, or if *s* isn't −1, 0 or 1. The message is "Step N orders face X, which does not exist." and similar.
  - It doesn't check geometry. Whether the faces really overlap is the builder's and the checks' job.
- **Missing everywhere:** the model loads, and every face's lift is 0. A file built by our tools always has `faceOrders`.
- **The fixtures:** `fold-in-half.fold` and `fold-in-quarters.fold` get hand-written `faceOrders` (1 pair and 6 pairs).

## 4. Engine (`src/fold/fold.ts`)

- **Exact angles.** `MAX_RENDER_ANGLE` and `clampAngle` go. Angles interpolate between steps exactly as now, without the clamp.
  - The spanning-tree code stays. A flat-foldable state closes its cycles exactly, so `treeChange` corrections fall to identity in practice. They stay for steps that are not fully folded (the plane's open wings).
- **Layer heights.** `layerHeights(model, step): number[]` gives each face's position in the stack at the end of `step`. It's cached per model, like the trees.
  1. It takes each face's folded pose at the end of the step, before the whole-model rotation, with no lift. Every flat stack then lies parallel to z = 0.
  2. For each triple in `faceOrders`, g's normal z-sign times s says whether f is above or below g along +z.
  3. Faces are ranked by a topological sort over those relations. Faces with no relation get the lowest rank that keeps every relation true. A cycle throws a RangeError naming the step.
  - Step 0 is all zeros.
- **Lift.** `foldedPositions(model, step, t)` lifts every face of step `step` by `LAYER_GAP × h` along +z, in the frame before the whole-model rotation. h blends from the previous step's height to this step's, over `smoothstep(min(1, t / 0.15))`.
  - The rotation is applied after the lift, so a turn-over carries the stack with it.
  - At t = 0, h equals the previous step's end height, so steps still join exactly.
- **Signature unchanged.** `foldedPositions`, `anglesAt` and `checkConsistency` keep their signatures. `checkConsistency` has always used unclamped angles. The player, `Paper.tsx`, `paper-geometry.ts` and the diagram need no change.
- `Paper.tsx` keeps `polygonOffset`. Lifted layers no longer need it, but it does no harm.

## 5. Builder and checks (`models/`)

- **`sequence.ts` tracks the stack.** It keeps `pieces` ordered from bottom to top along the view's +z.
  - On a fold, pieces that stay keep their order. The moving pieces reverse, then go on top for a valley fold (toward the viewer) or underneath for a mountain fold. That's what a simple fold does to real paper.
  - After every step, `turn` and `set` included, it records the order.
- **`build.ts` writes `faceOrders`.**
  1. For each step, it maps each face of the crease pattern to the piece that contains its centroid; pieces only split along creases, so each face lies in exactly one piece.
  2. For every pair of faces whose pieces overlap in the folded state, it emits `[f, g, s]`. The overlap test clips one convex outline against the other and needs an area above 1e-9.
  3. s comes from the pieces' order and from whether g faces the viewer (s is measured along g's normal).
  - It writes `faceOrders` only on frames where it differs from the previous frame. The output stays deterministic, so the stale-output guard keeps working.
- **`set()` comes back.** The paper plane's last step opens its wings with it.
- **`checkModel` gets no new checks.** It runs on lifted positions, so the existing crossing and flap-flip checks now enforce the layer order.
  - The seam check measures copies of a vertex. At rest that is now at most `LAYER_GAP` × (stack height), which is 0.03 for the kabuto, inside the 0.06 budget.
- **Thumbnails paint by layer.** `thumbnail.ts` paints faces bottom to top by layer height instead of by mean z. This fixes the mismatched dog ears in the drawing, and the `ponytail:` note goes.

## 6. Testing

- **Loader, unit:**
  - `faceOrders` per frame, inherited by frames that lack it;
  - `s = 0` dropped;
  - each malformed case raises a FoldError: a missing face, f = g, s = 2.
- **Engine, unit** (`src/fold/fold.test.ts`):
  - Rewrite the 178° tests for exact angles: fold-in-half ends flat at z = 0 under its lift, and the seam gap at rest is 0 when the lift is ignored.
  - `layerHeights` follows `faceOrders`, flips correctly for faces whose front faces down, and throws on a cycle.
  - The lift joins exactly at every step boundary.
  - The lift turns with a turn-over step.
  - The `it.todo` for disconnected stacks becomes a real test: the two tips no longer cross.
- **Builder, unit:**
  - `foldSequence` records the right order for a valley fold and for a mountain fold.
  - A two-layer fold gives fold-in-quarters-like `faceOrders`.
  - The probe's six models pass `checkModel`. `models/models.test.ts` already does this for every source in `models/src/index.ts`, and all six are added in M4 part 2.
- **Visual:** in the player, take desktop and Pixel 7 screenshots of the cup at step 4, the fox at step 3, the kabuto at steps 9 to 11 and the plane at its end. Take each from the default camera and turned to the side.

## 7. Out of scope

- A layer-order solver for crease patterns without `faceOrders`. It comes with import.
- Import, export UI and the web editor.
- Paper thickness that scales with the number of layers in a fold (fold "rounding"). The lift is uniform.
- Changing the M4 part 2 models. They are already written and pass under this design.
