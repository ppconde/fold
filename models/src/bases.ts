import { diamond as d, diamondSequence, foldSequence } from '../sequence';

const [L, T, R] = [d(0, 0), d(1, 1), d(2, 0)];
/** The corner pointing at you. */
export const B = d(1, -1);

/**
 * A new sheet folded into the square base (book p.15), a corner towards you. It ends open end down: the middle
 * on top, the paper's corners at the bottom. Creases: `upright` and `across` (the diagonals), `edge` and `other`
 * (the midlines).
 */
export function squareBase() {
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
  return s;
}

/** Where each lower edge's fold to the middle line meets the upper edges: √2 − 1 of the way up them. */
const k = Math.SQRT2 - 1;

/**
 * A new sheet folded into the kite base (book p.16), white side up, a corner towards you: the lower edges folded
 * to the upright diagonal, so the long point is at the bottom. Creases: `upright`, `kiteL`, `kiteR`.
 */
export function kiteBase() {
  const s = diamondSequence();
  s.crease('upright', B, T, {
    valley: true,
    hold: d(1.5, 0.1),
    en: 'Fold in half from corner to corner, then unfold.',
    pt: 'Dobra ao meio de canto a canto e desdobra.'
  });
  s.fold('kiteL', B, d(k, k), {
    valley: true,
    hold: d(1.1, 0),
    en: 'Fold the lower left edge to the middle line.',
    pt: 'Dobra a aresta de baixo à esquerda até à linha do meio.'
  });
  s.fold('kiteR', d(2 - k, k), B, {
    valley: true,
    en: 'Fold the lower right edge to the middle line.',
    pt: 'Dobra a aresta de baixo à direita até à linha do meio.'
  });
  return s;
}

/**
 * A new sheet folded into the kannon (cupboard) base (book p.16), white side up: the left and right edges folded
 * to the upright middle line, their coloured side showing. Creases: `middle`, `left`, `right`.
 */
export function kannonBase() {
  const s = foldSequence([0, 180, 0]);
  s.turn([0, 180, 0], { en: 'Turn the paper over, white side up.', pt: 'Vira o papel com o lado branco para cima.' });
  s.crease('middle', [0.5, 0], [0.5, 1], {
    valley: true,
    hold: [0.75, 0.5],
    en: 'Fold in half from side to side, then unfold.',
    pt: 'Dobra ao meio de lado a lado e desdobra.'
  });
  s.fold('left', [0.25, 0], [0.25, 1], {
    valley: true,
    hold: [0.5, 0.5],
    en: 'Fold the left edge to the middle line.',
    pt: 'Dobra a aresta da esquerda até à linha do meio.'
  });
  s.fold('right', [0.75, 1], [0.75, 0], {
    valley: true,
    en: 'Fold the right edge to the middle line.',
    pt: 'Dobra a aresta da direita até à linha do meio.'
  });
  return s;
}

/**
 * A new sheet folded into the blintz base (book p.16), white side up: the four corners folded to the middle, their
 * coloured side showing. The book pinches the middle; the diagonals, folded and unfolded, find it the whole way
 * across. Creases: `upright`, `across`, `cornerBL`, `cornerBR`, `cornerTR`, `cornerTL`.
 */
