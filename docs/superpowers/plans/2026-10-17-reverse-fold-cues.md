# Reverse Fold Cues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** At every reverse fold the player ghosts the flap while it takes its shortcut through the body, shows a "how your hands do it" sketch in the diagram slot, and the crane gets a pre-crease step before each reverse fold.

**Architecture:** Detection is pure and lives in `src/fold/reverse.ts`, from fold angles only (no new file fields). `Paper.tsx` ghosts faces with geometry groups and a second, transparent material. The panel shows a `HowSketch` next to the existing `CreaseDiagram`; CSS picks which one shows on phones. The builder's `claim` learns to relabel a reused crease, so the crane's pre-crease steps don't undo the reverse folds' mountain/valley.

**Tech Stack:** TypeScript, React 19, three 0.186 / @react-three/fiber 9 / drei, Vitest 5, Playwright, Biome, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-17-reverse-fold-cues-design.md`

## Global Constraints

- One PR per task group: PR 1 = Tasks 1–2, PR 2 = Task 3, PR 3 = Task 4, PR 4 = Task 5. Engine/player PRs merge before the crane PR.
- Work in a worktree `../fold-<topic>` (e.g. `../fold-reverse-ghost`), never in the main checkout. No `git stash`.
- Every new string goes in `src/i18n/en.ts` and `src/i18n/pt.ts` (European Portuguese, "tu" form, as the existing strings).
- Never "illegal", "wrong" or "error" in folder-facing copy.
- A phone's step sheet must not scroll for a normal step (`max-height: 38dvh`, `Player.module.css:315`).
- After code changes run `graphify update .`.
- Before each PR: `pnpm vitest run`, `pnpm build`, `pnpm check`, `pnpm test:e2e`.
- After Tasks 2 and 5: orbit the crane in the browser at the neck, tail and head steps, from all sides (above, below, edge-on), looking for sorting artefacts and z-fighting.

## Review Focus

1. Scrubbing back past the landing point: the flap must ghost again (Task 1 test `ghosts again when scrubbed back before the landing`).
2. Step 0 and models with no reverse fold (fold-in-quarters, tulip, dog-face): never detected, never ghosted, slot shows the crease diagram (Task 1 test `finds no reverse fold in models without one`).
3. Portuguese on a phone: the longer pt captions must not make the sheet scroll (Task 3 e2e `the how sheet fits a phone in Portuguese`).
4. The pre-crease step's diagram and checks once the crease carries the reverse fold's M/V: `checkModel` must stay clean (Task 5, models test `passes every check`). If the only failure is the pre-crease step's own path contradicting the relabelled assignment, stop and report; don't loosen the check.
5. Switching language or toggling "Creases" mid-step, then pressing next: the slot goes back to "How" on the next reverse fold step (Task 3 e2e `the toggle resets on the next step`).

---

### Task 1: Detect reverse folds and the faces to ghost

**Files:**
- Create: `src/fold/reverse.ts`
- Create: `src/fold/reverse.test.ts`
- Modify: `src/fold/fold.ts:312` (extract the landing point)

**Interfaces:**
- Produces:
  - `landingAt(model: Model, step: number): number` in `fold.ts`: `1 - 1 / (path.length + 1)` when the step has `landedOrders`, else `1`. `foldedPositions` uses it instead of the inline expression.
  - `isReverseFold(model: Model, step: number): boolean` in `reverse.ts`.
  - `ghostFaces(model: Model, step: number, t: number): ReadonlySet<number>` in `reverse.ts`: the moving faces when `isReverseFold` and `t < landingAt(model, step)`, else an empty set.

- [ ] **Step 1: Write the failing tests** in `src/fold/reverse.test.ts`. Load the committed crane with `loadModel(JSON.parse(readFileSync(new URL('../../public/models/crane.fold', import.meta.url), 'utf8')))`. Find the steps by instruction (`instruction.en.startsWith('Reverse-fold')`), not by index, because Task 5 shifts the indices.

```ts
it('finds exactly the neck, tail and head', () => {
  const found = crane.steps.map((_, k) => k).filter((k) => isReverseFold(crane, k));
  expect(found.map((k) => crane.steps[k].instruction.en.slice(0, 13))).toEqual(Array(3).fill('Reverse-fold '));
});
it('finds no reverse fold in models without one', () => {
  for (const m of [loadModel(fixture('fold-in-quarters')), tulip, dogFace])
    expect(m.steps.some((_, k) => isReverseFold(m, k))).toBe(false);
  expect(isReverseFold(crane, 0)).toBe(false);
});
it('ghosts the neck flap, not the body it passes between', () => {
  const g = ghostFaces(crane, neck, 0.5);
  for (const f of [2, 5, 34, 35]) expect(g.has(f)).toBe(true);   // the leg's layers (spike doc)
  for (const f of [25, 27]) expect(g.has(f)).toBe(false);        // the body's inner layers
});
it('ghosts again when scrubbed back before the landing', () => {
  const land = landingAt(crane, neck);
  expect(ghostFaces(crane, neck, land + 0.01).size).toBe(0);
  expect(ghostFaces(crane, neck, land - 0.01).size).toBeGreaterThan(0);
  expect(ghostFaces(crane, neck, 1).size).toBe(0);
});
```

(`tulip` and `dogFace` load `public/models/tulip.fold` and `dog-face.fold` the same way.)

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/fold/reverse.test.ts`
Expected: FAIL, `reverse.ts` doesn't exist.

