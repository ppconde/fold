import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import type { Vec2 } from '../../src/fold/types';
import { foldSequence, has, lacks } from '../sequence';

// a US letter sheet, 8.5 × 11 inches, standing tall: the nose at the top middle
const W = 8.5 / 11;
const M = W / 2;
// the nose folds: the top corners to the middle line, then the new slanted edges to it, the line from the nose
// bisecting the 45° the first folds left, down to the side at Y
const Y = 1 - M * (1 + Math.SQRT2);
// each wing: the slanted outer edge to the spine, its line from the nose bisecting the 22.5° the edge makes with it
const T = Math.tan(Math.PI / 16);
const body: Vec2 = [M - 0.02, 0.4];

const s = foldSequence([0, 180, 0], [W, 1]);
s.turn([0, 180, 0], {
  en: 'Turn the paper over, white side up, standing tall.',
  pt: 'Vira o papel com o lado branco para cima, ao alto.'
});
s.crease('middle', [M, 0], [M, 1], {
  valley: true,
  hold: [0.75 * W, 0.5],
  en: 'Fold the left half over to the right, then unfold, for a crease down the middle.',
  pt: 'Dobra a metade esquerda sobre a direita e desdobra, para fazer um vinco ao meio.'
});
s.together(
  { en: 'Fold both top corners to the middle line.', pt: 'Dobra os dois cantos de cima até à linha do meio.' },
  () => {
    s.fold('cornerL', [0, 1 - M], [M, 1], { valley: true, hold: [M, 0.3], en: '', pt: '' });
    s.fold('cornerR', [M, 1], [W, 1 - M], { valley: true, en: '', pt: '' });
  }
);
s.together(
  {
    en: 'Fold the new slanted edges to the middle line too.',
    pt: 'Dobra também as novas arestas inclinadas até à linha do meio.'
  },
  () => {
    s.fold('edgeL', [0, Y], [M, 1], { valley: true, hold: [M, 0.3], en: '', pt: '' });
    s.fold('edgeR', [M, 1], [W, Y], { valley: true, en: '', pt: '' });
  }
);
// the right half onto the left, so the nose folds end up inside
s.fold('half', [M, 1], [M, 0], {
  valley: true,
  tag: 'front',
  hold: [W / 4, 0.4],
  en: 'Fold the plane in half, the right half onto the left.',
  pt: 'Dobra o avião ao meio, a metade direita sobre a esquerda.'
});
s.fold('wingF', [M - T, 0], [M, 1], {
  valley: true,
  only: has('front'),
  hold: body,
  en: 'Fold the slanted left edge over to the right, along the bottom of the plane, for the first wing. Crease the nose sharp.',
  pt: 'Dobra a aresta inclinada da esquerda para a direita, até à base do avião, para fazer a primeira asa. Vinca bem o bico.'
});
s.fold('wingB', [M - T, 0], [M, 1], {
  valley: false,
  only: lacks('front'),
  hold: body,
  en: 'Fold the other wing behind to match the first.',
  pt: 'Dobra a outra asa para trás, da mesma forma.'
});
// the wings open out level with each other, tilted up 10° from flat across the body; the plane turns about its
// spine so the body hangs below it, then 30° to the side so both wings show, flying away from you
const D = MathUtils.DEG2RAD;
const flying = new Euler().setFromQuaternion(
  new Quaternion()
    .setFromAxisAngle(new Vector3(0, 0, 1), 30 * D)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -90 * D))
);
const open = (name: string) =>
  Object.fromEntries(Object.entries(s.angles(name)).map(([k, a]) => [k, Math.sign(a) * 80]));
s.set(
  { ...open('wingF'), ...open('wingB') },
  {
    en: 'Open the wings out, tilted up a little. Your plane is done: hold it under the body and throw it far!',
    pt: 'Abre as asas, um pouco inclinadas para cima. O teu avião está pronto: segura-o por baixo e atira-o para longe!'
  },
  [flying.x / D, flying.y / D, flying.z / D]
);

export default s.source({
  id: 'paper-plane',
  name: { en: 'Paper plane', pt: 'Avião de papel' },
  japaneseName: 'Kami hikōki',
  category: 'objects',
  difficulty: 'easy',
  tags: ['plane', 'dart', 'classic'],
  paperColor: '#2F6FA3'
});
