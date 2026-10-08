# Collapse tucks (squash hint) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A squash built with `collapse` ends with the right layers inside: a collapse can say which flaps it swung outside, and they end tucked between the layers they passed, as the crane's reverse folds already do.

**Architecture:** The rigid engine animates the Snail's squash, but the layers it reads off the motion leave the squashed corners outside the square base instead of inside. `collapse` gets the crane's `tuck` hint (`{ layers: [Pick, Pick], flaps: [Pick, Pick] }`, picked by tags and flat-sheet point like `only`). The build gives such a step a last tenth where the paper holds still (the motion resampled to 9 knots, then the end angles), and `tuckIn` moves the flaps inside, as for a reverse fold. So the layers don't drift through each other while the paper still moves, the solver also writes the stack the motion lands on (`foldapp:landedOrders`), and the player blends heights from the previous stack to that one during the motion, then to the tucked stack in the still stretch.

**Tech Stack:** TypeScript, three.js, Vitest, pnpm.

**Spec:** `docs/superpowers/plans/2026-10-08-origami-booklet.md` (roadmap item 2, the Snail). Decision: squash gets a collapse hint plus book-style movement arrows (arrows are the next PR).

## Global Constraints

- Engine/builder/player only; the arrows and the Snail are their own PRs.
- The crane's `.fold` changes only by gaining `foldapp:landedOrders` on its three tuck steps (neck, tail, head). Dog face, tulip and every SVG stay byte-identical.
- No new dependencies. Match surrounding style.
- Run `graphify update .` after code changes.

## Review Focus

1. A collapse with a tuck: the flaps end between the two layer groups (Snail square base: bottom corner's square in front, side corners inside, top corner's behind) and the model passes every check (Task 1).
2. No face passes through another while the paper moves; the layers only change places once it has landed (Task 1, via `checkModel` crossings).
3. `foldapp:landedOrders` is read for its own step only and validated like `faceOrders` (Task 2).
4. Steps without a tuck blend heights exactly as before (Task 3: every other model's files unchanged).

---

### Task 1: `collapse` takes a tuck

**Files:** `models/sequence.ts` (`collapse`), `models/build.ts` (resample + still stretch), `models/solve.ts` (`foldapp:landedOrders`), test `models/sequence.test.ts`.

- [x] Failing test: the Snail's opening (`snailOpening()`), front squash with `tuck: { layers: [bottom, top], flaps: [right, none] }`, turn over, back squash with `flaps: [left, none]`; `checkModel` is empty and `layerHeights` at the end put the bottom square above both side squares and the top square below them. Fails without the hint: bottom at height 1, flaps at 5.
- [x] `collapse` turns the picks into outlines of its new pieces and pushes `tuck` on the step.
- [x] `buildFold` (solve on): a tuck step without its own path gets the motion as 9 evenly spaced knots (the solver's, resampled), then the end angles, so the last tenth holds still.
- [x] `motionOrders`: before `tuckIn`, write the landed stack as `foldapp:landedOrders`.

### Task 2: The loader reads landed orders

**Files:** `src/fold/types.ts` (`Step.landedOrders`), `src/fold/load-model.ts`, test `src/fold/load-model.test.ts`.

- [x] Failing test: `foldapp:landedOrders` on frame 0 shows on step 1 only; a bad triple throws the faceOrders error.
- [x] Read it with `readFaceOrders`, no inheritance.

### Task 3: The player blends through the landed stack

**Files:** `src/fold/fold.ts` (`stackAt`, `foldedPositions`).

- [x] `stackAt(model, step, landed)` builds the stack from `landedOrders` (own cache, no inheritance shortcut).
- [x] `foldedPositions`: with landed orders, heights blend previous → landed over the motion (`s ≤ 1 − 1/(path + 1)`), then landed → final over the still stretch. Without them, `landing` is 1 and the blend is as before.

### Task 4: Verify and open the PR

- [ ] `pnpm models`: only `crane.fold` changes, by gaining `foldapp:landedOrders` on frames 15–17.
- [ ] `pnpm vitest run && pnpm build && pnpm check`, then `pnpm test:e2e` (port 4173 free first; stop the server after).
- [ ] `graphify update .`, push `feat/collapse-tuck`, draft PR, ponytail review, ready.
