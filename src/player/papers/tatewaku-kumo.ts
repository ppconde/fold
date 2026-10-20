import type { PaperPattern } from '.';

/**
 * Gold clouds between wavy gold lines on red (booklet p.53). The lines sway in alternate directions, so each column
 * swells where both its neighbours pinch, and a cloud sits in every swell: round lobes about its edge, each
 * traced in red on its inner side, a curl in the front lobe and a point above and below.
 */
export const tatewakuKumo: PaperPattern = {
  id: 'tatewaku-kumo',
  ground: '#c94a42',
  ink: '#b8955f',
  glsl: /* glsl */ `
float tkCloud(vec2 q) {
  // q: from the cloud's centre, in column widths, the cloud a little taller than wide; returns 1 where the cloud is gold
  q *= vec2(1.15, 0.95);
  vec2 m = vec2(abs(q.x), q.y);
  // the points: a concave taper reaching y = ±1.32
  float ay = abs(q.y);
  float t = clamp((1.32 - ay) / 0.85, 0.0, 1.0);
  float gold = 1.0 - aastep(0.0, max(m.x - 0.26 * t * t, ay - 1.32));
  // big overlapping lobes laid back to front (x, y, radius; mirrored left and right), each traced in red where it
  // overlaps the gold behind it; the front one carries the curl instead
  vec3 lobes[6] = vec3[6](
    vec3(0.0, 0.48, 0.3), vec3(0.36, 0.3, 0.28), vec3(0.44, -0.08, 0.28),
    vec3(0.0, -0.5, 0.27), vec3(0.3, -0.4, 0.26), vec3(0.0, 0.0, 0.3)
  );
  for (int i = 0; i < 6; i++) {
    vec2 o = m - lobes[i].xy;
    float d = length(o) - lobes[i].z;
    float rim = (1.0 - aastep(0.02, abs(d))) * gold * step(float(i), 4.5);
    gold = max(gold, 1.0 - aastep(0.0, d)) * (1.0 - rim);
  }
  // the curl: a spiral of two turns in the front lobe
  vec2 c = q - vec2(0.0, 0.02);
  float r = length(c);
  float k = 0.12;
  float u = (r - k * atan(c.y, c.x) / 6.28318) / k + 0.5;
  float f = fract(u) - 0.5;
  // only the inner arms, so it ends on a stroke rather than cut off by a circle
  float curl = (1.0 - aastep(0.025, abs(f) * k)) * step(u, 2.6);
  return gold * (1.0 - curl);
}

vec3 paperColor(vec2 uv) {
  vec2 p = uv * 5.0;
  float L = 3.0;
  float s = sin(6.28318 * p.y / L);
  float A = 0.36;
  // the nearest line; odd lines sway right as even ones sway left
  float n = floor(p.x + 0.5);
  float line = abs(p.x - n - A * (mod(n, 2.0) * 2.0 - 1.0) * s);
  float ink = 1.0 - aastep(0.03, line);
  // the nearest even and odd column: even ones swell a quarter period up, odd ones a quarter down
  for (int i = 0; i < 2; i++) {
    float k = 2.0 * floor((p.x - 0.5 - float(i)) / 2.0 + 0.5) + float(i);
    float yc = (0.25 - 0.5 * float(i)) * L;
    vec2 q = vec2(p.x - k - 0.5, mod(p.y - yc + 0.5 * L, L) - 0.5 * L);
    ink = max(ink, tkCloud(q));
  }
  return mix(uGround, uInk, ink);
}
`
};
