import type { PaperPattern } from '.';

/**
 * White four-petal flowers in a dense diagonal lattice on navy (booklet p.33).
 * Flower centres sit on a 45° grid; folding the cell by its symmetry leaves one petal to draw, a rounded lozenge
 * with its shoulders toward the tip, split at its inner end by a dark slit toward the flower's centre.
 */
export const hanabishi: PaperPattern = {
  id: 'hanabishi',
  ground: '#2f3a52',
  ink: '#efede1',
  glsl: /* glsl */ `
vec3 paperColor(vec2 uv) {
  vec2 p = uv * 16.0;
  vec2 c = floor(vec2(p.x + p.y, p.x - p.y) * 0.5 + 0.5);
  vec2 d = abs(p - vec2(c.x + c.y, c.x - c.y));
  float a = max(d.x, d.y) - 0.44;
  float b = min(d.x, d.y);
  vec2 e = vec2(a / 0.31, b / (0.27 + 0.08 * a / 0.31));
  // between a circle and a diamond: rounded shoulders, a soft point at the outer tip
  float r = mix(length(e), abs(e.x) + abs(e.y), 0.3);
  float ink = 1.0 - aastep(1.0, r);
  ink *= max(aastep(0.045, b), aastep(-0.08, a));
  return mix(uGround, uInk, ink);
}
`
};
