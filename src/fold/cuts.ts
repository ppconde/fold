import type { Model } from './types';

const keys = new WeakMap<Model, number[][][]>();

/**
 * Per face, per corner, a key shared by the copies of a vertex that must lie together at `step`: those joined
 * through an edge not cut by then. Without cuts, every copy of a vertex shares one key.
 */
export function cornerKeys(model: Model, step: number): number[][] {
  const list = keys.get(model) ?? [];
  keys.set(model, list);
  if (list[step]) return list[step];
  const offset: number[] = [];
  let n = 0;
  for (const face of model.faces) {
    offset.push(n);
    n += face.length;
  }
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number) => {
    let r = i;
    while (parent[r] !== r) r = parent[r];
    return r;
  };
  model.edgeFaces.forEach(([f, g], e) => {
    if (g === undefined || model.cutAt[e] <= step) return;
    for (const v of model.edges[e]) {
      parent[find(offset[f] + model.faces[f].indexOf(v))] = find(offset[g] + model.faces[g].indexOf(v));
    }
  });
  list[step] = model.faces.map((face, f) => face.map((_, c) => find(offset[f] + c)));
  return list[step];
}
