# 2. One model file, rebuilt on each edit, finished on save

Date: 2026-10-31 · Status: accepted (for the editor, not built yet)

## Context

A future editor will let people create, edit, upload and share their own models. Today models are authored as TypeScript (`models/src/*.ts`), built by `buildFold` (`models/build.ts`) and served as FOLD files (`public/models/*.fold`) that already carry app fields under the `foldapp:` prefix.

Measured on the library (2026-10-31, one core):

| Build stage | crane | whale | cicada |
|---|---|---|---|
| Fold sequence + crease layout (`arrange`) | 15 ms | 11 ms | 7 ms |
| Collapse-step solves | 114 ms | 52 ms | 0 |
| Layer order (`motionOrders`) | 71 ms | 65 ms | 0 |
| Pivot trials (`markPivots`) | 237 ms | 369 ms | 339 ms |
| **All but the homepage unfold** | **~0.44 s** | **~0.5 s** | **~0.35 s** |
| Homepage unfold solve | 5.0 s | 5.2 s | 16.7 s |
| `checkModel` | 0.47 s | 0.31 s | 0.24 s |

`arrange` lays out one crease pattern for the whole sheet. Adding a crease at a late step renumbers every earlier step's edges and faces (the angles are unchanged; it is pure renumbering), so a step-by-step incremental build would have to re-key everything by crease geometry.

## Decision

1. **A shared model is one `.fold` file**, valid FOLD, extended with our fields:
   - `foldapp:source`: the fold sequence as data, which the editor edits;
   - the standard FOLD fields plus the existing `foldapp:` fields: the built model, which playback reads;
   - `foldapp:unfold`: stored, since it is too slow to compute on demand;
   - `foldapp:version`: the extension's version.

   The extension stays `.fold`, so other FOLD tools still open the files. A file without `foldapp:source` (from another tool) plays but can't be edited step by step.
2. **On upload, the file is rebuilt from `foldapp:source` and compared with its built part**, the same check `models.test.ts` makes for the library ([ADR 1](0001-tests-read-committed-models.md)).
3. **On each edit, the editor rebuilds the whole model except the homepage unfold** (about 0.5 s). There is no incremental per-step build.
4. **On save or publish, the homepage unfold is solved and the model checked.** Until then, a preview of the unfold falls back to the straight flat-to-finished path, as four library models already do.
5. **The engine interface stays as it is.** The solver uses the engine's kinematics (`rootTransforms`, `treeEdges`) because it must move paper exactly as the engine does. `markPivots` stays a build-time trial; moving it into the engine would make the engine import the model checker, for about 0.3 s a rebuild.

## Consequences

- Nothing changes in code until the editor starts. Its first day splits `buildFold` into "all but the unfold" and "add the unfold".
- The real work for the editor is `foldapp:source` itself. `foldSequence`'s `valley` and `only` options are JS functions today and must become data.
- Pivot trials are the largest per-edit cost. If editing feels slow, they are the first thing to speed up or cache.
