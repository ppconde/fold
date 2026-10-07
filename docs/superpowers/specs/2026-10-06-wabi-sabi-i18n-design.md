# Fold — Milestone 3: wabi-sabi visual pass, crane homepage, EN/PT

Date: 2026-10-06
Status: draft, awaiting review
Builds on: `2026-10-04-fold-restart-design.md` (the "restart spec"). This document **supersedes** the following parts of it:
- the visual direction in §7 (colours, lines), §8 (dock and panel look) and §11 (landing page and palette)
- the milestones in §14

Everything else in the restart spec stands.

## 1. Purpose

Fold is a reference app. Students open a model and see exactly how it is folded. This milestone gives the app:
- a **wabi-sabi** character: quiet, tactile, organic, handmade, like a well-printed paper publication;
- a **homepage** built around a slowly drifting 3D paper crane that leads into a lesson;
- **two languages**: English (US) and Portuguese (Portugal).

Success:
- every existing screen reads as one wabi-sabi publication;
- older learners can still read everything and hit every control: AA contrast, 44px targets, scalable text, reduced motion;
- every screen and every model instruction is available in EN and PT;
- the crane homepage opens the default lesson by tap, by click, or by the keyboard.

## 2. Decisions log

| Topic | Decision |
|---|---|
| Relation to the original "folded-paper editorial" brief | Blend. Wabi-sabi sets the feel and the materials. A few soft, imperfect fold motifs remain (a folded corner, a crease line). Nothing crisp or geometric. |
| Background | Warm plaster with a faint linen weave and fine grain |
| Instructions container | A floating ivory paper sheet with a slightly irregular edge (it becomes a bottom sheet on phones) |
| Dock controls | Small centred ink symbols, no labels. Next sits on the centre line, in clay. Tooltips. A one-time hint. |
| 3D paper | Washi: a procedural fibre texture, a matte material, warm soft light, thinner charcoal ink lines, a clay active crease |
| Photography | None in this milestone. Library thumbnails are rendered from the models. The user's own photos come later. |
| Homepage | A drifting, pointer-aware 3D crane. Tapping it opens the default lesson. "Learning the crane — coming soon". |
| Crane asset | Reuse the old CC-BY-4.0 crane glTF (JuanG3D) now. Switch to one built from a crease-pattern file when the crane lesson exists. |
| Crane lesson | Deferred to its own milestone: keyframe steps for squash and petal folds |
| Editor | Deferred indefinitely. Models are authored as code instead (§8). |
| Languages | EN-US and PT-PT. No i18n library. The language is not in the URL. |

## 3. Visual system

### 3.1 Tokens (`src/styles/global.css`)

