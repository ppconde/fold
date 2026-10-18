import type { PaperPattern } from '.';

/**
 * Gold hemp-leaf stars on vermilion, a brighter gold sparkle on a few of them (booklet p.57).
 * A grid of equilateral triangles, 9 across: every edge, plus a line from each triangle's centre to its three corners.
 * Lines stop short of the corners, so each star keeps a small vermilion heart.
 */
export const asanoha: PaperPattern = {
  id: 'asanoha',
  ground: '#dc5a44',
  ink: '#cfa05a',
  glsl: /* glsl */ `
float asanohaSeg(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  return length(p - a - ab * clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0));
}

vec3 paperColor(vec2 uv) {
  vec2 p = uv * 9.0;
  // skewed coordinates: the lattice basis is (1, 0) and (1/2, √3/2)
  vec2 s = vec2(p.x - p.y * 0.57735, p.y * 1.1547);
  vec2 cell = floor(s);
  vec2 f = s - cell;
  bool up = f.x + f.y < 1.0;
  vec2 o = cell + (up ? vec2(0.0) : vec2(1.0));
  vec2 g = up ? f : 1.0 - f;
  // distance to the triangle's edges, in sheet units of the lattice
  float d = min(min(g.x, g.y), 1.0 - g.x - g.y) * 0.86603;
  // its corners, back in plain coordinates
  vec2 k = up ? vec2(1.0, 0.0) : vec2(-1.0, 0.0);
  vec2 v0 = vec2(o.x + o.y * 0.5, o.y * 0.86603);
  vec2 v1 = v0 + k;
  vec2 v2 = v0 + (up ? vec2(0.5, 0.86603) : vec2(-0.5, -0.86603));
  vec2 c = (v0 + v1 + v2) / 3.0;
  d = min(d, min(asanohaSeg(p, c, v0), min(asanohaSeg(p, c, v1), asanohaSeg(p, c, v2))));
  vec2 q0 = p - v0, q1 = p - v1, q2 = p - v2;
  float r0 = dot(q0, q0), r1 = dot(q1, q1), r2 = dot(q2, q2);
  vec2 star = r0 < r1 && r0 < r2 ? v0 : (r1 < r2 ? v1 : v2);
  vec2 q = p - star;
  float ink = (1.0 - aastep(0.025, d)) * aastep(0.09, length(q));
  // about one star in eleven gets a small bright cross over its heart
  vec2 id = floor(star * vec2(2.0, 1.1547) + 0.5);
  float lucky = step(0.91, fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453));
  vec2 a = abs(q);
  float plus = min(max(a.x - 0.04, a.y - 0.15), max(a.y - 0.04, a.x - 0.15));
  float spark = lucky * (1.0 - aastep(0.0, plus));
  vec3 col = mix(uGround, uInk, ink);
  return mix(col, min(uInk * 1.6, vec3(1.0)), spark);
}
`
};