- [ ] **Step 3: Implement**
  - `isReverseFold`: `step > 0`, and comparing `steps[step - 1].angles` to `steps[step].angles`: at least one edge goes from ±180 to ∓180, and the edges that go from 0 to nonzero include both signs.
  - Moving faces: a face moves when its transform relative to `fixedFace` (`rootTransforms(model, angles, step)`, `T[fixed]⁻¹·T[f]`) differs, by more than 1e-6 in any matrix element, between `anglesAt(model, step, 0)` and `anglesAt(model, step, landingAt(model, step) / 2)`. The spine relabel at the start of the path is the same pose, so the flip doesn't count as movement.
  - Cache per model in a `WeakMap`, as `fold.ts` does.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/fold`
Expected: PASS, including the existing `fold.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/fold/reverse.ts src/fold/reverse.test.ts src/fold/fold.ts
git commit -m "Engine: find reverse folds and the flap they swing, from the fold angles"
```

### Task 2: Ghost the flap on the stage

**Files:**
- Modify: `src/player/Paper.tsx`
- Modify: `src/player/paper-geometry.ts` (triangle offsets per face)
- Test: `src/player/paper-geometry.test.ts`

**Interfaces:**
- Consumes: `ghostFaces(model, step, t)` (Task 1).
- Produces: `faceGroups(model: Model, ghost: ReadonlySet<number>): { start: number; count: number; materialIndex: 0 | 1 }[]` in `paper-geometry.ts`, in vertex units and in `fillTriangles` order, with neighbouring faces of the same index merged into one range.

- [ ] **Step 1: Write the failing test** `faceGroups covers every triangle once, ghosted faces on material 1`: on `fixture('fold-in-quarters')` with ghost `{1}`, the counts sum to `triangleCount(model) * 3`, the ranges are contiguous from 0, and exactly the range for face 1 has `materialIndex: 1`.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/player/paper-geometry.test.ts`
Expected: FAIL, `faceGroups` isn't defined.

- [ ] **Step 3: Implement `faceGroups`**, then in `Paper.tsx`:
  - in the existing `useLayoutEffect`, `geometry.clearGroups()` and `addGroup` from `faceGroups(model, ghostFaces(model, step, t))`;
  - give both meshes a material array `[solid, ghost]`;
  - the ghost material is a copy of the solid one with `transparent`, `opacity={GHOST_OPACITY}` and `depthWrite={false}`;
  - `const GHOST_OPACITY = 0.3;` sits beside `INK`/`HIGHLIGHT`.

  The opacity and whether it fades over a short stretch are your call (spec, "Left to the builder").

- [ ] **Step 4: Verify**

Run: `pnpm vitest run && pnpm build`
Expected: PASS.

Then `pnpm dev`, open `/fold/crane` at the neck step and scrub the slider:
- the leg goes faint until the layers swap, then turns solid;
- scrubbing back makes it faint again;
- orbit from all sides at the neck, tail and head.

- [ ] **Step 5: Commit and open PR 1**

```bash
git add src/player/Paper.tsx src/player/paper-geometry.ts src/player/paper-geometry.test.ts
git commit -m "Player: a reverse fold's flap goes faint while it takes the shortcut through the body"
```

