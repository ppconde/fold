# Player Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each step easier to follow. Three changes:
- The step's crease glows terracotta on the 3D paper, starting just before the fold moves.
- A "Fold progress" slider lets learners scrub through a step at their own pace.
- The 3D code is lazy-loaded, so the page appears faster on phones.

**Architecture:**
- **Pure changes, unit-tested:**
  - The player reducer gains a lead-in hold, a `scrub` action, and mid-step Next/Prev.
  - `lineGroups` gains an `active` group.
- **UI changes, e2e-tested:** the slider, a fourth terracotta line set in `Paper`, and `Stage` loaded with `React.lazy`.

**Tech Stack:** React 19 (`lazy`, `Suspense`), React Three Fiber/drei `Line`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-04-fold-restart-design.md` §7 and §8. This builds on the M2 player, which is on branch `feat/player`.

## Global Constraints

- `src/player/player-state.ts` and `src/player/paper-geometry.ts` stay pure: no React or DOM.
- Active-crease colour: terracotta `#B8613F`. Line width is `2.5 × textScale`, and the line is drawn on top of the other lines.
- Lead-in: `LEAD_IN_SECONDS = 0.6` at 1×. It is scaled by speed the same way the fold is. It applies to `next` and `replay` only. Prev and scrub have no lead-in.
- "Well folded!" (`status === 'done'`) only shows when `step === last && t === 1` and the step is not playing.
- Slider:
  - native `<input type="range">`, min 0, max 100, step 1
  - `aria-label="Fold progress"`, `aria-valuetext="{n}% folded"`
  - hidden on step 0
  - at least 44px tall to tap
  - the player's ←/→/Space shortcuts are ignored while it has focus
- `<main>` also exposes `data-progress={Math.round(t * 100)}` so tests can read it.
- Tap targets are ≥ 44px. Every axe check must pass. The dock must still fit a 360px phone (existing e2e test).
- Branch: `feat/player-polish`, from `feat/player`.

## Review Focus

1. **Scrub, then Next.** It must finish the current step, not skip to the next one. Tested in Task 1 and Task 3.
2. **Scrub the last step partway.** No "Well folded!" card until it is fully folded. Tested in Task 1 and Task 3.
3. **Arrow keys on the focused slider.** They move the slider and must not change the step. Tested in Task 3.
4. **Tapping Next during the lead-in.** It is ignored, like any input while playing. The lead-in counts as playing. Tested in Task 1.
5. **Slow 3D chunk download.** The dock and instructions are usable before the canvas exists. Tested in Task 4 by delaying the chunk with route interception.

---

### Task 1: Player state — lead-in, scrub, mid-step Next/Prev, done needs t = 1

**Files:**
- Modify: `src/player/player-state.ts`
- Modify: `src/player/player-state.test.ts`

**Interfaces:**
- Produces:
  - `LEAD_IN_SECONDS = 0.6`
  - `PlayerState` gains `hold: number` (lead-in seconds at 1× still to wait)
  - `PlayerAction` gains `{ type: 'scrub'; t: number }`
  - `playerStatus` returns 'done' only when `t === 1`

- [ ] **Step 1: Update the existing tests that the lead-in changes, and add new ones** in `src/player/player-state.test.ts`. Import `LEAD_IN_SECONDS`.

Replace the body of "plays the next step once and stops" with:

```ts
    let s = run(initPlayer(3, 0, false), { type: 'next' });
    expect(s).toMatchObject({ step: 1, t: 0, playing: true, direction: 1, hold: LEAD_IN_SECONDS });
    s = run(s, secs(LEAD_IN_SECONDS / 2));
    expect(s.t).toBe(0);
    s = run(s, secs(LEAD_IN_SECONDS / 2 + STEP_SECONDS / 2));
    expect(s.t).toBeCloseTo(0.5);
    s = run(s, secs(STEP_SECONDS));
    expect(s).toMatchObject({ step: 1, t: 1, playing: false });
```

Replace the body of "respects speed" with:

```ts
    const s = run(
      initPlayer(3, 0, false),
      { type: 'cycleSpeed' },
      { type: 'next' },
      secs((LEAD_IN_SECONDS + STEP_SECONDS / 2) / 1.5)
    );
    expect(s.speed).toBe(1.5);
    expect(s.t).toBeCloseTo(0.5);
    expect(run(s, { type: 'cycleSpeed' }).speed).toBe(0.5);
```

