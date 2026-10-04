import type { Model } from './types';

export function assertStep(model: Model, step: number) {
  if (!Number.isInteger(step) || step < 0 || step >= model.steps.length) {
    throw new RangeError(`Step ${step} does not exist (0–${model.steps.length - 1}).`);
  }
}
