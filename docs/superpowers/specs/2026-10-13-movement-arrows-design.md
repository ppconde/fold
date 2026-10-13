# Movement arrows — design

Date: 2026-10-13. Status: approved in conversation, awaiting spec review.

## Why

The engine is rigid. Folds that need real paper to bend are animated as a stand-in: a reverse fold swings its flap over the front as one stack and then slides it inside (the crane's neck, tail and head), and a squash is a rigid collapse whose layers change places at the end (the Snail's step 5, PR #445). The animation lands in the right place, but the path it shows is not what hands do. Origami books solve this with arrows. This adds book-style arrows, drawn on the 3D paper, to the steps whose animation stands in for a hand move.

Decisions taken in conversation:

- **Where:** only steps whose animation is a stand-in ("faked folds"). In this PR, the crane's three reverse folds; the Snail's squash adds its own when it lands. Ordinary folds get no arrows.
- **Which symbols:** two. *Push*, the hollow arrow for "put your finger in here" / "push the spine in". *Swing*, the curved arrow for "the flap travels from here to there". No "press flat" mark.
- **When:** drawn on the step's starting pose, like a book diagram. Full strength during the lead-in pause and the start of the motion, fading out before the paper lands.

## Data: `foldapp:cues`

A new FOLD frame field, on the frame of the step it belongs to only (not inherited by later frames, like `foldapp:cut`):

```json
"foldapp:cues": [
  { "kind": "push", "face": 12, "from": [0.41, 0.18], "to": [0.47, 0.22] },
  { "kind": "swing", "face": 12, "from": [0.30, 0.05], "to": [0.62, 0.71] }
]
```

- `face`: the face the arrow is anchored on: the top layer, on the step's starting pose, under `to` for a push (it points at the paper and may start off it) and under `from` for a swing (it starts on the flap).
- `from`, `to`: flat-sheet points in that face's plane. `to` may lie outside the face (a swing ends where the flap lands).
- Loader (`src/fold/load-model.ts`): reads it into `Step.cues: Cue[]` (`type Cue = { kind: 'push' | 'swing'; face: number; from: Vec2; to: Vec2 }`, empty when absent). A cue with an unknown kind, a face that does not exist, a point that is not two finite numbers, or `from` equal to `to` throws a `FoldError` naming the step: `Step N foldapp:cues needs {kind: push|swing, face, from: [x, y], to: [x, y]} with from and to apart.`

## Builder

`fold`, `crease` and `collapse` in `models/sequence.ts` take an optional `cues?: CueSpec[]` with `type CueSpec = { push: [Vec2, Vec2] } | { swing: [Vec2, Vec2] }`. Points are view coordinates, the same space as `hold`.

- They are read against the pieces as they lie before the step: the top piece (last in the stack) whose view outline contains the anchor point (`q` for a push, `p` for a swing) anchors the cue, and both points go to flat-sheet coordinates through that piece's `toView` inverse.
- `SourceStep` gains `cues?: { kind: 'push' | 'swing'; from: Vec2; to: Vec2 }[]` in flat-sheet points; `buildFold` resolves the face containing the anchor point (as it does for `hold`; every face inside one piece lies in one plane at the step's start, since later creases are still flat) and writes `foldapp:cues`, points rounded to 6 decimals.
- A cue whose anchor point is not on the paper throws: `Step N's push cue points off the paper.` / `Step N's swing cue starts off the paper.`
- `together` passes cues through from the folds it gathers (the gathered step's cues are the concatenation).

## Player

New pure module `src/player/cues.ts`:

- `cueSegments(model, step): number[]`: line-segment points (x, y, z triples, pairs per segment) for every cue of `step`, on the step's starting pose `foldedPositions(model, step, 0)`. Each anchor face's map from flat to 3D comes from three of its corners (an affine map; faces are rigid). Arrows sit `3 × LAYER_GAP` above the face, along its normal.
  - **push:** a hollow arrow outline in the face plane from `from` to `to`: shaft width 0.18 × length, head width 0.45 × length, head length 0.35 × length, as one closed outline (7 corners).
  - **swing:** a quadratic arc from `from` to `to` whose control point rises along the face normal by 0.35 × |to − from|, as 16 segments, plus a V head at `to` along the arc's end tangent (two strokes, 0.18 × length each, 25° off the tangent).
- `cueOpacity(t): number`: 1 for t ≤ 0.1, then linear to 0 at t = 0.5, 0 after.

`src/player/Paper.tsx`: one more drei `Line` (segments) in the highlight colour `#A5633F`, `lineWidth` 2.2, `depthTest={false}`, `renderOrder` above the cut trace, `transparent`. Its points are `cueSegments(model, step)` (recomputed when the step changes), its material opacity `cueOpacity(t)`, hidden when there are no cues or the opacity is 0.

The homepage unfold (`src/home/unfold.ts`) drops `foldapp:cues` from its frames, as it does the cut trace. The crease diagram is unchanged.

Reduced motion follows the same rule: the arrows show whenever the step sits at its start (t near 0) and fade with t.

## The crane

Its three reverse folds get two cues each, in `models/src/crane.ts`, from the fold lines `turnFlap` already gives:

- **push:** on the flap, a short arrow just below the fold line, pointing at the flap's folded back edge (where the fold is pushed in).
- **swing:** from the flap's tip (`B` for the neck and tail, the neck's tip for the head) to where the tip lands (`mirror(tip, foldLine)`).

`crane.fold` changes only by gaining `foldapp:cues` on those three frames. Its SVG, and every file of the dog face and the tulip, stay byte-identical. PR #445 also rebuilds `crane.fold`; whichever merges second reruns `pnpm models`.

## Testing

- Loader: a valid cue list loads on its own step only; each malformed case throws its message.
- Builder: a cue's points come back as flat-sheet points through the top layer under its anchor point; an anchor off the paper throws; `together` keeps cues; `buildFold` writes the face containing the anchor.
- `cues.ts`: a push outline is closed, lies in its face plane `3 × LAYER_GAP` above it, and its tip is at `to`; a swing arc starts at `from`, ends at `to`, and its highest point is 0.35 × |to − from| / 2 above the face (a quadratic's peak is half its control height); `cueOpacity` gives 1, 1, 0.5, 0, 0 at 0, 0.1, 0.3, 0.5, 1.
- Models: every model passes `checkModel`; `pnpm models` changes only `crane.fold`, only by the new field.
- Existing e2e passes. Manual check in the browser: the crane's neck step at its start (arrows), while playing (fading, gone by mid-step) and at its end (none); preview server stopped afterwards.

## Out of scope

The "press flat" mark, arrows in the 2D crease diagram, arrows on ordinary folds, and the Snail's arrows (its own PR).
