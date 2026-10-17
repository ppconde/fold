import type { PaperPattern } from '.';

/**
 * Overlapping gold circles on vermilion, a four-point flower in each (booklet p.31).
 * Circles of radius 1/√2 on a 45° grid of spacing 1: neighbours overlap in lenses whose tips meet four at a time,
 * and the part of each circle no other one covers holds the flower.
 */
export const shippo: PaperPattern = {
  id: 'shippo',
  ground: '#d0553b',
  ink: '#c9a862',
  glsl: /* glsl */ `
vec3 paperColor(vec2 uv) {
  vec2 p = mat2(0.70711, 0.70711, -0.70711, 0.70711) * uv * 9.0;
  vec2 c = floor(p + 0.5);
  float rim = 1e3;
  float inner = 1e3;
  float inside = 0.0;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      float r = length(p - c - vec2(i, j));
      rim = min(rim, abs(r - 0.70711));
      inner = min(inner, abs(r - 0.62));
      inside += step(r, 0.70711);
    }
  }
  float ink = 1.0 - aastep(0.04, rim);
  // a thinner line inside each lens, following its edge
  ink = max(ink, (1.0 - aastep(0.016, inner)) * step(1.5, inside));
  // the flower: four long petals toward the lens tips (the page's edges), four short ones between
  vec2 q = p - c;
  float a = atan(q.y, q.x);
  float petal = 0.05 + 0.3 * pow(abs(sin(2.0 * a)), 10.0) + 0.1 * pow(abs(cos(2.0 * a)), 10.0);
  ink = max(ink, (1.0 - aastep(petal, length(q))) * step(inside, 1.5));
  return mix(uGround, uInk, ink);
}
`
};
