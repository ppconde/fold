import type { Vec2 } from '../../src/fold/types';
import { blintzBase } from './bases';

const s = blintzBase();

/** Fold four corners to the middle as one step, each over the line p→q (the corner to its left). */
const blintz = (name: string, lines: [Vec2, Vec2][], text: { en: string; pt: string }) =>
  s.together(text, () => {
    for (const [p, q] of lines) s.fold(name, p, q, { valley: true, en: '', pt: '' });
  });
/** The same, one corner per step: all four at once, their layers pass through each other. */
const corners = (name: string, lines: [Vec2, Vec2][], text: { en: string; pt: string }[]) => {
  for (const [i, [p, q]] of lines.entries()) s.fold(name, p, q, { valley: true, ...text[i] });
};

s.turn([0, 0, 0], { en: 'Turn the paper over.', pt: 'Vira o papel.' });
blintz(
  'second',
  [
    [
      [0.75, 0.25],
      [0.25, 0.25]
    ],
    [
      [0.75, 0.75],
      [0.75, 0.25]
    ],
    [
      [0.25, 0.75],
      [0.75, 0.75]
    ],
    [
      [0.25, 0.25],
      [0.25, 0.75]
    ]
  ],
  { en: 'Fold the four corners to the middle again.', pt: 'Dobra outra vez os quatro cantos até ao meio.' }
);
s.turn([0, 180, 0], { en: 'Turn the paper over.', pt: 'Vira o papel.' });
corners(
  'third',
  [
    [
      [0.75, 0.5],
      [0.5, 0.25]
    ],
    [
      [0.5, 0.75],
      [0.75, 0.5]
    ],
    [
      [0.25, 0.5],
      [0.5, 0.75]
    ],
    [
      [0.5, 0.25],
      [0.25, 0.5]
    ]
  ],
  [
    {
      en: 'Fold the bottom right corner to the middle a third time.',
      pt: 'Dobra o canto de baixo à direita até ao meio uma terceira vez.'
    },
    { en: 'Fold the top right corner to the middle.', pt: 'Dobra o canto de cima à direita até ao meio.' },
    { en: 'Fold the top left corner to the middle.', pt: 'Dobra o canto de cima à esquerda até ao meio.' },
    { en: 'Fold the bottom left corner to the middle.', pt: 'Dobra o canto de baixo à esquerda até ao meio.' }
  ]
);
s.turn([0, 0, 0], { en: 'Turn the paper over.', pt: 'Vira o papel.' });

// the squash, found by searching the flat-folded states: only the paper along one edge of the sheet moves. The two
// single front layers open off the small square under them and swing out into the rectangle's outer corners, and the
// square's half by the edge folds out along the line through its side corners to make the rectangle's middle. Written
// for the bottom square; the side ones are the same turned a quarter (the triple blintz looks the same each way).
const creases = s.source({} as never).creases;
/** A point a quarter turn clockwise about the middle, `k` times. */
const turn = (k: number, [x, y]: Vec2): Vec2 => (k ? turn(k - 1, [y, 1 - x]) : [x, y]);
const near = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9;
/** The crease from a to b, split off a longer one that starts at a. */
const segment = (a: Vec2, b: Vec2) => {
  const k = Object.keys(creases).find((n) => {
    const c = creases[n];
    const [from, to] = near(c.from, a) ? [c.from, c.to] : [c.to, c.from];
    const along = (to[0] - from[0]) * (b[1] - from[1]) - (to[1] - from[1]) * (b[0] - from[0]);
    return (
      near(from, a) && Math.abs(along) < 1e-9 && (b[0] - a[0]) * (to[0] - b[0]) + (b[1] - a[1]) * (to[1] - b[1]) > -1e-9
    );
  });
  if (!k) throw new Error(`No crease runs from ${a} to ${b}.`);
  const c = creases[k];
  if (!near(c.from, b) && !near(c.to, b)) s.split(k, b);
  return Object.keys(creases).find((n) =>
    [creases[n].from, creases[n].to].every((v) => near(v, a) || near(v, b))
  ) as string;
};
const squash = (k: number, text: { en: string; pt: string }) => {
  const P = (x: number, y: number) => turn(k, [x, y]);
  const back = (v: Vec2) => turn(4 - k, v);
  // the creases joining the front layers to the square and to the layers behind open flat
  const open = [
    segment(P(0.5, 0), P(0.375, 0.125)),
    segment(P(0.5, 0), P(0.625, 0.125)),
    segment(P(0.25, 0), P(0.375, 0.125)),
    segment(P(0.75, 0), P(0.625, 0.125))
  ];
  const before = new Set(Object.keys(creases));
  s.mark('squash', P(0.75, 0.375), P(0.25, 0.375), {
    valley: false,
    only: (_, at) => {
      const [x, y] = back(at);
      return y < 0.2 && Math.abs(x - 0.5) < 0.2;
    },
    en: '',
    pt: ''
  });
  const lines = Object.keys(creases).filter((n) => !before.has(n));
  // the square's strip runs along the edge and folds out toward you; each front layer folds in half the other way,
  // the half joined behind underneath
  const along = (n: string) => Math.abs(back(creases[n].from)[1] - back(creases[n].to)[1]) < 1e-9;
  s.collapse(
    {
      ...Object.fromEntries(open.map((n) => [n, 0])),
      ...Object.fromEntries(lines.map((n) => [n, (creases[n].assignment === 'V' ? -180 : 180) * (along(n) ? 1 : -1)]))
    },
    { hold: [0.53, 0.65], ...text }
  );
};
squash(0, {
  en: 'Open the bottom pocket and squash it flat into a rectangle.',
  pt: 'Abre a bolsa de baixo e espalma-a num retângulo.'
});
squash(1, {
  en: 'Squash the left pocket into a rectangle the same way.',
  pt: 'Espalma a bolsa da esquerda num retângulo da mesma forma.'
});
squash(3, {
  en: 'Squash the right pocket the same way. Your yakko-san is done.',
  pt: 'Espalma a bolsa da direita da mesma forma. O teu yakko-san está pronto.'
});

export default s.source({
  id: 'yakko-san',
  name: { en: 'Yakko-san', pt: 'Yakko-san' },
  japaneseName: 'Yakko-san',
  category: 'figures',
  difficulty: 'easy',
  tags: ['servant', 'figure', 'person', 'kimono'],
  paperColor: '#2F4F7F',
  solve: true
});
