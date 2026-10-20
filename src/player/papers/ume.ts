import type { PaperPattern } from '.';

/**
 * Gold plum blossoms scattered on navy, with small buds between them (booklet p.17).
 * A jittered 5×5 grid: each cell holds one blossom or bud, its size, turn and kind picked from a hash of the cell.
 * A blossom is five round petals around a navy eye; most eyes hold a ring of gold dots and a gold stamen.
 */
export const ume: PaperPattern = {
  id: 'ume',
  ground: '#2c3b56',
  ink: '#e0b45c',
  glsl: /* glsl */ `
vec3 hash3(vec2 c) {
  return fract(sin(vec3(dot(c, vec2(127.1, 311.7)), dot(c, vec2(269.5, 183.3)), dot(c, vec2(419.2, 371.9)))) * 43758.5453);
}

vec3 paperColor(vec2 uv) {
  vec2 p = uv * 5.0;
  vec2 c = floor(p);
  // one signed distance to the nearest gold, so every edge is a single aastep (no seams at cell borders)
  float d = 1e3;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      vec2 cell = c + vec2(i, j);
      vec3 h = hash3(cell);
      vec2 q = p - cell - 0.5 - (h.xy - 0.5) * 0.6;
      float turn = h.z * 6.2832;
      q = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * q;
      float r = length(q);
      float a = atan(q.y, q.x);
      float kind = fract(h.z * 31.0);
      if (kind < 0.3) {
        // a bud: two overlapping rounds and a smaller one tucked beside them
        float b = min(length(q - vec2(0.085, 0.0)), length(q + vec2(0.085, 0.0))) - 0.095;
        d = min(d, min(b, length(q - vec2(0.0, 0.13)) - 0.06));
      } else {
        float R = mix(0.28, 0.46, fract(h.z * 7.0));
        // five round petals; the two nearest to this angle make the outline
        float k = floor(a / 1.2566);
        float petals = 1e3;
        float hole = 1e3;
        for (int n = 0; n <= 1; n++) {
          float pa = (k + float(n)) * 1.2566;
          vec2 pc = q - vec2(cos(pa), sin(pa)) * R * 0.55;
          petals = min(petals, length(pc) - R * 0.47);
          // some blossoms have a navy comma in each petal
          hole = min(hole, length(pc - vec2(cos(pa + 0.6), sin(pa + 0.6)) * R * 0.12) - R * 0.17);
        }
        float f = max(petals, R * 0.32 - r);
        if (kind > 0.8) f = max(f, -hole);
        // a gold stamen, and in most eyes a ring of eight gold dots
        float eye = r - R * 0.1;
        if (fract(h.z * 13.0) < 0.7) {
          float da = floor(a / 0.7854 + 0.5) * 0.7854;
          eye = min(eye, length(q - vec2(cos(da), sin(da)) * R * 0.21) - R * 0.05);
        }
        d = min(d, min(f, eye));
      }
    }
  }
  return mix(uGround, uInk, 1.0 - aastep(0.0, d));
}
`
};
