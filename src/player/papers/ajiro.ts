import type { PaperPattern } from '.';

/**
 * Short white S-shaped strokes woven on charcoal, like split bamboo in a basket (booklet p.43).
 * On a 45° grid, even points hold a stroke along one diagonal and odd points one along the other; each stroke spans
 * two cells, so its ends stop just short of the middle of a crossing stroke and the strokes read as over and under.
 */
export const ajiro: PaperPattern = {
  id: 'ajiro',
  ground: '#4a4a4f',
  ink: '#f3f1ea',
  glsl: /* glsl */ `
vec3 paperColor(vec2 uv) {
  vec2 p = mat2(0.70711, 0.70711, -0.70711, 0.70711) * uv * 14.0;
  vec2 c = floor(p + 0.5);
  // distance to the nearest stroke, so one aastep covers every edge without seams between cells
  float d = 1e3;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      vec2 k = c + vec2(i, j);
      vec2 q = p - k;
      // even points run along x, odd ones mirrored to run along y, so both families bend the same way
      if (mod(k.x + k.y, 2.0) > 0.5) q = q.yx;
      float across = abs(q.y - 0.1 * sin(3.1416 * q.x / 0.78));
      d = min(d, max(across - 0.08, abs(q.x) - 0.78));
    }
  }
  float ink = 1.0 - aastep(0.0, d);
  return mix(uGround, uInk, ink);
}
`
};
