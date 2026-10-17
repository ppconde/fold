# Reverse Fold Tuck Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A reverse fold step swaps its flap for the tucked version at the first frame, opens the body a little, pivots the flap rigidly up between the body's layers into its final pose, and closes. No paper passes through paper. Then the ghost flap and the crane's pre-crease steps are removed.

**Architecture:** `foldedPositions` (`src/fold/fold.ts`) gets a reverse-fold branch. Each moving face is posed at the step's end angles, then turned in the body's plane around a pivot by `−θ·(1 − s)`. Its height comes from the final stack. The still faces the flap ends up between shift apart along the stack normal. The motion is built from the two end poses only; nothing in the `.fold` format changes. `isReverseFold` and the moving-face set move into `fold.ts` so the engine can use them without a circular import.

**Tech Stack:** TypeScript, three 0.186, React 19 / @react-three/fiber 9, Vitest 5, Playwright, Biome, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-17-reverse-fold-tuck-motion-design.md`

## Global Constraints

- Work from `origin/main` (local `main` is behind). Each PR in its own worktree `../fold-<topic>`, never the main checkout. No `git stash`.
- Three PRs, merged in order: PR 1 = Task 1 (`reverse-tuck-motion`), PR 2 = Task 2 (`reverse-no-ghost`), PR 3 = Task 3 (`crane-no-precrease`).
- Collapse tucks (`collapse(…, { tuck })`) and every non-reverse step keep today's motion exactly.
- No change to the `.fold` format. Model files are only regenerated in Task 3.
- `checkModel` stays clean for every model.
- Before each PR: `pnpm vitest run`, `pnpm build`, `pnpm check`, `pnpm test:e2e`. After code changes, run `graphify update .`.
- After Tasks 1 and 3: orbit the crane in the browser at the neck, tail and head steps from above, below and edge-on, scrubbing each step back and forth. Look for crossings, sorting artefacts, z-fighting and a visible swap.

## Review Focus

1. **The swap breaks step continuity on purpose.** `checkModel`'s "Step N starts … away from where step N−1 ended" must exempt only the moving faces of a reverse-fold step. Every still face must still match exactly. Test: `still faces of a reverse fold start where the last step ended` (Task 1).
2. **`crossings()` skips face pairs that share a vertex.** The flap shares its fold-line vertices with the body faces next to it. If the browser shows the flap cutting a neighbouring body face while the 40-sample test passes, extend `crossings()` to test those pairs with the shared vertices' own segments excluded (Task 1, Step 7).
3. **Pivot direction.** The neck and tail turn about 180°, so the short way and the long way are both near 180°. Test: `the crane's reverse folds pass no paper through paper` at 40 samples (Task 1).
4. **The head step reverse-folds a flap that is already tucked.** Its moving faces are inside the neck. The spread must open the neck's layers, and it must not move the body faces that aren't next to the head. Covered by the same 40-sample test, plus the existing `keeps the head on the neck as it reverse-folds` spread test.
5. **Scrubbing.** `t` in `[0, 1]` either way must be a pure function of `t`: no state between calls, and the swap is visible at `t = 0`, not only after `t > 0`. Covered by `ends exactly on the final pose` (t = 1) and `swaps the flap at the first frame` (t = 0), Task 1.

---

### Task 1: The swap-and-pivot motion in the engine

