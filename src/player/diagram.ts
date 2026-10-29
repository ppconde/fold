import { Euler, MathUtils, Vector3 } from 'three';
import { stepCreases } from '../fold/creases';
import type { Model, Vec2 } from '../fold/types';

type DiagramLine = {
  edge: number;
  from: Vec2;
  to: Vec2;
  kind: 'border' | 'mountain' | 'valley' | 'cut';
  state: 'outline' | 'active' | 'past';
};

/**
 * The flat sheet turned as the model is at `step` (paper x right, y away from you), and whether its back faces
 * you. A turn that stands the model on edge keeps the last turn that left it lying flat.
 */
function sheetView(model: Model, step: number): { at: (p: Vec2) => Vec2; back: boolean } {
  for (let k = step; k > 0; k--) {
    const turn = new Euler(...model.steps[k].rotation.map((a) => a * MathUtils.DEG2RAD));
    const up = new Vector3(0, 0, 1).applyEuler(turn).z;
    if (Math.abs(up) > 0.5) {
      const at = ([x, y]: Vec2): Vec2 => {
        const v = new Vector3(x, y, 0).applyEuler(turn);
        return [v.x, v.y];
      };
      return { at, back: up < 0 };
    }
  }
  return { at: (p) => p, back: false };
}

/** The crease pattern as the book draws it: the sheet as it lies in the view, valleys and mountains as seen. */
export function diagramLines(model: Model, step: number): DiagramLine[] {
  const view = sheetView(model, step);
  const { active, past } = stepCreases(model, step);
  const isActive = new Set(active);
  const shown = new Set([...active, ...past]);
  const target = model.steps[step].angles;
  const lines: DiagramLine[] = [];
  model.edges.forEach(([a, b], edge) => {
    const assignment = model.assignments[edge];
    const from = view.at(model.vertices[a]);
    const to = view.at(model.vertices[b]);
    if (assignment === 'B') {
      lines.push({ edge, from, to, kind: 'border', state: 'outline' });
      return;
    }
    if (assignment === 'C') {
      // a slit shows from the step that cuts it, then stays as part of the paper's outline
      if (model.cutAt[edge] <= step) {
        lines.push({ edge, from, to, kind: 'cut', state: model.cutAt[edge] === step ? 'active' : 'outline' });
      }
      return;
    }
    if (!shown.has(edge)) return;
    const mountain = assignment === 'M' || (assignment !== 'V' && target[edge] < 0);
    const kind = mountain !== view.back ? 'mountain' : 'valley';
    lines.push({ edge, from, to, kind, state: isActive.has(edge) ? 'active' : 'past' });
  });
  return lines;
}
