# Paper patterns: procedural chiyogami papers with a picker in the player

## Intent

Let people fold any model on Japanese patterned paper (chiyogami). The patterns come from a printed origami booklet
the owner photographed (24 pages, `~/Desktop/booklet-shaders/IMG_0117–0141.HEIC`). Part of the fun is **flicking
between papers while folding** to see how the model looks in each one. Your choice of paper becomes your favourite and
follows you to the next model.

## Goals

- Every booklet paper is **procedural**, drawn by a shader with no image textures. This is the owner's decision, made
  even for patterns that would be easier as images.
- A paper picker in the player (**option A** from the mockups) switches the paper live at any step, with no restart.
- **Plain** stays an option: the model's own `paperColor`, exactly as it renders today.
- The selected paper is remembered on the device and applies to every model.
- The patterns that are too hard to build now are listed below so the owner can review them later.

## Non-goals

- The five hard patterns (see the end of this doc). Don't attempt them now.
- Per-model default papers. All models start on plain for now. The owner may later give some models a booklet paper
  as their own default; that can be added then as one field on the model. Don't scaffold it now.
- Photo or bitmap textures of the booklet pages.
- Papers on the home page scene. Only the player is in scope (my call).

## Anti-goals (it fails even if it works)

- Crease lines, the active-fold highlight or cut lines become hard to read on a paper. Dark papers (navy, charcoal,
  brown) are where today's dark ink `#33302C` would vanish. Folding instructions must stay legible on every paper.
- The paper stops looking like paper: it turns glossy or flat, or loses the lighting and shading that show the folds.
  Patterns sit under the same lighting and keep the washi fibre feel.
- Switching papers causes a visible hitch, a restart of the fold, or a camera reset.
- The pattern swims, slides or stretches as the paper folds. It must be printed on the sheet, following the flat-paper
  UVs.

## Decided by the owner

- **Placement (option A):** a swatch in the player dock shows the current paper.
  - **Desktop:** tapping it opens a small popover with a grid of papers.
  - **Phone:** tapping it opens a bottom sheet over the instructions, with the model still visible above. Each tap
    applies the paper immediately; the popover or sheet stays open for more flicking.
- **Plain** is the first entry in the grid.
- **Favourite wins:** the paper the person selected always applies, including on any future model that ships with its
  own default paper.
- **First visit:** a person who has never picked a paper gets plain.
- **Procedural only.** The hard ones wait and are flagged.
- **One PR per paper.** The picker lands first in its own PR, shipping with plain plus one easy geometric paper
  (Ichimatsu) to prove the pipeline end to end. After that, each paper is its own PR, so the owner reviews every
  paper on its own and any paper can stall without blocking the others.

## Decided by me (check these)

- **The pattern goes on the front face only.** The back stays today's ivory, which matches real chiyogami (printed on
  one side, white on the back).
- **Each pattern uses the booklet's own colours.** Plain uses the model colour; the patterns don't recolour per model.
- **Pattern scale starts from the booklet page,** with the whole sheet being one booklet page (it may be coarsened;
  see below). For example, the
  checkerboard is about 16 squares across. The UVs are already 0..1 across the sheet (`fillUVs`,
  `src/player/paper-geometry.ts:93`), so a pattern can be defined in sheet space.
- **The washi fibre texture stays,** layered over the pattern, as it does over plain colours today.
- **The favourite is stored with the existing storage helper** in `src/player/browser.ts`, which already tolerates
  blocked storage. It stores a paper id. An unknown id (for example a paper that was removed later) falls back to
  plain.
- **Order of paper PRs:** geometric papers first (Shippō, Asanoha, Sayagata, Seigaiha dots, the stripes, Mame
  shibori, Same komon, Shippō hanabishi, Hanabishi lattice, Ajiro weave, Wavy cords). The drawn motifs come last
  (Ume, Sakura komon, Ine, Chō, Tatewaku kumo, Ryūsui, Kusari stripes). If one of those proves as hard as the deferred
  five, it moves to the flagged list rather than holding things up.
- **The bar for each paper** is "recognisably this booklet page, in its colours, on a folded model." Each paper PR
  includes a screenshot of a folded model on the paper next to the photo, so the owner can judge it in review.
- **Gold is flat matte for now,** with no metallic sheen. That keeps the paper look the anti-goals ask for, and a
  sheen can be a later PR if flat gold reads as ochre.
- **Scale may be coarsened per paper.** "Matches the booklet page" is a starting point; fine patterns (Same komon,
  Mame shibori, Shippō hanabishi) may be enlarged so they read clearly on a folded model on a phone without
  shimmering or moiré.
- **Paper names are translated (en/pt)** through the existing i18n files. They're used for the swatch's accessible
  label and a tooltip.
- **The booklet's text is left out.** It is printed at the edges of some pages (page numbers, Japanese text on
  IMG_0131 and IMG_0140), and none of it goes into the patterns.

