import { Euler, Quaternion, Vector3 } from 'three';
import { diamond as d, foldSequence, has } from '../sequence';

const [L, T, R, B] = [d(0, 0), d(1, 1), d(2, 0), d(1, -1)];

const s = foldSequence([0, 0, 45]);
s.turn([0, 0, 45], {
  en: 'Start with the coloured side up and a corner pointing at you.',
  pt: 'Começa com o lado colorido para cima e um canto virado para ti.'
});
s.crease('upright', B, T, {
  valley: true,
  hold: d(1.5, 0),
  en: 'Fold in half from corner to corner, then unfold.',
  pt: 'Dobra ao meio de canto a canto e desdobra.'
});
s.crease('across', R, L, {
  valley: true,
  hold: d(1, 0.5),
  en: 'Fold in half the other way, then unfold.',
  pt: 'Dobra ao meio no outro sentido e desdobra.'
});
s.turn([0, 180, 45], { en: 'Turn the paper over.', pt: 'Vira o papel.' });
s.crease('edge', d(0.5, -0.5), d(1.5, 0.5), {
  valley: true,
  hold: d(1.5, -0.25),
  en: 'Fold in half from edge to edge, then unfold.',
  pt: 'Dobra ao meio de lado a lado e desdobra.'
});
s.crease('other', d(1.5, -0.5), d(0.5, 0.5), {
  valley: true,
  hold: d(1.5, 0.25),
  en: 'Fold in half edge to edge the other way, then unfold.',
  pt: 'Dobra ao meio de lado a lado no outro sentido e desdobra.'
});
s.collapse(
  { across1: 180, upright1: 0, edge1: -180, other1: -180 },
  {
    hold: d(1, -0.5),
    en: 'Bring the left, right and top corners down to the bottom one, folding the paper into a small square.',
    pt: 'Leva os cantos da esquerda, da direita e de cima até ao de baixo, dobrando o papel num pequeno quadrado.'
  }
);

// the square base, open end down: the middle on top, the paper's corners at B
// the front layer's lower edges fold to the middle along the bisectors from B; they meet the sides at KL, KR
const r = Math.SQRT2 - 1;
const [KL, KR] = [d(0.5 + r / 2, -0.5 + r / 2), d(1.5 - r / 2, -0.5 + r / 2)];
/** The front flap's two layers on each side: the front quarter of the sheet and the half quarter joined to it. */
type At = [number, number];
const front = ([x, y]: At) => x > 0.5 && y > 0.5;
const frontLeft = (_: string[], at: At) => front(at) || (at[0] > 0.5 && at[1] < 0.5 && at[0] + at[1] > 1);
const frontRight = (_: string[], at: At) => front(at) || (at[0] < 0.5 && at[1] > 0.5 && at[0] + at[1] > 1);

s.together(
  {
    en: 'Fold the lower edges of the front layer to the middle line.',
    pt: 'Dobra as arestas de baixo da camada da frente até à linha do meio.'
  },
  () => {
    s.fold('kiteL', B, KL, { valley: true, only: frontLeft, hold: d(1, -0.1), en: '', pt: '' });
    s.fold('kiteR', KR, B, { valley: true, only: frontRight, en: '', pt: '' });
  }
);
s.crease('top', KL, KR, {
  valley: true,
  hold: d(1, -0.5),
  en: 'Fold the top triangle down over them, then unfold it.',
  pt: 'Dobra o triângulo de cima para baixo, por cima delas, e desdobra-o.'
});
s.collapse(
  { kiteL1: 0, kiteL2: 0, kiteR1: 0, kiteR2: 0 },
  { hold: d(1, -0.5), en: 'Unfold the two flaps.', pt: 'Desdobra as duas abas.' }
);
// petal fold: the front layer's middle swings up; the edges between its sides and the layers behind open flat.
// KL and KR on the flat sheet; the edge from each to the side corner is the part split off
const k = 1.5 - Math.SQRT1_2;
s.split('other1', [k, 0.5]);
const sideR = s.split('edge1', [0.5, k]);
s.collapse(
  { kiteL1: -180, kiteL2: -180, kiteR1: -180, kiteR2: -180, top4: 180, top5: 180, other1: 0, [sideR]: 0 },
  {
    hold: d(1, -0.1),
    en: 'Lift the bottom corner of the front layer up along the crease, pressing its sides in to the middle.',
    pt: 'Levanta o canto de baixo da camada da frente pelo vinco, apertando os lados para o meio.'
  }
);

s.turn([0, 0, 45], { en: 'Turn the paper over.', pt: 'Vira o papel.' });
const back = ([x, y]: At) => x < 0.5 && y < 0.5;
const backLayers = (_: string[], at: At) =>
  back(at) || (at[0] + at[1] < 1 && ((at[0] > 0.5 && at[1] < 0.5) || (at[0] < 0.5 && at[1] > 0.5)));
s.together(
  {
    en: 'Fold the lower edges to the middle line again.',
    pt: 'Dobra outra vez as arestas de baixo até à linha do meio.'
  },
  () => {
    s.fold('backL', B, KL, { valley: true, only: backLayers, hold: d(1, -0.1), en: '', pt: '' });
    s.fold('backR', KR, B, { valley: true, only: backLayers, en: '', pt: '' });
  }
);
s.collapse(
  { backL1: 0, backL2: 0, backR1: 0, backR2: 0 },
  { hold: d(1, -0.5), en: 'Unfold the two flaps.', pt: 'Desdobra as duas abas.' }
);
s.split('edge1', [0.5, 1 - k]);
const backSide = s.split('other1.2', [1 - k, 0.5]);
s.collapse(
  { backL1: -180, backL2: -180, backR1: -180, backR2: -180, top1: 180, top8: 180, edge1: 0, [backSide]: 0 },
  {
    hold: d(1, -0.1),
    en: 'Petal-fold this side too: lift the bottom corner up and press the sides in.',
    pt: 'Faz o mesmo deste lado: levanta o canto de baixo e aperta os lados para dentro.'
  }
);

// the legs: the side quarters below the petal creases; the left one in view is the quarter at corner (1, 0)
const below = ([x, y]: At) => Math.abs(x - y) > k - 0.5;
const leftLeg = (_: string[], at: At) => below(at) && at[0] > 0.5 && at[1] < 0.5;
const rightLeg = (_: string[], at: At) => below(at) && at[0] < 0.5 && at[1] > 0.5;
// inside reverse fold: the layers facing us now (nearer the corner (0, 0)) go in behind, the far ones come forward
const tuckIn = (_: string[], [x, y]: At) => x + y > 1;
/**
 * The fold line through `at` that turns a flap pointing `from` degrees to point `to` degrees (reflecting a
 * direction about a line at φ gives 2φ minus it), ordered so the flap's tip lies to its left.
 */
const turnFlap = (at: At, from: number, to: number, tip: At): [At, At] => {
  const phi = ((from + to) / 2) * (Math.PI / 180);
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
  over: true,
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
  over: true,
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
const D = Math.PI / 180;
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
