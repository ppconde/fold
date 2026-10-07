import { diamond as d, diamondSequence } from '../sequence';

// each petal crease leaves the middle of the base at 145° and meets the side edge (y = x) at (q, q)
const q = 1 / (1 + Math.tan((35 * Math.PI) / 180));

const s = diamondSequence();
s.fold('diagonal', d(2, 0), d(0, 0), {
  valley: true,
  hold: d(1, 0.5),
  en: 'Fold the bottom corner up to the top corner.',
  pt: 'Dobra o canto de baixo até ao canto de cima.'
});
s.fold('leftPetal', d(1, 0), d(q, q), {
  valley: true,
  hold: d(1, 0.6),
  en: 'Fold the left corner up so its tip sticks out past the side.',
  pt: 'Dobra o canto esquerdo para cima, com a ponta a sair pelo lado.'
});
s.fold('rightPetal', d(2 - q, q), d(1, 0), {
  valley: true,
  en: 'Fold the right corner up the same way.',
  pt: 'Dobra o canto direito para cima da mesma forma.'
});

export default s.source({
  id: 'tulip',
  name: { en: 'Tulip', pt: 'Túlipa' },
  japaneseName: 'Chūrippu',
  category: 'flowers',
  difficulty: 'easy',
  tags: ['tulip', 'flower', 'spring'],
  paperColor: '#B5524A'
});
