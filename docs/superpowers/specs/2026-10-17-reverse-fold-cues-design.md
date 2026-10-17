# Reverse fold cues

2026-10-17. How the player tells a folder that a step is a reverse fold, and shows what their hands actually do, while the paper on screen still swings through the body (the swing-and-tuck stand-in, see `2026-10-13-reverse-fold-spike.md`).

## Why

The crane's neck, tail and head are inside reverse folds. The engine can't fold them honestly yet, so the flap swings straight through the body's layers and the layers swap places in the step's last stretch (`landedOrders`, `src/fold/fold.ts:312`). Two things go wrong for the folder:

- they copy the motion and fold the flap around the outside;
- the step looks broken and they stop trusting the app.

The cues have to do both jobs: say "this isn't what your hands do", and show what they do instead.

Folders are a mix: hobbyists, students, people who already know the fold. It has to stay friendly and unobtrusive for the ones who know it.

## Goals

- A folder meeting a reverse fold for the first time can do it from the app alone.
- A folder who knows the fold can ignore the cues at a glance.
- The screen never shows the swing-through as something to copy.
- The crease diagram stays reachable on every step.
- Any model whose steps use the reverse-fold stand-in gets the cues without hand tagging in the player.

## Non-goals

- Making the reverse fold physically honest. That is the bending solver, its own research project.
- Arrows or marks drawn on the paper. Rejected before; motion should be truthful instead.
- Cues for squash folds or other collapse tucks. Only reverse folds (`s.fold(…, { tuck: true })`).
- Fixing the left/right mirror noted in the spike ("the left flap" is drawn on the right).

## Anti-goals

- Words like "illegal", "wrong" or "error". The tone is "the paper on screen takes a shortcut".
- Anything that makes a phone's step sheet scroll for a normal step.
- A modal or anything that interrupts playback.

## What the folder sees

### 1. A pre-crease step before each reverse fold

Before the neck, the tail and the head, a new step folds the flap along the reverse-fold line and unfolds it, like the crane's opening `s.crease` steps. The motion is an ordinary valley fold and back; nothing faked. The crease diagram shows the new line as it shows any crease.

Wording, in the style of the existing steps:

- en: "Fold the left flap up along this line, then unfold it." (tail: "the right flap"; head: "the tip of the neck down")
- pt: written to match the existing pt steps.

The reverse-fold step's own instruction stays as it is; its crease now already exists in the paper. The pre-crease folds one way only ("forward and back" was considered and not chosen).

### 2. The reverse fold step

- **Step label** gains a suffix: "Step N of M · reverse fold" (pt: "dobra invertida").
- **Ghosted flap on the stage.** From the start of the step until the layers swap (the landing point, `1 - 1/(path.length + 1)` of the step), the faces of the tucked flap render faint (lower opacity, still visible). They turn solid as the layers swap and the flap sits inside. Scrubbing back past the landing point ghosts them again.
- **"How" in the diagram slot.** Three small sketches, one generic set for every reverse fold:
  1. "Open the two layers a little"
  2. "Push the flap up between them, along your crease"
  3. "Close and flatten"

  The sketch shown follows the step's progress (first third, second third, last third up to landing, then the third sketch held), so scrubbing steps back through them. No timer.
- **"How / Creases" toggle.** On reverse-fold steps the slot shows "How" by default; "Creases" flips it to the crease diagram. The choice resets on every step and is not remembered.
- **Shortcut note**: "The paper on screen takes a shortcut through the body. Yours goes inside, like this." Shown under the sketches on wide screens; on phones it is the sketches' accessible description only (no room).

### Layout

- **Phones / portrait** (`Player.module.css:307`): the sheet keeps text left, slot right (`min(32vw, 8.5rem)`). On a reverse-fold step the slot holds the toggle, one sketch at a time with three progress dots, and the sketch's caption. The sheet must not grow past its current `max-height: 38dvh` without scrolling.
- **Wide screens and phones sideways**: the side panel shows the three sketches in a row, the shortcut note, then the crease diagram below. No toggle needed there (both visible).

Mockups from the brainstorm: `.superpowers/brainstorm/55334-1792231201/content/reverse-fold.html` and `reverse-fold-mobile.html` (not committed; rough).

## How the player knows

From the fold angles alone, no new fields. A reverse fold is the step where a crease already folded flat flips sign (the flap's spine reverses, +180 to −180 or back), while new creases appear along one line with both signs. Checked on `public/models/crane.fold`: exactly the neck, tail and head steps match (flips on edges 18/60, 57, 18; two new valleys and two new mountains each). Petal folds have mixed new creases but no flip; a squash opens its spine to flat rather than flipping it.

- `isReverseFold(model, step)` in the player, from `Step.angles` of this step and the one before.
- The ghosted flap is the faces that move during the step (everything not fixed with `fixedFace`), which the player already computes. Not the faces whose order changes: that set includes the body layers the flap passes between.

This keeps working when the bending solver replaces the stand-in, since a real reverse fold flips its spine too.

## Constraints

- Every string goes through the i18n files (`src/i18n/en.ts`, `pt.ts`); pt for all new text.
- Accessibility: the sketches are an `img` with a text alternative; caption changes during playback are not announced (the instruction is already `aria-live`). The toggle is a real control with pressed state.
- Ghosting uses transparency on layered paper: check for sorting artefacts and z-fighting, and orbit the crane from all angles at the neck, tail and head steps, in the browser, before calling it done.
- Reduced motion: nothing new animates on its own (sketches follow progress), so no special case expected.

## Delivery

One PR each, engine/player first, the crane last:

1. **Ghosted flap**: `isReverseFold`, ghost rendering.
2. **"How" slot**: step label suffix, sketches, toggle, layout on both breakpoints, strings.
3. **Crane pre-crease steps**: three new steps in `models/src/crane.ts`, regenerated model, checks pass.

`s.crease` already takes `fold`'s options, so `only: leftLeg` / `has('neck')` work. The real gap: when the reverse fold lands on the pre-crease's segments, `claim` (`models/sequence.ts:161`) reuses those creases and keeps the pre-crease's mountain/valley, undoing the per-layer `tuckIn` assignments (2677429). The diagram has one static assignment per crease (`src/player/diagram.ts`), so both steps show the same M/V. Decided: the reverse fold's final M/V wins everywhere, including on the pre-crease step's diagram (the diagram matches the finished model). That needs an engine change so a fold can relabel a crease it reuses; it lands as its own PR before 3, and checkModel must still pass on the crane.

## Left to the builder

- Ghost opacity, and whether it fades in/out over a short stretch or switches at the landing point.
- The sketches' exact drawing, as long as it reads as layers opening, flap going in between, flattening, and works at ~8rem.
- Toggle styling, within the existing panel look.