Change "replays the current step from the start" to expect `{ step: 2, t: 0, playing: true, hold: LEAD_IN_SECONDS }`.

Change "plays the current step backwards…" to also expect `hold: 0` in the first `toMatchObject`.

Add:

```ts
  it('carries leftover time from the lead-in into the fold', () => {
    const s = run(initPlayer(3, 0, false), { type: 'next' }, secs(LEAD_IN_SECONDS + STEP_SECONDS / 4));
    expect(s.hold).toBe(0);
    expect(s.t).toBeCloseTo(0.25);
  });

  it('scrubs to a point in the current step and pauses there', () => {
    const playing = run(initPlayer(3, 1, false), { type: 'next' }, secs(1));
    const s = run(playing, { type: 'scrub', t: 0.4 });
    expect(s).toMatchObject({ step: 2, t: 0.4, playing: false, hold: 0 });
    expect(run(s, { type: 'scrub', t: 7 }).t).toBe(1);
    expect(run(s, { type: 'scrub', t: Number.NaN }).t).toBe(0.4);
  });

  it('cannot scrub the flat sheet', () => {
    const flat = initPlayer(3, 0, false);
    expect(playerReducer(flat, { type: 'scrub', t: 0.5 })).toBe(flat);
  });

  it('finishes the current step when Next is pressed part-way through it', () => {
    const s = run(initPlayer(3, 2, false), { type: 'scrub', t: 0.4 }, { type: 'next' });
    expect(s).toMatchObject({ step: 2, t: 0.4, playing: true, direction: 1, hold: 0 });
    expect(run(s, secs(STEP_SECONDS))).toMatchObject({ step: 2, t: 1, playing: false });
  });

  it('unfolds from the scrubbed point when Previous is pressed part-way through', () => {
    const s = run(initPlayer(3, 2, false), { type: 'scrub', t: 0.4 }, { type: 'prev' });
    expect(s).toMatchObject({ step: 2, t: 0.4, playing: true, direction: -1, hold: 0 });
    expect(run(s, secs(STEP_SECONDS))).toMatchObject({ step: 1, t: 1, playing: false });
  });

  it('is only done once the last step is fully folded', () => {
    const partWay = run(initPlayer(3, 3, false), { type: 'scrub', t: 0.3 });
    expect(playerStatus(partWay)).toBe('idle');
    expect(playerStatus(run(partWay, { type: 'scrub', t: 1 }))).toBe('done');
    expect(playerReducer(partWay, { type: 'next' }).playing).toBe(true);
  });
```

Run: `pnpm vitest run src/player/player-state.test.ts`. Expected: FAIL (`hold` and `scrub` are unknown).

- [ ] **Step 2: Implement in `src/player/player-state.ts`**

```ts
export const SPEEDS = [0.5, 1, 1.5] as const;
export type Speed = (typeof SPEEDS)[number];
/** Seconds one step takes at 1×. */
export const STEP_SECONDS = 2.4;
/** Seconds (at 1×) the step's crease glows on the still paper before the fold starts. */
export const LEAD_IN_SECONDS = 0.6;

export type PlayerState = {
  step: number;
  t: number;
  playing: boolean;
  direction: 1 | -1;
  speed: Speed;
  last: number;
  /** Lead-in seconds (at 1×) still to wait before t starts moving. */
  hold: number;
};

export type PlayerAction =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'replay' }
  | { type: 'cycleSpeed' }
  | { type: 'tick'; dt: number }
  | { type: 'goTo'; step: number }
  | { type: 'scrub'; t: number };

const clampStep = (step: number, last: number) => Math.max(0, Math.min(last, Math.trunc(step) || 0));

export function initPlayer(last: number, step: number, reducedMotion: boolean): PlayerState {
  return { step: clampStep(step, last), t: 1, playing: false, direction: 1, speed: reducedMotion ? 0.5 : 1, last, hold: 0 };
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'cycleSpeed':
      return { ...state, speed: SPEEDS[(SPEEDS.indexOf(state.speed) + 1) % SPEEDS.length] };
    case 'scrub':
      if (state.step === 0 || !Number.isFinite(action.t)) return state;
      return { ...state, t: Math.max(0, Math.min(1, action.t)), playing: false, direction: 1, hold: 0 };
    case 'tick': {
      if (!state.playing || !Number.isFinite(action.dt) || action.dt <= 0) return state;
      let moving = action.dt * state.speed;
      if (state.hold > 0) {
        if (moving < state.hold) return { ...state, hold: state.hold - moving };
        moving -= state.hold;
      }
      const t = state.t + (state.direction * moving) / STEP_SECONDS;
      if (state.direction === 1 && t >= 1) return { ...state, t: 1, playing: false, hold: 0 };
      if (state.direction === -1 && t <= 0)
        return { ...state, step: state.step - 1, t: 1, playing: false, direction: 1, hold: 0 };
      return { ...state, t, hold: 0 };
    }
  }
  if (state.playing) return state;
  switch (action.type) {
    case 'next':
      if (state.step > 0 && state.t < 1) return { ...state, playing: true, direction: 1, hold: 0 };
      return state.step >= state.last
        ? state
        : { ...state, step: state.step + 1, t: 0, playing: true, direction: 1, hold: LEAD_IN_SECONDS };
    case 'prev':
      return state.step === 0 ? state : { ...state, playing: true, direction: -1, hold: 0 };
    case 'replay':
      return state.step === 0 ? state : { ...state, t: 0, playing: true, direction: 1, hold: LEAD_IN_SECONDS };
    case 'goTo':
      return { ...state, step: clampStep(action.step, state.last), t: 1, direction: 1, hold: 0 };
  }
}

export function playerStatus(state: PlayerState): 'idle' | 'playing' | 'done' {
  if (state.playing) return 'playing';
  return state.last > 0 && state.step === state.last && state.t === 1 ? 'done' : 'idle';
}
```

