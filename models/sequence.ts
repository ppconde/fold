import { Euler, Matrix4 } from 'three';
import type { Vec2, Vec3 } from '../src/fold/types';
import type { Crease } from './arrange';
import type { ModelSource, SourceStep } from './build';

type Text = { en: string; pt: string };
/** x' = a·x + b·y + c, y' = d·x + e·y + f */
type Affine = [number, number, number, number, number, number];
/** A flat piece of paper: its outline in paper coordinates, where it lies in the view, and which way it faces. */
type Piece = { outline: Vec2[]; toView: Affine; frontUp: boolean; tags: string[] };

const apply = (m: Affine, [x, y]: Vec2): Vec2 => [m[0] * x + m[1] * y + m[2], m[3] * x + m[4] * y + m[5]];
const compose = (m: Affine, n: Affine): Affine => [
  m[0] * n[0] + m[1] * n[3],
  m[0] * n[1] + m[1] * n[4],
  m[0] * n[2] + m[1] * n[5] + m[2],
  m[3] * n[0] + m[4] * n[3],
  m[3] * n[1] + m[4] * n[4],
  m[3] * n[2] + m[4] * n[5] + m[5]
];
function invert(m: Affine): Affine {
  const det = m[0] * m[4] - m[1] * m[3];
  const [a, b, d, e] = [m[4] / det, -m[1] / det, -m[3] / det, m[0] / det];
  return [a, b, -(a * m[2] + b * m[5]), d, e, -(d * m[2] + e * m[5])];
}
/** Mirror about the line through p and q. */
function mirror(p: Vec2, q: Vec2): Affine {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const l = dx * dx + dy * dy;
  const c = (dx * dx - dy * dy) / l;
  const s = (2 * dx * dy) / l;
  return [c, s, p[0] - c * p[0] - s * p[1], s, -c, p[1] - s * p[0] + c * p[1]];
}
const side = (p: Vec2, q: Vec2, v: Vec2) => (q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0]);
const area = (poly: Vec2[]) =>
  Math.abs(
    poly.reduce((s, a, i) => s + a[0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * a[1], 0)
  ) / 2;

/** Split a convex outline (view coordinates) by the line p→q into its left part, right part and the cut ends. */
function cut(poly: Vec2[], p: Vec2, q: Vec2) {
  const E = 1e-9;
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  const ends: Vec2[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const sa = side(p, q, a);
    const sb = side(p, q, b);
    if (sa >= -E) left.push(a);
    if (sa <= E) right.push(a);
    if (Math.abs(sa) <= E) ends.push(a);
    if ((sa > E && sb < -E) || (sa < -E && sb > E)) {
      const t = sa / (sa - sb);
      const x: Vec2 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      left.push(x);
      right.push(x);
      ends.push(x);
    }
  });
  return { left, right, ends };
}
function inside(p: Vec2, poly: Vec2[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const centroid = (poly: Vec2[]): Vec2 => [
  poly.reduce((s, v) => s + v[0], 0) / poly.length,
  poly.reduce((s, v) => s + v[1], 0) / poly.length
];

export type FoldOptions = Text & {
  /** true: the flap comes toward the viewer. false: it goes behind. */
  valley: boolean;
  /** Fold only pieces whose tags pass this test (default: every piece left of the line). */
  only?: (tags: string[]) => boolean;
  /** Tag added to every piece this fold moves, for later `only` tests. */
  tag?: string;
  /** A point (view coordinates) on paper that stays still in this step. */
  hold?: Vec2;
};

/**
 * Write a model as the folds a person makes. The sheet starts turned by `start` about its centre (as the
 * player shows it after a step with that rotation); every point is in that view, x right, y up, the unit
 * square's centre at (0.5, 0.5). Each `fold` is a simple fold: everything left of the line p→q (or the pieces
 * `only` picks) turns over that line. The result is the spec §8 format: crease segments in flat-paper
 * coordinates, and steps as changed angles.
 */
export function foldSequence(start: Vec3 = [0, 0, 0]) {
  const D = Math.PI / 180;
  const r = new Matrix4().makeRotationFromEuler(new Euler(start[0] * D, start[1] * D, start[2] * D)).elements;
  // view = R (p − c) + c on the table plane; R's z-row says whether the front still faces the viewer
  const turn: Affine = [r[0], r[4], 0, r[1], r[5], 0];
  const toView = compose([1, 0, 0.5, 0, 1, 0.5], compose(turn, [1, 0, -0.5, 0, 1, -0.5]));
  let pieces: Piece[] = [
    {
      outline: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1]
      ],
      toView,
      frontUp: r[10] > 0,
      tags: []
    }
  ];
  const creases: Record<string, Crease> = {};
  const steps: SourceStep[] = [];

  return {
    /** A step that only turns the model (absolute Euler XYZ, degrees). Pieces keep their view positions. */
    turn(rotation: Vec3, text: Text) {
      steps.push({ rotation, ...text });
    },
    /** A step that sets existing creases to new angles, e.g. to open a model out at the end. */
    set(fold: Record<string, number>, text: Text, rotation?: Vec3) {
      steps.push({ fold, ...text, ...(rotation ? { rotation } : {}) });
    },
    /** The creases the fold called `name` made, one per layer it cut (name1, name2, …), with their angles. */
    angles(name: string): Record<string, number> {
      return Object.fromEntries(
        steps.flatMap((st) => Object.entries(st.fold ?? {})).filter(([k]) => k.replace(/\d+$/, '') === name)
      );
    },
    fold(name: string, p: Vec2, q: Vec2, opts: FoldOptions) {
      const fold: Record<string, number> = {};
      const next: Piece[] = [];
      const moved = new Set<Piece>();
      const flip = mirror(p, q);
      for (const piece of pieces) {
        const { left, right, ends } = cut(
          piece.outline.map((v) => apply(piece.toView, v)),
          p,
          q
        );
        if ((opts.only && !opts.only(piece.tags)) || area(left) < 1e-9) {
          next.push(piece);
          continue;
        }
        const back = invert(piece.toView);
        if (area(right) > 1e-9) {
          const cutEnds = ends.filter(
            (e, i) => ends.findIndex((o) => Math.hypot(o[0] - e[0], o[1] - e[1]) < 1e-9) === i
          );
          if (cutEnds.length !== 2) throw new Error(`Fold ${name} cuts a piece in more than one line.`);
          const angle = (opts.valley === piece.frontUp ? 1 : -1) * 180;
          const key = `${name}${Object.keys(fold).length + 1}`;
          const [from, to] = cutEnds.map((e) => apply(back, e));
          creases[key] = { from, to, assignment: angle > 0 ? 'V' : 'M' };
          fold[key] = angle;
          next.push({ ...piece, outline: right.map((v) => apply(back, v)) });
        }
        const flap: Piece = {
          outline: left.map((v) => apply(back, v)),
          toView: compose(flip, piece.toView),
          frontUp: !piece.frontUp,
          tags: opts.tag ? [...piece.tags, opts.tag] : piece.tags
        };
        moved.add(flap);
        next.push(flap);
      }
      if (!Object.keys(fold).length) throw new Error(`Fold ${name} doesn't fold anything.`);
      pieces = next;
      let hold: Vec2 | undefined;
      if (opts.hold) {
        const still = pieces.find(
          (pc) =>
            !moved.has(pc) &&
            inside(
              opts.hold as Vec2,
              pc.outline.map((v) => apply(pc.toView, v))
            )
        );
        if (!still) throw new Error(`Fold ${name} holds a point that is not on a piece that stays still.`);
        hold = centroid(still.outline);
      }
      steps.push({ fold, en: opts.en, pt: opts.pt, ...(hold ? { hold } : {}) });
    },
    source(entry: Omit<ModelSource, 'creases' | 'steps'>): ModelSource {
      return { ...entry, creases, steps };
    }
  };
}

const H = Math.SQRT1_2;
/** The turn most diamond models start with: white side up, a corner pointing at the viewer. */
export const DIAMOND: Vec3 = [0, 180, 45];
/** Diamond coordinates after DIAMOND → view: left corner (0, 0), top (1, 1), right (2, 0), bottom (1, −1). */
export const diamond = (x: number, y: number): Vec2 => [0.5 + (x - 1) * H, 0.5 + y * H];
/** A sequence that starts with the DIAMOND turn as step 1. */
export function diamondSequence() {
  const s = foldSequence(DIAMOND);
  s.turn(DIAMOND, {
    en: 'Turn the paper over, white side up, with a corner pointing at you.',
    pt: 'Vira o papel com o lado branco para cima e um canto virado para ti.'
  });
  return s;
}
export const has = (tag: string) => (tags: string[]) => tags.includes(tag);
export const lacks =
  (...tag: string[]) =>
  (tags: string[]) =>
    !tag.some((t) => tags.includes(t));
