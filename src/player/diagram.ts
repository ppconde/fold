import { stepCreases } from '../fold/creases';
import type { Model, Vec2 } from '../fold/types';

export type DiagramLine = {
  edge: number;
  from: Vec2;
  to: Vec2;
  kind: 'border' | 'mountain' | 'valley' | 'cut';
  state: 'outline' | 'active' | 'past';
};

export function diagramLines(model: Model, step: number): DiagramLine[] {
  const { active, past } = stepCreases(model, step);
  const isActive = new Set(active);
  const shown = new Set([...active, ...past]);
  const target = model.steps[step].angles;
  const lines: DiagramLine[] = [];
  model.edges.forEach(([a, b], edge) => {
    const assignment = model.assignments[edge];
    const from = model.vertices[a];
    const to = model.vertices[b];
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
    const kind = assignment === 'M' || (assignment !== 'V' && target[edge] < 0) ? 'mountain' : 'valley';
    lines.push({ edge, from, to, kind, state: isActive.has(edge) ? 'active' : 'past' });
  });
  return lines;
}
