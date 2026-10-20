import type { PaperPattern } from '.';

/**
 * Pale keyhole dots on warm grey, sharkskin komon (booklet p.29).
 * Discs on a staggered grid (every other row shifted half a step), each with a round hole near the middle and a stem
 * of ground running down from it. The booklet's dots are about twice as fine; enlarged so they read on a phone.
 */
export const sameKomon: PaperPattern = {
  id: 'same-komon',
  ground: '#b4abab',
  ink: '#dfe1d4',
  glsl: /* glsl */ `
vec3 paperColor(vec2 uv) {
  vec2 p = uv * 16.0;
  // the nearest dot: on the square grid or on the one shifted by half a step both ways
  vec2 a = p - floor(p + 0.5);
  vec2 b = p - floor(p) - 0.5;
  vec2 q = (dot(a, a) < dot(b, b) ? a : b);
  float disc = length(q) - 0.32;
  float hole = length(q - vec2(0.0, -0.02)) - 0.1;
  vec2 s = abs(q - vec2(0.0, -0.2)) - vec2(0.045, 0.17);
  float stem = max(s.x, s.y);
  return mix(uGround, uInk, 1.0 - aastep(0.0, max(disc, -min(hole, stem))));
}
`
};
