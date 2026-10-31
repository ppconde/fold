import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { has } from '../sequence';
import { kannonBase } from './bases';

// the legs fold about lines from the square's top corners to LEG along the belly; the snout (the right point) turns
// up HEAD degrees from the belly and the tail (the left point) TAIL, about lines through it BEND in from each point
const [LEG, BEND, HEAD, TAIL] = [0.375, 0.2, 35, 60];

const s = kannonBase();
s.turn([0, 180, 90], {
  en: 'Turn the paper so its folded edges run across, the slit along the middle.',
  pt: 'Roda o papel para as arestas dobradas ficarem na horizontal, com a fenda ao meio.'
});
s.crease('half', [0.5, 0.75], [0.5, 0.25], {
  valley: true,
  hold: [0.25, 0.6],
  en: 'Fold in half from side to side, then unfold.',
  pt: 'Dobra ao meio de lado a lado e desdobra.'
});
s.together(
  {
    en: 'Fold the left and right ends to the middle line.',
    pt: 'Dobra as pontas da esquerda e da direita até à linha do meio.'
  },
  () => {
    s.fold('endL', [0.25, 0.25], [0.25, 0.75], { valley: true, tag: 'end', hold: [0.45, 0.6], en: '', pt: '' });
    s.fold('endR', [0.75, 0.75], [0.75, 0.25], { valley: true, tag: 'end', en: '', pt: '' });
  }
);
// each end's inner corners: the square's diagonals, through the end's layers only
const corners: [string, [number, number], [number, number], string, string][] = [
  [
    'TL',
    [0.25, 0.75],
    [0.5, 0.5],
    'Crease the top left flap from its outer corner to the middle.',
    'Vinca a aba de cima à esquerda, do canto de fora até ao meio.'
  ],
  ['BL', [0.5, 0.5], [0.25, 0.25], 'Do the same at the bottom left.', 'Faz o mesmo em baixo à esquerda.'],
  ['TR', [0.5, 0.5], [0.75, 0.75], 'And at the top right.', 'E em cima à direita.'],
  ['BR', [0.75, 0.25], [0.5, 0.5], 'And at the bottom right.', 'E em baixo à direita.']
];
for (const [name, p, q, en, pt] of corners) {
  // the left end is the paper below y = 0.5, the right end above
  const left = name.endsWith('L');
  s.crease(`diag${name}`, p, q, {
    valley: true,
    only: (tags, at) => has('end')(tags) && at[1] < 0.5 === left,
    hold: [0.5, 0.4],
    en,
    pt
  });
}

// each end opens out: its top layer turns back out flat into a point, its corners fold over it along the creases,
// and the kannon layer inside stays, its corners folded in half along the same creases. The kannon creases open
// where they run through the ends (split off there: the part left with the name runs through the left end)
const kannonL = s.split(s.split('left1', [0.75, 0.25]), [0.75, 0.75]);
const kannonR = s.split(s.split('right1', [0.25, 0.25]), [0.25, 0.75]);
s.collapse(
  { endL1: 0, left1: 0, right1: 0, diagTL1: -180, diagTL2: -180, diagBL1: -180, diagBL2: -180 },
  {
    hold: [0.6, 0.6],
    en: 'Open the left end out from the middle, folding its corners in along the creases so they make triangles at the top and bottom.',
    pt: 'Abre a ponta da esquerda para fora a partir do meio, dobrando os cantos pelos vincos para fazerem triângulos em cima e em baixo.'
  }
);
s.collapse(
  { endR1: 0, [kannonL]: 0, [kannonR]: 0, diagTR1: -180, diagTR2: -180, diagBR1: -180, diagBR2: -180 },
  {
    hold: [0.4, 0.6],
    en: 'Open the right end the same way.',
    pt: 'Abre a ponta da direita da mesma forma.'
  }
);
s.fold('body', [1, 0.5], [0, 0.5], {
  valley: false,
  hold: [0.45, 0.6],
  en: 'Fold in half along the middle, the bottom half going behind.',
  pt: 'Dobra ao meio pela linha do meio, com a metade de baixo para trás.'
});
// each leg: the kannon layer's triangle, folded down about a line from its top corner to halfway along the belly
type At = [number, number];
const kannon =
  (front: boolean, left: boolean) =>
  (_: string[], [x, y]: At) =>
    (front ? x > 0.75 : x < 0.25) && (left ? y < 0.25 : y > 0.75);
