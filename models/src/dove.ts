import { diamond as d, diamondSequence, has, lacks } from '../sequence';

// on the diamond (left corner (0, 0), the vertical diagonal at x = 1): the triangle's point folds over at
// STRIP, landing at 2 STRIP; its top layer folds back at BACK, opening a white diamond from 2 BACK − 2 STRIP
// to 2 STRIP across the strip
const [STRIP, BACK] = [0.7, 0.85];
// the wings fold up along a line just below the diamond's bottom corner, rising a little to the right
const [WING_L, WING_R] = [d(STRIP, -0.6), d(1, -0.54)];
// the head: the left point turns down about a line through the top edge at HEAD, leaning down to the left;
// just short of the strip, so it folds only the point's two layers
const HEAD = STRIP - 0.02;
const lean = (215 * Math.PI) / 180;

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
  hold: d(1.2, -0.1),
  en: 'Fold the front wing up, along a line just below the top bar.',
  pt: 'Dobra a asa da frente para cima, por uma linha logo abaixo da barra de cima.'
});
s.fold('wingB', WING_R, WING_L, {
  valley: false,
  only: lacks('top'),
  hold: d(1.2, -0.1),
  en: 'Fold the back wing up behind the same way.',
  pt: 'Dobra a asa de trás para cima, por trás, da mesma forma.'
});
// inside reverse fold: the front layer's flap goes back, the back layer's comes forward, both between them
s.fold('head', d(HEAD + Math.cos(lean), Math.sin(lean)), d(HEAD, 0), {
  valley: (tags) => !tags.includes('top'),
  over: true,
  tuck: true,
  hold: d(1.2, -0.1),
  en: 'Reverse-fold the left point down inside the body to make the head. Your dove is done.',
  pt: 'Faz uma dobra invertida na ponta da esquerda, para baixo e por dentro do corpo, para fazer a cabeça. A tua pomba está pronta.'
});

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
