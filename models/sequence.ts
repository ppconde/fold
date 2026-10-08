import { Euler, Matrix3, Matrix4, Vector2 } from 'three';
import type { Vec2, Vec3 } from '../src/fold/types';
import { arrange, type Crease, signedArea } from './arrange';
import { inside, type ModelSource, type SourceStep, type Tuck } from './build';

type Text = { en: string; pt: string };
/** A flat piece of paper: its outline in paper coordinates, where it lies in the view, and which way it faces. */
type Piece = { outline: Vec2[]; toView: Matrix3; frontUp: boolean; tags: string[] };

const apply = (m: Matrix3, [x, y]: Vec2): Vec2 => [...new Vector2(x, y).applyMatrix3(m).toArray()] as Vec2;
/** Mirror about the line through p and q. */
function mirror(p: Vec2, q: Vec2): Matrix3 {
  const [dx, dy] = [q[0] - p[0], q[1] - p[1]];
  const l = dx * dx + dy * dy;
  const c = (dx * dx - dy * dy) / l;
  const s = (2 * dx * dy) / l;
  return new Matrix3().set(c, s, p[0] - c * p[0] - s * p[1], s, -c, p[1] - s * p[0] + c * p[1], 0, 0, 1);
}
const side = (p: Vec2, q: Vec2, v: Vec2) => (q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0]);
const area = (poly: Vec2[]) => Math.abs(signedArea(poly));

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
const near = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9;
/** Is v on segment ab (strictly between the ends when `interior`)? */
function onSegment(v: Vec2, a: Vec2, b: Vec2, interior = false): boolean {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (Math.abs(side(a, b, v)) > 1e-9 * l) return false;
  const t = ((v[0] - a[0]) * (b[0] - a[0]) + (v[1] - a[1]) * (b[1] - a[1])) / (l * l);
  const m = interior ? 1e-9 / l : -1e-9 / l;
  return t > m && t < 1 - m;
}
const onOutline = (v: Vec2, poly: Vec2[]) => poly.some((a, i) => onSegment(v, a, poly[(i + 1) % poly.length]));
const D = Math.PI / 180;
const rotationOf = (e: Vec3) => new Matrix4().makeRotationFromEuler(new Euler(e[0] * D, e[1] * D, e[2] * D)).elements;
/** Paper → view on the table plane for a whole-model rotation: R (p − c) + c, c the sheet's middle. */
function viewOf(e: Vec3): Matrix3 {
  const r = rotationOf(e);
  return new Matrix3()
    .makeTranslation(0.5, 0.5)
    .multiply(new Matrix3().set(r[0], r[4], 0, r[1], r[5], 0, 0, 0, 1))
    .multiply(new Matrix3().makeTranslation(-0.5, -0.5));
}
/** How far toward flat a fold-and-unfold goes before it opens again. */
const PEAK = 0.97;
const centroid = (poly: Vec2[]): Vec2 => [
  poly.reduce((s, v) => s + v[0], 0) / poly.length,
  poly.reduce((s, v) => s + v[1], 0) / poly.length
];

export type FoldOptions = Text & {
  /**
   * true: the flap comes toward the viewer. false: it goes behind. A function decides per piece, for a
   * reverse fold: layers that turn opposite ways reverse the crease that joins them past the fold line.
   */
  valley: boolean | ((tags: string[], at: Vec2) => boolean);
  /** Fold only pieces that pass this test, given their tags and a point inside them on the flat sheet. */
  only?: (tags: string[], at: Vec2) => boolean;
  /** Tag added to every piece this fold moves, for later `only` tests. */
  tag?: string;
  /** A point (view coordinates) on paper that stays still in this step. */
  hold?: Vec2;
  /**
   * With `valley` a function (a reverse fold): true swings the flap over toward the viewer as one stack,
   * false behind, and lands there: rigid paper can't tuck it inside without opening the body flat.
   */
  over?: boolean;
  /** With `over`: end tucked inside as a real reverse fold does all the same, the layers changing places as it lands (see `Tuck`). */
  tuck?: boolean;
};

