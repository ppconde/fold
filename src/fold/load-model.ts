import type { Assignment, Edge, FaceOrder, Model, Step, Vec2, Vec3 } from './types';

export class FoldError extends Error {
  override name = 'FoldError';
}

const ASSIGNMENTS = new Set(['M', 'V', 'B', 'F', 'U']);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const edgeKey = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);

function readArray(json: Record<string, unknown>, field: string): unknown[] {
  const value = json[field];
  if (!Array.isArray(value)) throw new FoldError(`The file is missing ${field}.`);
  return value;
}

function isIndex(v: unknown, length: number): v is number {
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) < length;
}

export function loadModel(json: unknown): Model {
  if (!isRecord(json)) throw new FoldError('The file is not a FOLD object.');

  const vertices = readArray(json, 'vertices_coords').map((v, i): Vec2 => {
    if (!Array.isArray(v) || v.length < 2 || !isNum(v[0]) || !isNum(v[1])) {
      throw new FoldError(`Vertex ${i} must have x and y numbers.`);
    }
    if (v.length > 2 && v[2] !== 0) throw new FoldError(`Vertex ${i} is not flat (z must be 0).`);
    return [v[0], v[1]];
  });

  const edges = readArray(json, 'edges_vertices').map((e, i): Edge => {
    if (!Array.isArray(e) || e.length !== 2 || !e.every((v) => isIndex(v, vertices.length))) {
      throw new FoldError(`Edge ${i} must join two existing vertices.`);
    }
    if (e[0] === e[1]) throw new FoldError(`Edge ${i} must join two different vertices.`);
    return [e[0], e[1]];
  });

  const assignments = readArray(json, 'edges_assignment');
  if (assignments.length !== edges.length || !assignments.every((a) => ASSIGNMENTS.has(a as string))) {
    throw new FoldError(`edges_assignment needs one of M, V, B, F, U for each of the ${edges.length} edges.`);
  }

  const faces = readArray(json, 'faces_vertices').map((f, i) => {
    if (!Array.isArray(f) || f.length < 3 || !f.every((v) => isIndex(v, vertices.length))) {
      throw new FoldError(`Face ${i} must list at least three existing vertices.`);
    }
    return [...f] as number[];
  });

  if (faces.length === 0) throw new FoldError('The model has no faces.');

  const edgeIndex = new Map(edges.map(([a, b], i) => [edgeKey(a, b), i]));
  if (edgeIndex.size !== edges.length) throw new FoldError('Two edges join the same pair of vertices.');
  const faceEdges = faces.map((f, i) =>
    f.map((v, j) => {
      const e = edgeIndex.get(edgeKey(v, f[(j + 1) % f.length]));
      if (e === undefined) throw new FoldError(`Face ${i} has a side that is not an edge.`);
      return e;
    })
  );
  const edgeFaces = edges.map((): number[] => []);
  faceEdges.forEach((es, f) => {
    for (const e of es) edgeFaces[e].push(f);
  });

  const crowded = edgeFaces.findIndex((fs) => fs.length > 2);
  if (crowded !== -1) throw new FoldError(`Edge ${crowded} is shared by more than two faces.`);

  const faceCentroids = faces.map(
    (f): Vec2 => [
      f.reduce((s, v) => s + vertices[v][0], 0) / f.length,
      f.reduce((s, v) => s + vertices[v][1], 0) / f.length
    ]
  );
  const xs = vertices.map((v) => v[0]);
  const ys = vertices.map((v) => v[1]);
  const center: Vec2 = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];

  assertConnected(faces.length, faceEdges, edgeFaces);

  const frames = readArray(json, 'file_frames');
  if (frames.length === 0) throw new FoldError('The model has no steps.');

  const nearestToCenter = faceCentroids.reduce(
    (best, c, i) => {
      const d = Math.hypot(c[0] - center[0], c[1] - center[1]);
      return d < best.d ? { i, d } : best;
    },
    { i: 0, d: Number.POSITIVE_INFINITY }
  ).i;

  const steps: Step[] = [
    {
      angles: edges.map(() => 0),
      instruction: { en: '' },
      fixedFace: nearestToCenter,
      rotation: [0, 0, 0],
      faceOrders: [],
      path: []
    }
  ];
  frames.forEach((frame, i) => {
    const n = i + 1;
    const prev = steps[i];
    if (!isRecord(frame)) throw new FoldError(`Step ${n} is not an object.`);

    const angles = frame.edges_foldAngle;
    if (!Array.isArray(angles) || angles.length !== edges.length || !angles.every(isNum)) {
      throw new FoldError(`Step ${n} needs one fold angle per edge (${edges.length}).`);
    }

    angles.forEach((a, e) => {
      if (Math.abs(a) > 180) throw new FoldError(`Step ${n} folds edge ${e} past 180°.`);
      const kind = { B: 'border', F: 'flat line' }[assignments[e] as string];
      if (a !== 0 && kind) throw new FoldError(`Step ${n} folds edge ${e}, which is a ${kind}, not a crease.`);
    });

    const raw = frame['foldapp:instruction'];
    const instruction =
      typeof raw === 'string'
        ? { en: raw.trim() }
        : isRecord(raw) && typeof raw.en === 'string' && (raw.pt === undefined || typeof raw.pt === 'string')
          ? { en: raw.en.trim(), ...(typeof raw.pt === 'string' && raw.pt.trim() ? { pt: raw.pt.trim() } : {}) }
          : { en: '' };
    if (!instruction.en) throw new FoldError(`Step ${n} has no instruction.`);

    const fixedFace = frame['foldapp:fixedFace'] ?? prev.fixedFace;
    if (!isIndex(fixedFace, faces.length)) {
      throw new FoldError(`Step ${n} holds face ${fixedFace}, which does not exist.`);
    }

    const rotation = frame['foldapp:rotation'] ?? prev.rotation;
    if (!Array.isArray(rotation) || rotation.length !== 3 || !rotation.every(isNum)) {
      throw new FoldError(`Step ${n} rotation must be three numbers.`);
    }

    const faceOrders =
      frame.faceOrders === undefined ? prev.faceOrders : readFaceOrders(frame.faceOrders, n, faces.length);

    const path = readPath(frame['foldapp:path'], edges.length, `Step ${n} foldapp:path`);

    steps.push({ angles: [...angles], instruction, fixedFace, rotation: [...rotation] as Vec3, faceOrders, path });
  });

  return deepFreeze({
    title: typeof json.file_title === 'string' ? json.file_title : 'Untitled',
    paperColor: typeof json['foldapp:paperColor'] === 'string' ? json['foldapp:paperColor'] : '#B8613F',
    vertices,
    edges,
    assignments: assignments as Assignment[],
    faces,
    faceEdges,
    edgeFaces,
    faceCentroids,
    center,
    steps,
    unfold: readPath(json['foldapp:unfold'], edges.length, 'foldapp:unfold')
  });
}

