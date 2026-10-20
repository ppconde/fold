import type { PaperPattern } from '.';

/**
 * Navy cords on cream, outlines that swell into beads and pinch to a short neck between them (booklet p.63).
 * Cords are 1 unit apart. Each cord is a smooth union of a thin neck and a column of ellipses, one per bead, each with its
 * own hashed size; the ink is the outline of that shape. Each cord starts at its own phase.
 */
export const wavyCords: PaperPattern = {
  id: 'wavy-cords',
  ground: '#e4e2d6',
  ink: '#2c3557',
  glsl: /* glsl */ `
float wavyHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 paperColor(vec2 uv) {
  vec2 p = uv * 13.0;
  float col = floor(p.x);
  float x = fract(p.x) - 0.5;
  float y = p.y * 1.25 + wavyHash(vec2(col, -1.0)) * 7.0;
  float bead = floor(y);
  float d = abs(x) - 0.05; // the neck
  for (int i = -1; i <= 1; i++) {
    float b = bead + float(i);
    vec2 r = vec2(0.17 + 0.1 * wavyHash(vec2(col, b)), 0.0);
    r.y = min(r.x * 1.7, 0.46);
    // ellipse distance (approximate), then a smooth union so beads flow into the neck
    vec2 q = vec2(x, (y - b - 0.5) / 1.25);
    r.y /= 1.25;
    float k = length(q / r);
    float e = k * (k - 1.0) / length(q / (r * r));
    float h = clamp(0.5 + 0.5 * (e - d) / 0.06, 0.0, 1.0);
    d = mix(e, d, h) - 0.06 * h * (1.0 - h);
  }
  return mix(uGround, uInk, 1.0 - aastep(0.024, abs(d)));
}
`
};
