# Paper Patterns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let people fold on procedural chiyogami papers, picked from a swatch in the player dock, live and remembered.
PR 1 ships the picker with Plain + Ichimatsu; every later paper is its own small PR following the recipe at the end.

**Architecture:** A paper is a small TS object holding two booklet colours and a GLSL function `vec3 paperColor(vec2 uv)`
in sheet space (the existing 0..1 flat-paper UVs). Patterned papers inject that function into the front-face
`meshStandardMaterial` via `onBeforeCompile` (lighting, roughness, washi map, polygon offset all unchanged); Plain is
today's material untouched. The dock gets a swatch button opening a native `popover` grid of radio swatches (bottom
sheet on phones); swatch thumbnails are rendered once from the same GLSL by a tiny offscreen three renderer.

**Tech Stack:** React 19, @react-three/fiber 9 / drei 10, three 0.186, CSS modules, vitest, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-10-17-paper-patterns-design.md`

## Global Constraints

- Procedural only: no image or photo textures for patterns.
- Front face only gets the pattern; back stays `BACK` ivory `#F3EDE2`.
- Plain = `softenTowardIvory(model.paperColor)`, rendered exactly as today. First visit = Plain.
- Selected paper always wins; stored on device under key `fold:paper` via `readStored`/`writeStored` (`src/player/browser.ts`). Unknown stored id → Plain.
- Gold is flat matte: no metalness/roughness variation.
- Washi fibre map stays over the pattern.
- Switching papers: no fold restart, no camera reset.
- Crease/cut lines readable on every paper.
- Names in en and pt (`src/i18n/en.ts`, `src/i18n/pt.ts`).
- Player only — no home page scene changes.
- Work in a worktree `../fold-paper-<topic>`, never the main checkout. One PR per paper; PR 1 = picker + Plain + Ichimatsu.
- Before shipping any PR: orbit the crane in the browser at key steps (memory rule), desktop and a phone viewport.

## Review Focus

1. A stored paper id that no longer exists (renamed/removed) → Plain, no crash. Test in Task 1.
2. Arrow keys / Space while focus is on a swatch must not step or replay the fold. Test in Task 3.
3. Switching paper mid-animation keeps the step playing and the camera where it was. Test in Task 3 (step/state; camera by eye in Task 4).
4. A shader that fails to compile on some paper (GLSL typo) — must be caught before merge. Test in Task 3 (loops every paper, fails on `Shader Error` console output).
5. No WebGL or stage failed → no paper picker shown (nothing to paint). Checked by eye in Task 4, Step 1.

---

## PR 1: picker + Plain + Ichimatsu

Branch `paper-picker` in worktree `../fold-paper-picker`.

### Task 1: Paper registry, Ichimatsu, names, stored choice

**Files:**
- Create: `src/player/papers/index.ts`, `src/player/papers/ichimatsu.ts`, `src/player/papers/papers.test.ts`
- Modify: `src/player/browser.ts`, `src/i18n/en.ts`, `src/i18n/pt.ts`

**Interfaces:**
- Produces:
  - `type PaperPattern = { id: string; ground: string; ink: string; glsl: string }` — `ground`/`ink` are sRGB hex; `glsl` defines `vec3 paperColor(vec2 uv)` and may use uniforms `uGround`, `uInk` (linear vec3) and helper `float aastep(float edge, float x)` (declared by the material, not by the paper).
  - `PLAIN = 'plain'`, `PAPERS: PaperPattern[]` (grid order), `paperById(id: string): PaperPattern | undefined`, `resolvePaperId(stored: string | null): string`.
  - `readPaper(): string` (already resolved) and `writePaper(id: string): void` in `browser.ts`.
  - i18n: `player.paper: string` ("Paper"/"Papel"), `player.paperIs: (name: string) => string` ("Paper: X"/"Papel: X"), `papers: Record<string, string>` with `plain` ("Plain"/"Liso") and `ichimatsu` ("Ichimatsu").

- [ ] **Step 1: Write the failing test** `src/player/papers/papers.test.ts`

