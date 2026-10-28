# Reverse fold How drawings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The How slot on a reverse-fold step shows three book-style drawings of that fold, generated from the model, with the flap's flipping edge in yellow.

**Architecture:**
- A pure module, `src/player/how-drawing.ts`, turns `(model, step)` into 2D SVG primitives for three frames. It uses `reverseFan` and `foldedPositions` from `src/fold/fold.ts`, the way `diagram.ts` feeds `CreaseDiagram`.
- `HowSketch` renders those primitives in place of today's generic end-on sketches. Swipe, dots and the outlined current frame are unchanged.

**Tech Stack:** TypeScript, React, SVG, three.js `Vector3`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-28-reverse-fold-how-drawings-design.md`. The approved sketch is `how-drawn.html` in the session scratchpad (`preview3/`).

## Global Constraints

- Branch `reverse-how-drawings` in the worktree `../fold-reverse-tuck-motion`, stacked on `crane-no-precrease` (#505). No `git stash`. Push or open PRs only with the user's go-ahead.
- Notation (`docs/origami-diagram-conventions.md`):
  - mountain line `stroke-dasharray: 8 3 2 3`;
  - hidden or where-it-goes: dotted;
  - push: a broad arrow;
  - moving paper: a curved arrow with a filled head;
  - coloured side `model.paperColor`, white side the paper's back tone `#F3EDE2` (as `BACK` in `Paper.tsx`).
- The flipping edge is yellow `#f2b630`, 4px solid; its ghost is dotted. The app has one theme (no dark mode in `src/styles/global.css`), so one value is enough. Put it in a CSS custom property, `--spine`, in `HowSketch.module.css`.
- Always the model's plain colour, whatever paper is picked (spec, "calls").
- Captions (en), exactly:
  1. `Open the two layers a little. The folded edge in yellow is the one you'll turn inside out`
  2. `Push the folded edge in at the line: it flips and goes in between the layers`
  3. `Close and flatten. The folded edge now points the other way: the flap is inside out`
- No new dependencies.

## Review Focus

1. **Mirroring.** The drawing must not be mirrored against the default 3D view (camera at `[0, 2, 2]`; the paper group is turned −90° about x). Seen from the camera, model +x reads right and +y reads up. Pinned by a test that the neck's tip is on the same side (left) in the drawing as in `foldedPositions`.
2. **The head's tiny flap.** The frame box comes from the flap alone, so the head zooms in. A test checks the box is at most 1.6× the flap's extent.
3. **Faces seen edge-on, or standing out of the plane.** A face whose normal is nearly perpendicular to the view (|n·view| < 0.2) would draw as a sliver. Skip it. Pinned by a test that no drawn face has zero area.
4. **Overlapping layers drawn in the wrong order.** Painter order is by depth along the view normal. A test checks that frame 3 on the neck draws every body face whose depth is above the flap's after the flap.
5. **Phone sheet height.** The longer captions must still fit without scrolling. Covered by the existing Portuguese e2e test, `the how sheet fits without scrolling`.

---

### Task 0: Commit the conventions doc with the yellow edge

