import { MathUtils } from 'three';
import { foldedPositions } from '../fold/fold';
import type { Model } from '../fold/types';

/** The lesson stage's camera: vertical field of view in degrees, and its angle from straight down in radians. */
export const STAGE_FOV = 35;
export const STAGE_POLAR = 0.9;

/**
 * How far the stage's camera sits from the paper, per unit of the paper's reach, in a view `aspect` wide: far
 * enough that a ball holding the paper, with some room, fits the narrower side.
 */
export function stageDistance(aspect: number): number {
  const half = MathUtils.degToRad(STAGE_FOV / 2);
  return 1.08 / Math.sin(Math.min(half, Math.atan(Math.tan(half) * aspect)));
}

/** World (x, z) centre of the paper's bounding box once `step` has settled; paper (x, y) maps to world (x − cx, −(y − cy)). */
export function endCentre(model: Model, step: number): [number, number] {
  const points = foldedPositions(model, step, step === 0 ? 0 : 1).flat();
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [cx, cy] = model.center;
  return [(Math.min(...xs) + Math.max(...xs)) / 2 - cx, -((Math.min(...ys) + Math.max(...ys)) / 2 - cy)];
}

/**
 * How far the paper reaches from the camera's centre (endCentre of `step`): the settled pose, or, while step
 * `playing` plays or is scrubbed, every pose it passes (a flap standing up, a turn-over). Sampled at quarter steps.
 */
export function frameReach(model: Model, step: number, playing?: number): number {
  const [cx, cz] = endCentre(model, step);
  const [x0, y0] = [cx + model.center[0], model.center[1] - cz];
  const poses =
    playing === undefined
      ? [foldedPositions(model, step, step === 0 ? 0 : 1)]
      : [0, 0.25, 0.5, 0.75, 1].map((t) => foldedPositions(model, playing, t));
  let reach = 0;
  for (const [x, y, z] of poses.flat(2)) reach = Math.max(reach, Math.hypot(x - x0, y - y0, z));
  return reach;
}
