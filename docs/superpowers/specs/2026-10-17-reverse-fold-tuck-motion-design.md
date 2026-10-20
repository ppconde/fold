# Reverse fold tuck motion

2026-10-17. Replace the swing-and-tuck stand-in's motion with one that looks like the tuck a folder's hands make. The flap is swapped for its reversed (tucked) version at the start of the step. The body opens a little, the flap pivots rigidly up between its layers into place, and the body closes. The paper never passes through paper. The one break from rigid geometry is the swap.

## Why

Today a `tuck: true` step swings the flap rigidly over its fold line, straight through the body's layers. The layers then swap places in the step's last stretch (`landedOrders`, `landingAt` in `src/fold/fold.ts`). Paper visibly going through paper confuses the folder. The cues added on top of it explain the shortcut instead of removing it: the pre-crease steps (#473) and the faint "ghost" flap (#469). The pre-crease step also doesn't show the real move. It folds along the line and back, which is not what the hands do.

The rigid engine can't make the real motion (see `2026-10-13-reverse-fold-spike.md` and `2026-10-17-bending-prototype.md`). The user accepts breaking the geometry briefly to get a motion that reads right.

## Goals

- In every reverse-fold step, no face passes through another at any point of the step.
- The motion reads as the real tuck: open the body a little, the flap goes up inside, close and flatten.
- The step ends exactly in today's final pose (same angles, same layer order), so the next step starts where this one ends.
- It works for any model with reverse folds, with no per-model authoring and no change to the `.fold` format.

## Non-goals

- A physically correct bending path (the research-sized solver).
- Changing the step's final geometry, angles or instructions.
- Squash folds and collapse tucks (`collapse(…, { tuck })`). They keep today's motion and their `landedOrders` swap.

## Anti-goals

- A visible jump. The swap is a crossfade, never a cut.
- The flap leaving the space between the body's layers mid-step.
- Blending vertex positions to turn the flap inside out. That squashes every face to a sliver at the halfway point and flips its normal (the builder check found this).

## The motion

For a reverse-fold step (`isReverseFold(model, step)`, `src/fold/reverse.ts`):

1. **Swap, as a crossfade (first 15% of the step).** The tucked flap is the moving faces' final pose (their positions at `t = 1`, layer heights included) turned back around the pivot by the pivot angle. It holds still while the flap as it was (the previous step's end) fades out and the tucked flap fades in over it. Its layer order is the final one: spine on the inside, between the body's layers.
2. **Open.** Shift the body layers that the flap ends up between apart along the stack normal. The spread rises from zero, peaks while the flap pivots, and returns to zero by the end. These layers are the faces whose order changes in the step, minus the moving faces. It's a shift only, no rotation, like the existing `travel` clearance. "A little" means a few `LAYER_GAP`s, enough that the flap's layers clear them.
3. **Pivot (the rest of the step).** Carry the tucked flap rigidly around the **pivot**: the point where the reverse-fold crease meets the flap's spine. The angle is the best-fit rotation about that point, end pose onto start pose. At `s = 1` it is exactly the final pose. The base stays on the body at the pivot; the crease's far end comes away from the body mid-step, between the body's layers (a rigid turn can't keep that hinge closed).
4. **Close.** The spread is back to zero, and everything sits at the final pose.

**Pivot direction.** The neck and tail turn about 180°, so both senses are possible. The flap turns the way its tuck arrow bows: the arrow (`tuckArrow`) bows out away from the model's middle, and the flap's tip at mid-pivot lies on that side of the arrow's chord.

A reverse-fold step's motion comes from its two end poses, not from `Step.path`. Every other step is unchanged.

### Why a crossfade (decided 2026-10-17, after building)

A rigid turn can't give both a small swap and an attached base. Pivoting near the flap's middle gives a ~1 mm swap, but the flap spins like a propeller, its base comes off the body and it pokes past the body's edge. Pivoting at the crease/spine point keeps the base on, but the tucked flap's outline differs from the start by about the flap's width (≈25 mm on the neck and tail, ≈4 mm on the head, on a 15 cm sheet). The user compared three previews (base + crossfade, twist while pivoting, propeller) and chose base + crossfade.

