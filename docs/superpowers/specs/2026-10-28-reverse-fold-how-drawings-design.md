# Reverse fold "How" drawings, made from the model

## Why

The user worries that folders won't understand how a reverse fold is actually done. The 3D view can't teach it:
- the flap's fan through the body is a stand-in for the real move (spec `2026-10-17-reverse-fold-tuck-motion-design.md`, revision 2026-10-28);
- on the head the neck stays shut, so you never see the head go in.

The How slot has to carry the lesson. Today it shows the same three generic end-on sketches for every reverse fold (`src/player/HowSketch.tsx`: a V for the body's layers, a line for the flap). They say nothing about this flap on this model.

Two things must be unmistakable (the user's words, 2026-10-28):
1. **The flap goes inside**, between the body's two layers, not up on the outside like an ordinary fold.
2. **The paper is reversed**: the flap's folded edge (its spine) flips. The valley becomes a mountain, and the edge ends up pointing the other way.

## What gets built

Three drawings per reverse-fold step, generated from the model's own geometry, replacing the generic sketches in the How slot. They're approved from the sketch `how-drawn.html` (session scratchpad, `preview3/`), which hand-draws a simplified crane. The app draws the real outlines instead. The user chose this explicitly: "they should be made from the model".

| Frame | Shows | Caption (en) |
|---|---|---|
| 1 | The flap as it is, with the body's two layers parted a little: a sliver of the back layer and its white inside peek out along the flap's open edge. The fold line as a **mountain line** (dash-dot) across the flap. The flap's flipping edge in yellow. | Open the two layers a little. The folded edge in yellow is the one you'll turn inside out |
| 2 | Same flap and fold line. A **push mark** (Yoshizawa–Randlett broad arrow) on the spine where the fold line meets it, pointing in. A curved **valley-fold arrow** (filled head) from the tip to where it lands. The landing outline **dotted**. The yellow edge solid where it is, and **yellow dotted** where it will lie. | Push the folded edge in at the line: it flips and goes in between the layers |
| 3 | The finished pose: the flap folded in, with the body's layers drawn over it where they cover it. The yellow edge solid in its new place, and faint yellow dotted where it was. | Close and flatten. The folded edge now points the other way: the flap is inside out |

The note above the drawings stays `insideOut`: "The flap turns inside out and goes in between the body's layers."

### Notation

Every mark follows `docs/origami-diagram-conventions.md` (Yoshizawa–Randlett):
- mountain fold: dash-dot, `8 3 2 3` (as the crease diagram);
- hidden or where-it-goes: dotted;
- push: a broad arrow;
- moving paper: a curved arrow with a filled head;
- coloured side in the paper's colour, white side in the light paper tone.

**One addition:** the flipping edge in one colour (yellow) across all three frames. The user approved it from the sketch. Add it to the conventions doc's "Our additions", with the reason: books pick out the part they're talking about with a colour or tone, so it reads without a legend.

### Rejected (don't bring back)

- fingers or hands;
- end-on insets ("hard to understand");
- a top view;
- front-and-turned-over pairs;
- paired front/behind arrows;
- photos or generated images.

The user rejected each in turn on 2026-10-28.

## Geometry (from the model)

Everything comes from the step's own data, through `reverseFan(model, step)` (`src/fold/fold.ts`):
- `pivot`, `normal`, `line`: the fold line through the pivot;
- `from` / `to`: every face's corners at the step's start and end;
- `group`: which faces are the flap.

Draw in 2D, in the body's plane:
- **View:** project onto the plane through `pivot` with normal `normal`, seen from the side the player's default camera looks from (`Stage.tsx`, position `[0, 2, 2]`). The drawing then isn't mirrored against the 3D view.
- **Up and the scale:** the builder picks the in-plane "up", so the drawing reads like the default view: what's up on screen is up in the drawing.
- **Flap:** the moving faces. Body: the still faces.
- **Faces:** draw them as filled polygons in layer order, lowest first (heights along the normal from `from` for frames 1–2, from `to` for frame 3), so upper layers hide lower ones.
- **Lines:** stroke only the lines a book would draw: paper edges and creases folded flat (±180° at that pose). Unfolded creases (0°) aren't drawn.
- **Fill:** each face's fill is the paper's colour or the white side, by which way it faces the viewer.
- **Fold line:** the creases made this step (0° before, non-zero after), clipped to the flap.
- **Flipping edge:**
  - frames 1–2: the spine edges (folded flat, sign flipped this step, both faces moving) from the pivot outward;
  - frame 3: the same edges at `to`;
  - the faint and dotted versions are the other pose.
- **Tip, landing and arrow:** the tip is the moving corner that travels farthest (as `tuckBow`), and it lands at its `to` position. The arrow bows through the side the flap fans through (`fan.line`, away from the body's middle), so the drawing and the 3D motion agree.
- **Push mark:** at the pivot, pointing in across the spine.
- **Frame 1's parted layers:** a small offset of the layer behind the flap, showing its white side along the open edge. The builder sets the size.
- **Framing:** fit each drawing's viewBox to the flap's start and end outlines plus margin, the same box for all three frames of a step. The rest of the model is clipped by the frame. The head therefore zooms onto the neck's tip on its own.

## Behaviour (unchanged from today's slot)

- **Phone:** the drawings are a horizontal row you swipe, with dots following what's on screen.
- **Wide screens:** the frame that goes with the animation (`sketchFrame`) is outlined.
- **The How / Creases toggle** stays as it is.
- **The sheet fits without scrolling**, including in Portuguese (existing e2e).
- **Accessibility:** the slot is one `role="img"` labelled with the note plus the three captions.

## Constraints

- Light and dark themes: every colour is a token, including the yellow (`--spine` or similar; light `#f2b630`, dark `#f5c451` in the sketch).
- Pure geometry in a tested module, with rendering in the component. Follow the repo's pattern: `diagram.ts` builds `CreaseDiagram`'s lines, and `paper-geometry.ts` builds `Paper`'s.
- No new dependencies.

## Done when

- The crane's neck, tail and head each show three drawings that match the sketch's content, drawn from the model, in both themes, on phone and desktop.
- Unit tests on the geometry module:
  - the flap's start and end outlines come from the moving faces;
  - the fold line lies within the flap;
  - the flipping edge starts at the pivot;
  - the arrow bows to the same side as `fan.line`;
  - the frame box contains the flap at start and end.
- The existing How e2e tests still pass, with the captions updated in both languages.
- Checked by eye in the browser at all three steps, in both themes.

## Calls made without the user (check these)

- **Paper colour:** the drawings always use the model's plain colour (`model.paperColor`) and the theme's white-side tone, whatever pattern is picked in the paper picker. A diagram reads by flat tone, as books do, and dark patterns would swallow the ink lines. `HowSketch` gets the model, not the chosen paper.
- **The conventions doc** (`docs/origami-diagram-conventions.md`, untracked in the main checkout until now) is committed in this PR, with the yellow edge under "Our additions". This PR is the first to rely on it.

- **Covered marks:** any part of the yellow edge or the fold line that a body layer covers is drawn dotted (book rule: hidden is dotted). In practice the yellow edge ends as the flap's outer edge, visible; at most a sliver at the fold line is covered. The user saw the toggle in the demo and saw no difference.

## Left to the builder

- Exact sizes: margins, parting offset, stroke widths, push-mark size.
- The in-plane "up" rule, as long as the drawing isn't mirrored against the default 3D view.
- The Portuguese captions. Translate in the existing tone (my call: the user didn't specify).
- Whether the yellow edge has a soft halo on dark patterns.
