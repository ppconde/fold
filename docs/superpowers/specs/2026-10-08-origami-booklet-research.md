# Research: Origami Booklet Traditional Edition and what the fold engine can build from it

Date: 2026-10-08. This is research only. No code was changed.

## 1. Which book this is

**"Origami Booklet Traditional Edition"** is the English title of **英訳付き 伝承折り紙帖** (*Eiyaku-tsuki Denshō Origami-chō*, "Traditional Origami Booklet, with English translation").

| Field | Value | Source |
|---|---|---|
| Publisher | Ikeda Shoten (池田書店, "Ikeda Publishing Co., Ltd.") | [publisher page][ikeda] |
| Supervising editor | Kazuo Kobayashi (小林一夫), chairman of the International Origami Association (国際おりがみ協会理事長) | [publisher page][ikeda] |
| ISBN | 978-4-262-15250-9 (ISBN-10 4262152502) | [publisher page][ikeda], [Amazon.com][amzn] |
| Format | A5 variant (A5変型), 96 pages, ¥1,760 including tax | [publisher page][ikeda] |
| Publication date | 2007-09 according to openBD, the Japanese publishers' bibliographic API. Some Western listings give September 2016, which is probably the listing date of an import or reprint. | [openBD][openbd], [ThriftBooks][thrift], [Internet Archive][ia] |
| Contents | 24 traditional (伝承) models, each with a perforated sheet of Edo chiyogami printed in the same pattern as the photographed model. All text is in Japanese with English alongside. | [publisher page][ikeda], [Origami Kaikan shop][kaikan] |

**This is not a booklet bundled with paper packs.** It is a standalone book from Ikeda Shoten's bilingual origami series, and the paper is bound into the book.

### Similar titles that could be confused with it

Ikeda Shoten publishes two sister books, also supervised by Kobayashi:

- **英訳付き 折り紙帖, "Origami Booklet"** (ISBN 978-4-262-15245-5). Its 24 models include kabuto, tsuru, kimono, horse, swan, paper balloon and jumping frog ([publisher page][ikeda2]).
- **英訳付き 日本折り紙帖** (ISBN 978-4-262-15295-0). Its 24 models include crane, Mount Fuji, sumo wrestler, samurai and kabuto ([publisher page][ikeda3]).

The words **"Traditional Edition"** match only 978-4-262-15250-9. That is the book used here. If you meant the plain "Origami Booklet", the model list is completely different; see question 1 in §6.

[ikeda]: https://www.ikedashoten.co.jp/book-details.php?isbn=978-4-262-15250-9
[ikeda2]: https://www.ikedashoten.co.jp/book-details.php?isbn=978-4-262-15245-5
[ikeda3]: https://www.ikedashoten.co.jp/book-details.php?isbn=978-4-262-15295-0
[amzn]: https://www.amazon.com/Origami-Booklet-Traditional-KAZUO-KOBAYASHI/dp/4262152502
[openbd]: https://api.openbd.jp/v1/get?isbn=9784262152509
[thrift]: https://www.thriftbooks.com/w/origami-booklet-traditional-edition/8278126/
[ia]: https://archive.org/details/origamibooklettr0000kazu
[kaikan]: https://origamikaikan.co.jp/eccube/products/detail.php?product_id=821

## 2. The models, in book order

**How sure each part is**

- **Names, order and paper patterns: confirmed.** All 24 come from the publisher's own table of contents (目次) on [ikedashoten.co.jp][ikeda]. In the 目次, each model is followed by the name of its chiyogami pattern in brackets.
- **Front matter: confirmed.** Before the models, the book covers its symbols (記号), basic folds (基本の折り方) and basic shapes (折り方の基本).
- **Techniques and bases: inferred.** The book's own diagrams are not online. The techniques come from other traditional diagrams of the same model, found by two research passes and listed per row.
- **Variants marked (?) are uncertain.** Several traditional variants exist, or no diagram under that name was found. Check these against the book.

**Engine status** uses three values, explained in §3: **today** (HEAD), **after crane** (the pending crane branch), and **blocked** (needs new engine work, which the row names).

