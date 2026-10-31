import { assertStep } from './assert-step';
import type { Model } from './types';

const moved = new WeakMap<Model, ReadonlySet<number>[]>();

/**
 * The creases `step` moves: any whose angle, anywhere along its path or at its end, differs from where the step
 * before left it. A crease that folds and unfolds within the step is one; none at step 0.
 */
export function movedCreases(model: Model, step: number): ReadonlySet<number> {
  const list = moved.get(model) ?? [new Set()];
  moved.set(model, list);
  if (list[step]) return list[step];
  const prev = model.steps[step - 1].angles;
  const knots = [...model.steps[step].path, model.steps[step].angles];
  list[step] = new Set(prev.flatMap((a, e) => (knots.some((k) => k[e] !== a) ? [e] : [])));
  return list[step];
}

export function stepCreases(model: Model, step: number): { active: number[]; past: number[] } {
  assertStep(model, step);
  const isActive = movedCreases(model, step);
  const past = model.edges.flatMap((_, e) =>
    !isActive.has(e) && model.steps.slice(1, step).some((s) => [...s.path, s.angles].some((a) => a[e] !== 0)) ? [e] : []
  );
  return { active: [...isActive], past };
}