### Task 3: The "How" slot

**Files:**
- Create: `src/player/HowSketch.tsx`, `src/player/how.ts`, `src/player/how.test.ts`
- Modify: `src/player/Player.tsx:152-158` (panel), `src/player/Player.module.css` (phone block at :307, wide block at :337)
- Modify: `src/i18n/en.ts`, `src/i18n/pt.ts` (`player` section)
- Test: `e2e/player.spec.ts`

**Interfaces:**
- Consumes: `isReverseFold`, `landingAt` (Task 1).
- Produces:
  - `sketchFrame(t: number, landing: number): 0 | 1 | 2` in `how.ts`.
  - `HowSketch({ frame }: { frame: 0 | 1 | 2 })`.

- [ ] **Step 1: Write the failing unit test** `sketchFrame follows the step to its landing`. Expected: `sketchFrame(0, 0.9)` → 0, `(0.29, 0.9)` → 0, `(0.31, 0.9)` → 1, `(0.61, 0.9)` → 2, `(0.95, 0.9)` → 2, `(1, 0.9)` → 2. The boundaries sit at `landing / 3` and `2 * landing / 3`.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/player/how.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add the strings** to `player` in `en.ts`, mirrored in `pt.ts`:

| key | en | pt |
|---|---|---|
| `reverseFold` | `reverse fold` | `dobra invertida` |
| `how` | `How` | `Como` |
| `creases` | `Creases` | `Vincos` |
| `howSteps` | `['Open the two layers a little', 'Push the flap in between them, along your crease', 'Close and flatten']` | `['Abre um pouco as duas camadas', 'Empurra a aba para dentro, entre elas, pelo teu vinco', 'Fecha e alisa']` |
| `shortcut` | `The paper on screen takes a shortcut through the body. Yours goes inside, like this.` | `O papel no ecrã atravessa o corpo por um atalho. O teu vai por dentro, assim.` |

The spec's second caption said "up". It's "in" here because the head's reverse fold goes down.

- [ ] **Step 4: Implement `HowSketch`.** It's an inline SVG of the three sketches with `role="img"` and an `aria-label` of `shortcut` plus all three `howSteps`. It draws `frame`'s sketch with three progress dots and its caption, and it doesn't announce caption changes. Use the drawings from the spec's mockup (`reverse-fold-mobile.html`) as a starting point: two layers in a V, flap in between, closed. The final drawing is yours.

- [ ] **Step 5: Wire up the panel in `Player.tsx`**
  - `const reverse = isReverseFold(model, state.step)`.
  - The step label becomes `` `${t.stepOf(…)} · ${t.reverseFold}` `` when `reverse`.
  - `const [slot, setSlot] = useState<'how' | 'creases'>('how')`, reset to `'how'` whenever `state.step` changes.
  - When `reverse`, the panel gets `data-slot={slot}` and renders:
    - a two-button toggle (`aria-pressed`);
    - `<HowSketch frame={sketchFrame(state.t, landingAt(model, state.step))} />`;
    - a `<p>` with `t.shortcut`;
    - then the existing `<CreaseDiagram>`.
  - The CSS picks what shows:
    - phone block: the slot area shows the toggle plus `HowSketch` or the diagram, chosen by `data-slot`; the shortcut `<p>` is hidden.
    - wide block: no toggle; the sketches, the shortcut, then the diagram, all visible.

- [ ] **Step 6: Write the e2e tests** in `e2e/player.spec.ts`. Use `/fold/crane?step=15` for the neck; Task 5 updates the index.
  - `the reverse fold step shows how, and creases one tap away`: the label contains `reverse fold`; the `img` named like `/takes a shortcut/` is visible; clicking `Creases` shows the crease-pattern `img` (`/Crease pattern/`).
  - `the toggle resets on the next step`: click `Creases`, press next (step 16, the tail), and `How` has `aria-pressed="true"`.
  - `the how sheet fits a phone in Portuguese` (`test.use({ viewport: { width: 360, height: 640 } })`): switch to pt; on the neck step, `#instructions` has `scrollHeight <= clientHeight`.
  - `a normal step has no toggle`: at `step=14` there's no `Creases` button.

- [ ] **Step 7: Verify**

