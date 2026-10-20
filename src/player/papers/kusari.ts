import type { PaperPattern } from '.';

/**
 * Vertical bands of blue chain links between pairs of thin blue stripes, on cream (booklet p.41).
 * Each band is a column of rounded bars tilted the same way, alternating left and right, each one drawn over the one
 * above with a cream halo where they cross, and a second cream line inside each inner end where the hole is.
 */
export const kusari: PaperPattern = {
  id: 'kusari',
  ground: '#f2ecd6',
  ink: '#34548a',
  glsl: /* glsl */ `
vec3 paperColor(vec2 uv) {
  // one period across = a chain band (centred on x = 0) and the two stripes beside it
  vec2 p = vec2(fract(uv.x * 4.0) - 0.5, uv.y * 4.0);
  float ink = (1.0 - aastep(0.05, abs(p.x - 0.41))) + (1.0 - aastep(0.03, abs(p.x + 0.44)));
  // Links alternate left and right down the band, each lying over the one above it. Per side, keep the nearest link's
  // distance (so every edge field stays continuous for aastep) and the height of that link, to know which side is on top.
  const float STEP = 0.155;
  float k0 = floor(p.y / STEP);
  vec2 d = vec2(1e3); // left, right: distance to the link's edge
  vec2 h = vec2(1e3); // left, right: distance to the cream line around the link's hole
  vec2 y = vec2(0.0);
  for (int i = -2; i <= 2; i++) {
    float k = k0 + float(i);
    float side = mod(k, 2.0);
    vec2 q = p - vec2(side < 0.5 ? -0.1 : 0.1, (k + 0.5) * STEP);
    q = mat2(0.766, 0.643, -0.643, 0.766) * q; // into the link's frame, tilted 40° down to the right
    vec2 e = abs(q) - vec2(0.17, 0.06);
    float dk = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - 0.03;
    // the hole shows as a cream line just inside the link's end in the middle of the band, doubling the halo there
    float hk = max(abs(dk + 0.035), 0.06 - q.x * (side < 0.5 ? 1.0 : -1.0));
    if (side < 0.5) {
      if (dk < d.x) y.x = k;
      d.x = min(d.x, dk);
      h.x = min(h.x, hk);
    } else {
      if (dk < d.y) y.y = k;
      d.y = min(d.y, dk);
      h.y = min(h.y, hk);
    }
  }
  vec2 body = (1.0 - vec2(aastep(0.0, d.x), aastep(0.0, d.y))) * vec2(aastep(0.01, h.x), aastep(0.01, h.y));
  vec2 halo = 1.0 - vec2(aastep(0.022, d.x), aastep(0.022, d.y));
  // the lower link is on top
  if (y.y < y.x) ink = mix(mix(ink, body.x, halo.x), body.y, halo.y);
  else ink = mix(mix(ink, body.y, halo.y), body.x, halo.x);
  return mix(uGround, uInk, clamp(ink, 0.0, 1.0));
}
`
};