Note: `prev` no longer forces `t: 1`. An idle step already sits at t = 1, unless it was scrubbed, in which case reverse play starts from the scrubbed point.

- [ ] **Step 3: Run the tests.** `pnpm vitest run`. Expected: all pass.

- [ ] **Step 4: Commit.** Run `pnpm biome check --write src/player && pnpm biome ci`, then commit as `feat(player): lead-in before each fold, scrub action, mid-step Next/Prev` with the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer.

---

### Task 2: Crease highlight

**Files:**
- Modify: `src/player/paper-geometry.ts`
- Modify: `src/player/paper-geometry.test.ts`
- Modify: `src/player/Paper.tsx`

**Interfaces:**
- Produces: `lineGroups(...)` returns `{ borders, folded, flat, active }`.
  - `active` holds every crease this step folds, whatever its current angle.
  - `folded` and `flat` now hold past creases only.

- [ ] **Step 1: Update the tests** in the `lineGroups` describe block of `src/player/paper-geometry.test.ts`.
  - "shows only borders on the flat sheet": also expect `g.active` to equal `[]`.
  - Replace "draws the active crease as folded once it moves" with:

```ts
  it('puts this step’s crease in the active group, before and after it moves', () => {
    const model = half();
    for (const t of [0, 0.5, 1]) {
      const g = lineGroups(model, foldedPositions(model, 1, t), 1, t);
      expect(g.active).toHaveLength(6);
      expect(g.folded).toEqual([]);
      expect(g.flat).toEqual([]);
    }
    const g = lineGroups(model, foldedPositions(model, 1, 0.5), 1, 0.5);
    const expected = [0.5, 0, 0, 0.5, 1, 0];
    g.active.forEach((v, i) => {
      expect(v).toBeCloseTo(expected[i], 9);
    });
  });
```

  - Replace "draws a crease that has not moved yet as flat, and earlier creases as folded" with:

```ts
  it('keeps earlier creases out of the active group', () => {
    const model = quarters();
    const g = lineGroups(model, foldedPositions(model, 2, 0), 2, 0);
    expect(g.active).toHaveLength(2 * 6);
    expect(g.folded).toHaveLength(2 * 6);
    expect(g.flat).toEqual([]);
  });
```

Run: `pnpm vitest run src/player/paper-geometry.test.ts`. Expected: FAIL (there is no `active` group yet).

- [ ] **Step 2: Implement `lineGroups`.** Replace its return type and loop:

```ts
export function lineGroups(
  model: Model,
  faces: Vec3[][],
  step: number,
  t: number
): { borders: number[]; folded: number[]; flat: number[]; active: number[] } {
  const { active, past } = stepCreases(model, step);
  const angles = anglesAt(model, step, t);
  const borders: number[] = [];
  const folded: number[] = [];
  const flat: number[] = [];
  const highlighted: number[] = [];
  model.assignments.forEach((a, e) => {
    if (a === 'B') borders.push(...segment(model, faces, e));
  });
  for (const e of active) highlighted.push(...segment(model, faces, e));
  for (const e of past) (Math.abs(angles[e]) > FOLDED_DEGREES ? folded : flat).push(...segment(model, faces, e));
  return { borders, folded, flat, active: highlighted };
}
```

