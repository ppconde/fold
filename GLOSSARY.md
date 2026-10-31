# Glossary

**Model**: a loaded origami lesson (`src/fold/types.ts`): the flat sheet's vertices, edges and faces, plus its steps. Frozen; an edit makes a new Model.

**Step**: one move in a lesson: the fold angle of every edge at its end, the path there, the face held still, the stack.

**Stack** (faceOrders): how overlapping faces lie on each other at the end of a step.

**Kept stack**: a step that gives no new faceOrders keeps the stack of the step that last did (a turn, or opening out). `Step.ordersFrom` names that step; a step that gives its own orders points at itself.

**Step kind**: what sort of move a step is, as `Step.kind`, named only when something reads it. `'unfold'`: the homepage's single step from the flat sheet to the finished model, every crease at once. `'reverse'`: a reverse fold, found by the loader from the angles (not stored in the file).

**Reverse fold**: a flap's spine turns inside out: a crease already folded flat flips sign while new creases appear along one line, and the flap tucks between the body's layers. Its **fan** is how the flap swings round while the body opens; its **spine** is the flap's folded edges that flip. `reverseFold(model, step)` gives everything the player draws for one, or null.

**Fold-and-unfold**: a step whose path folds a crease and opens it again, so it ends where it started (a pre-crease). Its flap still counts as moving.

**Moved creases / moving faces**: what a step changes: `movedCreases` (creases.ts) are the creases whose angle differs anywhere along the path or at the end; `movingFaces` (fold.ts) are the faces that leave their place on the way.

**Model file**: a `.fold` file holding one model: the built model (standard FOLD plus `foldapp:` fields) that playback reads, and its source. See ADR 2.

**Source** (`foldapp:source`): the fold sequence as data, the folds a person makes in order, which an editor edits and the build turns into the built model. Today's sources are TypeScript in `models/src`.
