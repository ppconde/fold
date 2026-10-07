import type { Assignment, Edge, Vec2 } from '../src/fold/types';

export type Crease = { from: Vec2; to: Vec2; assignment: 'M' | 'V' | 'F' };

const EPS = 1e-6;
const BORDER: [Vec2, Vec2][] = [
  [
    [0, 0],
    [1, 0]
  ],
  [
    [1, 0],
    [1, 1]
  ],
  [
    [1, 1],
    [0, 1]
  ],
  [
    [0, 1],
    [0, 0]
  ]
];
const cross = (a: Vec2, b: Vec2) => a[0] * b[1] - a[1] * b[0];
const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];

/**
 * Planar graph of the unit square cut by `creases`: every segment is split where another one meets it,
 * points closer than 1e-6 merge, and faces run counter-clockwise. `edgeCrease[e]` names the crease edge e
 * lies on (null for the border). Crease ends must be exact: compute them, don't round them.
 */
export function arrange(creases: Record<string, Crease>) {
  const segments = [
    ...BORDER.map(([a, b]) => ({ a, b, name: null as string | null, assignment: 'B' as Assignment })),
    ...Object.entries(creases).map(([name, c]) => ({
      a: c.from,
      b: c.to,
      name,
      assignment: c.assignment as Assignment
    }))
  ];
  const label = (name: string | null) => name ?? 'the border';
  const vertices: Vec2[] = [];
  const vertexAt = (p: Vec2) => {
    let i = vertices.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < EPS);
    if (i === -1) i = vertices.push(p) - 1;
    return i;
  };
  const edges: Edge[] = [];
  const assignments: Assignment[] = [];
  const edgeCrease: (string | null)[] = [];
  const owner = new Map<string, string | null>();
  for (const s of segments) {
    const r = sub(s.b, s.a);
    const length = Math.hypot(...r);
    if (length < EPS) throw new Error(`Crease ${label(s.name)} has no length.`);
    const ts = [0, 1];
    for (const o of segments) {
      if (o === s) continue;
      const d = sub(o.b, o.a);
      const qp = sub(o.a, s.a);
      const denom = cross(r, d);
      if (Math.abs(denom) < EPS * length * Math.hypot(...d)) {
        // parallel: only a collinear overlap matters, and it is an authoring mistake
        if (Math.abs(cross(qp, r)) > EPS * length) continue;
        const t0 = (qp[0] * r[0] + qp[1] * r[1]) / length ** 2;
        const t1 = t0 + (d[0] * r[0] + d[1] * r[1]) / length ** 2;
        if (Math.min(Math.max(t0, t1), 1) - Math.max(Math.min(t0, t1), 0) > EPS) {
          throw new Error(`${label(s.name)} and ${label(o.name)} overlap.`);
        }
        continue;
      }
      const t = cross(qp, d) / denom;
      const u = cross(qp, r) / denom;
      const slackT = EPS / length;
      const slackU = EPS / Math.hypot(...d);
      if (t > -slackT && t < 1 + slackT && u > -slackU && u < 1 + slackU) ts.push(Math.max(0, Math.min(1, t)));
    }
    const ids = ts
      .sort((x, y) => x - y)
      .map((t) => vertexAt([s.a[0] + r[0] * t, s.a[1] + r[1] * t]))
      .filter((v, i, all) => i === 0 || v !== all[i - 1]);
    for (let i = 1; i < ids.length; i++) {
      const key = [ids[i - 1], ids[i]].sort((x, y) => x - y).join();
      if (owner.has(key)) throw new Error(`${label(s.name)} and ${label(owner.get(key) ?? null)} overlap.`);
      owner.set(key, s.name);
      edges.push([ids[i - 1], ids[i]]);
      assignments.push(s.assignment);
      edgeCrease.push(s.name);
    }
  }
  const off = vertices.find(([x, y]) => x < -EPS || x > 1 + EPS || y < -EPS || y > 1 + EPS);
  if (off) throw new Error(`Point (${off.join(', ')}) is off the paper.`);

  // neighbours of each vertex, counter-clockwise by angle
  const around = vertices.map((): number[] => []);
  for (const [a, b] of edges) {
    around[a].push(b);
    around[b].push(a);
  }
  const dangling = edges.findIndex(([a, b]) => around[a].length < 2 || around[b].length < 2);
  if (dangling !== -1) throw new Error(`Crease ${label(edgeCrease[dangling])} ends in the middle of the paper.`);
  const angle = (v: number, w: number) => Math.atan2(vertices[w][1] - vertices[v][1], vertices[w][0] - vertices[v][0]);
  around.forEach((ns, v) => {
    ns.sort((x, y) => angle(v, x) - angle(v, y));
  });

  // walk every half-edge with its face on the left; the outer loop is the one with negative area
  const faces: number[][] = [];
  const walked = new Set<string>();
  for (const [a, b] of edges) {
    for (const [u0, v0] of [
      [a, b],
      [b, a]
    ]) {
      const face: number[] = [];
      let [u, v] = [u0, v0];
      while (!walked.has(`${u},${v}`)) {
        walked.add(`${u},${v}`);
        face.push(u);
        const ns = around[v];
        [u, v] = [v, ns[(ns.indexOf(u) - 1 + ns.length) % ns.length]];
      }
      const area = face.reduce((s, p, i) => s + cross(vertices[p], vertices[face[(i + 1) % face.length]]), 0);
      if (area > EPS) faces.push(face);
    }
  }
  return { vertices, edges, assignments, edgeCrease, faces };
}