| # | Name (EN / JP, romaji) | Paper (目次) | Category | Difficulty | Base | Techniques | Diagram source | Engine status |
|---|---|---|---|---|---|---|---|---|
| 1 | Sanbo, footed / 足付き三方 Ashitsuki Sanbō | Ura-ume | objects | medium | Blintz, then square (preliminary) base | Valley, mountain, blintz, squash ×many on all four sides, open out into a 3D box with feet | [origaminojikan 21858][s1a], [origamijapan box-type-9][s1b] | **Blocked**: the folding up to the end works after crane, but the box has to stand up in 3D at the end (gap G3) |
| 2 | Yakko-san / 奴さん | Kyogen-kamon | objects (figure, see §2.1) | easy | Blintz ×3 | Valley, blintz, turn over, squash ×3 (open the pockets into rectangles) | [OrigamiUSA][s2a], [origamijapan samurai][s2b] | **After crane** (squash) |
| 3 | Hakama / 袴 | Kikkō-matsu | objects | easy–medium | Blintz ×2 (same start as yakko) | Blintz, squash, pleat, mountain fold in half. Traditionally worn with a yakko, which makes it 2 sheets. | [origamijapan samurai][s2b], [asoppa 8698140][s3] | **After crane** for the hakama alone. Combining it with the yakko needs multiple sheets (G4). |
| 4 | Shuriken / 手裏剣 | Sayagata | objects (or geometric) | easy | No base: edges folded to the centre to make a strip | Valley, mountain, mirror-image corner folds on 2 sheets, interlocking tuck-in | [origaminojikan 5559][s4] | **Blocked**: 2 sheets (G4) and pocket tuck-in (G2) |
| 5 | Dove / 鳩 Hato | Ōka | animals | easy | Diagonal triangle | Valley, mountain, inside reverse fold (head), wings set at an angle | [origaminojikan 23772][s5a], [origami-club pigeon][s5b] | **After crane** (inside reverse; wings with `set`) |
| 6 | Camellia / 椿 Tsubaki | Chō-saya | flowers | easy–medium | Edges to the centre, corner squashes, pinwheel lock | Valley, mountain, squash, tuck-in lock, centre corners folded back. The leaf is a separate sheet. | [origaminojikan 21401][s6] | **Blocked**: pinwheel/twist lock with the last flap tucked under the first (G2) |
| 7 | Iris / 菖蒲 Ayame | Namida-kanoko | flowers | medium | Square base, then squash ×4, then petal ×4 (frog-base route) | Valley, squash ×8, petal or kite-thin folds, open out, curl the petals | [origaminojikan 21975][s7] | **After crane** for every flat step. The final petal curl is out of scope (G6); the model can end flat. |
| 8 | Palanquin / 御駕籠 Okago (?) | Hana-shippō | objects | medium | Unclear: starts with a squash and creases | Squash, valley on front and back, inside reverse, opened out at the end | [asoppa 9084467][s8] (only source found) | **After crane (?)**. The last opening step is unverified (G3). |
| 9 | Flower tato / 花たとう Hana-tatō (?) | Hanabishi | objects | easy–medium | Blintz-style creases, then a pinwheel | Valley, blintz, pinwheel lock, pull out the inner corners | [origaminojikan 21156][s9a], [asoppa 7828664][s9b] (both are related designs; no diagram is titled 花たとう) | **Blocked**: pinwheel lock (G2) and pulling out hidden layers (G5) |
| 10 | Fox mask / 狐の面 Kitsune no men (?) | Same-seigaiha | animals (or objects, since it is a mask) | easy | Diagonal triangle | Valley, fold in half, squash (ears) | [asahobby 514][s10a] (book references only), [mynavi fox face][s10b] | **After crane (?)**. Note: the traditional キツネ on [origaminojikan 18703][s10c] uses cuts, so if the book uses that model it is blocked. |
| 11 | Ghost / お化け Obake (?) | Mameshibori | objects (figure, see §2.1) | medium | Square base | Valley, collapse, squash ×8, inside reverse, **slits cut with scissors**, open out | [origaminojikan 35416][s11] (幽霊, the nearest traditional ghost) | **Blocked**: cutting (G1). The other candidate, the lantern ghost (提灯お化け), would need inflation, which is also out of scope. |
| 12 | Pheasant / 雉 Kiji (?) | Dainagon | animals | easy | Kite | Valley, mountain, fold in half, inside reverse ×2 (neck and head) | [tanoshii-origami kiji][s12] (not stated as traditional) | **After crane** |
| 13 | Sumo wrestler / 相撲取り Sumōtori | Komochi-yoshiwara | objects (figure, see §2.1) | easy | Blintz, then kite-style folds to the centre | Valley, mountain, blintz, unwrap the back layers, fold in half, pinch so it stands | [origami-club sumo][s13] | **After crane**: the unwrap is done as a `collapse`, and the stand pose with `set` |
| 14 | Ferryboat / 渡し船 Watashibune (?) | Ō-ami gōshi | objects | easy | Unknown. Candidates: the cupboard-base twin boat (二艘舟) or the boat turned inside out | Twin boat: valley and squash. Inside-out boat: turned inside out, which is not rigid. | [origami-club 2boat][s14a], [origami-club boat][s14b] (neither is confirmed as the book's model) | **Unknown**: after crane if it is the twin boat, blocked if it is the inside-out boat |
| 15 | Piano / ピアノ | Ichimatsu | objects | easy | Cupboard base | Valley, squash (open the pockets), fold the front down so it stands | [origami-club piano][s15] | **After crane** |
| 16 | Swallow / 燕 Tsubame | Shippō | animals | medium | Waterbomb or square-like collapse, read from the source text | Valley, squash, inside reverse, **tail split with a cut** | [origaminojikan 6167][s16] | **Blocked**: cutting (G1) |
| 17 | Celebration wrapper / 祝い包み Iwai-zutsumi (?) | Senmen samekomon | objects | easy–medium | Diagonal creases, corner folds into a tato or pinwheel | Valley, pleat, wrap, final flap tucked into a pocket | [origami-club pochi1][s17a], [pochi2][s17b] (related, not confirmed) | **Blocked**: pocket tuck-in (G2) |
| 18 | Hawk / 鷹 Taka | Tōka | animals | unknown | Unknown | No traditional diagram found | [giladorigami: 0 results][s18] | **Unknown** |
| 19 | Lantern / 提灯 Chōchin | Kumo-tatewaku | objects | easy | Cupboard-like | Valley, mountain, squash | [origaminojikan 34545][s19] | **After crane** |
| 20 | Snail / 蝸牛 Katatsumuri | Kanze-nami | animals | medium | Square base, then partial petal folds | Valley, mountain, squash/petal, inside reverse ×2, **1 cut** (horns) | [origaminojikan 20132][s20] | **Blocked**: cutting (G1) |
| 21 | Cicada / 蝉 Semi | Asanoha | animals | easy | Diagonal triangle | Valley, mountain: corners up, layered flaps down, sides mountain-folded | [origami-club cicada][s21] | **Today**: only simple folds, using `only` tags to pick the layer |
| 22 | Pig / 豚 Buta | Bōjima | animals | easy–medium | Cupboard ("pig base") | Valley, squash ×4, mountain fold in half, inside reverse (tail), squash (snout) | [origami-club pig][s22] (diagram credited ©Shingu) | **After crane** |
| 23 | Hat (sombrero) / 帽子 Bōshi (?) | Chō no mai | objects | easy | Cupboard-like | Valley, squash, crown dented to make it 3D | [origaminojikan 35688][s23a] (a traditional 帽子, but not sombrero-shaped). Traditional sombrero: [giladorigami listing][s23b], no online diagram. | **After crane (?)**. The dent is non-rigid; leave it out. |
| 24 | Whale / 鯨 Kujira | Hyōtan-tatewaku | animals | easy | Fish base (kite folds plus two rabbit-ear collapses) | Valley, mountain, rabbit ear, fold in half, optional outside reverse (tail) | [origami.me whale][s24] | **After crane**. The outside reverse is optional and has not been tried in the builder. |

[s1a]: https://origaminojikan.com/21858/2
[s1b]: https://origamijapan.net/jp/box-type-9/
[s2a]: https://origamiusa.org/diagrams/yakko-san
[s2b]: https://origamijapan.net/jp/samurai/
[s3]: https://asoppa.com/asopparecipe/makes/8698140/
[s4]: https://origaminojikan.com/5559
[s5a]: https://origaminojikan.com/23772
[s5b]: https://en.origami-club.com/traditional/pigeon/index.html
[s6]: https://origaminojikan.com/21401/2
[s7]: https://origaminojikan.com/21975/2
[s8]: https://asoppa.com/asopparecipe/makes/9084467/
[s9a]: https://origaminojikan.com/21156/2
[s9b]: https://asoppa.com/asopparecipe/makes/7828664/
[s10a]: https://origami.asahobby.net/book/hakase/514.htm
[s10b]: https://kaigoshoku.mynavi.jp/contents/kaigonomirailab/recreation/origami/2279/
[s10c]: https://origaminojikan.com/18703/3
[s11]: https://origaminojikan.com/35416
[s12]: https://tanoshii-origami.jp/tori-kiji/
[s13]: http://en.origami-club.com/fun/sumo/index.html
[s14a]: http://en.origami-club.com/fun/2boat/index.html
[s14b]: http://en.origami-club.com/fun/boat/index.html
[s15]: http://en.origami-club.com/traditional/piano/index.html
[s16]: https://origaminojikan.com/6167
[s17a]: http://en.origami-club.com/traditional/pochi1/index.html
[s17b]: http://en.origami-club.com/traditional/pochi2/index.html
[s18]: https://www.giladorigami.com/origami-database/Hawk+Traditional
[s19]: https://origaminojikan.com/34545/2
[s20]: https://origaminojikan.com/20132/2
[s21]: http://en.origami-club.com/traditional/cicada/index.html
[s22]: http://en.origami-club.com/animal/animal(big)/pig/index.html
[s23a]: https://origaminojikan.com/35688/2
[s23b]: https://www.giladorigami.com/origami-database/Sombrero+Traditional
[s24]: https://origami.me/whale/

**Totals**

| Status | Count | Models |
|---|---|---|
| Today | 1 | 21 cicada |
| After crane | 13 | 2, 3, 5, 7, 8, 10, 12, 13, 15, 19, 22, 23, 24 |
| Blocked (needs engine work) | 8 | 1, 4, 6, 9, 11, 16, 17, 20 |
| Unknown (model not identified) | 2 | 14, 18 |

### 2.1 Categories

The catalog's categories are fixed in `src/models/catalog.ts:8`: `'animals' | 'flowers' | 'objects' | 'geometric'`. Most of the book maps onto them cleanly. Three groups fit poorly:

- **People and characters:** yakko-san, sumo wrestler, obake, and arguably the fox mask. That is 3–4 models, and the sister book 日本折り紙帖 adds hina dolls, a samurai, an oni and yukinko ([publisher page][ikeda3]). **Proposal:** a `figures` category, but only if a second book is planned. Otherwise put them in `objects` with a `figure` tag.
- **Wrappers:** the flower tato and iwai-zutsumi (origata, Japanese ceremonial wrapping). These fit `objects`; add a `wrapping` tag. No new category is needed.
- **Shuriken:** either `objects` or `geometric`. It is the book's only modular model, so `objects` is the better fit.

## 3. Engine support: technique matrix

### 3.1 How the engine represents a model

- **Flat crease pattern.** A model is one flat crease pattern on the unit square (`models/arrange.ts:6-23`, BORDER). It must be a single connected sheet (`src/fold/load-model.ts:200`, "The paper is in separate pieces").
- **Steps are angles.** A step is a vector of fold angles, one per edge, each within ±180° (`src/fold/types.ts:9-23`, `load-model.ts:116`). It also holds the face that stays still, a whole-model rotation and the face stacking order (`faceOrders`).
- **Faces are rigid.** Each face is rotated rigidly about its parent crease along a spanning tree (`src/fold/fold.ts:16` `hinge`, `:86` `rootTransforms`). There are no named fold types: a "technique" is whatever the builder (`models/sequence.ts`) can turn into creases plus angles.
- **What HEAD has.** At HEAD, `foldSequence` has four methods: `turn`, `set`, `angles` and `fold` (`git show HEAD:models/sequence.ts`, lines 94–107).
  - `fold` is a simple fold along a line, through every layer to its left, or through the pieces picked by `only(tags)` (HEAD `:52-58`).
  - `set` moves existing creases to new angles, for example to open a model out at the end.
  - Every step is checked by `checkModel` (`models/check.ts:21` `spread`, `:56` `crossings`).
  - The v1 spec explicitly left squash, petal and reverse folds and tucks out of scope (`docs/superpowers/specs/2026-10-04-fold-restart-design.md:410-413`).

### 3.2 What the pending crane branch adds

These changes are uncommitted in the working tree.

- **`crease()`, fold and unfold:** a precrease made in one step, through a path that goes to 97% and back (`models/sequence.ts:334`, `PEAK` at `:66`).
- **`collapse()`:** sets many creases in one step and recomputes the layers from the flat-folded pattern (`:351`). The crane uses it for the square-base collapse, the petal folds and the wings (`models/src/crane.ts:36,71,80,103,176`).
- **`split()`, `together()`:** split an existing crease at a point; make several simple folds as one step (`:368`, `:374`).
- **Reverse folds:** `valley` can be a function that decides per layer; `over` and `tuck` choose which side the flap swings to and whether it ends tucked inside (`:77-90`). A reverse fold animates as the flap swinging over the body, then the layers swap order as it lands; it is not a true tuck (`carry-forward.md`, "Reverse folds swing over"). The crane's neck, tail and head use it (`crane.ts:142-173`).
- **`only(tags, at)`:** picks layers by position on the flat sheet as well as by tag (`:79`).
- **Path solver (`models/solve.ts:151`, `solvePaths`):** for steps whose straight motion tears the paper, it solves intermediate angles (Levenberg–Marquardt, `:68`).
  - `motionOrders` (`:221`) and `tuckIn` (`:298`) work out the layer order from the motion.
  - The engine follows the solved paths through `Step.path` (`src/fold/types.ts`, `src/fold/fold.ts:155` `pathAngles`), which `load-model.ts:202-213` reads.
  - The tear check now samples every 10% of a step (`models/check.ts:121-124`).

### 3.3 The matrix

| Technique | Today (HEAD) | After crane | Notes and evidence |
|---|---|---|---|
| Valley / mountain fold, through all layers or chosen layers | ✅ | ✅ | `fold()`, HEAD `sequence.ts:107`; `tulip.ts`, `dog-face.ts` |
| Turn over, rotate | ✅ | ✅ | `turn()`, HEAD `:94` |
| Blintz, pleat, fold in half | ✅ (made of simple folds) | ✅ | `dog-face.ts:4-34` uses `only` with tags |
| Fold and unfold (precrease) | ❌ | ✅ | `crease()`, `sequence.ts:334` |
| Collapse into a square/preliminary or waterbomb base | ❌ | ✅ | `collapse()`, `crane.ts:36` |
| Squash fold | ❌ | ✅ | `collapse()` docstring, `sequence.ts:347-350` |
| Petal fold | ❌ | ✅ | `crane.ts:75-87,109-116` |
| Rabbit ear (also used for the fish base) | ❌ | ✅ in principle | A `collapse` of creases meeting at one vertex, with a solved path. No model uses it yet. |
| Inside reverse fold | ❌ | ✅ (swings over, then the layers swap) | `sequence.ts:84-90`, `crane.ts:142` |
| Outside reverse fold | ❌ | ⚠️ untested | Same machinery with `over: false` / `valley` mirrored; no model exercises it |
| Crimp | ❌ | ⚠️ untested | Two reverse folds; the same `valley` function per layer |
| Unwrap, or pulling out a hidden layer | ❌ | ⚠️ partly | `collapse` can set creases back to 0; not tried on hidden layers |
| Swivel fold | ❌ | ❌ | `carry-forward.md`, "Legs are not narrowed… the builder can't express yet" |
| Open sink | ❌ | ❌ | No builder operation; the crease pattern inverts in the middle of a stack |
| Closed sink | ❌ | ❌ | Not rigidly foldable; out of scope |
| Twist or pinwheel lock (last flap tucked under the first) | ❌ | ❌ | `faceOrders` must be acyclic: a cycle throws `RangeError` (`src/fold/fold.ts:254`). A cyclic lock is exactly that kind of cycle. |
| Tuck a flap into a pocket | ❌ | ⚠️ only as a reverse fold | `Tuck` covers reverse folds only (`models/build.ts:13-19`) |
| Rigid 3D pose at the end (wings out, stand) | ✅ via `set` | ✅ | `crane.ts:197`; `set()`, HEAD `:98` |
| 3D box with gussets (sanbo, masu) | ❌ | ⚠️ unverified | Needs `set` plus a solved path through a degree-4+ corner; `checkModel` tear budget, `check.ts:5` |
| Inflate, turn inside out, dent | ❌ | ❌ | Not rigid: out of scope |
| Curl or shaping | ❌ | ❌ | Faces are flat polygons; out of scope |
| Cutting | ❌ | ❌ | Creases must end on the paper or on another crease (`arrange.ts:104`); there is no cut assignment. The spec's landing page promises "one sheet, no cuts" (`fold-restart-design.md:321`). |
| Multi-sheet, modular | ❌ | ❌ | One connected sheet (`load-model.ts:200`), one unit square (`arrange.ts:6`) |

## 4. Engine gaps, ranked by how many models they unblock

The count is the number of blocked or uncertain models each gap stands in front of. A model can need more than one.

| Rank | Gap | Models | Fits a rigid engine? | Suggested path |
|---|---|---|---|---|
| 1 | **G2. Pocket tuck-in and pinwheel lock.** Needs layer orders that may be cyclic, or ordered per region instead of per face pair. | Camellia, Hana-tato, Iwai-zutsumi, Shuriken (4) | Yes, but `faceOrders` needs per-region or cyclic ordering (`fold.ts:229-264`) | The most valuable piece of engine work; it also unlocks origata (wrapping) in general |
| 2 | **G1. Cutting.** | Obake, Swallow, Snail, and the fox if it is the キツネ variant (3–4) | No: the spec rules out cuts | Author cut-free variants: a swallow without the split tail, a snail with its horns folded instead of cut. Or skip these models. |
| 3 | **G3. 3D open-out of boxes and stands** (non-flat end poses through multi-crease vertices) | Sanbo; also checks Okago, Piano, Sumo (1 blocked, 3 to verify) | Partly: rigid boxes exist, but the solver must find a path through them | Try the sanbo on the crane branch first; `solvePaths` may already be enough |
| 4 | **G4. Multiple sheets** | Shuriken (needed), Hakama with yakko, Camellia leaf (optional) (1 + 2) | No: the model is one sheet | Out of scope. Use single-sheet variants. |
| 5 | **G5. Pull out or unwrap hidden layers** | Hana-tato, Sumo (2) | Yes | Exercise `collapse` on it during the crane branch |
| 6 | **G6. Curl and dent shaping** | Ayame, Hat (2, both cosmetic) | No | Leave it out; the models end flat |
| 7 | Outside reverse and crimp (untested) | Whale (optional tail) (1) | Yes | Add a builder test when the whale is authored |

Sinks and swivels block nothing in this book. They matter for the traditional narrow-leg crane (`carry-forward.md`) and for harder models.

**Fundamentally out of scope for a rigid flat-folding engine:** inflation (lantern ghost, inside-out boat), curling and denting, cuts, and multi-sheet modulars.

## 5. Suggested order

1. **Right after the crane lands**, in roughly ascending order of new technique:
   - Cicada, which can be built today.
   - Then the dove, kiji, whale, pig, piano, chōchin and yakko-san.
   - These cover the inside reverse, squash, rabbit ear and cupboard-base squash, each on its own.
2. **Next:** the ayame, which repeats the crane's petal folds.
3. **Then:** the sumo wrestler and hakama, then the sanbo as a test of the 3D open-out (G3).

## 6. Open questions

1. **Which book did you mean?** The "Traditional Edition" is 978-4-262-15250-9. The sister "Origami Booklet" (978-4-262-15245-5) has a different 24, including the kabuto, crane, horse, swan, balloon and jumping frog.
2. **Exact variants for 14 (ferryboat), 18 (hawk), 9 (hana-tato), 10 (fox mask), 11 (obake), 17 (iwai-zutsumi), 23 (sombrero).** No online diagram under these names was confirmed as the book's design. Check against a physical copy; the [Internet Archive copy][ia] is borrow-only.
3. **Licensing.** These are traditional, anonymous designs. Our models are CC BY-NC-SA (`2026-10-06-wabi-sabi-i18n-design.md:192`), and the step sequences would be written by us, not copied. Even so, do not reproduce the book's diagrams, text or chiyogami patterns.
4. **Difficulty ratings.** The book gives none on its contents page ([publisher page][ikeda]). The ratings in the table are estimates from step counts and techniques in the linked diagrams.
5. **Older models.** `carry-forward.md` mentions a cup, fox face, kabuto and paper plane that "pass checkModel", but `models/src/` contains only the crane, dog face and tulip. Were they dropped? If they come back, the fox face may cover model 10.
