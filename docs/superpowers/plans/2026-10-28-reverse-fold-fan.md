# Reverse fold fan (option G) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A reverse fold's flap fans across its fold line inside the body, which opens like a book to take it. This replaces the flip and the pivot.

**Architecture:**
- `foldedPositions` (src/fold/fold.ts) keeps its plain path. On a reverse step, `fanned` post-processes it: the moving faces fan between their plain start and end corners, and the still faces turn as two rigid groups about the body's far edge.
- `reverseFan(model, step)` replaces `reverseTurn`. It holds everything per step and is cached in a WeakMap like today. Everything is computed in world coordinates from the plain corners, so the whole-model turn needs no special case.

**Tech Stack:** TypeScript, three.js (`Vector3`, `Matrix4`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-17-reverse-fold-tuck-motion-design.md`, section "Revision 2026-10-28: fan the flap through the opening body", plus "Decisions made without the user (2026-10-28)".

## Global Constraints

- Work in the worktree `../fold-reverse-tuck-motion`. Engine work goes on branch `reverse-tuck-motion`, so PR 1 never ships the flip. `reverse-no-ghost` and `crane-no-precrease` are rebased onto it afterwards (Task 2).
- No `git stash`: back files up to the session scratchpad instead.
- Opening: `28° · sin(π s)`, where s = `progress(t)`. Each still group turns by half of that.
- Fit: `fit = min(1, 0.9 · reach / longest)` and `k(u) = 1 − (1 − fit) · sin(π u)`, with u = s.
- Pinch arrows: full until s = 1/12, gone by s = 1/6.
- Continuity: each step must start and end exactly where the plain path does, so return the plain corners at s = 0 and s = 1. The `leaves collapse tucks and ordinary steps alone` snapshot must stay byte-identical.
- `crossings` and `tradesPlaces` must be clean at 40 samples on the neck, tail and head. If not, widen or retime the opening; if that fails, **stop and ask the user**.
- Don't push or open PRs without the user's go-ahead. PR 1 must say it shouldn't deploy without PR 2.
- After code changes, run `graphify update .` in the main checkout once the branch lands, per CLAUDE.md. Not needed in the worktree.

## Review Focus

1. **A flap corner lying exactly on the fold line on the body's side** (φ₀ = ±π). It must go round the same way as the rest, using the majority sign, or the flap tears. Pinned by the flap-seams `spread` check at 40 samples in Task 1.
2. **Body seams between the front and back groups** away from the hinge. They part mid-step by design. `spread` must still measure seams *within* each group, so a real tear in one side is caught. Pinned by `still measures the body's own seams` (models.test.ts) and a new within-group test.
3. **The head step:** a small flap on a two-layer neck. The tail's and head's short way must not cut through the neck's layers. Pinned by the 40-sample crossings test, which covers all three steps.
4. **Scrubbing anywhere, or backwards.** `foldedPositions` is a pure function of t, and `progress` clamps. A test samples t = 0, 0.25, 0.5, 0.75, 1 twice in different orders and expects identical output (the cache must not depend on the order).
5. **A reverse step that also turns the whole model.** The crane has none, and the fan assumes it. Pin it with a test that every reverse step's `rotation` equals the previous step's, and add a `ponytail:` comment in `reverseFan`.

---

### Task 0: Commit the spec revision on the engine branch

**Files:**
- Modify: `docs/superpowers/specs/2026-10-17-reverse-fold-tuck-motion-design.md` (on `reverse-tuck-motion`)
- Create: `docs/superpowers/plans/2026-10-28-reverse-fold-fan.md` (this file)

- [ ] **Step 1:** Copy both files from the worktree (currently on `crane-no-precrease`, uncommitted) to the scratchpad, `git checkout -- <spec>` and remove the plan file, then `git checkout reverse-tuck-motion`, copy both back, and run `git diff --stat`. Expected: only those two files.
- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-10-17-reverse-fold-tuck-motion-design.md docs/superpowers/plans/2026-10-28-reverse-fold-fan.md
git commit -m "Spec: a reverse fold fans its flap through the opening body (option G)"
```

### Task 1: Engine, fan the flap and open the body like a book

**Files:**
- Modify: `src/fold/fold.ts`
  - remove `REVERSE_FLIP`, `REVERSE_OPEN`, `opening()`, `reverseTurn`, `ReverseTurn`;
  - `travel()` returns all zeros for a reverse fold;
  - strip the `flip`, `turnBack`, `flipRise`, `stackUp` and `turning` code from `foldedPositions`; moving faces' lifts blend with `u` like everyone else's.
- Modify: `src/fold/reverse.ts`
  - `pinchArrows` gates on `isReverseFold`;
  - change the `pinchOpacity` timing.
- Modify: `models/check.ts`
  - `spread` keys by fan group;
  - reverse steps sample 40 times instead of the flip samples.
- Test: `src/fold/fold.test.ts`, `src/fold/reverse.test.ts`, `models/models.test.ts`

**Interfaces:**
- Produces, in `src/fold/fold.ts`:
  ```ts
  export type ReverseFan = {
    pivot: Vec3;        // where the new crease meets the spine (world, from the plain start corners)
    normal: Vec3;       // the body's plane normal (unit; sign doesn't matter)
    line: Vec3;         // unit, in the plane, through pivot: the fold line, pointing AWAY from the body's middle
    side: 1 | -1;       // way round for corners lying on −line (majority sign of their start angle)
    reach: number;      // max over still faces' end corners of (q − pivot)·line
    fit: number;        // min(1, 0.9 · reach / longest flap radius at the start)
    hinge: { point: Vec3; dir: Vec3 }; // the body's far edge: along the flap's start spine, through the still corner farthest across from the flap
    group: (0 | 1 | -1)[]; // per face: 0 moving (the flap), ±1 the still face's side of the flap's middle height at the end
    sense: Record<1 | -1, 1 | -1>; // per still group, the turn sign about hinge.dir that opens it
    from: Vec3[][];     // plain corners at t = 0 (cached)
    to: Vec3[][];       // plain corners at t = 1 (cached)
  };
  export function reverseFan(model: Model, step: number): ReverseFan | null; // null unless isReverseFold
  export const REVERSE_OPEN_DEG = 28;
  ```
- Consumes: `isReverseFold`, `movingFaces`, `progress`, `turnAbout(point, axis, angle): Matrix4` (all existing in fold.ts).
- Removed (later branches must stop importing them): `REVERSE_FLIP`, `REVERSE_OPEN`, `reverseTurn`.

**The fan, per moving corner p (start) and e (its end):** the signatures don't determine this, so here it is.

```ts
// plane coords about the pivot: a along line, b along n × line, h along normal
const phi0 = |phi| ≈ π (within 1e-9) ? side * Math.PI : Math.atan2(b, a);
const k = 1 - (1 - fit) * Math.sin(Math.PI * s);
const phi = phi0 * (1 - 2 * s);          // halfway: every corner lies along +line
const h = hStart + (hEnd - hStart) * s;  // hStart from p, hEnd from e
// corner = pivot + k·r·(cos phi · line + sin phi · (n × line)) + h·normal
```

The fold line is the mirror line that best maps the moving start corners onto their end corners in the plane: keep the existing `cos2`/`sin2` fit from `reverseTurn` (lines 584–596), run on `from`/`to` instead of the tucked pose. The body's middle is the centroid of the still faces' `to` corners. Flip `line` if `(middle − pivot)·line > 0`.

**The book, per still face in group g:** rotate its plain corners at t about `hinge` by `sense[g] · (REVERSE_OPEN_DEG/2)° · sin(π s)`. `sense[g]` is the sign for which a small turn of the group's centroid moves it away from the flap's middle height (as `groupSign` does in the sketch).

- [ ] **Step 1: Write the failing tests** in `src/fold/fold.test.ts`, in `describe('reverse folds')`.

  Delete these tests, which pin the flip and the pivot:
  - `flips the flap exactly onto its tucked pose`
  - `pivots the flap rigidly`

  Keep these unchanged:
  - `starts each step where the last one ended`
  - `keeps the flap at its pivot, on the body, all step`
  - `turns the flap the way its tuck arrow bows`
  - `opens the body and closes it again`
  - the snapshot test

  Add:

```ts
it('fans the flap onto its fold line halfway, inside the body', () => {
  for (const k of reverse) {
    const fan = reverseFan(crane, k)!;
    const mid = foldedPositions(crane, k, 0.5); // progress(0.5) = 0.5
    for (const f of moving(k)) for (const p of mid[f]) {
      const d = sub(p, fan.pivot);
      const n = new Vector3(...fan.normal), L = new Vector3(...fan.line);
      const inPlane = d.addScaledVector(n, -d.dot(n));
      expect(inPlane.clone().cross(L).length()).toBeLessThan(1e-9);    // on the line
      expect(inPlane.dot(L)).toBeGreaterThanOrEqual(-1e-9);            // on the far side
      expect(inPlane.dot(L)).toBeLessThanOrEqual(0.9 * fan.reach + 1e-9); // inside the body
    }
  }
});

it('shortens the flap only as much as the body needs', () => {
  for (const k of reverse) {
    const { fit } = reverseFan(crane, k)!;
    expect(fit).toBeGreaterThan(0.3);
    expect(fit).toBeLessThan(0.5);    // spec: about 0.39, 0.39, 0.36
  }
});

it('takes the neck the long way round and the tail and head the short way', () => {
  // the tip's start angle about the pivot from the fold line: it sweeps 2|φ₀|
  const [neck, tail, head] = reverse;
  const sweep = (k: number) => { /* tip = moving corner farthest from pivot in `from`; return 2·|φ₀| */ };
  expect(sweep(neck)).toBeGreaterThan(Math.PI);
  expect(sweep(tail)).toBeLessThan(Math.PI);
  expect(sweep(head)).toBeLessThan(Math.PI);
});

it('opens each side of the body 14° at the peak, as one piece', () => {
  for (const k of reverse) {
    const fan = reverseFan(crane, k)!;
    const [mid, end] = [foldedPositions(crane, k, 0.5), foldedPositions(crane, k, 1)];
    fan.group.forEach((g, f) => {
      if (g === 0) return;
      expect(normalOf(mid[f]).angleTo(normalOf(end[f]))).toBeCloseTo((14 * Math.PI) / 180, 6);
    });
  }
});

it('gives the same pose for any t, whatever order it is asked in', () => {
  const ts = [0, 0.25, 0.5, 0.75, 1];
  for (const k of reverse) {
    const a = ts.map((t) => foldedPositions(crane, k, t));
    const b = [...ts].reverse().map((t) => foldedPositions(crane, k, t)).reverse();
    expect(b).toEqual(a);
  }
});

it("doesn't turn the whole model during a reverse fold", () => {
  for (const k of reverse) expect(crane.steps[k].rotation).toEqual(crane.steps[k - 1].rotation);
});
```

  (`normalOf(face: Vec3[]): Vector3` is a local helper: the normalised cross product of the first three corners.)

  In `models/models.test.ts`:
  - **Delete** `checks catch a reverse fold whose flap turns over the wrong way`. The flip sense is gone; the sweep test replaces it.
  - **Change** the crossings test to 40 samples (it already uses `i / 40`).
  - **Replace** `still measures the body's own seams while the flap pivots`. Its faces 34 and 35 may now sit in opposite groups, and their parting is the designed break. The replacement is generic:

```ts
it("still measures each side's own seams while the body opens", () => {
  for (const k of reverse) {
    const { group } = reverseFan(model, k)!;
    const faces = foldedPositions(model, k, 0.7);
    // the widest gap between two copies of one vertex on still faces in the same group
    let gap = 0;
    model.faces.forEach((a, f) => model.faces.forEach((b, g) => {
      if (f >= g || group[f] === 0 || group[f] !== group[g]) return;
      a.forEach((v, i) => { const j = b.indexOf(v); if (j >= 0) gap = Math.max(gap, Math.hypot(...faces[f][i].map((x, n) => x - faces[g][j][n]))); });
    }));
    expect(spread(model, k, 0.7)).toBeGreaterThanOrEqual(gap);
    expect(spread(model, k, 0.7)).toBeLessThanOrEqual(SEAM_BUDGET);
  }
});
```

  In `src/fold/reverse.test.ts`, change `pinchOpacity`:

```ts
expect([0, 1 / 12, 1 / 8, 1 / 6, 1].map(pinchOpacity)).toEqual([1, 1, expect.closeTo(0.5, 9), 0, 0]);
```

- [ ] **Step 2: Run the tests and check they fail**

  Run: `corepack pnpm vitest run src/fold models`
  Expected: FAIL. `reverseFan` is not exported, and `pinchOpacity` gives the old timing.

- [ ] **Step 3: Implement**
  - In `fold.ts`:
    - add `reverseFan` and `REVERSE_OPEN_DEG`;
    - rename the current `foldedPositions` body to `plainPositions(model, step, t)` (not exported) and strip the flip and pivot code from it;
    - the new `foldedPositions` returns `plainPositions` unless `reverseFan` is non-null and 0 < s < 1, in which case it applies the fan and the book;
    - `reverseFan` caches `from = plainPositions(…, 0)` and `to = plainPositions(…, 1)`.
  - In `reverse.ts`: `pinchOpacity = (s) => Math.max(0, Math.min(1, (1 / 6 - s) * 12))`, and update its doc comment.
  - In `check.ts`:
    - `spread`'s key becomes `` `${keys[f][c]} ${fan ? fan.group[f] : 0}` ``, and the comment explains the three rigid pieces;
    - export `SEAM_BUDGET` (the new models test uses it);
    - drop the `flip` samples; reverse steps use `ts = Array.from({ length: 40 }, (_, i) => (i + 1) / 40)`;
    - remove the `REVERSE_FLIP` import.

- [ ] **Step 4: Run all checks and confirm they pass**

  Run: `corepack pnpm vitest run && corepack pnpm tsc --noEmit && corepack pnpm lint`
  Expected:
  - all pass;
  - the snapshot is unchanged (no `-u`);
  - `checkModel` on the crane reports no problems.

  If crossings or tradesPlaces fire, first retime the opening (peak earlier) or raise `REVERSE_OPEN_DEG`, up to 40°. If that fails, **stop and ask the user**, with the step, the t and the faces.

- [ ] **Step 5: Commit**

```bash
git add src/fold models
git commit -m "Engine: a reverse fold fans its flap through the opening body, no flip or pivot"
```

### Task 2: Rebase the stack, rename the e2e test, and look at it

**Files:**
- Modify (during rebase): `src/fold/reverse.ts`, `src/fold/reverse.test.ts`, `src/player/Paper.tsx`, `src/fold/__snapshots__/fold.test.ts.snap`, as conflicts need.
- Modify: `e2e/player.spec.ts`: rename `the neck turns over, and the flap changes` to `the neck tucks in, and the flap changes`. The body is unchanged.

- [ ] **Step 1:** Back up the three branch tips: `git branch backup/<name>-pre-fan <name>`.
- [ ] **Step 2:** Rebase the two branches above the engine branch:
  - `git rebase --onto reverse-tuck-motion 412b1c7 reverse-no-ghost`;
  - `git rebase --onto reverse-no-ghost backup/reverse-no-ghost-pre-fan crane-no-precrease`.

  Resolve conflicts in favour of the new engine API (`REVERSE_FLIP`, `reverseTurn` no longer exist). Re-run the snapshot only where `crane-no-precrease` changes the crane's steps: `corepack pnpm vitest run -u src/fold/fold.test.ts`. Then `git diff` the snapshot: only crane entries may change.
- [ ] **Step 3:** On `crane-no-precrease`, rename the e2e test and run:

  `corepack pnpm vitest run && corepack pnpm tsc --noEmit && corepack pnpm lint && corepack pnpm playwright test e2e/player.spec.ts`

  Expected: all pass.
- [ ] **Step 4:** Check by eye in the browser. Use the dev server on :5288 (already running from this worktree): steps 16, 17 and 18 of the crane.
  - Scrub each step slowly and orbit from the front, back, top and side.
  - Look for paper through paper, flicker or a jump at the ends.
  - Screenshot each at 25%, 50% and 75% into the scratchpad, and show them to the user.
- [ ] **Step 5: Commit** the e2e rename on `crane-no-precrease`:

```bash
git add e2e/player.spec.ts
git commit -m "e2e: the neck tucks in, and the flap changes"
```

  Then report to the user. Push and PRs wait for their go-ahead.
