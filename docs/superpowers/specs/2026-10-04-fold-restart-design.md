# Fold — restart design

Date: 2026-10-04
Status: approved. The visual direction (§7, §8 look, §11) and the milestones (§14) are superseded by `2026-10-06-wabi-sabi-i18n-design.md`.

## 1. Purpose

Fold is a web app that teaches people — young and old — to fold origami. It should feel like a calm, playful experiment: a 3D paper model you can rotate, zoom and pan, folding step by step, with the matching 2D crease pattern beside it.

Success for v1:

- A learner can pick a model from a searchable library and fold along with it on a phone or a desktop.
- Every step shows an animated 3D fold, a plain-English instruction and the crease pattern with the step's creases highlighted.
- The maintainer can author new models in an in-app editor and publish them as static FOLD files.
- The UI is usable by older users (large targets, scalable text, keyboard support, AA contrast) and passes automated axe checks.

The app is English-first. Japanese names appear as a secondary line only.

## 2. Decisions log

| Topic | Decision |
|---|---|
| Model format | [FOLD](https://github.com/edemaine/fold) files with one `file_frames` entry per step |
| Old engine | Dropped. Archived on branch `old_main` |
| Geometry library | `rabbit-ear` (GPLv3). The app is therefore licensed GPLv3 |
| Routing / data | TanStack Router (file-based, `validateSearch`, route loaders). No TanStack Query, no state library |
| Backend | None in v1. Static files only. Supabase + accounts later |
| Hosting | Cloudflare Workers static assets, Git-connected, custom domain `fold.ppconde.com` |
| Tooling | pnpm, Biome (replaces ESLint/Prettier/Husky/lint-staged), Vite 8, TypeScript 7, Vitest, Playwright |
| Editor | Desktop only. Draws crease patterns and authors steps |
| Launch models | Simple valley/mountain folds only (no squash, petal, reverse folds or tucks) |
| Theme | Light only |

## 3. Repository and tooling

### Branches

- `old_main`: created from current `origin/main` and pushed. Archive of the previous code. Never merged back.
- `main`: receives the new app. Each milestone is a feature branch merged by PR.

### Dependencies

`package.json` is rewritten from scratch. All versions are the latest at setup time.

Runtime: `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/drei`, `@tanstack/react-router`, `rabbit-ear`. Each is installed in the milestone that first uses it.

Dev: `vite`, `@vitejs/plugin-react`, `wrangler`, `@tanstack/router-plugin`, `typescript`, `vitest`, `@playwright/test`, `@axe-core/playwright`, `@biomejs/biome`, `@types/react`, `@types/react-dom`, `@types/three`.

`packageManager` pins pnpm. If TypeScript 7 breaks the router plugin or other tooling, fall back to TypeScript 5.9 and note why in the README.

### Removed

- Packages: `@supabase/supabase-js`, `supabase`, `gsap`, `lil-gui`, `stats.js`, `three-orbit-controls`, `@types/webgl2`, `@types/node` (unless a config needs it), all ESLint packages, `prettier`, `husky`, `lint-staged`, `sass`, `vite-plugin-svgr`, `vite-plugin-plain-text`, `@vitest/ui`, `@vitest/coverage-v8`, `@vitejs/plugin-react-swc`.
- Files: `src/scene/**`, `src/services/**`, `src/types/database.ts` and the other old types, `declarations/`, `fonts/`, `public/models/3d_origami_crane/`, `.devcontainer/`, `.eslintrc.cjs`, `.prettierrc`, `.husky/`, `package-lock.json`, `.github/workflows/main.yml`, `.github/workflows/update-types.yml`, old `tests/`.
- Dependabot stays unchanged (its `npm` ecosystem also handles pnpm lockfiles).
- `.superpowers/` is untracked and ignored.

### Added

- `LICENSE` (GPLv3).
- `biome.json` with recommended rules, including React hook rules.
- `.github/workflows/ci.yml`: on PRs, runs `biome ci`, `tsc --noEmit`, `vitest run` and `playwright test` against `vite preview`, with cached browsers. PRs need it green to merge.
- The `.claude/skills/playwright-cli` agent skill, committed with the repo.

### Hosting

- Cloudflare Workers static assets connected to the GitHub repo.
- Build command: `pnpm biome ci && pnpm vitest run && pnpm build`, where `build` is `tsc --noEmit && vite build`, so type errors block deploys.
- SPA fallback (`not_found_handling: "single-page-application"`) so clean URLs work.
- Production deploys from `main`. Every branch gets a preview URL.
- Custom domain `fold.ppconde.com`. The ppconde.com zone is already on Cloudflare; the maintainer attaches the domain in the dashboard.

## 4. Routes

| Path | Screen | Loader |
|---|---|---|
| `/` | Editorial landing | `models.json` (for featured and gallery) |
| `/library?q=&cat=&diff=` | Library | `models.json` |
| `/fold/$id?step=` | Step player | `models/$id.fold`, parsed by `loadModel` |
| `/editor` | Step editor (lazy route) | none |
| `/about` | About | none |

`validateSearch` parses search params into typed objects. Invalid values fall back to defaults instead of erroring. A loader that fails renders the route's `errorComponent`: "Model not found" or "This model couldn't be read: <reason>", plus a link to the library.

`AppShell` wraps all routes. It owns the ☰ menu (Library, Editor, About, text size A / A+ / A++) and the text-size setting, which is stored in localStorage and applied as a root CSS variable.

## 5. Model data

### Index: `public/models/models.json`

```ts
type ModelEntry = {
  id: string;            // url slug, matches the file name
  name: string;          // English, e.g. "Fox face"
  japaneseName?: string; // e.g. "Kitsune"
  category: 'animals' | 'flowers' | 'objects' | 'geometric';
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  thumbnail?: string;    // path under /models/thumbs/
};
```

### Model file: `public/models/<id>.fold`

A standard FOLD 1.2 file.

The top level is the crease pattern:
- `vertices_coords` (2D)
- `edges_vertices`
- `edges_assignment` (`M`, `V`, `B`, `F`, `U`)
- `faces_vertices`
- `file_title`, `file_author`, `file_creator: "fold.ppconde.com"`
- custom `foldapp:paperColor`

Each `file_frames[k]` is step k+1:
- `frame_inherit: true` and `frame_parent: 0`
- `edges_foldAngle`: the angle of every edge at the end of the step, in degrees. Positive is valley, negative is mountain, 0 is flat.
- `foldapp:instruction` (required string)
- `foldapp:fixedFace` (optional face index; inherits the previous step's value; defaults to the face whose centroid is nearest the paper's centre)
- `foldapp:rotation` (optional `[x, y, z]` degrees for the whole model at the end of the step, used for "turn over" and "rotate 90°"; inherits the previous step's value; defaults to `[0, 0, 0]`)

Step 0 (flat paper) is implicit: all angles 0, rotation `[0, 0, 0]`.

These values are derived, not stored:
- The step's active creases are edges whose angle differs from the previous step.
- Past creases are edges that were non-zero in any earlier step.

## 6. Fold engine (`src/fold/`)

Pure TypeScript, no React, no DOM. Rabbit Ear is used for parsing and graph operations where it helps.

```ts
loadModel(json: unknown): Model                 // throws FoldError with a readable message
foldedPositions(model, step, t): Vec3[][]       // t ∈ [0,1] within step; per face, its corners in 3D
stepCreases(model, step): { active: number[]; past: number[] }
checkConsistency(model, step): { ok: true } | { ok: false; edges: number[] }
remapAngles(oldGraph, newGraph, angles): number[] // after crease-pattern edits
```

### `loadModel`

Rejects:
- missing CP fields
- frames whose `edges_foldAngle` length ≠ edge count
- missing instructions
- non-planar or empty geometry

### `foldedPositions`

1. Interpolate each edge angle from step−1 to step with ease-in-out.
2. Clamp ±180° to ±178°, so stacked layers fan out slightly instead of z-fighting.
   `// ponytail: angle clamp instead of layer ordering; store faceOrders from rabbit-ear's layer solver if thick models flicker.`
3. Use one canonical spanning tree of faces per model (BFS from face 0 over shared edges), built once and cached.
4. Accumulate each face's transform `T(f)` along that tree: parent's transform × rotation about the shared edge by that edge's angle.
5. Hold the fixed face still and anchor the step: `pose(f) = A_k · T(fixed_k)⁻¹ · T(f)`, with `A_1 = I` and `A_{k+1} = A_k · T_k(fixed_k)⁻¹ · T_k(fixed_{k+1})` at step k's end angles. Because every step uses the same tree, every face joins exactly at step boundaries, and changing `fixedFace` never makes the paper jump. Anchors are cached per model, so models are treated as immutable once posed.
6. Apply the slerped whole-model rotation about the flat paper's bounding-box centre (shortest-path slerp). Known gap: after folding, turning over makes the paper slide sideways; the player milestone decides the pivot/camera fix.
7. Output per-face vertex copies, so faces stay rigid even if non-tree adjacencies disagree mid-step.

### `checkConsistency`

At t=1, with unclamped angles, every crease that is not on the spanning tree must agree with it: rebuilding the face on one side from the face on the other side, using that crease's angle, must land every corner where the tree placed it (within ε). Returns the creases that disagree. Used by the editor to warn about impossible angle combinations. Limitation: at exactly ±180° mountain and valley produce the same pose, so a wrong M/V on a fully folded crease is not detectable.

### `remapAngles`

Each new edge takes the angle of the old edge it is collinear with and contained in. New edges get 0. Deleted edges are dropped.

## 7. Rendering (shared by player, editor preview and landing hero)

### `Stage`

The R3F `Canvas` with:
- `frameloop="demand"`, invalidated while animating or while the camera moves
- `dpr={[1, 2]}`
- drei `CameraControls` for rotate, zoom and pan on mouse, touch and trackpad. It frames the model on load and on reset, and never moves during a step.
- Lights:
  - key directional light from upper front-left
  - weaker fill light from the opposite side
  - soft hemisphere light
- drei `ContactShadows` under the model.

### `Paper`

- One non-indexed `BufferGeometry`. Positions come from `foldedPositions` and are updated in place.
- `MeshToonMaterial` with a 3–4 step gradient map: front face in `foldapp:paperColor`, back face white.
- Lines with drei `<Line>`, constant pixel width:
  - border edges: solid charcoal, thicker
  - creases folded right now: thinner charcoal
  - creases currently flat: fainter
- Line width scales with the text-size setting.

### `CreaseDiagram`

An SVG of the crease pattern:
- valley = dashed, mountain = dash-dot, standard notation
- active creases bold
- past creases faint
- future creases hidden

No fold arrows in v1.

### WebGL fallback

If WebGL is unavailable, pages that would show `Stage` show the diagram and instructions only, with a one-line note.

## 8. Step player (`/fold/$id`)

### Behaviour

- **Next** animates step k→k+1 once and stops. There is no auto-advance.
- **Previous** animates the current step in reverse.
- **Replay** replays the current step.
- **Speed** cycles 0.5× / 1× / 1.5×. The default is 0.5× when `prefers-reduced-motion` is set.
- **Reset view** reframes the camera.
- `?step=` stays in sync, so reloading or sharing resumes at that step.
- After the final step, a completion card shows "Well folded!" and "<name> is complete." with "Fold again" and "Back to library". When the last step finishes playing, focus moves to the card heading so screen readers announce it (not when the page is opened on a finished step, nor when the slider is scrubbed to 100%); "Fold again" returns focus to "Next step".

### Layout

- 3D stage in the centre.
- Floating dock at bottom centre: ◀ ▶ ▶| speed ⟲. It shows "k / n" when the panel is hidden.
- ☰ and the model name at top-left.
- Desktop (≥ 900px): a right panel with the step label, the instruction and `CreaseDiagram`. An edge tab toggles it, and the choice is remembered in localStorage.
- Phone: the same content in a bottom sheet with a tap-to-toggle grip.

### Accessibility

- Targets ≥ 44px.
- Keyboard: ←/→ step, Space replay, R reset view, Esc close panel or sheet.
- Visible focus.
- The instruction is in an `aria-live="polite"` region.
- The player root exposes `data-step` and `data-state` (`idle | playing | done`) for tests.

### Components

| Component | Role |
|---|---|
| `FoldPage` | The route |
| `Stage` | 3D canvas, lights, camera |
| `Paper` | Paper mesh and lines |
| `StepPanel` | Instruction and `CreaseDiagram`; panel or sheet by breakpoint |
| `Dock` | Floating controls |
| `usePlayer` | `{step, t, playing, speed}`; advances `t` in `useFrame` |

## 9. Editor (`/editor`, desktop only)

Below 900px the page shows only "The editor needs a larger screen" and a library link. The route is lazy, so Rabbit Ear's drawing code is not in the main bundle.

### Start

- New square sheet, or import a `.fold` (bare CP or full model).
- Drafts autosave to localStorage (try/catch).

### Crease mode

- Click two snap points to add a crease.
  - The default draws a full line clipped to the paper.
  - Shift draws a segment only.
- Snap targets: vertices, edge midpoints, intersections. A visible hover marker shows the snap.
- Select creases to toggle M/V or delete.
- Undo/redo is a stack of full graph snapshots.
- After each edit, step angles are remapped with `remapAngles`.

### Steps mode

- Left: step list. "Add step" copies the previous step's angles.
- Select one or more creases (shift-click). Set their angle with buttons (valley 180 / mountain −180 / flat 0) or a slider.
- Click a face to set `fixedFace`.
- Buttons: turn over, rotate ±90°.
- Instruction text field.
- Live preview: `Stage` + `Paper` + `CreaseDiagram`, with a `t` scrubber.
- `checkConsistency` warnings highlight the offending vertices.

### Details

id, name, Japanese name, category, difficulty, tags, paper color.

### Export

- Download `.fold`.
- Copy the `models.json` entry.
- Download a thumbnail PNG of the final state (canvas capture).

Publishing a built-in model means committing the files to `public/models/` through a PR.

### First task: Rabbit Ear spike

Before building the editor, confirm that `rabbit-ear` 0.9.4:
- adds a segment or line to a graph and resolves intersections and faces
- reads and writes frames

Anything missing is implemented in `src/fold/`. The design is unchanged either way.

## 10. Library (`/library`)

- Search box and one row of filter chips:
  - category: All / Animals / Flowers / Objects / Geometric
  - difficulty: Easy / Medium / Hard
  - one selection per group
- On phones the chip row scrolls sideways.
- `filterModels(index, search)` is a pure function.
  - It matches `q` against name, Japanese name and tags.
  - Matching is case-insensitive and accent-insensitive via `normalize('NFD')`.
- Cards:
  - thumbnail, or a CSS folded-paper placeholder if there is none
  - name, Japanese name (small, secondary line; hidden below 600px), difficulty dots with a text label; nothing else
  - clipped folded corner
  - hover lift
- Empty state: "No folds match. Clear filters."

## 11. Landing (`/`) and About (`/about`)

### Landing

The editorial brief: minimal, generous white space, angular sections, paper-like layered cards, folded corners, subtle shadows.

- **Hero:**
  - Serif headline, short description, "Start folding" button to `/library`.
  - Asymmetric live `Stage` looping a featured model's steps.
  - The 3D loads after the text.
  - Static thumbnail under reduced motion or without WebGL.
- **Sections:** featured folds (overlapping cards), philosophy (one sheet, no cuts, Japanese tradition), gallery of all models, final call to action.
- **Diagonal transitions:** `clip-path`.
- **Unfold-on-scroll:** CSS 3D transforms triggered by `IntersectionObserver`, disabled under reduced motion.
- **Palette tokens:**
  - ivory `#F7F3EA`
  - off-white `#FBF9F4`
  - beige `#E9E1D1`
  - charcoal `#2B2A28`
  - terracotta `#B8613F`
  - deep indigo accent `#2E3A59`
  - Final values must pass WCAG AA for every text pair.
- **Fonts:** Google Fonts, chosen during milestone 5. Candidates: Shippori Mincho or Fraunces for headings, Instrument Sans for body.
- **Styling:** plain CSS custom properties and CSS Modules. No UI kit.

### About

- What Fold is and how to use the player.
- Credits: FOLD format (Erik Demaine et al.) and Rabbit Ear (Robby Kraft).
- Licenses: code GPLv3; models CC BY-NC-SA unless stated otherwise.

## 12. Launch content

Authored by the maintainer in the editor during milestone 4:

| Model | Category | Difficulty |
|---|---|---|
| Cup | Objects | Easy |
| Fox face | Animals | Easy |
| Dog face | Animals | Easy |
| Tulip (simple, no waterbomb base) | Flowers | Easy |
| Samurai helmet (Kabuto, no final tuck) | Objects | Medium |
| Paper plane | Objects | Easy |

Rule: v1 models use only valley/mountain folds, turn over and rotate.

Hand-written fixtures for milestones 1–3:
- `fold-in-half`
- `fold-in-quarters` (two steps; the second fold goes through two layers)

Both live in `public/models/` and are also used by the tests.

## 13. Testing

### Vitest (unit)

- `loadModel`:
  - accepts the fixtures
  - rejects each malformed case with a specific message
- `foldedPositions` on the fixtures:
  - flat at t=0
  - moving half at 90° at t=0.5
  - folded within the 178° clamp at t=1
  - the fixed face never moves
- `stepCreases` returns the expected active and past creases.
- `checkConsistency` flags an impossible combination and passes a valid one.
- `remapAngles`: a split edge inherits its angle; a new edge gets 0.
- `filterModels` handles query, accents, case, and each filter alone and combined.

### Playwright (e2e)

- Two projects: Desktop Chrome and Pixel 7, against `vite preview`.
- No canvas screenshot assertions. Tests use DOM state, the URL and `data-*` attributes.
- `@axe-core/playwright` scans every route in both projects. Serious or critical violations fail.

| Milestone | Flows |
|---|---|
| 0 | Every route loads; the ☰ menu navigates; an unknown route shows not found; axe on placeholders |
| 2 | Next/prev update the text and `?step=`; reload resumes; ←/→/Space work; panel toggle (desktop); sheet toggle (phone); completion card; unknown id shows not found; WebGL disabled shows the fallback |
| 3 | Phone shows the larger-screen note; desktop: import a fixture, draw a crease, add a step, set an angle, export downloads a valid `.fold`; a draft survives reload |
| 4 | Search "fox" shows Fox face; filters update the URL and results; reload keeps filters; empty state clears; a card opens the player |
| 5 | "Start folding" goes to the library; reduced motion shows the static hero |

### Manual checks

Each milestone's Cloudflare preview is checked on a real phone and a desktop, using `playwright-cli` where useful.

## 14. Milestones

Each milestone is one PR to `main`.

| # | Milestone | Done when |
|---|---|---|
| 0 | Setup | `old_main` pushed. `main` cleaned. pnpm, Biome, TS, Vite, TanStack Router placeholder routes, `AppShell`, LICENSE, CI workflow and Playwright smoke tests in place. Cloudflare connected. `fold.ppconde.com` serves the placeholders. |
| 1 | Fold engine | `src/fold/` and both fixtures, all unit tests green |
| 2 | Player | `/fold/fold-in-half` and `/fold/fold-in-quarters` meet section 8 on phone and desktop; e2e flows green |
| 3 | Editor | Spike done; section 9 complete; e2e flows green |
| 4 | Library and content | Section 10 complete; six launch models and thumbnails committed |
| 5 | Landing and About | Section 11 complete; design and accessibility pass; e2e flows green |

## 15. Out of scope (v1)

- Accounts, Supabase, user uploads, TanStack Query
- Squash, petal and reverse folds, and tucks
- A layer-order solver (`faceOrders`)
- Fold arrows in the diagram
- Swipe gestures on the bottom sheet
- Editor on phone or tablet
- Dark mode
- Localisation beyond English
- Auto-advancing playback

## 16. Risks

- **Rabbit Ear API gaps.** The docs are thin. Mitigated by the spike at the start of milestone 3.
- **TypeScript 7 tooling compatibility.** Fall back to 5.9.
- **Multi-layer flicker** beyond what the 178° clamp handles. Upgrade path: `faceOrders`.
- **Authoring time.** Six models by hand in the editor is the largest effort in milestone 4.
