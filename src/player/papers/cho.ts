import type { PaperPattern } from '.';

/**
 * Small pale-gold butterflies scattered densely on green (booklet p.61), the page-edge lettering left out.
 * One butterfly per cell of an 11×11 grid, nudged, sized and turned at random so the grid doesn't show; the
 * 3×3 cells around the pixel are drawn since a butterfly may reach into its neighbours. Each is a thin body and
 * two wings (a long tapered one above, a small one below) mirrored about it, with a gap between, as on the page.
 */
export const cho: PaperPattern = {
  id: 'cho',
  ground: '#3f8a68',
  ink: '#dcb487',
  glsl: /* glsl */ `
float choHash(vec2 c, float k) {
  return fract(sin(dot(c, vec2(127.1, 311.7)) + k) * 43758.5453);
}
// roughly the distance to an ellipse of radii r centred at o, turned by a, narrowing by t toward its +x end
float choWing(vec2 p, vec2 o, vec2 r, float a, float t) {
  p = mat2(cos(a), -sin(a), sin(a), cos(a)) * (p - o);
  r.y *= 1.0 - t * clamp(p.x / r.x, -1.0, 1.0);
  return (length(p / r) - 1.0) * min(r.x, r.y);
}
vec3 paperColor(vec2 uv) {
  vec2 p = uv * 11.0;
  vec2 c0 = floor(p);
  float d = 1e3;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      vec2 c = c0 + vec2(i, j);
      vec2 q = p - c - 0.5 - (vec2(choHash(c, 1.0), choHash(c, 2.0)) - 0.5) * 0.5;
      float a = choHash(c, 3.0) * 6.2832;
      float s = 1.0 + 0.35 * choHash(c, 4.0);
      q = mat2(cos(a), sin(a), -sin(a), cos(a)) * q / s;
      q.x = abs(q.x);
      float b = choWing(q, vec2(0.0), vec2(0.022, 0.12), 0.0, 0.0);
      b = min(b, choWing(q, vec2(0.22, 0.13), vec2(0.19, 0.095), 0.5, 0.45));
      b = min(b, choWing(q, vec2(0.13, -0.1), vec2(0.095, 0.058), -0.6, 0.0));
      d = min(d, b * s);
    }
  }
  // clamped so the jump where the nearest butterfly changes, far from any wing, doesn't blur into a seam
  return mix(uGround, uInk, 1.0 - aastep(0.0, min(d, 0.03)));
}
`
};