```ts
describe('papers', () => {
  it('has unique ids and never reuses plain', () => {
    const ids = PAPERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(PLAIN);
  });
  it('names every paper in every language', () => {
    for (const d of [en, pt]) for (const id of [PLAIN, ...PAPERS.map((p) => p.id)]) expect(d.papers[id]).toBeTruthy();
  });
  it('uses 7-character hex colours and defines paperColor', () => {
    for (const p of PAPERS) {
      expect(p.ground).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.ink).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.glsl).toMatch(/vec3\s+paperColor\s*\(\s*vec2\s+uv\s*\)/);
    }
  });
  it('falls back to plain for missing or unknown ids', () => {
    expect(resolvePaperId(null)).toBe(PLAIN);
    expect(resolvePaperId('gone')).toBe(PLAIN);
    expect(resolvePaperId('ichimatsu')).toBe('ichimatsu');
    expect(resolvePaperId(PLAIN)).toBe(PLAIN);
  });
});
```

- [ ] **Step 2: Run** `pnpm vitest run src/player/papers` — expect FAIL (module not found).
- [ ] **Step 3: Implement** the registry and `ichimatsu.ts`: `ground '#b73a30'`, `ink '#221d1d'`, 16 squares across the sheet, edges anti-aliased with `aastep` (no `fwidth`-free hard steps — they shimmer when folded small). Add the i18n entries (`Dictionary` type flows from `en`), and `readPaper`/`writePaper` using key `fold:paper`.
- [ ] **Step 4: Run** `pnpm vitest run` — expect PASS (whole suite, i18n test included).
- [ ] **Step 5: Commit** `Papers: registry, Ichimatsu, names, stored choice`

### Task 2: Patterned material on the sheet

**Files:**
- Create: `src/player/paper-material.ts`, `src/player/paper-material.test.ts`
- Modify: `src/player/Paper.tsx`, `src/player/Stage.tsx`

**Interfaces:**
- Consumes: `PaperPattern`, `paperById` (Task 1).
- Produces:
  - `patternHooks(p: PaperPattern): { onBeforeCompile: (shader: { vertexShader: string; fragmentShader: string; uniforms: Record<string, { value: unknown }> }) => void; customProgramCacheKey: () => string }` — spread onto the front `<meshStandardMaterial>`.
  - `PAPER_GLSL_HEAD: string` — `uniform vec3 uGround; uniform vec3 uInk;` + `aastep` (fwidth-based). Reused by the swatch renderer in Task 3.
  - `Paper` and `Stage` gain prop `paper: string` (a resolved id).

- [ ] **Step 1: Write the failing test** `src/player/paper-material.test.ts`: run the hook on three's real `ShaderLib.standard` strings, so a three upgrade that renames a chunk fails here instead of silently drawing plain.

```ts
it('injects the pattern into the standard shader', () => {
  const shader = { vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader, uniforms: {} as Record<string, { value: unknown }> };
  const hooks = patternHooks(paperById('ichimatsu')!);
  hooks.onBeforeCompile(shader);
  expect(shader.vertexShader).toContain('vSheetUv = uv;');
  expect(shader.fragmentShader).toContain('paperColor(vSheetUv)');
  expect(shader.uniforms.uGround.value).toBeInstanceOf(Color);
  expect(hooks.customProgramCacheKey()).toBe('paper:ichimatsu');
});
```

- [ ] **Step 2: Run** `pnpm vitest run src/player/paper-material.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `patternHooks`: add `varying vec2 vSheetUv` (vertex: after `#include <uv_vertex>` set `vSheetUv = uv;`), prepend `PAPER_GLSL_HEAD` + `p.glsl` to the fragment, and after `#include <map_fragment>` do `diffuseColor.rgb *= paperColor(vSheetUv);`. Uniforms are `new Color(p.ground)` / `new Color(p.ink)` (three converts sRGB hex to linear). Throw if either `replace` target is missing — the test then names the drift.
- [ ] **Step 4: Wire** `Paper.tsx`: when `paperById(paper)` exists, the front material gets `color="#ffffff"`, `{...patternHooks(p)}` and `key={p.id}` (fresh material per paper; `customProgramCacheKey` lets three reuse each compiled program); otherwise today's Plain material unchanged. Add **halo lines** under `borders` and `folded`, shown only on patterned papers: same segments, colour `BACK`, opacity 0.7, `lineWidth` ink + 1.6, rendered before the ink line. Thread `paper` from `Stage` props through `Scene` to `Paper`.
  `// ponytail:` note on `key={p.id}`: first switch to a paper compiles its program once (one frame); move to a single program with a pattern-index uniform if that hitch is ever visible.
