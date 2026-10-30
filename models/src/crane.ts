import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { diamond as d, has } from '../sequence';
import { B, basicShape2, petal as k } from './bases';

const s = basicShape2();
// the petal sides' lower halves, front and back, as basicShape2 split them off
const [sideR, backSide] = ['edge1.2', 'other1.2.2'];
type At = [number, number];

// the legs: the side quarters below the petal creases; the left one in view is the quarter at corner (1, 0)
const below = ([x, y]: At) => Math.abs(x - y) > k - 0.5;
const leftLeg = (_: string[], at: At) => below(at) && at[0] > 0.5 && at[1] < 0.5;
const rightLeg = (_: string[], at: At) => below(at) && at[0] < 0.5 && at[1] > 0.5;
// inside reverse fold: each layer's crease, as its flap ends up inside the body (between the layers it passed):
// a valley for the layers nearer the corner (0, 0), a mountain for the far ones
const tuckIn = (_: string[], [x, y]: At) => x + y < 1;
/**
 * The fold line through `at` that turns a flap pointing `from` degrees to point `to` degrees (reflecting a
 * direction about a line at φ gives 2φ minus it), ordered so the flap's tip lies to its left.
 */
const turnFlap = (at: At, from: number, to: number, tip: At): [At, At] => {
  const phi = MathUtils.degToRad((from + to) / 2);
  const q: At = [at[0] + Math.cos(phi), at[1] + Math.sin(phi)];
  const left = (q[0] - at[0]) * (tip[1] - at[1]) - (q[1] - at[1]) * (tip[0] - at[0]) > 0;
  return left ? [at, q] : [q, at];
};
const mirror = ([px, py]: At, [a, b]: [At, At]): At => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const t = ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy);
  return [2 * (a[0] + t * dx) - px, 2 * (a[1] + t * dy) - py];
};
// neck and tail stand 70° up, leaning out; the head turns down and out
const base: At = [0.5, 0.24];
const neck = turnFlap(base, -90, 110, B);
s.fold('neck', neck[0], neck[1], {
  valley: tuckIn,
  over: false,
  tuck: true,
  only: leftLeg,
  tag: 'neck',
  hold: d(1, 0.3),
  en: 'Reverse-fold the left flap up inside the body to make the neck.',
  pt: 'Faz uma dobra invertida na aba da esquerda, para cima e por dentro do corpo, para fazer o pescoço.'
});
const tail = turnFlap(base, -90, 70, B);
s.fold('tail', tail[0], tail[1], {
  valley: tuckIn,
  over: false,
  tuck: true,
  only: rightLeg,
  hold: d(1, 0.3),
  en: 'Reverse-fold the right flap up the same way to make the tail.',
  pt: 'Faz o mesmo à aba da direita para fazer a cauda.'
});
const tip = mirror(B, neck);
const headAt: At = [base[0] + (tip[0] - base[0]) * 0.8, base[1] + (tip[1] - base[1]) * 0.8];
const head = turnFlap(headAt, 110, 215, tip);
s.fold('head', head[0], head[1], {
  valley: tuckIn,
  over: true,
  tuck: true,
  only: has('neck'),
  hold: d(1, 0.3),
  en: 'Reverse-fold the tip of the neck down to make the head.',
  pt: 'Faz uma dobra invertida na ponta do pescoço, para baixo, para fazer a cabeça.'
});

// wings: each petal swings down about its hinge line, its hidden side flaps hinging at the same line
s.collapse(
  { top1: 0, top8: 0, edge1: 180, [backSide]: 180, top4: 0, top5: 0, other1: 180, [sideR]: 180 },
  {
    // the strip of body between the wing hinges and the neck and tail
    hold: [0.47, 0.275],
    en: 'Fold the wings down, one in front and one behind.',
    pt: 'Dobra as asas para baixo, uma à frente e outra atrás.'
  }
);
// stood up off the table (its side view up), then turned a little so both wings show as they open
const D = MathUtils.DEG2RAD;
const standing = new Euler().setFromQuaternion(
  new Quaternion()
    .setFromAxisAngle(new Vector3(0, 0, 1), -145 * D)
    .multiply(new Quaternion().setFromEuler(new Euler(90 * D, 0, 45 * D)))
);
s.turn([standing.x / D, standing.y / D, standing.z / D], {
  en: 'Stand the crane up.',
  pt: 'Põe o grou de pé.'
});
// opened level: the wings stand out evenly, one to each side of the body
s.set(
  { top1: 90, top8: 90, edge1: 90, [backSide]: 90, top4: 90, top5: 90, other1: 90, [sideR]: 90 },
  {
    en: 'Pull the wings out to the sides. Your crane is done.',
    pt: 'Puxa as asas para os lados. O teu grou está pronto.'
  }
);

export default s.source({
  id: 'crane',
  name: { en: 'Crane', pt: 'Grou' },
  japaneseName: 'Orizuru',
  category: 'animals',
  difficulty: 'medium',
  tags: ['crane', 'bird', 'classic'],
  paperColor: '#B5524A',
  solve: true
});
