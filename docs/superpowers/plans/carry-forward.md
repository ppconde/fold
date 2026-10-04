# Carry-forward items for later milestones

Decided during M0 and M1 reviews. Each milestone's plan must include the items for it.

## M2 — Player

- **Rotation pivot.** Turn-over steps rotate about the flat paper's centre, so after folding, the paper slides sideways while turning. Fold the pivot into the anchor chain in `src/fold/fold.ts`, keeping the API unchanged. Add a test that the folded bounding-box centre stays fixed during a turn-over step.
- **Clamp seam gap.** Clamping angles at ±178° tears multi-layer folds mid-step. Fold-in-quarters step 2 shows up to 0.0175 (1.75% of the paper) at t = 0.5. Measure it on a phone, then choose between a smaller clamp (gap ≈ proportional to 180 − clamp) and a per-face normal offset. Add a test that bounds the maximum seam gap.
- **Per-frame allocation.** `foldedPositions` returns `Vec3[][]` and allocates per frame. Keep it unless phone profiling shows GC pauses. If it does, add an optional `out: Float32Array`.
- **Missing model ids.** Cloudflare's SPA fallback (and `vite preview`) return `index.html` with 200 for a missing `/models/<id>.fold`. The loader must check the id against `models.json`, or treat a non-JSON response as "Model not found".
- **Route announcements.** `<title>` is always "Fold" and focus doesn't move on navigation. Add per-route titles via route `head` + `<HeadContent />`, and move focus or announce on route change.
- **☰ button backdrop.** The fixed ☰ button has no backdrop over the canvas or scrolled content. Check its contrast over the 3D stage.

## M3 — Editor

- **Models are frozen.** `loadModel` deep-freezes its result, and the WeakMap caches assume immutability. Every edit must produce a new `Model`.
- **Mountain/valley sign mismatch.** The loader accepts a mountain crease with a positive angle and a valley with a negative one, because a precrease can later collapse the other way. The editor should warn about these, not reject them.
- **`remapAngles` tolerance.** The `onSegment` dot-product tolerance isn't normalised by edge length. There are no tests at 0..400 scale, for √2 diagonal splits, or for a new edge spanning two collinear creases. Settle the epsilon and coordinate scale in the Rabbit Ear spike.
- **Remaining loader gaps.** `frame_parent` / `frame_inherit` are ignored (steps are sequential). Non-convex faces could flip the M/V side test. Both matter only for third-party uploads.