## The papers

Names are suggestions; the builder may refine them. Colours are read from the photos, so check them against the photos
rather than trusting the words.

### Build now (19)

| Photo | Paper | Look |
|---|---|---|
| IMG_0117 | Ume (plum blossom) | Scattered gold five-petal plum blossoms of mixed sizes, some with dotted centres, plus small buds, on deep navy |
| IMG_0121 | Sayagata | Interlocking key-fret (manji lattice) in gold on dark brown-black, set on a diagonal |
| IMG_0122 | Sakura komon | Small gold five-petal blossoms with pale centres, evenly scattered on cream |
| IMG_0124 | Same komon | Very fine, dense rows of tiny white arcs/dots on warm grey (sharkskin) |
| IMG_0125 | Shippō | Overlapping-circle lattice with four-point stars, gold on vermilion |
| IMG_0126 | Hanabishi lattice | Dense diagonal grid of white four-petal flowers and leaf shapes on navy |
| IMG_0127 | Seigaiha dots | Overlapping wave scales drawn in silver dots on saffron yellow |
| IMG_0128 | Mame shibori | Regular grid of small white rings on charcoal |
| IMG_0130 | Kusari stripes | Vertical bands of blue interlocking chain links, separated by thin blue stripes, on cream |
| IMG_0131 | Ajiro weave | Woven pattern of short white curved strokes on charcoal |
| IMG_0132 | Ichimatsu | Red and black checkerboard |
| IMG_0133 | Shippō hanabishi | Small four-petal crosses (pointed ellipses) in a tight grid, silver on slate purple |
| IMG_0135 | Ine (rice) | Scattered gold rice stalks at many angles on cream |
| IMG_0136 | Tatewaku kumo | Vertical wavy bands framing gold cloud motifs, gold on red |
| IMG_0137 | Ryūsui | Stacked flowing-water swirls in white on charcoal |
| IMG_0138 | Asanoha | Hemp-leaf star lattice, gold on vermilion, with a few brighter gold sparkle points |
| IMG_0139 | Hand-drawn stripes | Uneven vertical stripes, gold-olive on peach |
| IMG_0140 | Chō (butterflies) | Densely scattered small butterflies in pale gold on green |
| IMG_0141 | Wavy cords | Rows of wavy vertical lines that pinch and swell (like chains of beads), navy on cream |

### Later: flagged for the owner's review (5)

These are complex figurative or collage motifs that would be very hard as procedural shaders. Don't build them in this
work.

| Photo | Paper | Why it's hard |
|---|---|---|
| IMG_0119 | Kamon (family crests) | About six different crest designs in gold circles (leaves, butterfly, hexagon, fan) on red. Each crest is its own illustration. |
| IMG_0120 | Clouds and kikkō | Irregular patches of hexagon-flower lattice mixed with stylised pine/cloud clusters, gold on orange |
| IMG_0123 | Faint crests | Low-contrast circular crests and butterflies over a dotted key-fret, on red |
| IMG_0129 | Rosettes | Ornate floral medallions with fine leaf and scroll detail, white on green |
| IMG_0134 | Fan collage | Overlapping fan shapes, each filled with a different pattern (sayagata, seigaiha, asanoha, blossoms), on red |

## Constraints

- The stack is React Three Fiber/three. The paper is today a `meshStandardMaterial` front/back pair in
  `src/player/Paper.tsx` (around L94). Its colour is `softenTowardIvory(model.paperColor)` and its `map` is the washi
  texture from `src/player/washi.ts`.
- Lighting, roughness and the polygon offset (which keeps lines on top) must behave as they do today.
- Crease lines (`INK`, `HIGHLIGHT`) and cuts must stay readable on every paper; see the anti-goals.
- The player is used on phones, so the shaders must be cheap enough for mobile GPUs.
- Repo conventions: before any engine or player change ships, orbit the crane in the browser at key steps. Agents work
  in a separate worktree (`../fold-<topic>`), not the main checkout.

## Left to the builder

- How patterns become shaders. Options include injecting into the standard material (`onBeforeCompile`) or a custom
  material that keeps the standard lighting. One shader with a pattern index, or one per pattern, is also the
  builder's choice, as long as switching is instant.
- How swatch previews are drawn: the same shaders rendered small, or a canvas. They should look like the real paper,
  not the CSS stand-ins from the mockups.
- How to keep lines legible on dark papers (per-paper ink colour, a light halo, or something else).
- The visual design of the dock swatch, popover and sheet, following the existing player styles (`Player.module.css`,
  `paper` look) and keyboard and screen-reader basics: focusable swatches, an accessible name and the selected state.

## Mockups

These are the brainstorm screens in `.superpowers/brainstorm/85077-1792247295/content/`. The chosen option (A) is
`paper-picker-both.html`, the first row, desktop and phone.
