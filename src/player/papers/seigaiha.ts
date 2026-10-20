import type { PaperPattern } from '.';

/**
 * Overlapping wave scales drawn in silver dots on saffron (booklet p.35).
 * Rows of half-discs of radius 0.5, spacing 1, each row a quarter up and half across from the last; a lower row lies
 * over the one above it. Each scale holds three rings of dots, closer along a ring than between rings so the arcs read.
 */
export const seigaiha: PaperPattern = {
  id: 'seigaiha',
  ground: '#e3a83c',
  ink: '#bdbcc6',
  glsl: /* glsl */ `
float seigaihaDots(vec2 q, vec2 cell) {
  float r = length(q);
  float ring = clamp(floor((r - 0.19) / 0.12 + 0.5), 0.0, 2.0);
  float rr = 0.19 + 0.12 * ring;
  float n = floor(3.14159 * rr / 0.085 + 0.5);
  float a = atan(q.y, q.x);
  float k = clamp(floor(a / 3.14159 * n), 0.0, n - 1.0);
  float ca = (k + 0.5) * 3.14159 / n;
  // hand-printed: each dot a slightly different size
  float size = 0.018 + 0.01 * fract(sin(dot(cell + vec2(ring, k), vec2(12.9898, 78.233))) * 43758.5453);
  return 1.0 - aastep(size, length(q - rr * vec2(cos(ca), sin(ca))));
}

vec3 paperColor(vec2 uv) {
  vec2 p = uv * 5.0;
  float row = floor(p.y / 0.25);
  float ink = 0.0;
  // back row first, then the row in front of it covers it
  for (int i = 0; i <= 1; i++) {
    float j = row - float(i);
    float shift = 0.5 * mod(j, 2.0);
    vec2 c = vec2(floor(p.x - shift + 0.5) + shift, j * 0.25);
    vec2 q = p - c;
    float cover = 1.0 - aastep(0.5, length(q));
    ink = mix(ink, seigaihaDots(q, vec2(c.x, j)), cover);
  }
  return mix(uGround, uInk, ink);
}
`
};
