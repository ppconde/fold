import { diamond as d, diamondSequence, has, lacks } from '../sequence';

const s = diamondSequence();
s.fold('diagonal', d(0, 0), d(2, 0), {
  valley: true,
  tag: 'front',
  hold: d(1, -0.5),
  en: 'Fold the top corner down to the bottom corner.',
  pt: 'Dobra o canto de cima até ao canto de baixo.'
});
// nose and chin first: folding them after the ears re-routed the engine's joints and flipped an ear's layers
s.fold('nose', d(1.25, -0.75), d(0.75, -0.75), {
  valley: true,
  only: has('front'),
  en: 'Fold the tip of the front layer up to make the nose.',
  pt: 'Dobra para cima a ponta da camada da frente para fazer o focinho.'
});
s.fold('chin', d(1.25, -0.75), d(0.75, -0.75), {
  valley: false,
  only: lacks('front'),
  en: 'Fold the back tip behind.',
  pt: 'Dobra a ponta de trás para trás.'
});
s.fold('leftEar', d(0.25, -0.25), d(0.65, 0), {
  valley: true,
  hold: d(1, -0.4),
  en: 'Fold the left corner down to make an ear.',
  pt: 'Dobra o canto esquerdo para baixo para fazer uma orelha.'
});
s.fold('rightEar', d(1.35, 0), d(1.75, -0.25), {
  valley: true,
  en: 'Fold the right corner down to make the other ear.',
  pt: 'Dobra o canto direito para baixo para fazer a outra orelha.'
});

export default s.source({
  id: 'dog-face',
  name: { en: 'Dog face', pt: 'Cara de cão' },
  japaneseName: 'Inu',
  category: 'animals',
  difficulty: 'easy',
  tags: ['dog', 'puppy', 'animal', 'face'],
  paperColor: '#B08A6A'
});