- [ ] **Step 5: Run** `pnpm vitest run && pnpm build` — expect PASS and a clean type check.
- [ ] **Step 6: Commit** `Papers: patterned front face, halo lines on patterned papers`

### Task 3: The picker in the dock

**Files:**
- Create: `src/player/PaperPicker.tsx`, `src/player/PaperPicker.module.css`, `src/player/papers/swatch.ts`, `e2e/paper.spec.ts`
- Modify: `src/player/Player.tsx`, `src/player/Player.module.css` (dock grid gains one 44px column)

**Interfaces:**
- Consumes: `PAPERS`, `PLAIN`, `paperById`, `readPaper`, `writePaper` (Task 1); `PAPER_GLSL_HEAD` (Task 2); `softenTowardIvory`.
- Produces:
  - `swatchUrl(p: PaperPattern): string` — data URL, 96×96, rendered once per paper and cached; one shared offscreen `WebGLRenderer` + `ShaderMaterial` (`PAPER_GLSL_HEAD + p.glsl`, `gl_FragColor = vec4(paperColor(uv * 0.25), 1.0)` then `#include <colorspace_fragment>`), so the swatch shows a quarter-sheet crop at a readable scale.
  - `<PaperPicker paper={id} plainColor={hex} onChange={(id) => void} />`.
  - `main` gets `data-paper={id}`.

UI decisions (spec option A):
- Trigger: a 44px dock button showing the current swatch, `aria-label={t.paperIs(name)}`, `popovertarget` → native `popover="auto"` (light dismiss + Escape for free).
- Popover content: `<fieldset>` with legend `t.paper`, one visually-hidden radio per paper (Plain first, then `PAPERS` order) with a swatch label and `title`= name. Changing a radio calls `onChange` immediately; the popover stays open.
- Desktop: popover anchored above the trigger, grid of 6 columns. Phone (`max-width: 899px` portrait, same query as the panel): fixed bottom sheet, full width, above the dock, model visible above it.
- Swatch thumbnails are generated when the popover first opens (`toggle` event), not on page load.
- Rendered only when `webgl && !stageFailed`.
- `Player.tsx` keydown handler: also bail out when `document.querySelector(':popover-open')` exists (alongside `dialog[open]`).

- [ ] **Step 1: Write the failing e2e** `e2e/paper.spec.ts`

```ts
test('picks a paper, keeps it on reload and on another model', async ({ page }) => {
  await page.goto('/fold/tulip');
  await expect(page.locator('main')).toHaveAttribute('data-paper', 'plain');
  await page.getByRole('button', { name: 'Paper: Plain' }).click();
  await page.getByRole('radio', { name: 'Ichimatsu' }).check();
  await expect(page.locator('main')).toHaveAttribute('data-paper', 'ichimatsu');
  await page.reload();
  await expect(page.locator('main')).toHaveAttribute('data-paper', 'ichimatsu');
  await page.goto('/fold/crane');
  await expect(page.locator('main')).toHaveAttribute('data-paper', 'ichimatsu');
});

test('an unknown stored paper falls back to plain', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fold:paper', 'gone'));
  await page.goto('/fold/tulip');
  await expect(page.locator('main')).toHaveAttribute('data-paper', 'plain');
});

test('arrow keys on a swatch change paper, not the step; switching mid-fold keeps playing', async ({ page }) => {
  await page.goto('/fold/tulip?step=1');
  await page.getByRole('button', { name: /^Paper:/ }).click();
  await page.getByRole('radio', { name: 'Plain' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('main')).toHaveAttribute('data-step', '1');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Replay step' }).click();
  await page.getByRole('button', { name: /^Paper:/ }).click();
  await page.getByRole('radio', { name: 'Plain' }).check();
  await expect(page.locator('main')).toHaveAttribute('data-step', '1');
});

test('every paper compiles', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/fold/crane');
  await page.getByRole('button', { name: /^Paper:/ }).click();
  for (const radio of await page.getByRole('radio').all()) await radio.check();
  await page.waitForTimeout(500);
  expect(errors.filter((e) => /Shader Error|WebGLProgram/.test(e))).toEqual([]);
});

test('the open picker passes axe', async ({ page }) => {
  await page.goto('/fold/tulip');
  await page.getByRole('button', { name: /^Paper:/ }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
```

  Use the real `t.replay` string for the replay button's name.