export function blintzBase() {
  const s = foldSequence([0, 180, 0]);
  s.turn([0, 180, 0], { en: 'Turn the paper over, white side up.', pt: 'Vira o papel com o lado branco para cima.' });
  s.crease('upright', [0, 0], [1, 1], {
    valley: true,
    hold: [0.75, 0.25],
    en: 'Fold in half from corner to corner, then unfold.',
    pt: 'Dobra ao meio de canto a canto e desdobra.'
  });
  s.crease('across', [1, 0], [0, 1], {
    valley: true,
    hold: [0.8, 0.6],
    en: 'Fold in half the other way, then unfold. The creases cross at the middle.',
    pt: 'Dobra ao meio no outro sentido e desdobra. Os vincos cruzam-se no meio.'
  });
  s.fold('cornerBL', [0.5, 0], [0, 0.5], {
    valley: true,
    hold: [0.5, 0.6],
    en: 'Fold the bottom left corner to the middle.',
    pt: 'Dobra o canto de baixo à esquerda até ao meio.'
  });
  s.fold('cornerBR', [1, 0.5], [0.5, 0], {
    valley: true,
    hold: [0.5, 0.6],
    en: 'Fold the bottom right corner to the middle.',
    pt: 'Dobra o canto de baixo à direita até ao meio.'
  });
  s.fold('cornerTR', [0.5, 1], [1, 0.5], {
    valley: true,
    hold: [0.5, 0.6],
    en: 'Fold the top right corner to the middle.',
    pt: 'Dobra o canto de cima à direita até ao meio.'
  });
  s.fold('cornerTL', [0, 0.5], [0.5, 1], {
    valley: true,
    hold: [0.5, 0.6],
    en: 'Fold the top left corner to the middle.',
    pt: 'Dobra o canto de cima à esquerda até ao meio.'
  });
  return s;
}

/** Where the petal creases meet the sheet's edges, as a fraction along them from the nearer corner. */
export const petal = 1.5 - Math.SQRT1_2;
// the square base, open end down: the front layer's lower edges fold to the middle along the bisectors from B; they
// meet the sides at KL, KR
const [KL, KR] = [d(0.5 + k / 2, -0.5 + k / 2), d(1.5 - k / 2, -0.5 + k / 2)];
type At = [number, number];
/** The front flap's two layers on each side: the front quarter of the sheet and the half quarter joined to it. */
const front = ([x, y]: At) => x > 0.5 && y > 0.5;
const frontLeft = (_: string[], at: At) => front(at) || (at[0] > 0.5 && at[1] < 0.5 && at[0] + at[1] > 1);
const frontRight = (_: string[], at: At) => front(at) || (at[0] < 0.5 && at[1] > 0.5 && at[0] + at[1] > 1);
const back = ([x, y]: At) => x < 0.5 && y < 0.5;
const backLayers = (_: string[], at: At) =>
  back(at) || (at[0] + at[1] < 1 && ((at[0] > 0.5 && at[1] < 0.5) || (at[0] < 0.5 && at[1] > 0.5)));

/**
 * The square base petal-folded front and back into Basic shape 2, the bird base (book p.65), open end down: two
 * long petals, the split points at the bottom. Creases, besides the square base's: `kiteL`, `kiteR`, `backL`,
 * `backR` (the petals' sides), `top` (their hinges); `other1` and `edge1` are split where the petal sides meet them.
 */
export function basicShape2() {
  const s = squareBase();
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
  // the edge from KL, KR (on the flat sheet) to the side corner is the part split off
  s.split('other1', [petal, 0.5]);
  const sideR = s.split('edge1', [0.5, petal]);
  s.collapse(
    { kiteL1: -180, kiteL2: -180, kiteR1: -180, kiteR2: -180, top4: 180, top5: 180, other1: 0, [sideR]: 0 },
    {
      hold: d(1, -0.1),
      en: 'Lift the bottom corner of the front layer up along the crease, pressing its sides in to the middle.',
      pt: 'Levanta o canto de baixo da camada da frente pelo vinco, apertando os lados para o meio.'
    }
  );

  s.turn([0, 0, 45], { en: 'Turn the paper over.', pt: 'Vira o papel.' });
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
  s.split('edge1', [0.5, 1 - petal]);
  const backSide = s.split('other1.2', [1 - petal, 0.5]);
  s.collapse(
    { backL1: -180, backL2: -180, backR1: -180, backR2: -180, top1: 180, top8: 180, edge1: 0, [backSide]: 0 },
    {
      hold: d(1, -0.1),
      en: 'Petal-fold this side too: lift the bottom corner up and press the sides in.',
      pt: 'Faz o mesmo deste lado: levanta o canto de baixo e aperta os lados para dentro.'
    }
  );

  return s;
}

/** Where a squash's crease meets the sheet edge: this far from the edge's middle (half of tan 22.5°). */
const r = (Math.SQRT2 - 1) / 2;