Run: `pnpm vitest run && pnpm build && pnpm check && pnpm test:e2e`
Expected: all PASS. The axe check in `player.spec.ts` still passes.

- [ ] **Step 8: Commit and open PR 2**

```bash
git add src/player src/i18n e2e/player.spec.ts
git commit -m "Player: a reverse fold step shows how your hands do it, the creases one tap away"
```

### Task 4: A fold can relabel a crease it reuses

**Files:**
- Modify: `models/sequence.ts:161-190` (`claim`), `:289` (its call in `fold`)
- Test: `models/sequence.test.ts`

**Interfaces:**
- Produces: `claim(name, from, to, assignment, splitEnds, relabel = false)`. With `relabel`, a reused crease (`same`) takes the new `assignment`. `fold` passes `relabel = opts.tuck === true`. Nothing else changes, so turning a flap over an existing crease like a page (#453) keeps its first label.

- [ ] **Step 1: Write the failing test** `a reverse fold relabels the crease a pre-crease made`. Build a two-layer flap; `s.crease` it along a line with `valley: true`; then `s.fold` along the same line with `valley: fn, over: true, tuck: true`, where `fn` gives the opposite sense on one layer. Expect that the crease keys from the `crease` step are reused (no new keys) and carry the `tuck` fold's assignments, and that `checkModel(loadModel(buildFold(src)))` is `[]`. Model the layers on the existing test `tucks the flaps a collapse swings outside…` (`sequence.test.ts:187`).

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run models/sequence.test.ts`
Expected: FAIL, the assignments are the pre-crease's.

- [ ] **Step 3: Implement** the `relabel` parameter as specified above.

- [ ] **Step 4: Verify**

Run: `pnpm vitest run models`
Expected: PASS. The committed models are unchanged: `is committed as built` passes, since no model pre-creases a reverse fold yet.

- [ ] **Step 5: Commit and open PR 3**

```bash
git add models/sequence.ts models/sequence.test.ts
git commit -m "Engine: a reverse fold takes over the crease a pre-crease made, with its own mountain/valley"
```

### Task 5: The crane pre-creases each reverse fold

**Files:**
- Modify: `models/src/crane.ts:141-172`
- Regenerate: `public/models/crane.fold`, `public/models/crane.svg` (`pnpm models`)
- Modify: `e2e/player.spec.ts` (the step indices from Task 3)

**Interfaces:**
- Consumes: Task 4's relabel, Tasks 1–3 unchanged.

- [ ] **Step 1: Add the three steps.** Before each of `s.fold('neck' …)`, `s.fold('tail' …)` and `s.fold('head' …)`, add `s.crease` on the same line with the same `only`, `valley: true` and the same `hold`:
  - neck: en `Fold the left flap up along this line, then unfold it.` / pt `Dobra a aba da esquerda para cima por esta linha e desdobra.`
  - tail: en `Fold the right flap up along this line, then unfold it.` / pt `Dobra a aba da direita para cima por esta linha e desdobra.`
  - head: en `Fold the tip of the neck down along this line, then unfold it.` / pt `Dobra a ponta do pescoço para baixo por esta linha e desdobra.`

  Name the creases so `claim` reuses them: same line, and the reverse fold keeps its own name. Check that the reverse-fold steps add no new crease keys.

- [ ] **Step 2: Rebuild and verify**

Run: `pnpm models && pnpm vitest run`
Expected: PASS. `crane: passes every check` and `reverse.test.ts` still find exactly three reverse folds. If `checkModel` flags only the pre-crease steps, stop and report (Review Focus 4).

- [ ] **Step 3: Update the e2e indices.** Neck 15 → 16, tail 16 → 18, the normal step 14 → 15. Then:

Run: `pnpm test:e2e`
Expected: PASS.

- [ ] **Step 4: Check it in the browser** with `pnpm dev`:
  - each pre-crease step folds and unfolds on screen with no ghosting;
  - its diagram highlights the new line;
  - the reverse fold that follows ghosts its flap and shows "How";
  - orbit the crane from all sides at all six steps.

- [ ] **Step 5: Commit and open PR 4**

```bash
git add models/src/crane.ts public/models/crane.fold public/models/crane.svg e2e/player.spec.ts
git commit -m "Crane: pre-crease each reverse fold before it's made"
```
