# Carry-forward items for later milestones

Decided during M0 and M1 reviews. Each milestone's plan must include the items for it.

## Resolved in M2

- **Clamp seam gap.** Kept `MAX_RENDER_ANGLE` at 178°: no gap visible between the bottom-layer halves in a mid-fold phone screenshot (fold-in-quarters step 2, 0.5×). An engine regression test keeps the maximum seam gap under 2% of the paper.
- **Per-frame allocation.** Kept `Vec3[][]`; revisit only if a real phone stutters (headless timing is not representative).
- **☰ button backdrop.** Verified by axe on the player.

## M3 — Editor

- **Models are frozen.** `loadModel` deep-freezes its result, and the WeakMap caches assume immutability. Every edit must produce a new `Model`.
- **Mountain/valley sign mismatch.** The loader accepts a mountain crease with a positive angle and a valley with a negative one, because a precrease can later collapse the other way. The editor should warn about these, not reject them.
- **`remapAngles` tolerance.** The `onSegment` dot-product tolerance isn't normalised by edge length. There are no tests at 0..400 scale, for √2 diagonal splits, or for a new edge spanning two collinear creases. Settle the epsilon and coordinate scale in the Rabbit Ear spike.
- **Remaining loader gaps.** `frame_parent` / `frame_inherit` are ignored (steps are sequential). Non-convex faces could flip the M/V side test. Both matter only for third-party uploads.
- **"Hide steps" pill overlap.** On phones the "Hide steps" pill can sit over the paper. Consider moving it into the sheet header.

## M4 — Library and content

- **`setPositions` line buffer churn.** Each frame re-sends every line segment buffer. Preallocate per crease count before larger models.
- **`readTextScale()` every render.** Line widths are read on render, so they don't follow a live text-size change.

## M5 — Landing and polish

- **Very small screens.** At 320px wide with the sheet hidden, the dock pill (~332px) overflows and clips ◀; wrap it or hide the step count below ~340px. On desktops under ~700px tall the completion card can cover the bottom of the crease diagram.

- **Lazy-load `Stage`.** The route chunk is ~993 kB.
- **No keyboard camera control.** Only drag, pinch and scroll turn or zoom the view; R resets it.
- **Aside tab stop.** The instructions aside's `tabIndex` (needed for the scrolling phone sheet) adds a tab stop on desktop.