## What gets removed

- **The pre-crease steps** before the neck, tail and head (#473). The crane goes back to its step count before #473.
- **The ghost flap** (#469): `ghostFaces` and its tests. There is no shortcut left to ghost. The transparent material stays: the crossfade draws with it.
- `landingAt` and the mid-stack swap no longer apply to reverse-fold steps. They stay for collapse tucks.

Kept: `isReverseFold`, the tuck arrow (#475), the "How" sketches and the step label suffix (#470). The tuck arrow currently fades out at `landingAt`. For reverse folds it gets its own fade, finishing by the time the pivot ends; the exact timing is the builder's call.

## Decisions made without the user (check these)

- **"No crossings" is checked two ways:** by `crossings()` in `checkModel` (at 10 samples, plus a test sampling the crane's reverse folds at 40 or more), and by eye in the browser. If the browser shows the flap sliding through a body layer and `crossings()` misses it, strengthening `crossings()` is part of the engine PR.
- **The engine tells reverse folds from collapse tucks with `isReverseFold`,** not with a new field. No model files are regenerated for the engine change.

## Constraints

- The engine change lives in `foldedPositions` in `src/fold/fold.ts`. `checkModel` in `models/check.ts` samples it, so the checks cover the new motion for free.
- `checkModel` must stay clean for every model.
- The phone and wording rules from `2026-10-17-reverse-fold-cues-design.md` still hold for the cues that stay.
- After the changes, orbit the crane in the browser at the neck, tail and head steps from all sides (above, below, edge-on). Look for crossings, sorting artefacts, z-fighting and a visible swap. Scrub each step back and forth.
- One PR per change, in this order: the engine motion, then removing the ghost, then removing the crane's pre-crease steps. Work in `../fold-<topic>` worktrees, not the main checkout.

## Left to the builder

- The open amount and its timing against the pivot.
- How the best-fit `R⁻¹` is computed: a 2D Procrustes fit of the moving vertices, or the fold line and spine directions directly.
- Keeping the flap's own layers apart through the pivot. They are rigid together, so their heights from the final stack should already hold.
- Whether the head step, which reverse-folds a flap that is itself already tucked, also needs the neck's layers to open.

## Revision 2026-10-18: flip in place, pinch arrows

The user found the crossfade glitchy: two see-through necks overlapping read as a rendering fault. They liked the pivot and the landing. They chose, from a preview (`/tmp/claude-preview/reverse-fold-start.html`), to replace the swap with a flip, and asked for two arrows in 3D that point inwards.

**The flip replaces the swap (first third of the step).** The tucked flap is exactly the start flap mirrored across a line through the pivot, in the body's plane. Measured on the crane, the residual is 0.00 mm for neck, tail and head. So a rigid 180° turn around that line (out of the plane, like a page) carries the flap from the previous step's end to the tucked pose. Nothing is see-through, and the step starts exactly where the last one ended. The pivot then runs over the remaining two thirds, unchanged. The body's open/close spans the whole step as before. The flip must pass the 40-sample crossings test; the axis is fixed, so the only choice is the turn's sense (±180°). If neither sense is crossing-free, stop and ask the user.

**Pinch arrows.** There are two ink arrows in the model's 3D space, like the tuck arrow: one in front of the paper and one behind. They point at each other, along the body's normal, at a spot on the flap's spine a quarter of the way from the pivot to the tip. They show at full strength from the first frame, then fade out by the time the flap is edge-on, halfway through the flip (the turning flap would pass through one of them after that). The tuck arrow stays as it is.

**Removed:** the crossfade (the outgoing copy, `swapLayers`, the transparent material, `swapFade`), and `checkModel`'s continuity exemption for reverse-fold steps.

**Changed copy:** `player.shortcut` becomes "The flap turns inside out and goes in between the body's layers." (en). In pt: "A aba vira do avesso e entra entre as camadas do corpo."
