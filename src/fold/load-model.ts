import type { Assignment, Edge, Model, Step, Vec2, Vec3 } from './types';

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
    return [v[0], v[1]];
  });

  const edges = readArray(json, 'edges_vertices').map((e, i): Edge => {
    if (!Array.isArray(e) || e.length !== 2 || !e.every((v) => isIndex(v, vertices.length))) {
      throw new FoldError(`Edge ${i} must join two existing vertices.`);
    }
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
    return f as number[];
  });

  const edgeIndex = new Map(edges.map(([a, b], i) => [edgeKey(a, b), i]));
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
    { angles: edges.map(() => 0), instruction: '', fixedFace: nearestToCenter, rotation: [0, 0, 0] }
  ];
  frames.forEach((frame, i) => {
    const n = i + 1;
    const prev = steps[i];
    if (!isRecord(frame)) throw new FoldError(`Step ${n} is not an object.`);

    const angles = frame.edges_foldAngle;
    if (!Array.isArray(angles) || angles.length !== edges.length || !angles.every(isNum)) {
      throw new FoldError(`Step ${n} needs one fold angle per edge (${edges.length}).`);
    }

    const instruction = frame['foldapp:instruction'];
    if (typeof instruction !== 'string' || !instruction.trim()) throw new FoldError(`Step ${n} has no instruction.`);

    const fixedFace = frame['foldapp:fixedFace'] ?? prev.fixedFace;
    if (!isIndex(fixedFace, faces.length)) {
      throw new FoldError(`Step ${n} holds face ${fixedFace}, which does not exist.`);
    }

    const rotation = frame['foldapp:rotation'] ?? prev.rotation;
    if (!Array.isArray(rotation) || rotation.length !== 3 || !rotation.every(isNum)) {
      throw new FoldError(`Step ${n} rotation must be three numbers.`);
    }

    steps.push({ angles, instruction: instruction.trim(), fixedFace, rotation: rotation as Vec3 });
  });

  return {
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
    steps
  };
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
