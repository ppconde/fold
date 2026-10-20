import type { PaperPattern } from '.';

/**
 * Small white rings on charcoal in a square grid, each with a dark pinhole just off centre where the tie was (booklet
 * p.37). The page has about 40 across; 22 here, so the rings still read on a folded model on a phone.
 */
export const mameShibori: PaperPattern = {
  id: 'mame-shibori',
  ground: '#2e2c29',
  ink: '#e6ecec',
  glsl: /* glsl */ `
vec3 paperColor(vec2 uv) {
  vec2 q = fract(uv * 22.0) - 0.5;
  float disc = 1.0 - aastep(0.3, length(q));
  float hole = 1.0 - aastep(0.1, length(q - vec2(-0.05, 0.04)));
  return mix(uGround, uInk, disc * (1.0 - hole));
}
`
};