/**
 * Write a model as the folds a person makes. The sheet starts turned by `start` about its centre (as the
 * player shows it after a step with that rotation); every point is in that view, x right, y up, the unit
 * square's centre at (0.5, 0.5). Each `fold` is a simple fold: everything left of the line p→q (or the pieces
 * `only` picks) turns over that line. The result is the spec §8 format: crease segments in flat-paper
 * coordinates, and steps as changed angles.
 */
export function foldSequence(start: Vec3 = [0, 0, 0]) {
  const r = rotationOf(start);
  const toView = viewOf(start);
  let turned: Vec3 | null = null;
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
  /** Every crease's angle after the last step. */
  const state: Record<string, number> = {};
  /** While set, folds gather into this one step instead of each making their own. */
  let gathering: SourceStep | null = null;
  const push = (step: SourceStep) => {
    for (const [k, a] of Object.entries(step.fold ?? {})) state[k] = a;
    if (!gathering) return void steps.push(step);
    gathering.fold = { ...gathering.fold, ...step.fold };
    gathering.hold ??= step.hold;
    gathering.stack = step.stack;
  };

  /** Split crease `key` at x (strictly inside it); every step that set it sets the new half too. */
  const split = (key: string, x: Vec2) => {
    const c = creases[key];
    let n = 2;
    while (creases[`${key}.${n}`]) n++;
    const other = `${key}.${n}`;
    creases[key] = { ...c, to: x };
    creases[other] = { ...c, from: x };
    if (key in state) state[other] = state[key];
    for (const st of steps) {
      for (const m of [st.fold, ...(st.path ?? [])]) if (m && key in m) m[other] = m[key];
    }
  };
  /**
   * The crease names covering the segment from→to, made where missing (`name1`, `name2`, …): parts that
   * lie on an existing crease reuse it, and with `splitEnds` existing creases it meets end-on split there.
   */
  const claim = (name: string, from: Vec2, to: Vec2, assignment: 'M' | 'V', splitEnds: boolean): string[] => {
    for (const x of splitEnds ? [from, to] : []) {
      for (const [k, c] of Object.entries(creases)) if (onSegment(x, c.from, c.to, true)) split(k, x);
    }
    // break the new segment wherever an existing collinear crease starts or ends on it
    const along = (v: Vec2) => (v[0] - from[0]) * (to[0] - from[0]) + (v[1] - from[1]) * (to[1] - from[1]);
    const cuts = Object.values(creases)
      .flatMap((c) => [c.from, c.to])
      .filter((v) => onSegment(v, from, to, true))
      .sort((a, b) => along(a) - along(b));
    const points = [from, ...cuts, to].filter(
      (v, i, all) => i === 0 || Math.hypot(v[0] - all[i - 1][0], v[1] - all[i - 1][1]) > 1e-9
    );
    return points.slice(1).map((b, i) => {
      const a = points[i];
      const same = Object.entries(creases).find(
        ([, c]) => (near(c.from, a) && near(c.to, b)) || (near(c.from, b) && near(c.to, a))
      );
      if (same) return same[0];
      let n = 1;
      while (creases[`${name}${n}`]) n++;
      creases[`${name}${n}`] = { from: a, to: b, assignment };
      return `${name}${n}`;
    });
  };
  /** The pieces of the flat-folded crease pattern, laid out from the face at `held` (paper coordinates). */
  const relayer = (held: Vec2, still: Piece): Piece[] => {
    const { vertices, edges, edgeCrease, faces } = arrange(creases);
    const polys = faces.map((f) => f.map((v) => vertices[v]));
    const root = polys.findIndex((poly) => inside(held, poly));
    const out: (Piece | undefined)[] = [];
    out[root] = { outline: polys[root], toView: still.toView, frontUp: still.frontUp, tags: [] };
    const queue = [root];
    while (queue.length) {
      const f = queue.shift() as number;
      const from = out[f] as Piece;
      faces[f].forEach((v, i) => {
        const w = faces[f][(i + 1) % faces[f].length];
        const e = edges.findIndex(([a, b]) => (a === v && b === w) || (a === w && b === v));
        const key = edgeCrease[e];
        if (key === null) return;
        const g = faces.findIndex((h, j) => j !== f && h.includes(v) && h.includes(w));
        if (g === -1 || out[g]) return;
        const angle = Math.abs(state[key] ?? 0);
        if (angle !== 0 && angle !== 180) throw new Error(`Crease ${key} is not flat (${angle}°).`);
        const [a, b] = [apply(from.toView, vertices[v]), apply(from.toView, vertices[w])];
        out[g] = {
          outline: polys[g],
          toView: angle ? mirror(a, b).multiply(from.toView) : from.toView,
          frontUp: angle ? !from.frontUp : from.frontUp,
          tags: []
        };
        queue.push(g);
      });
    }
    // each new piece keeps the tags of the old piece it came from
    return out.map((pc) => {
      const c = centroid((pc as Piece).outline);
      const old = pieces.find((o) => inside(c, o.outline));
      return { ...(pc as Piece), tags: old?.tags ?? [] };
    });
  };

  const api = {
    /**
     * A step that only turns the model (absolute Euler XYZ, degrees). The first turn sets up the view the
     * sequence started in; a later one turns the pieces with it, about the middle of the sheet.
     */
    turn(rotation: Vec3, text: Text) {
      if (turned) {
        const delta = viewOf(rotation).multiply(viewOf(turned).invert());
        const flipped = rotationOf(rotation)[10] * rotationOf(turned)[10] < 0;
        pieces = pieces.map((pc) => ({
          ...pc,
          toView: delta.clone().multiply(pc.toView),
          frontUp: pc.frontUp !== flipped
        }));
      }
      turned = rotation;
      steps.push({ rotation, ...text, stack: pieces });
    },
    /** A step that sets existing creases to new angles, e.g. to open a model out at the end. The stack stays as it was. */
    set(fold: Record<string, number>, text: Text, rotation?: Vec3) {
      steps.push({ fold, ...text, ...(rotation ? { rotation } : {}), stack: pieces });
    },
    /** The creases the fold called `name` made, one per layer it cut (name1, name2, …), with their angles. */
    angles(name: string): Record<string, number> {
      return Object.fromEntries(
        steps.flatMap((st) => Object.entries(st.fold ?? {})).filter(([k]) => k.replace(/\d+$/, '') === name)
      );
    },
    fold(name: string, p: Vec2, q: Vec2, opts: FoldOptions) {
      const fold: Record<string, number> = {};
      /** The angles the flap swings through as one stack (a reverse fold's animation). */
      const swing: Record<string, number> = {};
      const next: Piece[] = [];
      const flaps: Piece[] = [];
      const moved = new Map<Piece, boolean>();
      // a reverse fold that swings over: the layers it passes, and its flaps by the way each turns
      const tuck: Tuck = { layers: [[], []], flaps: [[], []] };
      const flip = mirror(p, q);
      for (const piece of pieces) {
        const { left, right, ends } = cut(
          piece.outline.map((v) => apply(piece.toView, v)),
          p,
          q
        );
        if ((opts.only && !opts.only(piece.tags, centroid(piece.outline))) || area(left) < 1e-9) {
          next.push(piece);
          continue;
        }
        const valley =
          typeof opts.valley === 'function' ? opts.valley(piece.tags, centroid(piece.outline)) : opts.valley;
        const back = piece.toView.clone().invert();
        if (area(right) > 1e-9) {
          const cutEnds = ends.filter(
            (e, i) => ends.findIndex((o) => Math.hypot(o[0] - e[0], o[1] - e[1]) < 1e-9) === i
          );
          if (cutEnds.length !== 2) throw new Error(`Fold ${name} cuts a piece in more than one line.`);
          const angle = (valley === piece.frontUp ? 1 : -1) * 180;
          const [from, to] = cutEnds.map((e) => apply(back, e));
          const reverse = typeof opts.valley === 'function';
          for (const key of claim(name, from, to, angle > 0 ? 'V' : 'M', reverse)) {
            fold[key] = angle;
            if (opts.over !== undefined) swing[key] = (opts.over === piece.frontUp ? 1 : -1) * 180;
          }
          const outline = right.map((v) => apply(back, v));
          tuck.layers[valley ? 1 : 0].push(outline);
          next.push({ ...piece, outline });
        }
        const flap: Piece = {
          outline: left.map((v) => apply(back, v)),
          toView: flip.clone().multiply(piece.toView),
          frontUp: !piece.frontUp,
          tags: opts.tag ? [...piece.tags, opts.tag] : piece.tags
        };
        moved.set(flap, valley);
        tuck.flaps[valley ? 1 : 0].push(flap.outline);
        flaps.push(flap);
      }
      if (!Object.keys(fold).length) throw new Error(`Fold ${name} doesn't fold anything.`);
      // layers that turn opposite ways swap sides: the crease joining them reverses
      for (const [key, c] of Object.entries(creases)) {
        const mid: Vec2 = [(c.from[0] + c.to[0]) / 2, (c.from[1] + c.to[1]) / 2];
        const sides = flaps.filter((f) => onOutline(mid, f.outline)).map((f) => moved.get(f));
        if (sides.length === 2 && sides[0] !== sides[1] && !(key in fold)) fold[key] = -(state[key] ?? 0);
      }
      // a simple fold turns the moving layers over as one: they reverse, and land on top (valley) or underneath
      flaps.reverse();
      pieces = opts.valley ? [...next, ...flaps] : [...flaps, ...next];
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
      // swung over: the flaps travel as one stack (done at 90%), then the creases take their reverse-fold
      // angles, the same pose with the layers tucked in
      const path = !opts.tuck
        ? []
        : Array.from({ length: 9 }, (_, i) =>
            Object.fromEntries(
              Object.keys(fold).map((k) => {
                const a = state[k] ?? 0;
                return [k, a + ((swing[k] ?? a) - a) * ((i + 1) / 9)];
              })
            )
          );
      push({
        fold: opts.over !== undefined && !opts.tuck ? swing : fold,
        ...(path.length ? { path } : {}),
        en: opts.en,
        pt: opts.pt,
        ...(hold ? { hold } : {}),
        ...(opts.tuck ? { tuck } : {}),
        stack: pieces
      });
    },
    /** Fold and unfold in one step: the crease is made, the paper lies flat again. */
    crease(name: string, p: Vec2, q: Vec2, opts: FoldOptions) {
      const before = pieces;
      const prior = { ...state };
      api.fold(name, p, q, opts);
      const step = steps[steps.length - 1];
      const fold = step.fold ?? {};
      // stop short of flat at the turn, so the flap never rests on the paper it came from
      step.path = [Object.fromEntries(Object.entries(fold).map(([k, a]) => [k, a * PEAK]))];
      step.fold = Object.fromEntries(Object.keys(fold).map((k) => [k, prior[k] ?? 0]));
      for (const k of Object.keys(fold)) state[k] = prior[k] ?? 0;
      pieces = before;
      step.stack = pieces;
    },
    /**
     * A step that moves several creases at once (a collapse, squash, petal fold): set them, and the layers
     * are worked out again from the flat-folded crease pattern, the piece under `hold` staying put.
     */
    collapse(fold: Record<string, number>, opts: Text & { hold: Vec2 }) {
      for (const [k, a] of Object.entries(fold)) {
        if (!creases[k]) throw new Error(`Collapse sets ${k}, which is not a crease.`);
        state[k] = a;
      }
      const still = pieces.find((pc) =>
        inside(
          opts.hold,
          pc.outline.map((v) => apply(pc.toView, v))
        )
      );
      if (!still) throw new Error('Collapse holds a point that is not on the paper.');
      const held = apply(still.toView.clone().invert(), opts.hold);
      pieces = relayer(held, still);
      steps.push({ fold, en: opts.en, pt: opts.pt, hold: held, stack: pieces });
    },
    /** Split crease `name` at `x` (flat-sheet coordinates); returns the name of the part past x. */
    split(name: string, x: Vec2): string {
      const before = new Set(Object.keys(creases));
      split(name, x);
      return Object.keys(creases).find((k) => !before.has(k)) as string;
    },
    /** Several simple folds made at once, as one step (e.g. both sides of a kite). */
    together(text: Text, folds: () => void) {
      gathering = { ...text, fold: {} };
      const step = gathering;
      folds();
      gathering = null;
      steps.push(step);
    },
    source(entry: Omit<ModelSource, 'creases' | 'steps'>): ModelSource {
      return { ...entry, creases, steps };
    }
  };
  return api;
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