function readFaceOrders(raw: unknown, n: number, faceCount: number): FaceOrder[] {
  const bad = () => new FoldError(`Step ${n} faceOrders needs [f, g, s] triples with s of -1, 0 or 1.`);
  if (!Array.isArray(raw)) throw bad();
  return raw.flatMap((order): FaceOrder[] => {
    if (!Array.isArray(order) || order.length !== 3 || ![-1, 0, 1].includes(order[2])) throw bad();
    const [f, g, s] = order;
    for (const face of [f, g]) {
      if (!isIndex(face, faceCount)) throw new FoldError(`Step ${n} orders face ${face}, which does not exist.`);
    }
    if (f === g) throw new FoldError(`Step ${n} orders face ${f} against itself.`);
    return s === 0 ? [] : [[f, g, s]];
  });
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

function assertConnected(faceCount: number, faceEdges: number[][], edgeFaces: number[][]) {
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const f = queue.shift() as number;
    for (const e of faceEdges[f]) {
      for (const g of edgeFaces[e]) {
        if (!seen.has(g)) {
          seen.add(g);
          queue.push(g);
        }
      }
    }
  }
  if (seen.size !== faceCount) throw new FoldError('The paper is in separate pieces.');
}

/** Lists of one angle per edge, each within 180°; none when absent. */
function readPath(raw: unknown, edgeCount: number, what: string): number[][] {
  const path = raw ?? [];
  if (
    !Array.isArray(path) ||
    !path.every((a) => Array.isArray(a) && a.length === edgeCount && a.every((x) => isNum(x) && Math.abs(x) <= 180))
  ) {
    throw new FoldError(`${what} needs lists of ${edgeCount} angles within 180°.`);
  }
  return path.map((a) => [...a]);
}
