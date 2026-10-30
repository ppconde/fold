import type { Vec2 } from '../../src/fold/types';
import { overlap } from '../arrange';
import { diamond, has, lacks } from '../sequence';
import { kiteBase } from './bases';

// Worked out on the diamond (left corner (0, 0), top (1, 1), bottom (1, −1)) with the kite base's long point B at
// the bottom, then turned a quarter clockwise as the book draws it, B to the left: `d` places a diamond point in that
// view. The kite creases from B and the short end's creases from T (its edges folded to the middle the same way)
// meet at X, √2 − 1 out from the middle on the across diagonal: the fish base's side corners.
const d = (x: number, y: number): Vec2 => {
  const [u, v] = diamond(x, y);
  return [0.5 + (v - 0.5), 0.5 - (u - 0.5)];
};
const k = Math.SQRT2 - 1;
const [XL, XR, C, T] = [d(1 - k, 0), d(1 + k, 0), d(1, 0), d(1, 1)];
// the long point folds behind about a fifth of the way up the kite; the fish base's side corners fold behind CORNER
// in from the middle; each fin turns about a line from where the ear meets the back, FIN from the back's tail end:
// nearly upright across the body, leaning toward the head enough that the ear, pointing at the head, swings down past
// the belly toward the tail (at least 23° from upright), the fin then pointing 2 FIN − 180° down from the back; the
// tail folds up about a line from TAIL on the back, leaning LEAN back from upright
const [TIP, CORNER, FIN] = [-0.6, 0.3, (122 * Math.PI) / 180];
const [TAIL, LEAN] = [0.85, (40 * Math.PI) / 180];

/** Diamond coordinates of a flat-sheet point (the sheet is turned over, a corner toward you). */
const diamondOf = ([u, v]: Vec2): Vec2 => [1 + (v - 0.5) - (u - 0.5), u - 0.5 + (v - 0.5)];
/** Flat-sheet point of a diamond point. */
const paper = (x: number, y: number): Vec2 => [0.5 + (y - (x - 1)) / 2, 0.5 + (y + (x - 1)) / 2];
/** Is the flat-sheet point in a side flap of the kite (left −1, right 1): outside that side's crease from B? */
const flap = (side: 1 | -1) => (_: string[], at: Vec2) => {
  const [x, y] = diamondOf(at);
  return side * (x - 1) > 0 && y > TIP && Math.abs(x - 1) > k * (y + 1);
};
/** Does a piece cover part of a side corner's ear (left −1, right 1), the kite between X, the corner and the edges? */
const ear = (side: 1 | -1) => (outline: Vec2[]) => {
  const r = Math.SQRT1_2;
  const quad = [paper(1 + side, 0), paper(1 + side * r, 1 - r), paper(1 + side * k, 0), paper(1 + side * r, r - 1)];
  return overlap(outline, quad).area > 1e-9;
};
/** Mirror v about the line through a and b. */
const reflect = (v: Vec2, a: Vec2, b: Vec2): Vec2 => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const t = ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / (dx * dx + dy * dy);
  return [2 * (a[0] + t * dx) - v[0], 2 * (a[1] + t * dy) - v[1]];
};

const s = kiteBase();
const valley = Object.values(s.angles('kiteL'))[0];
s.turn([0, 180, 135], {
  en: 'Turn the kite so its long point is on the left.',
  pt: 'Roda o papagaio para a ponta comprida ficar à esquerda.'
});
s.fold('tip', d(2, TIP), d(0, TIP), {
  valley: false,
  hold: d(1.1, 0),
  en: 'Fold the end of the long point behind, about a fifth of the way along.',
  pt: 'Dobra a ponta comprida para trás, a cerca de um quinto do comprimento.'
});
s.crease('upperL', XL, T, {
  valley: true,
  hold: d(1.2, 0),
  en: 'Fold the upper right edge to the middle line, then unfold.',
  pt: 'Dobra a aresta de cima à direita até à linha do meio e desdobra.'
});
s.crease('upperR', T, XR, {
  valley: true,
  hold: d(0.8, 0),
  en: 'Fold the lower right edge to the middle line, then unfold.',
  pt: 'Dobra a aresta de baixo à direita até à linha do meio e desdobra.'
});

