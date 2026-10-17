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

- A visible jump. The swap must be small enough not to read as one (see the measurement below).
- The flap leaving the space between the body's layers mid-step.
- Blending vertex positions to turn the flap inside out. That squashes every face to a sliver at the halfway point and flips its normal (the builder check found this).

## The motion

For a reverse-fold step (`isReverseFold(model, step)`, `src/fold/reverse.ts`):

1. **Swap (at `s = 0`).** Take the moving faces' final pose: their positions at `t = 1`, layer heights included. Apply the rigid in-plane transform `R⁻¹` that best fits them back onto their start pose. Draw the flap there from the first frame instead of the start pose. Its layer order is the final one: spine on the inside, between the body's layers. Nothing is blended.
2. **Open.** Shift the body layers that the flap ends up between apart along the stack normal. The spread rises from zero, peaks while the flap pivots, and returns to zero by the end. These layers are the faces whose order changes in the step, minus the moving faces. It's a shift only, no rotation, like the existing `travel` clearance. "A little" means a few `LAYER_GAP`s, enough that the flap's layers clear them.
3. **Pivot.** Carry the swapped flap rigidly from `R⁻¹` back to identity (rotation angle × eased progress, around `R`'s fixed point in the body's plane). At `s = 1` it is exactly the final pose.
4. **Close.** The spread is back to zero, and everything sits at the final pose.

**Pivot direction.** The neck and tail turn about 180°. Of the two directions, the engine must take the one that keeps the flap clear of the body's inner layers, rather than sweeping across the inside where the other flaps are. Proposed: pick the direction whose swept path stays on the outside of the fixed face (for example, test both with `crossings()` at a few samples and keep the clean one). This is my read of the geometry and hasn't been tested.

A reverse-fold step's motion comes from its two end poses, not from `Step.path`. Every other step is unchanged.

### Measured swap jump

Measured on `public/models/crane.fold` (origin/main, 2026-10-17) on a 15 cm sheet: the gap between the start outline and the swapped outline, after the best-fit `R⁻¹`.

| Step | Flap length | Biggest jump | Average jump | Pivot |
|---|---|---|---|---|
| Neck | 86 mm | 1.4 mm | 0.7 mm | ~184° |
| Tail | 88 mm | 0.5 mm | 0.4 mm | ~178° |
| Head | 16 mm | 1.7 mm | 0.7 mm | ~111° |

There is no crossfade. If the head's swap shows in the browser when zoomed in, add a short crossfade there, using a transparent copy of the faces like the one the ghost used. That would be a follow-up, not part of this work.

## What gets removed

- **The pre-crease steps** before the neck, tail and head (#473). The crane goes back to its step count before #473.
- **The ghost flap** (#469): `ghostFaces`, the transparent material and their tests. There is no shortcut left to ghost.
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
