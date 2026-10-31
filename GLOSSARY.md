# Glossary

**Model**: a loaded origami lesson (`src/fold/types.ts`): the flat sheet's vertices, edges and faces, plus its steps. Frozen; an edit makes a new Model.

**Step**: one move in a lesson: the fold angle of every edge at its end, the path there, the face held still, the stack.

**Stack** (faceOrders): how overlapping faces lie on each other at the end of a step.

**Kept stack**: a step that gives no new faceOrders keeps the stack of the step that last did (a turn, or opening out). `Step.ordersFrom` names that step; a step that gives its own orders points at itself.

**Step kind**: what sort of move a step is, as `Step.kind`, named only when something reads it. `'unfold'`: the homepage's single step from the flat sheet to the finished model, every crease at once.
