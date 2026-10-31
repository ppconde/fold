# 1. Tests read the committed model files

Date: 2026-10-31 · Status: accepted

## Context

Engine and player tests load real models from `public/models/*.fold`, the files `npm run models` builds and the app serves. An architecture review suggested building them in memory instead (`loadModel(buildFold(src))`), so a model change can't break `src/` tests.

Building is slow: all 14 models take about 31 s (cicada 16 s, crane 5 s), almost all of it the solver, mostly the homepage unfold. Loading the committed files takes about 9 ms. Vitest isolates test files, so every file that built the crane would pay its 5 s again.

## Decision

Tests keep reading the committed files. `models/models.test.ts` is the one test that rebuilds every model and checks the committed files match it, so they can't drift from their sources.

## Consequences

- The engine suite stays around 1.5 s; only `models.test.ts` pays for the build.
- Engine tests run against the models users actually get.
- Changing a model means rebuilding it (`npm run models`) before `src/` tests see the change.
- `buildFold` already runs in memory and in the browser; a future editor doesn't need this to change.
