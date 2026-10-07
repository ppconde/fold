# Carry-forward items for later milestones

Decided during M0 and M1 reviews. Each milestone's plan must include the items for it.

## Resolved in M2

- **Clamp seam gap (NOT resolved; see M3).** Kept `MAX_RENDER_ANGLE` at 178°: no gap visible between the bottom-layer halves in a mid-fold phone screenshot (fold-in-quarters step 2, 0.5×). The 2%-of-paper claim no longer holds: the gap is now visible at rest and grows with distance from a stack (0.047 on a 3-panel grid, 0.052 on a 4-panel grid at t=1). Regression tests only stop it getting worse.
- **Per-frame allocation.** Kept `Vec3[][]`; revisit only if a real phone stutters (headless timing is not representative).
- **☰ button backdrop.** Verified by axe on the player.

## Editor (later)

- **Non-rigid steps tear mid-fold.** When one step moves several creases that meet at a vertex (e.g. a degree-4 corner) and those creases are interpolated linearly at the same time, faces can separate mid-step by up to ~0.6 of the paper, even though `checkConsistency` is fine at the step's end. The editor should warn when a step folds more than one crease meeting at a vertex, or check consistency at intermediate t.

- **Models are frozen.** `loadModel` deep-freezes its result, and the WeakMap caches assume immutability. Every edit must produce a new `Model`.
- **Mountain/valley sign mismatch.** The loader accepts a mountain crease with a positive angle and a valley with a negative one, because a precrease can later collapse the other way. The editor should warn about these, not reject them.
- **`remapAngles` tolerance.** The `onSegment` dot-product tolerance isn't normalised by edge length. There are no tests at 0..400 scale, for √2 diagonal splits, or for a new edge spanning two collinear creases. Settle the epsilon and coordinate scale in the Rabbit Ear spike.
- **Remaining loader gaps.** `frame_parent` / `frame_inherit` are ignored (steps are sequential). Non-convex faces could flip the M/V side test. Both matter only for third-party uploads.
- **Homepage crane.** Switch it to a crease-pattern build when the crane lesson exists.

## Resolved in M4 (part 1)

- **Step count cell may overflow at 10 or more steps.** The 7th dock column is now `minmax(44px, max-content)`; asserted on the 11-step kabuto in part 2.
- **`setPositions` line buffer churn.** `writeSegments` (src/player/segments.ts) reuses the line buffer while the segment count is unchanged.
- **`readTextScale()` every render.** Moot: the text-size option was removed at the maintainer's request (browser zoom covers it).

## Layer-order milestone (inserted before M4 part 2)

- **M4 part 2 needs `foldSequence().set()` back.** It was removed as unused in part 1. The paper plane's last step (plan Task 11) calls it to open the wings: `set(fold, text, rotation?)` pushes `{ fold, ...text, rotation }`.
- **Flaps cut through flaps at rest.** No layer order: a flap folded onto another flap clamps to the same 178° wedge. `pnpm models` with the full `models/src/index.ts` from Task 11 of the M4 plan reports it for the cup (from step 4), fox face (step 3), samurai helmet (step 3) and paper plane (step 4). Done when those four pass `checkModel` unchanged.
- **Thumbnail painter's order.** `models/thumbnail.ts` paints faces by mean height; switch it to the solver's layer order.
- **Disconnected stacks pass through themselves.** The fold engine keeps a stack rigid only when its layers share a crease the step leaves alone. Folding the free corner of a folded-in-half sheet moves two separate tips, and they still cross mid-fold (signed gap +0.017 → −0.009). The layer-order solver must handle this case (see the `it.todo` in `src/fold/fold.test.ts`).
- **Seam gap at rest.** The 178° clamp leaves copies of a vertex apart even when the step is finished (0.047 on 3 panels, 0.052 on 4, at t=1). The layer-order solver must remove it.

## M5 — Landing and polish

- **Homepage motion gaps.** It uses frameloop 'always' (the spec asked for 'demand', paused on visibilitychange), and the ≤1° camera drift was never built.
- **English-only strings.** FoldError detail messages are English for PT users (catalog.ts says "The model library is not a FOLD file." for models.json); index.html meta description is English only.

- **Very small screens.** At 320px wide with the sheet hidden, the dock pill (~332px) overflows and clips ◀; wrap it or hide the step count below ~340px. On desktops under ~700px tall the completion card can cover the bottom of the crease diagram.

- **Scrub position not in the URL.** A reload shows the step fully folded.
- **Slider can touch the paper's bottom edge on desktop.** Camera framing ignores the taller dock.
- **Lazy-load `Stage`.** The route chunk is ~993 kB.
- **No keyboard camera control.** Only drag, pinch and scroll turn or zoom the view; R resets it.
- **Aside tab stop.** The instructions aside's `tabIndex` (needed for the scrolling phone sheet) adds a tab stop on desktop.
- **User photography for the About page.**
- **Dock hint says "hover for names".** Wrong on touch devices.
- **Phone completion card overlaps the instruction sheet.**
- **Shippori Mincho weight 500 is used** but only 400/600 load.
- **Library list sets `lang="ja"` on the romaji Japanese name.** Should be `ja-Latn` or none.
- **Homepage crane polish.** Shadow sits low; crane fills ~35% of the canvas; pointer tilt isn't reset on mouseleave.
- **Step-1 raised flap is clipped** at the top of the player canvas (camera framing).
- **No drift test** between `src/styles/palette.ts` and the CSS tokens in `global.css`.