- [ ] **Step 3: Draw it in `src/player/Paper.tsx`.**
  - Add `const HIGHLIGHT = '#B8613F';` next to `INK`.
  - Add a ref `const active = useRef<LineRef>(null);`.
  - In the layout effect, call `setSegments(active.current, groups.active);`.
  - Render this `Line` last, so it draws on top:

```tsx
        <Line
          ref={active}
          points={PLACEHOLDER}
          segments
          color={HIGHLIGHT}
          lineWidth={2.5 * scale}
          visible={false}
        />
```

- [ ] **Step 4: Run** `pnpm vitest run`, `pnpm biome ci` and `pnpm build`. Then build, run `pnpm preview --port 4173`, and use `playwright-cli` to screenshot `/fold/fold-in-quarters?step=1` at 1280×800 into `/tmp/polish-highlight-step1.png`. Look at it: the step-1 crease must show as a terracotta line on the folded paper. Kill the preview server afterwards.

- [ ] **Step 5: Commit** as `feat(player): highlight the step's crease on the 3D paper`, with the trailer.

---

### Task 3: Fold progress slider

**Files:**
- Modify: `src/player/Player.tsx`
- Modify: `src/player/Player.module.css`
- Modify: `e2e/player.spec.ts`

**Interfaces:**
- Consumes: `scrub` and the new Next/Prev semantics from Task 1.
- Produces: `<input type="range" aria-label="Fold progress">` inside the dock area, and `data-progress` on `<main>`.

- [ ] **Step 1: Write the failing e2e tests.** Append these to `e2e/player.spec.ts`:

```ts
test('scrubbing folds part-way, and Next finishes the same step', async ({ page }) => {
  await page.goto('/fold/fold-in-quarters?step=1');
  const progress = page.getByRole('slider', { name: 'Fold progress' });
  await progress.fill('50');
  await expect(page.locator('main')).toHaveAttribute('data-progress', '50');
  await expect(page.locator('main')).toHaveAttribute('data-step', '1');
  await expect(progress).toHaveAttribute('aria-valuetext', '50% folded');
  await page.getByRole('button', { name: 'Next step' }).click();
  await settled(page);
  await expect(page.locator('main')).toHaveAttribute('data-step', '1');
  await expect(page.locator('main')).toHaveAttribute('data-progress', '100');
});

test('a part-folded last step is not finished yet', async ({ page }) => {
  await page.goto('/fold/fold-in-half?step=1');
  await expect(page.getByText('Well folded!')).toBeVisible();
  await page.getByRole('slider', { name: 'Fold progress' }).fill('30');
  await expect(page.getByText('Well folded!')).toBeHidden();
  await page.getByRole('button', { name: 'Next step' }).click();
  await settled(page);
  await expect(page.getByText('Well folded!')).toBeVisible();
});

test('arrow keys on the slider move the fold, not the step', async ({ page }) => {
  await page.goto('/fold/fold-in-quarters?step=1');
  const progress = page.getByRole('slider', { name: 'Fold progress' });
  await progress.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('main')).toHaveAttribute('data-step', '1');
  await expect(page.locator('main')).toHaveAttribute('data-progress', '98');
});

test('the flat sheet has no progress slider', async ({ page }) => {
  await page.goto('/fold/fold-in-quarters?step=0');
  await expect(page.locator('main')).toHaveAttribute('data-step', '0');
  await expect(page.getByRole('slider', { name: 'Fold progress' })).toHaveCount(0);
});
```

Run: `lsof -ti:4173 | xargs kill 2>/dev/null; pnpm exec playwright test e2e/player.spec.ts -g "scrub|part-folded|arrow keys on the slider|no progress slider"`. Expected: FAIL.

- [ ] **Step 2: Implement in `src/player/Player.tsx`.**

1. On `<main>`, add `data-progress={Math.round(state.t * 100)}`.
2. In the keydown handler, before any other key handling, add: `if (e.target instanceof HTMLInputElement) return;`.
3. Next's `aria-disabled` becomes `(state.step === state.last && state.t === 1) || state.playing`.
4. Inside the dock `<div className={styles.dock} data-testid="dock">`, before the `.pill` div, add:

```tsx
        {state.step > 0 && (
          <input
            type="range"
            className={styles.progress}
            min={0}
            max={100}
            step={1}
            value={Math.round(state.t * 100)}
            aria-label="Fold progress"
            aria-valuetext={`${Math.round(state.t * 100)}% folded`}
            onChange={(e) => dispatch({ type: 'scrub', t: Number(e.target.value) / 100 })}
          />
        )}
```

- [ ] **Step 3: Style it in `src/player/Player.module.css`.**
  - The dock becomes a column: change `.dock` to `flex-direction: column; align-items: center; gap: 0.25rem;` and keep its existing padding.
  - In the desktop media query, the pill already has `pointer-events: auto`. Give the slider the same.
  - Add:

```css
.progress {
  width: min(22rem, 100%);
  min-height: 44px;
  margin: 0;
  accent-color: var(--terracotta);
  cursor: pointer;
}
```

  - Desktop media query: add `pointer-events: auto;` to `.progress`.

- [ ] **Step 4: Run the full checks.** `pnpm biome check --write . && pnpm biome ci`, `pnpm vitest run`, `lsof -ti:4173 | xargs kill 2>/dev/null; pnpm test:e2e`. Expected: all green on desktop and phone. That includes the existing "dock, instructions and title never overlap" and "dock fits on screen … 360px phone" tests. Fix the layout, never the tests.

- [ ] **Step 5: Screenshots.**
  - Desktop 1280×800: `/fold/fold-in-quarters?step=2`, slider at 50 → `/tmp/polish-scrub-desktop.png`.
  - `--mobile`: same page and slider value → `/tmp/polish-scrub-phone.png`.
  - Look at both. The slider sits above the dock pill, nothing overlaps, and the paper is half folded.

- [ ] **Step 6: Commit** as `feat(player): fold progress slider to scrub through a step`, with the trailer.

---

### Task 4: Lazy-load the 3D stage

**Files:**
- Modify: `src/player/Player.tsx`
- Modify: `src/player/Player.module.css`
- Modify: `e2e/player.spec.ts`

- [ ] **Step 1: Write the failing e2e test.** Append:

```ts
test('the controls work before the 3D view has loaded', async ({ page }) => {
  let release: () => void = () => {};
  const held = new Promise<void>((r) => {
    release = r;
  });
  await page.route(/\/assets\/Stage-[^/]+\.js$/, async (route) => {
    await held;
    await route.continue();
  });
  await page.goto('/fold/fold-in-quarters');
  await expect(page.locator('main')).toHaveAttribute('data-step', '0');
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next step' }).click();
  await settled(page);
  await expect(page.locator('main')).toHaveAttribute('data-step', '1');
  release();
  await expect(page.locator('canvas')).toBeVisible();
});
```

Run it. Expected: FAIL. Without a separate chunk the route never matches, so the canvas renders immediately and `toHaveCount(0)` fails.

- [ ] **Step 2: Implement.** In `src/player/Player.tsx`:
  - Replace `import { Stage } from './Stage';` with `const Stage = lazy(() => import('./Stage').then((m) => ({ default: m.Stage })));`
  - Add `lazy` and `Suspense` to the react import.
  - Wrap the existing `<Stage … />` in `<Suspense fallback={<div className={styles.stagePlaceholder} aria-hidden="true" />}>`.

  In the CSS, add:

```css
.stagePlaceholder {
  position: absolute;
  inset: 0;
  margin: auto;
  width: min(40%, 14rem);
  aspect-ratio: 1;
  border-radius: 2px;
  background: var(--off-white);
  box-shadow: 0 8px 24px rgb(43 42 40 / 0.08);
}
```

  Make sure Vite names the chunk `Stage-<hash>.js`; it does this by default from the module name. If the file name differs, adjust the test's route pattern to the real name and say so.

- [ ] **Step 3: Measure.**
  - Run `pnpm build`.
  - Record the JS chunk sizes from the Vite output, before (on the Task 3 commit) and after. Note gzip sizes for the `fold._id` route chunk and the new `Stage` chunk.
  - three.js stays in the route chunk, because the engine uses it. That's expected. drei, fiber and camera-controls should move into `Stage`.

- [ ] **Step 4: Run the full checks.** biome, vitest and e2e, as in Task 3. All green.

- [ ] **Step 5: Commit** as `perf(player): load the 3D stage separately so controls appear first`, with the trailer.