**Files:**
- Create: `docs/origami-diagram-conventions.md` (copy of the main checkout's untracked file)

- [ ] **Step 1:** Copy `/Users/ppconde/Documents/repos/fold/docs/origami-diagram-conventions.md` into the worktree. Under "Our additions", replace the `*(none)*` bullet with:

  > - **The flipping edge** on a reverse fold: the flap's folded edge (its spine), the part that turns inside out, drawn yellow (`--spine`) in every frame. It's solid where it is and dotted where it goes or was. Books pick out the part they talk about with a colour or tone, so it reads without a legend. Used by the How drawings (`src/player/how-drawing.ts`).

  Keep the "Rejected (2026-10-28)" paragraph.
- [ ] **Step 2: Commit**

```bash
git add docs/origami-diagram-conventions.md
git commit -m "Docs: origami diagram conventions (Yoshizawa–Randlett), with the flipping edge as our one addition"
```

### Task 1: Geometry, `howDrawing(model, step)`

**Files:**
- Create: `src/player/how-drawing.ts`
- Test: `src/player/how-drawing.test.ts`

**Interfaces:**
- Consumes, from `src/fold/fold.ts`:
  - `reverseFan(model, step): ReverseFan | null`, using `pivot`, `normal`, `line`, `from`, `to`, `group`;
  - `movingFaces`.
- Produces:
  ```ts
  export type Seg = { from: Vec2; to: Vec2; hidden: boolean };
  export type HowFace = { points: Vec2[]; side: 'front' | 'back'; edges: [Vec2, Vec2][] };
  export type HowFrame = {
    faces: HowFace[];                     // painter order, back to front
    peek: Vec2[] | null;                  // frame 0: the layer behind the flap, white side, drawn first
    fold: Seg[];                          // frames 0–1: mountain line
    spine: (Seg & { ghost: boolean })[];  // the flipping edge: solid, plus a ghost (frame 1: where it goes; frame 2: where it was)
    landing: Vec2[] | null;               // frame 1: dotted outline of the flap where it lands
    push: { at: Vec2; dir: Vec2 } | null; // frame 1: broad arrow at the spine, `dir` unit, pointing in
    arrow: { from: Vec2; to: Vec2; control: Vec2 } | null; // frame 1: quadratic curve, filled head at `to`
  };
  export type HowDrawing = { box: [x: number, y: number, w: number, h: number]; frames: [HowFrame, HowFrame, HowFrame] };
  export function howDrawing(model: Model, step: number): HowDrawing | null; // null unless reverseFan is non-null
  ```
  Coordinates are SVG-style (y down), in model units. The box is square, so it matches the CSS `aspect-ratio: 1`.

**Decisions the signature doesn't fix:**
- **View:**
  - `view` = `fan.normal`, flipped so `view.z > 0` (the camera side);
  - `ex` = world x projected into the plane and normalised (or world y if x is within 0.2 of `view`);
  - `ey = view × ex`;
  - a point projects to `[(p − pivot)·ex, −(p − pivot)·ey]`.
- **Poses:** frames 0–1 use `fan.from`; frame 2 uses `fan.to`.
- **Faces:**
  - Skip a face if |its normal · view| < 0.2. The normal is the cross product of its first three corners.
  - `side` is `'front'` when its normal · view > 0.
  - Order faces by mean depth `(p − pivot)·view`, ascending.
- **Edges of a face:** consecutive corner pairs whose model edge has assignment `B`, or whose angle at that pose is ±180. The angles are `model.steps[step − 1].angles` for frames 0–1 and `model.steps[step].angles` for frame 2. Look the edge up through a `Map` keyed `"min-max"` vertex ids, built once per model.
- **Fold line:** edges with `before === 0 && after !== 0`, on moving faces, projected at the start pose.
- **Spine:** edges with `|before| === 180 && after === −before`, where both of their faces are moving.
  - Frames 0–1: solid at the start pose.
  - Frame 1: ghost at the end pose.
  - Frame 2: solid at the end pose, ghost at the start pose.
- **Tip:** the moving corner that travels farthest from start to end.
- **Arrow (frame 1):**
  - from the tip at start to the tip at end, both pulled 8% towards each other;
  - `control` = the chord's midpoint + `0.35 · span` along the chord's perpendicular, on the side where the projected `fan.line` points;
  - so it bows the same way the flap fans in 3D.
- **Push (frame 1):**
  - `dir` is the in-plane perpendicular to the spine that points towards the flap's start centroid;
  - `at` = the projected pivot − `dir · 0.04 · box.w`.
- **Peek (frame 0):** the convex hull of the flap's start corners, shifted by `0.03 · box.w` along `dir`. The tests don't check it, so it's eyeballed in Task 2.
- **Landing (frame 1):** the convex hull of the flap's end corners.
- **Hidden marks:** sample each fold or spine segment at 32 points. A point is hidden when it lies inside a drawn face whose depth is more than `LAYER_GAP / 2` above the depth of the segment's own face. Consecutive runs become separate `Seg`s.
- **Box:**
  - the bounding box of the flap's projected start and end corners, scaled ×1.45 about its centre;
  - squared to its longer side.

- [ ] **Step 1: Write the failing tests** in `src/player/how-drawing.test.ts`. Load the committed crane, as `src/fold/fold.test.ts` does with `committed('crane')`. Take `reverse = steps where isReverseFold`.

```ts
it('draws only reverse folds', () => {
  expect(howDrawing(crane, reverse[0] - 1)).toBeNull();
  for (const k of reverse) expect(howDrawing(crane, k)?.frames).toHaveLength(3);
});

it('starts the flipping edge at the pivot, as it is and as it ends', () => {
  // the projected pivot is an end of every solid spine segment, in frames 0 and 2
});

it('draws the fold line within the flap, as a mountain line in the first two frames', () => {
  // every fold point lies inside the flap's start hull (tolerance 1e-9); frame 2 has no fold line
});

it('bows the tip arrow the way the flap fans', () => {
  // (control − chord midpoint) · projected fan.line > 0, for the neck, tail and head
});

it('keeps the neck on the same side as the 3D view', () => {
  // the neck's tip x in frame 0 < the pivot's x, as in foldedPositions(crane, neck − 1, 1) world x
});

it('zooms onto the flap: the box holds it, and not much more', () => {
  // all flap start and end points lie inside box; box.w ≤ 1.6 × max(flap extent x, y), for all three
});

it('draws no face edge-on, and the flap under the layers that cover it', () => {
  // every face has |signedArea| > 1e-9; on the neck's frame 2, each body face deeper-above the flap comes after every flap face
});
```

  Write each comment as real assertions with the values shown. `signedArea` is in `models/arrange.ts`; copy the one-line shoelace into the test rather than importing from `models/`.

- [ ] **Step 2: Run them and check they fail**

  Run: `corepack pnpm vitest run src/player/how-drawing.test.ts`
  Expected: FAIL, because `how-drawing.ts` doesn't exist.

- [ ] **Step 3: Implement** `src/player/how-drawing.ts` to the interface and decisions above. Cache it per model and step in a `WeakMap`, as `reverseFan` does.

- [ ] **Step 4: Run them and check they pass**

  Run: `corepack pnpm vitest run src/player/how-drawing.test.ts && corepack pnpm tsc --noEmit -p . && corepack pnpm biome check src`
  Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add src/player/how-drawing.ts src/player/how-drawing.test.ts
git commit -m "Player: a reverse fold's How drawings, made from the model"
```

### Task 2: Render them in the How slot

**Files:**
- Modify: `src/player/HowSketch.tsx`: take `model` and `step`, drop `SKETCHES`, and render each `HowFrame` as an `<svg viewBox={box}>`.
- Modify: `src/player/HowSketch.module.css`:
  - add `--spine`;
  - add classes for face fills, edges, fold (mountain dash), spine and ghost, landing (dotted, ink at 0.6 opacity), push (white fill, ink stroke), arrow;
  - remove `.layers` and `.flap`.
- Modify: `src/player/Player.tsx:197`: `<HowSketch model={model} step={state.step} frame={…} />`.
- Modify: `src/i18n/en.ts` and `src/i18n/pt.ts`, `howSteps`. English is the global constraint's text. Portuguese is a translation in the existing tone, e.g.:
  1. `Abre um pouco as duas camadas. A dobra a amarelo é a que vais virar do avesso`
  2. `Empurra a dobra para dentro, pela linha: ela vira e entra entre as camadas`
  3. `Fecha e alisa. A dobra aponta agora para o outro lado: a aba está do avesso`
- Test: `e2e/player.spec.ts`. The existing How tests stay as they are, and they cover the role, label, swipe, dots and fit. Add one assertion to `on a wide screen shows how and the creases together`: `#instructions svg path[data-spine]` has a count > 0.

**Interfaces:**
- Consumes: `howDrawing(model, step): HowDrawing | null` (Task 1).
- Produces: `HowSketch({ model, step, frame }: { model: Model; step: number; frame: 0 | 1 | 2 })`.

Rendering notes (the decisions):
- **Strokes:** all of them use `vector-effect="non-scaling-stroke"`, so widths are in CSS pixels at any zoom.
- **Face fill:** inline `fill`, `model.paperColor` for `'front'` and `#F3EDE2` for `'back'`.
- **Push mark:** the sketch's polygon (`push()` in `how-drawn.html`), scaled by `box.w / 300`.
- **Arrow:** `<path d="M from Q control to">` plus a filled triangular head, sized `9 · box.w / 300`.
- **Spine:** each segment is a `<line data-spine …>`; the attribute is the hook for the e2e test.
- **Hidden `Seg`s:** dotted, `stroke-dasharray: 1 5` with round caps.
- **When `howDrawing` returns null** (it can't on a reverse step), render nothing.

- [ ] **Step 1: Write the failing e2e assertion** (the `data-spine` count above).
- [ ] **Step 2: Build, serve and run it, and check it fails**

  Run: `corepack pnpm build && (corepack pnpm preview --port 4173 --strictPort &) && corepack pnpm playwright test e2e/player.spec.ts -g "shows how and the creases"`. Playwright's `webServer` calls bare `pnpm`, which isn't on PATH here, so serve it by hand.
  Expected: FAIL, count 0.
- [ ] **Step 3: Implement** the component, CSS, the `Player.tsx` prop and the captions.
- [ ] **Step 4: Run everything and check it passes**

  Run: `corepack pnpm tsc --noEmit -p . && corepack pnpm biome check src e2e && corepack pnpm vitest run && corepack pnpm build`, then restart the preview and run `corepack pnpm playwright test`.
  Expected: all pass, including `the how sheet fits without scrolling` (Portuguese, phone) and `a swipe moves through the sketches`.
- [ ] **Step 5: Look at it.**
  - On the dev server (:5288, this worktree), go to crane steps 16, 17 and 18 at a 900×800 desktop size and at a 360×640 phone size.
  - Screenshot the How slot at 10%, 50% and 100% into the scratchpad.
  - Compare against `how-drawn.html`:
    - the flap points the same way as in the 3D view;
    - the yellow edge moves as in the sketch;
    - the arrow bows the same side as the flap's motion;
    - the peek and the push mark sit at sensible sizes.
  - Tune the Task 1 constants if needed; the unit tests must stay green.
  - Show the screenshots to the user.
- [ ] **Step 6: Commit**

```bash
git add src/player e2e src/i18n
git commit -m "Player: the How slot draws each reverse fold from the model, its flipping edge in yellow"
```
