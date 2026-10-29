import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { diamond as d, diamondSequence, has, lacks } from '../sequence';

// on the diamond (left corner (0, 0), the vertical diagonal at x = 1): the triangle's point folds over at
// STRIP, landing at 2 STRIP; its top layer folds back at BACK, opening a white diamond from 2 BACK − 2 STRIP
// to 2 STRIP across the strip
const [STRIP, BACK] = [0.7, 0.9];
// the wings fold up along the book's dotted line across the whole T, just under its top edge and rising a
// little to the right: nearly all the body below it becomes the wing
const RISE = 0.145;
const wing = (x: number) => -0.19 + RISE * (x - STRIP);
const [WING_L, WING_R] = [d(STRIP, wing(STRIP)), d(1, wing(1))];
// the head: the left point turns down about a line through the top edge at HEAD, leaning down to the left,
// short of where the wing line meets the point's lower edge
const HEAD = 2 * BACK - 2 * STRIP + 0.18;
const lean = 215 * MathUtils.DEG2RAD;

const s = diamondSequence();
s.fold('half', d(1, 1), d(1, -1), {
  valley: true,
  tag: 'front',
  hold: d(0.5, 0.2),
  en: 'Fold the right corner over to the left one.',
  pt: 'Dobra o canto da direita até ao da esquerda.'
});
s.fold('strip', d(STRIP, -1), d(STRIP, 1), {
  valley: true,
  tag: 'point',
  hold: d(0.95, 0.8),
  en: 'Fold the point over to the right, along a line about a third of the way in from the right edge.',
  pt: 'Dobra a ponta para a direita, por uma linha a cerca de um terço da aresta da direita.'
});
s.fold('back', d(BACK, 1), d(BACK, -1), {
  valley: true,
  only: (tags) => has('point')(tags) && lacks('front')(tags),
  hold: d(0.8, 0.6),
  en: 'Fold the top layer of the point back to the left.',
  pt: 'Dobra a camada de cima da ponta de volta para a esquerda.'
});
s.fold('bar', d(0, 0), d(2, 0), {
  valley: true,
  tag: 'top',
  hold: d(0.85, -0.6),
  en: 'Fold the top half down onto the bottom half.',
  pt: 'Dobra a metade de cima para baixo, sobre a metade de baixo.'
});
s.fold('wingF', WING_R, WING_L, {
  valley: true,
  only: has('top'),
  tag: 'wing',
  hold: d(1.2, -0.05),
  en: 'Fold the front layers up along a slightly slanted line just below the top edge, to make a wing.',
  pt: 'Dobra as camadas da frente para cima, por uma linha ligeiramente inclinada logo abaixo da aresta de cima, para fazer uma asa.'
});
s.fold('wingB', WING_R, WING_L, {
  valley: false,
  only: lacks('top'),
  tag: 'wing',
  hold: d(1.2, -0.05),
  en: 'Fold the back wing up behind the same way.',
  pt: 'Dobra a asa de trás para cima, por trás, da mesma forma.'
});
const spine = s.angles('bar');
// inside reverse fold: the front layer's flap goes back, the back layer's comes forward, both between them
s.fold('head', d(HEAD + Math.cos(lean), Math.sin(lean)), d(HEAD, 0), {
  valley: (tags) => !tags.includes('top'),
  // the raised wings reach past the head's line
  only: lacks('wing'),
  over: true,
  tuck: true,
  hold: d(1.2, -0.05),
  en: 'Reverse-fold the left point down inside the body to make the head.',
  pt: 'Faz uma dobra invertida na ponta da esquerda, para baixo e por dentro do corpo, para fazer a cabeça.'
});

// stood on its wing lines, each half of the body leaning OPEN out from upright. Where the head's line meets the top
// edge, the head's two creases and its turned-in top edge open with it, worked out on one half: the body's top edge
// along x, the half reaching `down` from it, the head's crease in it at SIDE from x. The head's top edge stays in the
// middle plane, at the head's angle (lean − 180°) from that crease.
const D = MathUtils.DEG2RAD;
const [OPEN, SIDE] = [15 * D, 2 * Math.PI - lean];
const x = new Vector3(1, 0, 0);
const down = new Vector3(0, Math.sin(OPEN), -Math.cos(OPEN));
const crease = x.clone().multiplyScalar(Math.cos(SIDE)).addScaledVector(down, Math.sin(SIDE));
const turn = Math.atan2(crease.z, crease.x) + Math.acos(Math.cos(lean - Math.PI) / Math.hypot(crease.x, crease.z));
const edge = new Vector3(Math.cos(turn), 0, Math.sin(turn));
/** How far from flat a crease along `e` is folded: the side toward `a` against the side toward `b`. */
const folded = (e: Vector3, a: Vector3, b: Vector3) => {
  const side = (v: Vector3) => v.clone().addScaledVector(e, -v.dot(e)).normalize();
  return 180 - side(a).angleTo(side(b)) / D;
};
const to = (angles: Record<string, number>, size: number) =>
  Object.fromEntries(Object.entries(angles).map(([k, a]) => [k, Math.sign(a) * size]));
// the head's fold turned the part of the top edge inside it over (a crease it split off keeps its parent's name)
const after = s.angles('bar');
const [body, edges] = [false, true].map((flipped) =>
  Object.fromEntries(
    Object.entries(after).filter(([k, a]) => (a === -(spine[k] ?? spine[k.replace(/\.\d+$/, '')])) === flipped)
  )
);
// stood up off the table on its wing lines (levelled), then turned a little toward you
const standing = new Euler().setFromQuaternion(
  new Quaternion()
    .setFromAxisAngle(new Vector3(0, 0, 1), -30 * D)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 90 * D))
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -Math.atan(RISE)))
    .multiply(new Quaternion().setFromEuler(new Euler(0, 180 * D, 45 * D)))
);
s.set(
  {
    ...to(body, 180 - (2 * OPEN) / D),
    // the wings above the top edge would close as the body opens below it: they spread as far again
    ...to({ ...s.angles('wingF'), ...s.angles('wingB') }, 180 - (2 * OPEN) / D),
    ...to(s.angles('head'), folded(crease, x, edge)),
    ...to(edges, folded(edge, crease, new Vector3(crease.x, -crease.y, crease.z)))
  },
  {
    en: 'Open the body a little at the bottom so the dove stands up. Your dove is done.',
    pt: 'Abre um pouco o corpo por baixo para a pomba ficar de pé. A tua pomba está pronta.'
  },
  [standing.x / D, standing.y / D, standing.z / D]
);

export default s.source({
  id: 'dove',
  name: { en: 'Dove', pt: 'Pomba' },
  japaneseName: 'Hato',
  category: 'animals',
  difficulty: 'easy',
  tags: ['dove', 'bird', 'animal', 'peace'],
  paperColor: '#6F8497',
  solve: true
});
