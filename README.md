# Fold

Learn origami step by step: an interactive 3D model folds along with you, next to the crease pattern for each step.

The app is available in English and European Portuguese (switch from the menu).

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

Copyright © 2026 Pedro Conde. All rights reserved.

The source is public so you can read it, but it is **not** open source. The code, models, step sequences and paper patterns may not be copied, modified, redistributed or used to train AI systems without written permission. Text and data mining rights are reserved under EU Directive 2019/790, Art. 4(3). See [`LICENSE`](LICENSE) for the full terms.

Versions published before this change were released under the GPLv3, and copies of those versions remain under it. Third-party components (npm dependencies, the FOLD format, the fonts) keep their own licences.