| Token | Value | Use |
|---|---|---|
| `--plaster` | `#E6DCCB` | page background |
| `--ivory` | `#F3EDE2` | paper sheets, cards, the menu sheet |
| `--sand` | `#B08A6A` | quiet details only; never text on sand |
| `--clay` | `#A5633F` | primary accent: Next, the active crease, the slider thumb, underlines |
| `--moss` | `#6F7A55` | secondary accent for non-text marks: difficulty marks (3.37:1) |
| `--indigo` | `#4F6177` | links, the focus ring |
| `--charcoal` | `#33302C` | text, ink lines |
| `--muted` | `#5E5649` | captions, labels (5.33:1 on plaster; the mockup's #6F6658 failed AA at 4.16:1) |

The old tokens (`--ivory #F7F3EA`, `--terracotta`, and the rest) are replaced. Every text and background pair actually used must pass WCAG AA. An automated test enforces this (§10).

### 3.2 Texture
- **Plaster** (the page background): fine grain from an inline SVG `feTurbulence` data URI, plus a faint linen weave made of two `repeating-linear-gradient` layers at an opacity of 0.03 or less. No image downloads.
- **Paper** (sheets and cards): ivory with grain only.
- Forbidden: decorative gradients, glassmorphism, neon colours, pill-shaped buttons, and rounded "SaaS" cards (radius ≤ 3px).

### 3.3 Type
- **Shippori Mincho** (400 and 600): headings, model names, instructions.
- **Instrument Sans** (400 and 500): interface text and labels.
- **Zen Kurenaido**: only Japanese names and decorative ink marks (for example 折).
- Fonts come from Google Fonts with `display=swap` and a Latin subset. Shippori Mincho also needs the 折 glyph, so it is requested with `text=` or as a CJK subset, whichever is smaller.
- The existing text-size setting (`--text-scale`) scales everything.

### 3.4 Lines, marks and imperfection
- Ink rules are 1px charcoal at an opacity of about 0.35–0.5. They replace borders and boxes.
- The dock icons are hand-drawn SVG paths with slight irregularity, each optically centred in a 24px box.
- Imperfection is bounded:
  - Paper sheets and cards may use a `clip-path` polygon with corners off by at most 1%, and a rotation of at most 1.5°.
  - Text, controls and focus rings are never clipped or rotated.
  - Tap areas stay ≥ 44px.
- Fold motifs:
  - a softly folded corner on library rows (on hover) and on the completion card;
  - a faint crease line on the instructions sheet.

### 3.5 Motion
- Fades of 400–700 ms with `cubic-bezier(.2,.6,.2,1)`. No bounce, no scale-pop.
- Parallax appears only on the homepage.
- Under `prefers-reduced-motion: reduce`, everything is instant and the homepage crane is static. Fold lessons keep their own animation, which already defaults to 0.5×.

## 4. Player restyle (`/fold/$id`)

The layout and every behaviour from the restart spec §8 and the polish round are unchanged.

### Instructions sheet
- **Look:** ivory paper with grain, a ≤1% irregular `clip-path`, a soft shadow off the plaster, and a faint crease line.
- **Phone:** it becomes the bottom sheet with an irregular top edge.
- **Content, top to bottom:**
  - "Step 1 · 2": uppercase Instrument Sans with letter-spacing, in muted text;
  - the instruction in Shippori Mincho, about 1.2rem × the text scale;
  - the crease diagram on its own small paper square, rotated about −1°.
- **Toggle:** the "Hide steps" pill becomes the text link "hide steps" / "show steps", with an ink underline, in the same position.

### Dock
- Seven equal cells:
  - **start · back · again**
  - **next**, on the exact centre line, 28px, clay
  - **speed · view · step count**
- Every control keeps:
  - an invisible 44×44px hit area;
  - a `title` tooltip;
  - its existing accessible name ("Start over", "Previous step", "Replay step", "Next step", "Speed 1×", "Reset view").
- Visible marks:
  - icons are inline SVG, charcoal, stroke 1.4 (Next 1.8, clay);
  - speed is text ("1×"), the step count is text ("1/2").
- **Progress slider:** a thin ink track (1px, charcoal at 0.45) with a 9px clay dot. It is still a native `<input type="range">`, restyled.
- **One-time hint:**
  - On the first player visit, a muted line under the dock reads "← back · next → · hover for names" (and the PT equivalent).
  - It fades out after the first completed step, and is never shown again.
  - The `localStorage` key is `fold:dockHint` (try/catch, like the other settings).

### Header
- The model name in Shippori Mincho, with the Japanese name under it in Zen Kurenaido.
- The ☰ button becomes the word **menu**, with an ink underline, top-left. Its accessible name stays "Menu".

### Menu
- An ivory paper sheet from the left (still a native `<dialog>`).
- Links are in the serif.
- Text size and language are small ink-text toggles: **A · A+ · A++** and **EN · PT**.
- The focus ring is indigo.

### Completion card
- An ivory card with a softly folded corner.
- "Well folded!" / localised.
- **Fold again** has a clay underline. **Back to library** is a plain ink link.
- Its positioning and focus behaviour are unchanged.

### 3D paper (washi)
- **Material:** a `MeshStandardMaterial` (roughness about 0.9, metalness 0) replaces `MeshToonMaterial`.
  - The map is a procedural washi fibre texture: a `CanvasTexture` of about 256px, generated once with fibres and grain, then tiled.
  - Front: `model.paperColor`, blended 15% toward ivory. Back: `--ivory`.
- **Lights:**
  - a warm key (`#fff4e6`) from the upper front-left;
  - a soft fill;
  - a hemisphere light (`#fffaf0`, `#e6dccb`).
  - The contact shadow is softer and warmer (opacity about 0.25, a larger blur).
- **Lines:**
  - charcoal `#33302C` at 0.67× today's widths;
  - the active crease is clay `#A5633F` with `renderOrder` 1, as now.
- **Canvas:** transparent, so the plaster shows through.
- **Fallback:** the 2D fallback and the "3D view didn't load" messages are restyled. Their behaviour is unchanged.

## 5. Homepage (`/`)

### Layout
- **Desktop:** asymmetric. A left column of about 38% holds:
  - the headline in Shippori Mincho at about 3.2rem (EN "Fold, slowly." / PT "Dobrar, devagar.");
  - one quiet sentence;
  - a **start folding →** ink link;
  - a muted line, "learning the crane — coming soon".
- The crane floats large, right of centre, with a faint 折 ink mark behind it.
- **Phone:** the crane on top, the text below.

### Crane
- `public/models/crane/scene.gltf` + `scene.bin`, restored from `old_main` with its textures dropped.
- Credit: "3D Origami crane" by JuanG3D, CC-BY-4.0, shown on the About page.
- Its material is replaced at load with the washi material (§4), so it doesn't depend on node or material names. Use `dispose={null}` on the shared, cached graph.

### Motion
- An idle vertical drift of ±2% of the crane's height over about 7s, plus a slow yaw sway of ±6°.
- The camera drifts by ≤1° over about 12s.
- **Desktop pointer:** the crane turns toward the pointer, at most 10° yaw and 6° pitch, with damping (no snapping).
- **Touch:** idle motion only. No device-orientation API, because it would need a permission prompt.
- `frameloop` stays `"demand"` with an invalidation loop only while the page is visible. It pauses on `visibilitychange`.

### Enter
- Tapping or clicking anywhere on the page, except the menu, links and buttons, starts the enter transition:
  - the crane eases forward over about 600ms while the page fades into the plaster;
  - then it navigates to the default lesson.
- The **start folding →** link does the same and is the keyboard and screen-reader path. Tap-anywhere is only an enhancement.
- The default lesson is `defaultModel` in `public/models/models.json`. It is `fold-in-quarters` in this milestone and becomes the first launch model in Milestone 4.
- Reduced motion: no transition; navigate immediately. The homepage root exposes `data-motion="on|off"` for tests.

### Loading
- The crane scene is lazy-loaded in its own chunk, the same as the player's `Stage`, inside an error boundary.
- The text paints first.
- If the crane fails to load, the homepage stays fully usable without it. No error is shown.
- The library and player chunks are not loaded by the homepage.

## 6. Other pages
- **Library (interim):** an editorial list. For each model:
  - the name in the serif;
  - the Japanese name in brush hand;
  - difficulty as 1–3 small moss marks, plus a visually hidden label;
  - a soft folded-corner motif on hover or focus.

  Search, filters and cards come in Milestone 4.
- **About:** restyled and translated. Credits: the FOLD format (Erik Demaine et al.), the CC-BY-4.0 crane (JuanG3D), and the fonts (SIL OFL). The code is GPLv3. Models are CC BY-NC-SA.
- **Not found and error pages:** restyled and translated.

## 7. Languages (EN-US, PT-PT)

### Interface strings
- `src/i18n/en.ts` exports `en`, a nested object of strings and small functions (e.g. `stepOf(n, total)`).
- `src/i18n/pt.ts` exports `pt` typed as `typeof en`, so a missing key fails `tsc`.
- No plurals or ICU formatting beyond the small functions.

### Choosing a language
- **First visit:** `navigator.languages` decides. Any `pt*` gives `pt`; anything else gives `en`.
- **After that:** the menu toggle, stored in `localStorage` as `fold:lang` (try/catch).
- A `LanguageProvider` in the app shell exposes `useT()` (the dictionary) and `useLang()` (`[lang, setLang]`).
- Switching updates:
  - `document.documentElement.lang` to `en-US` or `pt-PT`;
  - route `<title>`s (the `head` functions read the current language);
  - all visible text, without a reload.
- URLs carry no language segment.

### Model text
- In `models.json`, `name` becomes `{ "en": string, "pt": string }`. `japaneseName` stays a string.
- In `.fold` frames, `foldapp:instruction` may be a string (treated as English) or `{ "en": string, "pt"?: string }`.
- `loadModel` normalises it to `Step.instruction: { en: string; pt?: string }` and rejects an object without `en`.
- The player picks `instruction[lang] ?? instruction.en`. The model is never reloaded on a language switch.
- Migrate the two existing fixtures and `models.json` to bilingual form.

### Translation
- Both languages are written as part of the work.
- Portuguese uses European conventions: "dobrar", "vincar", "dobra em vale" / "dobra em monte", and the informal "tu".
- The maintainer reviews the PT before merge.

## 8. Authoring models as code (built in Milestone 4; decided here)
- Each model is a TypeScript module in `models/src/<id>.ts` that declares:
  - the crease segments (or a crease-pattern import);
  - the steps, as changed angles plus EN/PT instructions plus an optional `fixedFace` or `rotation`;
  - the library entry.
- `pnpm models` builds `public/models/<id>.fold` and `models.json`, then checks every model:
  - `loadModel` accepts it;
  - `checkConsistency` is ok at every step;
  - every step boundary joins (≤ 1e-9);
  - no mid-step tear (consistency sampled at t = 0.25, 0.5, 0.75);
  - stacked layers never cross;
  - seam gap ≤ a configured budget.
- The same command renders a washi thumbnail and per-step screenshots for the maintainer to review.
- **Layer-order solver gate:** if any launch model exceeds the seam-gap budget visibly, a layer-order solver milestone is inserted before Milestone 4 ships.

## 9. Roadmap (replaces restart spec §14)

| # | Milestone | Status |
|---|---|---|
| 0–2 | Setup, engine, player | done (PRs #423–#425) |
| — | Player polish | PR #426 |
| **3** | **This spec:** wabi-sabi visual pass, crane homepage, EN/PT | done (PR #428) |
| 4a | Library, model pipeline, dog face and tulip | this PR |
| L | Layer order (inserted by the §8 gate: cup, fox, kabuto and plane cut through themselves) | next |
| 4b | The other four launch models; the cup becomes the default lesson | |
| 5 | About page and final polish | |
| later | Crane lesson (keyframe steps for squash and petal folds); editor; uploads; accounts | deferred |

## 10. Testing
- **Unit tests:**
  - the EN and PT dictionaries have identical key sets and no empty strings;
  - language detection (`navigator.languages` cases and the stored value);
  - `loadModel` handles bilingual instructions, the plain-string fallback, and rejects an object without `en`;
  - every palette pair used for text passes AA (contrast computed in the test).
- **Existing e2e tests** keep passing. Only visual-detail assertions may change: glyph text and the dock button title strings stay as they are.
- **New e2e tests:**
  - **Homepage:**
    - the "start folding" link opens the default lesson;
    - a tap on the page background opens it;
    - pressing Enter on the link works;
    - under reduced motion there is no transition and the crane is static (the homepage exposes `data-motion="off"`);
    - if the crane chunk fails to load (route abort), the text and link still work.
  - **Dock:**
    - every control has a `title`;
    - the one-time hint shows on the first visit and not after a reload once a step is completed.
  - **Language:**
    - switch to PT: the menu, an instruction, `<title>` and `<html lang="pt-PT">` all update;
    - after a reload, PT persists;
    - a `pt-BR` browser starts in PT; an `fr` browser starts in EN.
- **axe:** every route, in both languages.
- **Visual review:** desktop (1280×800) and phone (Pixel 7) screenshots of the homepage, the player (step 1, mid-fold, done), the menu, the library and the 3D-failed state. These are attached to the PR.

## 11. Out of scope
- Photography.
- The crane lesson and keyframe engine.
- The layer-order solver.
- The editor.
- URL-based locale.
- Languages beyond EN and PT.
- Dark mode.
- Device-orientation tilt on the homepage.