**Files:**
- Modify: `src/fold/fold.ts` (`foldedPositions`; new exports below)
- Modify: `src/fold/reverse.ts` (import `isReverseFold` and `movingFaces` from `fold.ts` instead of defining them; keep re-exporting `isReverseFold` so importers don't change)
- Modify: `models/check.ts` (continuity check in `checkModel`)
- Test: `src/fold/fold.test.ts`, `models/models.test.ts`

**Interfaces:**
- Produces, in `fold.ts`:
  - `isReverseFold(model: Model, step: number): boolean`: moved unchanged from `reverse.ts`.
  - `movingFaces(model: Model, step: number): ReadonlySet<number>`: faces whose pose relative to `fixedFace` differs between the step's start and end angles (cached per model, like the other `WeakMap`s). Empty for step 0.
  - `swapTurn(model: Model, step: number): { pivot: Vec3; axis: Vec3; angle: number } | null`: the in-plane rotation (radians, around `axis` = the fixed face's normal through `pivot`) that carries the swapped flap at `s = 0` to its final pose at `s = 1`. Null unless `isReverseFold`. Cached.
  - `REVERSE_OPEN = 3`: layers each side of the flap shift apart at the peak of the open.
- Consumed by Task 2: `isReverseFold` and `movingFaces`, via `reverse.ts`.

- [ ] **Step 1: Write the failing tests** in `src/fold/fold.test.ts`. Load the committed crane as `reverse.test.ts` does, and find the reverse steps with `crane.steps.flatMap((_, k) => (isReverseFold(crane, k) ? [k] : []))` (3 of them).

```ts
it('ends exactly on the final pose', () => {
  for (const k of reverse) {
    const end = foldedPositions(crane, k, 1);
    expect(foldedPositions(crane, k + 1, 0)).toEqual(end); // next step starts where this one ends
  }
});
it('swaps the flap at the first frame: the outline barely moves', () => {
  // ≤ 2 mm on a 15 cm sheet, in the fixed face's plane; measured 1.4 / 0.5 / 1.7 mm (spec)
  for (const k of reverse) expect(outlineJump(crane, k)).toBeLessThanOrEqual((2 / 150) * side(crane));
});
it('pivots the flap rigidly', () => {
  // every edge of a moving face keeps its length at t = 0, 0.5, 1
});
it('opens the body and closes it again', () => {
  // some still face next to the flap is farther than at t = 0 from its end height at t = 0.5, and is back at t = 1
});
it('leaves collapse tucks and ordinary steps alone', () => {
  // for every model in public/models: every step where !isReverseFold matches a snapshot of foldedPositions at t = 0, 0.5, 1
  // taken from origin/main before this change (commit the snapshot in this step)
});
```

`outlineJump` is a test helper. It samples the moving faces' edges at `t = 0` of step `k` and at `t = 1` of step `k − 1`, projects both onto the fixed face's plane, and returns their symmetric Hausdorff distance. `side` is the sheet's side length in vertex units.

In `models/models.test.ts`, add:

```ts
it("the crane's reverse folds pass no paper through paper", () => {
  for (const k of reverse) for (let i = 0; i <= 40; i++) expect(crossings(model, k, i / 40)).toEqual([]);
});
it('still faces of a reverse fold start where the last step ended', () => {
  // for k in reverse: faces not in movingFaces(model, k) match foldedPositions(model, k - 1, 1) exactly at t = 0
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm vitest run src/fold/fold.test.ts models/models.test.ts`
Expected: the outline-jump, rigid and crossings tests FAIL (today's motion swings through the body). `isReverseFold`/`movingFaces` imports from `./fold` fail to resolve.

- [ ] **Step 3: Move `isReverseFold` and the moving-face set into `fold.ts`**

Use `movingFaces` from `travel` (`moving`, start pose against end pose) rather than `reverse.ts`'s half-landing sample. `reverse.ts` imports both and re-exports `isReverseFold`. Its own `movingFaces` and `ghostFaces` keep working until Task 2.

- [ ] **Step 4: Implement `swapTurn`**

`axis` is the fixed face's normal at the step's end. `pivot` and `angle` come from mapping the flap's spine at the end onto the spine at the start. The spine is the first edge that `isReverseFold` sees flip (`|before| = 180` and `after = −before`) whose faces are both moving. Match its endpoints by vertex id, in the fixed face's plane. If that edge misbehaves, a 2D Procrustes fit of the moving vertices is the fallback (the spec leaves this to the builder); the outline-jump test is the gate.

**Direction:** `angle` and `angle − 2π·sign(angle)` are both candidates. Keep the one where `crossings` is empty at `t = 0.25, 0.5, 0.75`. If both are clean, keep the smaller `|angle|`. If neither is clean, keep the smaller one and let the test fail.

- [ ] **Step 5: Implement the reverse branch in `foldedPositions`**

When `isReverseFold(model, step)`:
- **Moving faces:** the pose is `turnAbout(pivot, axis, −angle·(1 − s)) · pose · T₁[f]`, with `T₁ = rootTransforms(model, step.angles, step)`. The lift is the final stack's: `LAYER_GAP · to.heights[f] · to.up[f]`, all step long. Turning about the stack normal keeps heights.
- **Still faces:** as today (heights blended `from` → `to`, no landing mid-stack), plus an open shift along `up`. The shift is `± REVERSE_OPEN · LAYER_GAP · rise`, reusing `rise`. Its sign is `+` for faces that end above every moving face they overlap in the step's final `faceOrders`, `−` for those below. It's 0 for faces with no such order. No `travel` clearance for this step.
- **Everything else** (anchor, `stepRotation` turn, `endsOpen` roots) is unchanged.

- [ ] **Step 6: Exempt the swap in `checkModel`'s continuity check**

When `isReverseFold(model, k + 1)`, skip faces in `movingFaces(model, k + 1)` when computing `jump`. The outline-jump test covers them instead.

- [ ] **Step 7: Run the tests until they pass**

Run: `pnpm vitest run`
Expected: all PASS, including `passes every check` for every model, and `keeps the head on the neck as it reverse-folds`. If the head's spread test fails because the neck opens, lower the open for faces the head isn't next to. Don't loosen the test.

If crossings pass but the browser check (Step 8) shows the flap cutting a body face it shares a vertex with, extend `crossings()` for that pair (Review Focus 2). Add a failing test for that exact step and fraction first.

- [ ] **Step 8: Browser check**

Run `pnpm dev`. Open `/fold/crane?step=<neck>`, then the tail and head steps. Orbit as in Global Constraints and scrub. If the head's swap is visible when zoomed in, note it in the PR body as a follow-up; there's no crossfade in this PR.

- [ ] **Step 9: Commit and open PR 1**

```bash
git add src/fold models docs/superpowers/specs/2026-10-17-reverse-fold-tuck-motion-design.md docs/superpowers/plans/2026-10-17-reverse-fold-tuck-motion.md
git commit -m "Engine: a reverse fold tucks its flap in first, then pivots it up between the body's layers"
```

PR title: `Engine: a reverse fold tucks its flap in first, then pivots it up between the body's layers`.

---

### Task 2: Remove the ghost flap; the tuck arrow fades on its own

**Files:**
- Modify: `src/fold/reverse.ts` (delete `ghostFaces` and the local `movingFaces`; `tuckArrow` uses `movingFaces` from `fold.ts`)
- Modify: `src/player/Paper.tsx` (drop ghost groups, the second material and `GHOST_OPACITY`; arrow opacity)
- Modify: `src/player/paper-geometry.ts` (delete `faceGroups` if nothing else uses it) and `paper-geometry.test.ts`
- Test: `src/fold/reverse.test.ts`

**Interfaces:**
- Consumes: `isReverseFold` and `movingFaces` from Task 1.
- Produces: `arrowOpacity(s: number): number`, full until `s = 0.75`, falling linearly to 0 at `s = 1`. The `landing` parameter is gone.

- [ ] **Step 1: Update the tests in `reverse.test.ts`**

Delete the `ghostFaces` describe block. Replace the `arrowOpacity` cases:

```ts
expect(arrowOpacity(0)).toBe(1);
expect(arrowOpacity(0.75)).toBe(1);
expect(arrowOpacity(0.875)).toBeCloseTo(0.5);
expect(arrowOpacity(1)).toBe(0);
```

In `tuckArrow`'s test, replace `ghostFaces(crane, neck, 0.5)` with `movingFaces(crane, neck)`.

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm vitest run src/fold/reverse.test.ts`
Expected: FAIL on `arrowOpacity`'s new signature.

- [ ] **Step 3: Remove the ghost and change `arrowOpacity`**

In `Paper.tsx`, call `arrowOpacity(progress(t))`. Keep a single material. Remove `landingAt` from Paper's imports if it's unused.

- [ ] **Step 4: Run everything**

Run: `pnpm vitest run && pnpm check && pnpm build && pnpm test:e2e`
Expected: all PASS. No e2e test refers to the ghost; if one does, delete that assertion.

- [ ] **Step 5: Commit and open PR 2**

```bash
git add src
git commit -m "Player: no ghost flap on reverse folds, now that the flap goes inside"
```

---

### Task 3: Remove the crane's pre-crease steps

**Files:**
- Modify: `models/src/crane.ts` (delete the three `s.crease('neckPre' | 'tailPre' | 'headPre', …)` calls and their comment, added in #473)
- Regenerate: `public/models/crane.fold` (`pnpm models`)
- Modify: `e2e/player.spec.ts` (`a reverse fold step`: `NECK = 16`, `NORMAL = 15`; the toggle test goes back to a single `next` and `NECK + 1`, as before #473)

The engine parts of #473 stay: `claim` relabelling a reused crease, and the fold-and-unfold clearance. They are generic engine behaviour, outside this plan. Don't revert them.

- [ ] **Step 1: Update the e2e constants and the toggle test** as above. Run `pnpm test:e2e -g "a reverse fold step"`. Expected: FAIL (the pre-crease steps are still there).

- [ ] **Step 2: Delete the three pre-crease calls and regenerate**

Run: `pnpm models`
Expected: `crane.fold` loses 3 steps. `git diff --stat public/models` shows only `crane.fold`.

- [ ] **Step 3: Run everything**

Run: `pnpm vitest run && pnpm check && pnpm build && pnpm test:e2e`
Expected: all PASS. The tests that find steps by instruction text (`models.test.ts`, `reverse.test.ts`, `fold.test.ts`) need no index changes.

- [ ] **Step 4: Browser check** as in Task 1, Step 8, now without the pre-crease steps. Also check the step before the neck (the petal fold) runs straight into the neck with no jump.

- [ ] **Step 5: Commit and open PR 3**

```bash
git add models/src/crane.ts public/models/crane.fold e2e/player.spec.ts
git commit -m "Crane: no pre-crease steps, the reverse folds show the real move"
```
