# Fold

Learn origami step by step: an interactive 3D model folds along with you, next to the crease pattern for each step.

Live at https://fold.ppconde.com

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # unit tests (Vitest)
pnpm test:e2e     # end-to-end tests (Playwright)
pnpm check        # lint + format (Biome)
```

Models are [FOLD](https://github.com/edemaine/fold) files in `public/models/`. The design spec lives in `docs/superpowers/specs/`.

## License

Code: GPLv3 (see `LICENSE`). Models: CC BY-NC-SA 4.0 unless stated otherwise.