/**
 * A new sheet folded into Basic shape 1, the squashed square base (book p.65): the square base turned open end up
 * and its four flaps squashed, a squashed flap showing in front and behind. It ends open end up, the middle at the
 * bottom. Creases: the square base's, and a `squash` line through each flap's two layers, from the middle to the
 * edge, 22.5° off the midline.
 */
export function basicShape1() {
  const s = squareBase();
  const C: At = [0.5, 0.5];
  // on the flat sheet: the halves of the creases the squashes move. The axis halves join each quarter's two
  // halves (front B, back T); a spine is the folded edge of one flap
  const frontAxis = s.split('upright1', C);
  const backAxis = 'upright1';
  const spine1 = 'other1';
  const spine3 = s.split('other1', C);
  const spine4 = 'edge1';
  const spine2 = s.split('edge1', C);
  s.turn([0, 180, 225], {
    en: 'Turn the square base around so its open end points up.',
    pt: 'Roda a base quadrada para a ponta aberta ficar virada para cima.'
  });
  // a squash's lines: from the middle to the flap's open edge, in the view (`side` +1 the right flap, −1 the left),
  // through the flap's two layers (picked on the flat sheet): `squash1`, `squash2`, … Each layer's half by the
  // spine folds back onto the half by the axis, a mountain.
  let n = 0;
  const squashLines = (side: number, flap: (at: At) => boolean) => {
    s.mark('squash', C, [0.5 + side * r, 1], {
      valley: (_, [x, y]) => (x - 0.5) * (y - 0.5) < 0,
      only: (_, at) => flap(at),
      en: '',
      pt: ''
    });
    return { [`squash${++n}`]: -180, [`squash${++n}`]: -180 };
  };
  const [left, right]: At[] = [
    [0.2, 0.85],
    [0.8, 0.85]
  ];
  s.collapse(
    { [frontAxis]: 180, [spine1]: 0, ...squashLines(1, ([x, y]) => (y > 0.5 && x > y) || (y < 0.5 && x + y > 1)) },
    {
      hold: left,
      en: 'Lift the right flap up, open it and squash it flat, its folded edge on the middle line.',
      pt: 'Levanta a aba da direita, abre-a e espalma-a, com a aresta dobrada sobre a linha do meio.'
    }
  );
  s.collapse(
    { [frontAxis]: 0, [spine1]: 180 },
    {
      hold: left,
      en: 'Fold the left half of the squashed flap over to the right.',
      pt: 'Dobra a metade esquerda da aba espalmada para a direita.'
    }
  );
  s.collapse(
    { [frontAxis]: 180, [spine2]: 0, ...squashLines(-1, ([x, y]) => (x > 0.5 && y > x) || (x < 0.5 && x + y > 1)) },
    {
      hold: right,
      en: 'Squash the left flap the same way.',
      pt: 'Espalma a aba da esquerda da mesma forma.'
    }
  );
  s.turn([0, 0, 225], { en: 'Turn the paper over.', pt: 'Vira o papel.' });
  s.collapse(
    {
      [backAxis]: 180,
      [spine3]: 0,
      ...squashLines(1, ([x, y]) => (y < 0.5 && y > x) || (x < 0.5 && y > 0.5 && x + y < 1))
    },
    {
      hold: left,
      en: 'Squash the right flap on this side too.',
      pt: 'Espalma também a aba da direita deste lado.'
    }
  );
  s.collapse(
    { [backAxis]: 0, [spine3]: 180 },
    {
      hold: left,
      en: 'Fold the left half over to the right again.',
      pt: 'Dobra outra vez a metade esquerda para a direita.'
    }
  );
  s.collapse(
    {
      [backAxis]: 180,
      [spine4]: 0,
      ...squashLines(-1, ([x, y]) => (x < 0.5 && x > y) || (y < 0.5 && x > 0.5 && x + y < 1))
    },
    {
      // on the squashed flaps: nothing else is left on this side
      hold: [0.56, 0.85],
      en: 'Squash the last flap the same way.',
      pt: 'Espalma a última aba da mesma forma.'
    }
  );
  return s;
}
