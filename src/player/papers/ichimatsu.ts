import type { PaperPattern } from '.';

/** Red and black checkerboard, 16 squares across the sheet (booklet p.45). */
export const ichimatsu: PaperPattern = {
  id: 'ichimatsu',
  ground: '#b73a30',
  ink: '#221d1d',
  glsl: /* glsl */ `
vec3 paperColor(vec2 uv) {
  // a triangle wave per axis, so both square edges are anti-aliased
  vec2 tri = abs(fract(uv * 8.0) - 0.5) * 2.0;
  float a = aastep(0.5, tri.x);
  float b = aastep(0.5, tri.y);
  return mix(uGround, uInk, a + b - 2.0 * a * b);
}
`
};