// the rabbit ears, in each kite flap: the corner's half diagonal (X to the corner) and the line from X square to the
// long point's edge, where the incircle of the triangle the corner makes with the middle line touches it: the ear
// turns about it and lies along the middle pointing at the head
for (const side of [-1, 1] as const) {
  const [X, name] = side === -1 ? [XL, 'L'] : [XR, 'R'];
  const kiteLine: [Vec2, Vec2] = [d(1, -1), d(1 + side * (1 - k), k)];
  // the kite fold left the corner on the middle line, √2 − 1 up
  const corner = d(1, k);
  const touch = reflect(d(1 + side * Math.SQRT1_2, Math.SQRT1_2 - 1), ...kiteLine);
  const opts = { valley: true, only: flap(side), en: '', pt: '' };
  s.mark(`ear${name}`, ...((side === -1 ? [X, corner] : [corner, X]) as [Vec2, Vec2]), opts);
  s.mark(`earBase${name}`, ...((side === -1 ? [X, touch] : [touch, X]) as [Vec2, Vec2]), opts);
}
const upperKiteL = s.split('kiteL1', paper(1 - k, 0));
const upperKiteR = s.split('kiteR1', paper(1 + k, 0));
// the lower flap lies on top (the kite folds it second), so it opens first: both corners start at one point on the
// middle line, and pulled out together they would pass through each other.
s.collapse(
  { [upperKiteR]: 0, upperR1: valley, earR1: valley, earBaseR1: -valley },
  {
    hold: d(1.1, -0.3),
    en: 'Open the lower flap and fold it along the creases: its corner stands up and lies flat along the middle as an ear.',
    pt: 'Abre a aba de baixo e dobra-a pelos vincos: o canto levanta-se e fica deitado ao longo do meio, como uma orelha.'
  }
);
s.collapse(
  { [upperKiteL]: 0, upperL1: valley, earL1: valley, earBaseL1: -valley },
  { hold: d(1.1, -0.3), en: 'Do the same with the upper flap.', pt: 'Faz o mesmo com a aba de cima.' }
);
s.together(
  { en: 'Fold the top and bottom points behind.', pt: 'Dobra as pontas de cima e de baixo para trás.' },
  () => {
    s.fold('cornerL', d(1 - CORNER, -1), d(1 - CORNER, 1), { valley: false, hold: d(1.1, -0.3), en: '', pt: '' });
    s.fold('cornerR', d(1 + CORNER, 1), d(1 + CORNER, -1), { valley: false, en: '', pt: '' });
  }
);
// the middle line runs on through the long point's tip, folded behind and so facing the other way: its part there is
// its own crease, turned the other way (one crease turns as one hinge)
s.split('upright1', paper(1, TIP));
s.fold('half', d(1, -1), d(1, 1), {
  valley: false,
  tag: 'back',
  hold: d(1.2, -0.3),
  en: 'Fold the top half behind along the middle line.',
  pt: 'Dobra a metade de cima para trás, pela linha do meio.'
});
// each fin: the ear left after the corners folded behind, turned back about a line from where it meets the back
const fin = d(1 + Math.sin(FIN), Math.cos(FIN));
s.fold('finF', fin, C, {
  valley: true,
  only: (tags, _, outline) => lacks('back')(tags) && ear(1)(outline),
  hold: d(1.2, -0.3),
  en: 'Fold the ear on the front down toward the tail, along a line slanting across the body, to make a fin.',
  pt: 'Dobra a orelha da frente para baixo, em direção à cauda, por uma linha inclinada através do corpo, para fazer uma barbatana.'
});
s.fold('finB', fin, C, {
  valley: false,
  only: (tags, _, outline) => has('back')(tags) && ear(-1)(outline),
  hold: d(1.2, -0.3),
  en: 'Fold the ear behind the same way, for the other fin.',
  pt: 'Dobra a orelha de trás da mesma forma, para a outra barbatana.'
});
// the tail's layers fold up together to the front
s.fold('tail', d(1, TAIL), d(1 + Math.sin(LEAN), TAIL - Math.cos(LEAN)), {
  valley: true,
  // the tail's layers only: past the belly the line would catch the fins
  only: (_, __, outline) => outline.some((v) => diamondOf(v)[1] > TAIL),
  hold: d(1.2, -0.3),
  en: 'Fold the tail up in front. Your whale is done.',
  pt: 'Dobra a cauda para cima, para a frente. A tua baleia está pronta.'
});

export default s.source({
  id: 'whale',
  name: { en: 'Whale', pt: 'Baleia' },
  japaneseName: 'Kujira',
  category: 'animals',
  difficulty: 'easy',
  tags: ['whale', 'animal', 'sea'],
  paperColor: '#3E5C76',
  solve: true
});
