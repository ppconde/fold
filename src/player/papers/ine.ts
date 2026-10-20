import type { PaperPattern } from '.';

/**
 * Gold rice stalks scattered at every angle on cream (booklet p.51).
 * One stalk per cell of a jittered 6×6 grid, each turned and bent its own way: a row of thin grains down the middle
 * and a row each side, tilted toward the tip like an ear of rice. Stalks are longer than a cell, so they cross.
 */
export const ine: PaperPattern = {
  id: 'ine',
  ground: '#ebe7dc',
  ink: '#8f7646',
  glsl: /* glsl */ `
float ineGrain(vec2 q, float a, vec2 r) {
  q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
  return (length(q / r) - 1.0) * r.y;
}

vec3 paperColor(vec2 uv) {
  vec2 p = uv * 6.0;
  vec2 c = floor(p);
  float d = 1e3;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      vec2 cell = c + vec2(i, j);
      vec3 h = fract(sin(vec3(dot(cell, vec2(127.1, 311.7)), dot(cell, vec2(269.5, 183.3)), dot(cell, vec2(419.2, 371.9)))) * 43758.5);
      float a = h.x * 6.2832;
      vec2 q = mat2(cos(a), sin(a), -sin(a), cos(a)) * (p - cell - 0.5 - (h.yz - 0.5) * 0.5);
      q.y -= (h.y - 0.5) * 0.9 * q.x * q.x;
      if (abs(q.x) > 0.66 || abs(q.y) > 0.16) continue;
      // grains every 0.11 along the stalk, a little smaller toward the tip (+x)
      float n = clamp(floor(q.x / 0.11 + 0.5), -5.0, 5.0);
      float s = 1.0 - 0.04 * n;
      vec2 g = vec2(q.x - n * 0.11, abs(q.y) - 0.075 * s);
      d = min(d, ineGrain(g, 0.75, vec2(0.05, 0.022) * s));
      float m = clamp(floor(q.x / 0.11), -5.0, 4.0);
      d = min(d, ineGrain(vec2(q.x - (m + 0.5) * 0.11, q.y), 0.0, vec2(0.04, 0.011) * s));
    }
  }
  // clamped so the jump where a stalk's box ends is flat and fwidth stays small
  return mix(uGround, uInk, 1.0 - aastep(0.0, min(d, 0.015)));
}
`
};
