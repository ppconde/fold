import type { PaperPattern } from '.';

/**
 * Flowing water in white on charcoal (booklet p.55). Each swirl is an S of three parallel strokes: a lane runs in,
 * U-turns down, runs back, U-turns again and runs out, its two free ends thinning to a point. Swirls sit in staggered
 * rows, each nudged and some mirrored, so the stream doesn't read as a grid.
 */
export const ryusui: PaperPattern = {
  id: 'ryusui',
  ground: '#2b2c31',
  ink: '#e4e1da',
  glsl: /* glsl */ `
// distance to the nearest of three strokes 0.1 apart, centred on a centreline d away
float ryusuiBands(float d) {
  return min(d, abs(d - 0.1));
}

// how wide a tail is t from its free end: a point, then a thin line, swelling to full width where it joins the swirl
float ryusuiTail(float t, float a) {
  return max(min(t / (0.12 * a), 0.35 + 0.65 * clamp((t - 0.4 * a) / (0.4 * a), 0.0, 1.0)), 0.01);
}

// one swirl at the origin: lanes at y = 0.4, 0, -0.4 joined by U-turns of radius 0.2, the middle lane m long on each
// side, the tails a and b long
float ryusuiSwirl(vec2 p, float m, float a, float b) {
  float d = 1e3;
  // the two U-turns, each only past its lane ends
  if (p.x > m) d = min(d, ryusuiBands(abs(length(p - vec2(m, 0.2)) - 0.2)));
  if (p.x < -m) d = min(d, ryusuiBands(abs(length(p - vec2(-m, -0.2)) - 0.2)));
  if (abs(p.x) <= m) d = min(d, ryusuiBands(abs(p.y)));
  if (p.x <= m && p.x > m - a) d = min(d, ryusuiBands(abs(p.y - 0.4)) / ryusuiTail(p.x - m + a, a));
  if (p.x >= -m && p.x < b - m) d = min(d, ryusuiBands(abs(p.y + 0.4)) / ryusuiTail(b - m - p.x, b));
  return d;
}

vec3 paperColor(vec2 uv) {
  // rows 1.1 apart, just clear of each other; each swirl 2 wide plus tails
  vec2 q = uv * 9.0;
  float row = floor(q.y / 1.1);
  float d = 1e3;
  for (int j = -1; j <= 1; j++) {
    float r = row + float(j);
    float x = q.x + fract(r * 0.618) * 2.0;
    float cell = floor(x / 2.0);
    for (int i = -1; i <= 1; i++) {
      float c = cell + float(i);
      vec3 h = fract(sin(vec3(c * 12.9898 + r * 78.233, c * 39.346 + r * 11.135, c * 73.156 + r * 52.235)) * 43758.5453);
      vec2 l = vec2(x - (c + 0.5) * 2.0 - (h.x - 0.5) * 0.4, q.y - (r + 0.5) * 1.1);
      if (h.z > 0.5) l.x = -l.x;
      d = min(d, ryusuiSwirl(l, 0.05 + 0.3 * h.y, 0.7 + 0.8 * h.z, 0.7 + 0.8 * h.x));
    }
  }
  return mix(uGround, uInk, 1.0 - aastep(0.026, d));
}
`
};
