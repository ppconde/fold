# Squash creases and the path solver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Snail's step-5 squash can be built: the builder lays down a squash's creases without a step of their own, and the path solver no longer contradicts itself when faces land exactly on each other.

**Architecture:** Two small fixes found while prototyping the Snail (roadmap item 2). (1) `overlap()` in `models/solve.ts` clips one face by another with Sutherland–Hodgman. When two faces land exactly on each other their edges are collinear, rounding makes `keep()` disagree across an edge parallel to the clip line, the intersection divides 0 by 0, and the NaN area and centre slip past `area < 1e-9`; `motionOrders` then reads `d = NaN` as "below", which closes a cycle and `stackAt` throws "faceOrders contradict each other". Points within 1e-12 of a clip edge count as inside, and a NaN `d` throws instead of becoming an order. (2) `foldSequence().mark(name, p, q, opts)` makes the creases a fold along p→q would make, left flat, with no step, so a following `collapse` can set them (a squash's lines, which the book never pre-creases).

**Tech Stack:** TypeScript, Vitest, pnpm.

**Spec:** `docs/superpowers/plans/2026-10-08-origami-booklet.md` (roadmap item 2, the Snail, needs this first).

## Global Constraints

- Engine/builder only; the Snail is the next PR.
- The crane's `.fold` changes, and only by losing spurious face orders: pairs that never overlap ([2, 3] on the flat sheet at frame 0; [11, 33] at frame 6; [2, 33] at frame 12). No angle, path or other field changes. Dog face, tulip and the SVGs stay byte-identical.
- No new dependencies. Match surrounding style: short JSDoc, lowercase `//` comments that say why.
- After code changes, run `graphify update .` (project CLAUDE.md).

## Review Focus

1. Two faces landing exactly on top of each other through a multi-layer fold get an order, not a NaN (Task 1 test).
2. A NaN anywhere in the approach test throws a named error instead of writing an order (Task 1, by construction: `!(Math.abs(d) >= 1e-9)`).
3. `mark` leaves no step, no angle and the stack untouched; a later `collapse` can set its creases (Task 2 test).
4. Existing models: only the crane's face orders above change (Task 3).

---

### Task 1: `overlap()` survives coincident faces

**Files:**
- Modify: `models/solve.ts` (`overlap`, ~line 224; `motionOrders`, the `Math.abs(d) < 1e-9` check)
- Test: `models/sequence.test.ts` (in `describe('foldSequence')`)

- [ ] **Step 1: Write the failing test** — the Snail's first four steps plus its squash lines, with the solver on. Two folded-in corners land exactly on each other through eight layers.

```ts
  it('orders faces that land exactly on each other through a many-layer fold', () => {
    // the Snail's opening: corners to the middle, then in half twice, then the squash's lines
    const s = diamondSequence();
    const d = diamond;
    const flat = (x: number, y: number): [number, number] => [(2 - x + y) / 2, (x + y) / 2];
    s.crease('across', d(2, 0), d(0, 0), { valley: true, hold: d(1, 0.5), ...text });
    s.crease('upright', d(1, -1), d(1, 1), { valley: true, hold: d(1.5, 0), ...text });
    s.together(text, () => {
      s.fold('sideL', d(0.5, -0.5), d(0.5, 0.5), { valley: true, hold: d(1, 0), ...text });
      s.fold('sideR', d(1.5, 0.5), d(1.5, -0.5), { valley: true, ...text });
    });
    s.split('across1', flat(0.5, 0));
    s.split('across1.2', flat(1.5, 0));
    s.fold('half', d(0, 0), d(2, 0), { valley: true, hold: d(1, -0.5), ...text });
    s.split('upright1', flat(1, 0));
    s.fold('quarter', d(1, 0), d(1, -1), { valley: true, hold: d(0.75, -0.5), ...text });
    s.mark('mid', d(0.5, -0.5), d(1, 0), { valley: true, ...text });
    const model = loadModel(buildFold(s.source({ ...entry, tags: [], solve: true })));
    expect(checkModel(model)).toEqual([]);
  });
```

This test also needs `mark` (Task 2). Do Task 2's implementation step first if running tasks strictly in order, or write both tests, then both fixes.

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run models/sequence.test.ts -t "land exactly"`
Expected: FAIL with `Step 6 faceOrders contradict each other at face 1.`

- [ ] **Step 3: Fix `overlap()` and the NaN guard**

In `overlap`:

```ts
    // within a hair of the edge counts as inside: faces lying exactly on each other have collinear edges,
    // and rounding either side of one would cut a parallel edge (0 / 0)
    const keep = (v: Vec2) => (q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0]) >= -1e-12;
```

In `motionOrders`, replace `if (Math.abs(d) < 1e-9) {` with:

```ts
        if (!(Math.abs(d) >= 1e-9)) {
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm vitest run models/sequence.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add models/solve.ts models/sequence.test.ts models/sequence.ts
git commit -m "Solver: faces landing exactly on each other get an order, not NaN"
```

### Task 2: `mark` lays a squash's creases without a step

**Files:**
- Modify: `models/sequence.ts` (new method before `collapse`)
- Test: `models/sequence.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
  it('marks creases without a step, flat, for a collapse to set', () => {
    const s = foldSequence();
    s.mark('m', [0.5, 0], [0.5, 1], { valley: true, ...text });
    const src = s.source({ ...entry, tags: [] });
    expect(src.steps).toEqual([]);
    expect(Object.keys(src.creases)).toEqual(['m1']);
    s.collapse({ m1: 180 }, { hold: [0.75, 0.5], ...text });
    expect(checkModel(loadModel(buildFold(s.source({ ...entry, tags: [] }))))).toEqual([]);
  });
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run models/sequence.test.ts -t "marks creases"`
Expected: FAIL with `s.mark is not a function`.

- [ ] **Step 3: Implement**

```ts
    /** The creases a fold along p→q would make (`opts` picks the layers), left flat with no step: a squash's lines. */
    mark(name: string, p: Vec2, q: Vec2, opts: FoldOptions) {
      const before = pieces;
      const prior = { ...state };
      api.fold(name, p, q, opts);
      for (const k of Object.keys(steps.pop()?.fold ?? {})) {
        if (k in prior) state[k] = prior[k];
        else delete state[k];
      }
      pieces = before;
    },
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm vitest run models/sequence.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add models/sequence.ts models/sequence.test.ts
git commit -m "Builder: mark() lays creases without a step"
```

### Task 3: Rebuild, verify, open the PR

- [ ] **Step 1:** `pnpm models && git status --short public/models` — expected: only `public/models/crane.fold` changes. Confirm with a script that every frame is equal except `faceOrders`, and that the only removed orders are the three listed in Global Constraints, none added.
- [ ] **Step 2:** `pnpm vitest run && pnpm build && pnpm check` — all pass; commit any formatting.
- [ ] **Step 3:** `pnpm test:e2e` — PASS. Stop any preview server afterwards.
- [ ] **Step 4:** `graphify update .`
- [ ] **Step 5:** Commit the crane rebuild, push `feat/squash-solver`, open the PR against `main` (draft first, ready after a ponytail review).
