import type { PaperPattern } from '.';

/**
 * Uneven vertical stripes, gold-olive on peach, drawn by hand (booklet p.59).
 * One stripe per column of the sheet; each gets its own width and slow sideways drift, and each edge its own
 * ragged value noise, so no two stripes or edges match.
 */
export const stripes: PaperPattern = {
  id: 'stripes',
  ground: '#e8c5ad',
  ink: '#9a8350',
  glsl: /* glsl */ `
float stripesHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// smooth 1D value noise along y, a separate stream per (column, seed)
float stripesNoise(float col, float seed, float y) {
  float i = floor(y);
  float f = fract(y);
  f = f * f * (3.0 - 2.0 * f);
  return mix(stripesHash(vec2(col, seed + i)), stripesHash(vec2(col, seed + i + 1.0)), f) - 0.5;
}

vec3 paperColor(vec2 uv) {
  float x = uv.x * 30.0;
  float col = floor(x);
  float y = uv.y * 30.0;
  // the stripe's centre wanders slowly; its half-width varies per stripe and along it
  float centre = col + 0.5 + 0.12 * (stripesHash(vec2(col, 7.0)) - 0.5) + 0.12 * stripesNoise(col, 100.0, y * 0.35);
  float hw = 0.26 + 0.05 * stripesHash(vec2(col, 13.0)) + 0.06 * stripesNoise(col, 200.0, y * 0.6);
  // each edge is ragged on its own, like a brush dragged down the page
  float left = centre - hw + 0.05 * stripesNoise(col, 300.0, y * 2.5);
  float right = centre + hw + 0.05 * stripesNoise(col, 400.0, y * 2.5);
  float ink = aastep(left, x) * (1.0 - aastep(right, x));
  return mix(uGround, uInk, ink);
}
`
};
