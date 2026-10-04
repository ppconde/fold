import type { Edge, Model, Vec2 } from './types';

const EPSILON = 1e-9;

export function stepCreases(model: Model, step: number): { active: number[]; past: number[] } {
  if (step <= 0) return { active: [], past: [] };
  const prev = model.steps[step - 1].angles;
  const active = model.steps[step].angles.flatMap((a, e) => (a !== prev[e] ? [e] : []));
  const isActive = new Set(active);
  const past = model.edges.flatMap((_, e) =>
    !isActive.has(e) && model.steps.slice(1, step).some((s) => s.angles[e] !== 0) ? [e] : []
  );
  return { active, past };
}

function onSegment(p: Vec2, a: Vec2, b: Vec2): boolean {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const apx = p[0] - a[0];
  const apy = p[1] - a[1];
  const lengthSq = abx * abx + aby * aby;
  const cross = abx * apy - aby * apx;
  const dot = abx * apx + aby * apy;
  return Math.abs(cross) <= EPSILON * Math.sqrt(lengthSq) + EPSILON && dot >= -EPSILON && dot <= lengthSq + EPSILON;
}

/** Carry fold angles across a crease-pattern edit: each new edge takes the angle of the old edge it lies on. */
export function remapAngles(
  prev: { vertices: Vec2[]; edges: Edge[] },
  next: { vertices: Vec2[]; edges: Edge[] },
  angles: number[]
): number[] {
  return next.edges.map(([p, q]) => {
    const old = prev.edges.findIndex(([a, b]) => {
      const A = prev.vertices[a];
      const B = prev.vertices[b];
      return onSegment(next.vertices[p], A, B) && onSegment(next.vertices[q], A, B);
    });
    return old === -1 ? 0 : angles[old];
  });
}