- [ ] **Step 2: Run** `pnpm test:e2e e2e/paper.spec.ts` — expect FAIL (no picker).
- [ ] **Step 3: Implement** `swatch.ts`, `PaperPicker.tsx` + CSS, and in `Player.tsx`: `const [paper, setPaper] = useState(readPaper)`, `onChange = (id) => { setPaper(id); writePaper(id); }`, pass `paper` to `LazyStage`, `data-paper` on `main`, picker in the dock row, popover guard in the keydown handler. Follow existing dock styles (`.dockRow button`, `--charcoal`, `paper` class for the popover surface).
- [ ] **Step 4: Run** `pnpm test:e2e && pnpm vitest run && pnpm check` — expect PASS.
- [ ] **Step 5: Commit** `Player: paper picker in the dock`

### Task 4: Look at it, then open the PR

- [ ] **Step 1:** `pnpm dev`; on desktop and a 390×844 phone viewport, open the crane. Flick Plain ↔ Ichimatsu at step 0, mid-animation and at the last step. Orbit the crane all round at key steps on both papers. Check: pattern stays printed on the sheet while folding (no swimming), back is ivory, creases/active highlight/cuts readable on red and black squares and on the ivory back, no hitch beyond one frame on first switch, camera untouched, bottom sheet leaves the model visible. Disable WebGL (or force stage failure) and confirm no picker.
- [ ] **Step 2:** Screenshot the folded crane on Ichimatsu next to `IMG_0132` for the PR body.
- [ ] **Step 3:** `graphify update .`, push, open the PR (body via mattpocock-skills:pr; screenshot + note that the remaining papers follow one PR each).

---

## Recipe: one PR per paper (repeat after PR 1 merges)

Branch `paper-<id>` in worktree `../fold-paper-<id>`.

- [ ] **Step 1:** Add `src/player/papers/<id>.ts` (`PaperPattern`, colours sampled from the photo in `~/Desktop/booklet-shaders/`), append it to `PAPERS`, add `papers.<id>` names in en and pt.
- [ ] **Step 2:** `pnpm vitest run && pnpm test:e2e e2e/paper.spec.ts` — the registry test checks names/colours/signature; "every paper compiles" now covers the new shader.
- [ ] **Step 3:** By eye (Task 4, Step 1 checklist) on the crane, desktop and phone. Fine patterns: coarsen until no shimmer/moiré on the folded crane on a phone. Use `aastep` for every edge. If a motif turns out as hard as the deferred five, stop: add it to the "Later" table in the spec instead and close the branch.
- [ ] **Step 4:** Commit `Papers: <Name>`, `graphify update .`, PR with the folded-crane screenshot beside the booklet photo.

Order and ids (photo → id):

| # | Photo | id | Name (en) |
|---|---|---|---|
| 1 | IMG_0125 | `shippo` | Shippō |
| 2 | IMG_0138 | `asanoha` | Asanoha |
| 3 | IMG_0121 | `sayagata` | Sayagata |
| 4 | IMG_0127 | `seigaiha` | Seigaiha |
| 5 | IMG_0139 | `stripes` | Hand-drawn stripes |
| 6 | IMG_0128 | `mame-shibori` | Mame shibori |
| 7 | IMG_0124 | `same-komon` | Same komon |
| 8 | IMG_0133 | `shippo-hanabishi` | Shippō hanabishi |
| 9 | IMG_0126 | `hanabishi` | Hanabishi lattice |
| 10 | IMG_0131 | `ajiro` | Ajiro weave |
| 11 | IMG_0141 | `wavy-cords` | Wavy cords |
| 12 | IMG_0130 | `kusari` | Kusari stripes |
| 13 | IMG_0122 | `sakura-komon` | Sakura komon |
| 14 | IMG_0117 | `ume` | Ume |
| 15 | IMG_0140 | `cho` | Chō (butterflies) |
| 16 | IMG_0135 | `ine` | Ine (rice) |
| 17 | IMG_0136 | `tatewaku-kumo` | Tatewaku kumo |
| 18 | IMG_0137 | `ryusui` | Ryūsui |

Asanoha's brighter sparkle points are a third tone: compute it inside `paperColor` (e.g. `mix(uInk, vec3(1.0), 0.35)`), no new field.
