import { diamond as d, diamondSequence } from '../sequence';

type At = [number, number];
/** Diamond view → flat sheet, for naming points on creases. */
const flat = (x: number, y: number): At => [(2 - x + y) / 2, (x + y) / 2];

const s = diamondSequence();
s.crease('across', d(2, 0), d(0, 0), {
  valley: true,
  hold: d(1, 0.5),
  en: 'Fold the bottom corner up to the top corner and unfold.',
  pt: 'Dobra o canto de baixo até ao canto de cima e desdobra.'
});
s.crease('upright', d(1, -1), d(1, 1), {
  valley: true,
  hold: d(1.5, 0),
  en: 'Fold the left corner over to the right corner and unfold.',
  pt: 'Dobra o canto esquerdo até ao canto direito e desdobra.'
});
s.together(
  {
    en: 'Fold the left and right corners to the centre.',
    pt: 'Dobra os cantos da esquerda e da direita até ao centro.'
  },
  () => {
    s.fold('sideL', d(0.5, -0.5), d(0.5, 0.5), { valley: true, hold: d(1, 0), en: '', pt: '' });
    s.fold('sideR', d(1.5, 0.5), d(1.5, -0.5), { valley: true, en: '', pt: '' });
  }
);
s.split('across1', flat(0.5, 0));
s.split('across1.2', flat(1.5, 0));
s.fold('half', d(0, 0), d(2, 0), {
  valley: true,
  hold: d(1, -0.5),
  en: 'Fold in half, the top corner down to the bottom corner.',
  pt: 'Dobra ao meio, o canto de cima até ao canto de baixo.'
});
s.split('upright1', flat(1, 0));
s.fold('quarter', d(1, 0), d(1, -1), {
  valley: true,
  hold: d(0.75, -0.5),
  en: 'Fold in half again, the right side over the left.',
  pt: 'Dobra outra vez ao meio, o lado direito sobre o esquerdo.'
});
s.split('across1.2', flat(1, 0));
// the squashes' diagonals, which the book never pre-creases
s.mark('mid', d(0.5, -0.5), d(1, 0), { valley: true, en: '', pt: '' });
s.collapse(
  { upright1: 0, 'across1.2.3': 0, 'across1.2.2': 0, mid3: -180, mid4: -180 },
  {
    hold: d(0.8, -0.6),
    en: 'Open the pocket of the top flap and squash it over to the right, flat into a triangle.',
    pt: 'Abre a bolsa da aba de cima e espalma-a para a direita, num triângulo.'
  }
);
// the back squash's flaps, picked on the flat sheet: the left corner's square, and the top-half layer next to it
const backFlaps = (_: string[], [x, y]: At) => x > 0.5 && (y < 0.5 || x > y);
const wrap = (_: string[], [x, y]: At) => x < 0.5 && y < 0.5;
const beneath = (_: string[], [x, y]: At) => y > 0.5 && (x < 0.5 || y > x);
const none = () => false;
s.turn([0, 0, 45], { en: 'Turn the model over.', pt: 'Vira o modelo.' });
// on rigid paper the back squash is two moves: the corner turns behind like a page, then the pocket opens
// (doing both at once bends the paper; see the reverse-fold spike)
s.collapse(
  { mid1: -180, mid2: 180 },
  {
    hold: d(0.8, -0.6),
    en: 'Fold the corner that sticks out at the top right behind, along the edge.',
    pt: 'Dobra para trás, pela aresta, o canto que sai em cima à direita.'
  }
);
s.collapse(
  { 'upright1.2': 0, across1: 0, 'across1.2': 0, mid1: -180, mid2: 180 },
  {
    hold: d(0.8, -0.6),
    // on rigid paper the flaps overshoot: the corner's bottom half below the layers behind, the rest over the
    // outside layer; they land between the two, as in the front squash
    tuck: { layers: [wrap, beneath], flaps: [backFlaps, none] },
    en: 'Open the pocket and squash this flap over to the left the same way. This is a square base.',
    pt: 'Abre a bolsa e espalma esta aba para a esquerda da mesma forma. É uma base quadrada.'
  }
);

export default s.source({
  id: 'snail',
  name: { en: 'Snail', pt: 'Caracol' },
  japaneseName: 'Katatsumuri',
  category: 'animals',
  difficulty: 'medium',
  tags: ['snail', 'animal'],
  paperColor: '#8A9A5B',
  solve: true
});
