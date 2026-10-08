# Origami Booklet Traditional Edition — roadmap

Steps per model: `../specs/2026-10-08-origami-booklet-steps.md`. Book research and engine gaps: `../specs/2026-10-08-origami-booklet-research.md`.

Rules: one PR per model; engine work and bases land in their own PRs before the models that need them. Everything branches from main **after the crane branch merges** (it brings squash, petal and inside reverse folds, and the path solver). Each PR gets its own detailed plan when it starts.

## Order

1. **Engine: slits.** A cut along a line inside the paper, so the two sides fold independently afterwards. Animation: a distinct line traces along the cut path, then the edges part. Slits only; cutting a piece off (smaller piece dissolves) waits for a model that needs it.
2. **Snail (#20)**, the first booklet model. Needs slits (step 11), squash (step 5), inside reverse folds (step 10). It makes its own square base, so it doesn't wait on the bases. Category: animals.
3. **Catalog.** Categories become animals, flowers, objects, figures, bases (`src/models/catalog.ts:8`, `src/models/filter.ts:7`, EN/PT labels in `src/i18n/`):
   - add `figures` (Yakko-san, Sumo, Obake) and `bases`; drop `geometric` (no models). Fox mask goes in objects with a `fox` tag.
   - add a `buildsOn` field on catalog entries; the model page shows "Starts from: …" with a link.
   - remove Fold in half and Fold in quarters from the library (`models/src/index.ts`, `public/models/models.json`). Keep them as test-only fixtures for the engine unit tests (`src/fold/fixtures.ts`), and point the e2e specs (player, library, language) at a real model such as the tulip.
4. **Bases, one PR each**, shared from `models/src/bases.ts`: square base, kite base, kannon fold, double kannon fold, blintz base, Basic Shape 1, Basic Shape 2 (bird base). The crane moves onto the shared square base and Basic Shape 2.
5. **Models with no further engine work**, one PR each, easiest first: Cicada, Dove, Whale, Yakko-san, Hakama, Pig, Chochin, Hawk.
6. **Remaining slit models:** Obake, Kiji (step 2 needs checking against the book first).
7. **Engine: locks and tucks** (one flap slides under another, layer order with a cycle; `src/fold/fold.ts` currently throws on cycles). Then Camellia, Hana-tato, Iwai-zutsumi, Swallow (tail threaded through a slit).
8. **Spike: box open-out** (flat paper opening into a 3D box). Then the models that finish in 3D: Sanbo, Fox mask, Piano (continues from Fox mask), Okago, Ayame, Hat, Sumo, Ferryboat. Ayame's petal curl stops at the last flat-or-opened step.

Excluded: Shuriken (two sheets). Before modelling any step marked uncertain in the steps doc, check it against the book.
