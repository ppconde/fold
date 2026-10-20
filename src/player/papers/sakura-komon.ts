import type { PaperPattern } from '.';

/**
 * Small gold cherry blossoms scattered on cream (booklet p.25). A staggered grid of 7 per row, each blossom nudged
 * and turned by a per-cell hash: five notched petals, cut apart by thin gaps, around a pale ring and a gold dot.
 */
export const sakuraKomon: PaperPattern = {
  id: 'sakura-komon',
  ground: '#ebe6dc',
  ink: '#a08442',
  glsl: /* glsl */ `
vec3 paperColor(vec2 uv) {
  vec2 p = uv * 7.0;
  p.x += 0.5 * mod(floor(p.y), 2.0);
  vec2 cell = floor(p);
  vec2 h = fract(sin(vec2(dot(cell, vec2(127.1, 311.7)), dot(cell, vec2(269.5, 183.3)))) * 43758.5453);
  // jitter stays small enough that each blossom fits its own cell, so no neighbour loop
  vec2 q = p - cell - 0.5 - (h - 0.5) * 0.3;
  float r = length(q);
  // into the nearest petal's frame, petal along +x
  float a = atan(q.y, q.x) + h.x * 6.2832;
  float k = a - 1.2566 * floor(a / 1.2566 + 0.5);
  vec2 f = r * vec2(cos(k), sin(k));
  float ink = 1.0 - aastep(0.1, length(f - vec2(0.15, 0.0)));
  ink *= aastep(0.045, length(f - vec2(0.265, 0.0)));  // the notch at the tip
  ink *= aastep(0.01, r * sin(0.6283 - abs(k)));      // the gap between petals
  ink *= aastep(0.055, r);
  float ring = 1.0 - aastep(0.055, r);
  float eye = 1.0 - aastep(0.022, r);
  vec3 col = mix(uGround, uInk, ink);
  col = mix(col, mix(uGround, vec3(1.0), 0.5), ring);
  return mix(col, uInk, eye);
}
`
};
