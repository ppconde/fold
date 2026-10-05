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