const legs = (front: boolean) => () => {
  const opts = { valley: front, en: '', pt: '' };
  s.fold(front ? 'legFL' : 'legBL', [0.25, 0.75], [LEG, 0.5], {
    ...opts,
    only: kannon(front, true),
    hold: [0.5, 0.65]
  });
  s.fold(front ? 'legFR' : 'legBR', [1 - LEG, 0.5], [0.75, 0.75], { ...opts, only: kannon(front, false) });
};
s.together(
  {
    en: 'Fold the triangles down along the lines to make the legs.',
    pt: 'Dobra os triângulos para baixo pelas linhas para fazer as patas.'
  },
  legs(true)
);
s.together({ en: 'Do the same behind.', pt: 'Faz o mesmo atrás.' }, legs(false));
// snout and tail: inside reverse folds turning each point up from the belly, about a line from BEND in
// along the belly (reflecting a direction about a line at φ gives 2φ minus it)
const reverse = (at: At, from: number, to: number): [At, At] => {
  const phi = ((from + to) / 2) * (Math.PI / 180);
  const q: At = [at[0] + 0.2 * Math.cos(phi), at[1] + 0.2 * Math.sin(phi)];
  // ordered so the point lies to its left: it folds
  return to > 90 ? [at, q] : [q, at];
};
// the base layer's ends; the back half (paper x < 0.5) turns as a valley, the front half as a mountain
const end =
  (left: boolean) =>
  (_: string[], [x, y]: At) =>
    x > 0.25 && x < 0.75 && (left ? y < 0.25 : y > 0.75);
const tuckIn = (_: string[], [x]: At) => x < 0.5;
s.fold('snout', ...reverse([1 - BEND, 0.5], 0, HEAD), {
  valley: tuckIn,
  over: false,
  tuck: true,
  only: end(false),
  hold: [0.5, 0.65],
  en: 'Reverse-fold the right point up inside to make the snout.',
  pt: 'Faz uma dobra invertida na ponta da direita, para cima e por dentro, para fazer o focinho.'
});
s.fold('tail', ...reverse([BEND, 0.5], 180, 180 - TAIL), {
  valley: tuckIn,
  over: false,
  tuck: true,
  only: end(true),
  hold: [0.5, 0.65],
  en: 'Reverse-fold the left point up the same way, higher, to make the tail.',
  pt: 'Faz o mesmo à ponta da esquerda, mais para cima, para fazer a cauda.'
});

// stood up off the table on its legs, leaning 25° toward you so its side shows past the camera's height
const D = MathUtils.DEG2RAD;
const standing = new Euler().setFromQuaternion(
  new Quaternion()
    .setFromAxisAngle(new Vector3(1, 0, 0), (90 - 25) * D)
    .multiply(new Quaternion().setFromEuler(new Euler(0, 180 * D, 90 * D)))
);
s.turn([standing.x / D, standing.y / D, standing.z / D], {
  en: 'Stand the pig up on its legs. Your pig is done.',
  pt: 'Põe o porco de pé, assente nas patas. O teu porco está pronto.'
});

export default s.source({
  id: 'pig',
  name: { en: 'Pig', pt: 'Porco' },
  japaneseName: 'Buta',
  category: 'animals',
  difficulty: 'easy',
  tags: ['pig', 'animal', 'farm'],
  paperColor: '#D98C8C',
  solve: true
});
