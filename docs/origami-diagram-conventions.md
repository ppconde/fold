# Origami diagram conventions

Every drawing the app shows the folder, such as the crease diagram, the "How" drawings and any future step illustration, follows the **Yoshizawa–Randlett system**. It's the notation origami books have used since the 1960s, so anyone who has folded from a book can read our drawings without a legend. Anything a step needs that the system has no mark for is listed under "Our additions", and is kept as small as possible.

## Where it comes from

- **Akira Yoshizawa** introduced it in *Atarashi Origami Geijutsu* (1954): dashed and dash-dot lines for valley and mountain folds, and symbols such as "inflate".
- **Samuel Randlett** and **Robert Harbin** added symbols such as "rotate" and "zoom in", and adopted it as the standard. Randlett first set it out in *The Art of Origami* (1961).
- **Robert J. Lang** proposed a standard set of symbols in a series of articles for the Friends of the Origami Center of America (now OrigamiUSA), 1989–1991. Most current diagrams follow it. Lang's "view from here" eye symbol is widely used but is not part of the system.

## Lines

| Line | Drawn as | Means |
|---|---|---|
| Edge | Thick solid line | An edge of the paper |
| Crease | Thin line (often grey) | A fold made earlier and unfolded |
| Valley fold | Dashed line | Fold toward you: the paper forms a valley |
| Mountain fold | Dash-dot line (one or two dots per dash, depending on the author) | Fold away from you: the paper forms a ridge |
| Hidden or not yet made | Dotted line | A fold or edge behind other layers ("x-ray"), or where paper will go |

## Arrows

| Arrow | Drawn as | Means |
|---|---|---|
| Valley fold | Curved arrow with a filled head | Fold the paper this way, in front |
| Mountain fold | Curved arrow with a hollow half head | Fold the paper this way, behind |
| Fold and unfold | Zig-zag arrow, or one arrow with a head at each end | Fold, crease, and open back out |
| Push | Filled head with no stem, or a broad ("rotund") arrow | Push here: used for reverse folds and sinks |
| Pull | Broad arrow pointing out | Pull paper out from here |
| Inflate | Broad arrow | Blow or open into the model |
| Turn over | Loop-the-loop arrow | Turn the whole model over |
| Rotate | Circle of arrows with a number or fraction in it | Rotate by that much (e.g. 90, 1/4), clockwise unless shown otherwise |
| Repeat | Arrow with one or more short strokes across it | Repeat the step that many times, or on the flap shown |
| Repeat behind | Repeat mark on a mountain-fold arrow, or the words "repeat behind" | Do the same on the back |

## Named operations

These are drawn as combinations of the marks above:
- pleat
- inside and outside crimp
- inside and outside reverse fold
- open
- sink
- inflate
- roll
- cut

The system also has view marks: turn over, rotate, zoom in and zoom out.

**Inside reverse fold** is the one the crane's neck, tail and head use. It's drawn as one picture:
- the fold line as a **mountain fold** on the near layer (the far layer folds the same way, mirrored);
- a **push** mark on the folded edge (the spine) where the fold line meets it;
- a curved arrow showing where the tip goes.

Tutorials teach it in four steps:
1. Fold along the line and unfold, so the crease exists.
2. Open the layers a little, and turn the near crease the other way.
3. Push the tip in between the layers.
4. Flatten, pressing the creases firmly.

## Paper sides

Books show the two sides of the paper by tone: the coloured side shaded or coloured, the white side left white. We draw the coloured side in the paper's colour and the white side in a light paper tone. Both have a light and a dark-mode value.

## How the app uses it

- **Crease diagram** (`src/player/CreaseDiagram.module.css`): valley `stroke-dasharray: 6 4` (dashed), mountain `8 3 2 3` (dash-dot). It already follows the system.
- **"How" drawings for reverse folds** (`src/player/how-drawing.ts`, drawn from the model): they use the marks above. The fold line is a mountain line, there is a push mark at the spine, a curved arrow shows the tip's path, a dotted outline shows where the flap lands, the white inside shows wherever the layers part, and the flipping edge is yellow (below).
- **On-stage 3D marks on reverse folds** (`src/fold/reverse.ts`, drawn by `src/player/Paper.tsx`) use the system's own marks, as a book draws the step:
  - the fold line is dash-dot, a mountain fold;
  - a hollow push arrow lies flat on the paper, filled with the paper's back colour, pointing at the folded edge where the fold line meets it. Only the one on the camera's side of the paper shows;
  - a curved arrow with a filled head runs from the tip to where it lands, bowed a little out from the body.

## Our additions

Marks the system doesn't have, used only where a step needs them:
Any mark added here should look like the system's own, so a book folder doesn't need a legend.
- **The flipping edge** on a reverse fold: the flap's folded edge (its spine), the part that turns inside out, drawn yellow (`--spine`) in every frame. It's solid where it is and dotted where it goes or was. Books pick out the part they talk about with a colour or tone, so it reads without a legend. Used by the How drawings (`src/player/how-drawing.ts`).

Rejected (2026-10-28): fingers (a thumb in front, a dotted finger behind) and a front-and-turned-over pair to say "press both sides" on a reverse fold. The system's own picture (mountain line, push arrow, tip arrow) already means both layers turn together.

## Sources

- [Wikibooks: Origami/Techniques/Yoshizawa-Randlett system](https://en.wikibooks.org/wiki/Origami/Techniques/Yoshizawa-Randlett_system)
- [Wikipedia: Yoshizawa–Randlett system](https://en.wikipedia.org/wiki/Yoshizawa%E2%80%93Randlett_system)
- [Origami Resource Center: Origami symbols, lines and arrows](https://origami-resource-center.com/origami-symbols/)
- [Origami Expressions: Guide to basic origami symbols](https://origamiexpressions.com/basic-symbols) (follows Lang's recommendations)
- [Origami Resource Center: Inside reverse fold](https://origami-resource-center.com/inside-reverse-fold)
- [Origami.guide: Inside reverse fold](https://origami.guide/beginner-origami/origami-folding-techniques/inside-reverse-fold/)
- [OrigamiUSA, *The Fold*: the evolution of the notation system](https://origamiusa.org/thefold/article/evolution-notation-system)
- Robert J. Lang, [Origami diagramming conventions: a historical perspective](https://www2.ibb.unesp.br/Museu_Escola/Ensino_Fundamental/Origami/Artigos/Origami%20Diagramming_Conventions%20A%20Historical%20Perspective.pdf)
