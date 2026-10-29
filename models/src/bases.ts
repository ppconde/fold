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
    hold: d(1.5, 0),
    en: 'Fold in half from corner to corner, then unfold.',
    pt: 'Dobra ao meio de canto a canto e desdobra.'
  });
  s.fold('kiteL', B, d(k, k), {
    valley: true,
    hold: d(1, 0),
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
