import { diamond as d, foldSequence, has, lacks } from '../sequence';

// heights on the diamond (the top corner at y = 1, the side corners at 0.5): the front layer folds down at
// TOP, then rolls down again at BAND, leaving a band with the tip showing below it as the neck
const [TOP, BAND] = [0.65, 0.52];
// the sides fold behind along lines that lean out toward the tail, crossing the side corners' height at x = SIDE
// (and 2 − SIDE): far enough out that the two flaps don't overlap behind the body, which would stack the paper
// too thick for the engine's seams. The head folds behind at HEAD, its corners in by EYE along its top.
const [SIDE, LEAN, HEAD, EYE] = [0.74, 0.1 / 0.68, 0.71, 0.03];
const sideAt = (y: number) => SIDE + (y - 0.5) * LEAN;
const corner = sideAt(HEAD);
const s = foldSequence([0, 0, 45]);
s.turn([0, 0, 45], {
  en: 'Start with the coloured side up and a corner pointing at you.',
  pt: 'Começa com o lado colorido para cima e um canto virado para ti.'
});
s.fold('diagonal', d(2, 0), d(0, 0), {
  valley: true,
  tag: 'front',
  hold: d(1, 0.5),
  en: 'Fold the bottom corner up to the top corner, coloured side inside.',
  pt: 'Dobra o canto de baixo até ao canto de cima, com o lado colorido para dentro.'
});
s.together(
  {
    en: 'Fold the left and right corners up to the top corner.',
    pt: 'Dobra os cantos da esquerda e da direita até ao canto de cima.'
  },
  () => {
    s.fold('cornerL', d(1, 0), d(0.5, 0.5), { valley: true, tag: 'wingL', hold: d(1, 0.1), en: '', pt: '' });
    s.fold('cornerR', d(1.5, 0.5), d(1, 0), { valley: true, tag: 'wingR', en: '', pt: '' });
  }
);
// the wings' lines dip a little at the middle, so their tips land just past the bottom corner, a little apart.
// One at a time: at the top corner the two flaps touch, and swung together they brush through each other.
s.fold('wingL', d(0.5, 0.5), d(1, 0.475), {
  valley: true,
  only: has('wingL'),
  hold: d(1, 0.1),
  en: 'Fold the left flap down along a slight slant, its tip just past the bottom corner, to make a wing.',
  pt: 'Dobra a aba da esquerda para baixo num ligeiro ângulo, com a ponta um pouco além do canto de baixo, para fazer uma asa.'
});
s.fold('wingR', d(1, 0.475), d(1.5, 0.5), {
  valley: true,
  only: has('wingR'),
  hold: d(1, 0.1),
  en: 'Fold the right flap down the same way to make the other wing.',
  pt: 'Dobra a aba da direita para baixo da mesma forma para fazer a outra asa.'
});
/** The body's front layer, not the corners folded off it. */
const front = (tags: string[]) => has('front')(tags) && lacks('wingL', 'wingR')(tags);
s.fold('top', d(0, TOP), d(2, TOP), {
  valley: true,
  only: front,
  hold: d(1, 0.9),
  en: 'Fold the top corner of the front layer down, along a line a little below the middle of the top half.',
  pt: 'Dobra para baixo o canto de cima da camada da frente, por uma linha um pouco abaixo do meio da metade de cima.'
});
s.fold('band', d(0, BAND), d(2, BAND), {
  valley: true,
  only: front,
  hold: d(1, 0.9),
  en: 'Fold it down once more, leaving its tip showing below as the neck.',
  pt: 'Dobra-a para baixo mais uma vez, deixando a ponta à vista por baixo, como o pescoço.'
});
// one side at a time: swung together, the two flaps cross behind the body
s.fold('sideL', d(sideAt(0.16), 0.16), d(sideAt(0.84), 0.84), {
  valley: false,
  hold: d(1, 0.6),
  en: 'Fold the left side behind along a slightly slanted line.',
  pt: 'Dobra o lado esquerdo para trás, por uma linha ligeiramente inclinada.'
});
s.fold('sideR', d(2 - sideAt(0.84), 0.84), d(2 - sideAt(0.16), 0.16), {
  valley: false,
  hold: d(1, 0.6),
  en: 'Fold the right side behind the same way.',
  pt: 'Dobra o lado direito para trás da mesma forma.'
});
s.fold('head', d(0, HEAD), d(2, HEAD), {
  valley: false,
  hold: d(1, 0.6),
  en: 'Fold the top point behind to make the head.',
  pt: 'Dobra a ponta de cima para trás para fazer a cabeça.'
});
s.together(
  { en: 'Fold the head’s two top corners in a little.', pt: 'Dobra um pouco os dois cantos de cima da cabeça.' },
  () => {
    s.fold('eyeL', d(corner + EYE - 0.05, HEAD - 0.05), d(corner + EYE, HEAD), {
      valley: true,
      hold: d(1, 0.6),
      en: '',
      pt: ''
    });
    s.fold('eyeR', d(2 - corner - EYE, HEAD), d(2 - corner - EYE + 0.05, HEAD - 0.05), {
      valley: true,
      en: '',
      pt: ''
    });
  }
);

export default s.source({
  id: 'cicada',
  name: { en: 'Cicada', pt: 'Cigarra' },
  japaneseName: 'Semi',
  category: 'animals',
  difficulty: 'easy',
  tags: ['cicada', 'insect', 'animal', 'summer'],
  paperColor: '#6E7F4E'
});
