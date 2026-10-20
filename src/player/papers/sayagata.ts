import type { PaperPattern } from '.';

/**
 * Interlocking manji key-fret in gold on brown-black, set on a diagonal (booklet p.23).
 * Manji with arms of 1 and hooks of 2 on the lattice (3,1),(-1,3) interlock with no gaps; each stroke is drawn as a
 * band outlined in gold. The square grid is turned 45° and squashed to half height, so the lines run at ±27°.
 */
export const sayagata: PaperPattern = {
  id: 'sayagata',
  ground: '#352d24',
  ink: '#cfb173',
  glsl: /* glsl */ `
vec3 paperColor(vec2 uv) {
  vec2 s = uv * 13.0;
  vec2 p = mat2(0.70711, -0.70711, 0.70711, 0.70711) * vec2(s.x, s.y * 2.0);
  vec2 c = floor(vec2(3.0 * p.x + p.y, 3.0 * p.y - p.x) / 10.0 + 0.5);
  float d = 1e3;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      vec2 m = c + vec2(i, j);
      vec2 q = p - vec2(3.0 * m.x - m.y, m.x + 3.0 * m.y);
      for (int k = 0; k < 4; k++) {
        // L∞ distance to the arm (0,0)-(1,0) and the hook (1,0)-(1,2), then turn a quarter for the next pair
        d = min(d, max(max(max(-q.x, q.x - 1.0), 0.0), abs(q.y)));
        d = min(d, max(abs(q.x - 1.0), max(max(-q.y, q.y - 2.0), 0.0)));
        q = vec2(q.y, -q.x);
      }
    }
  }
  return mix(uGround, uInk, 1.0 - aastep(0.05, abs(d - 0.25)));
}
`
};
