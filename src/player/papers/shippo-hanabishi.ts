import type { PaperPattern } from '.';

/**
 * Small silver crosses of pointed petals on slate purple (booklet p.47): Shippō's lenses alone, shrunk so their tips
 * don't touch. On a 45° grid of spacing 1, a petal sits on every edge midpoint, long axis across the edge; each petal
 * is the overlap of two discs. Coarser than the page so it doesn't shimmer on a phone.
 */
export const shippoHanabishi: PaperPattern = {
  id: 'shippo-hanabishi',
  ground: '#615c78',
  ink: '#d4d6cc',
  glsl: /* glsl */ `
// signed distance to a petal of half-length 0.34 and half-width 0.095, long axis along y:
// discs of radius R = (L² + W²) / 2W, centred R - W either side
float petalDist(vec2 q) {
  const float R = 0.656;
  const float D = 0.561;
  return max(length(q - vec2(D, 0.0)), length(q + vec2(D, 0.0))) - R;
}

vec3 paperColor(vec2 uv) {
  vec2 p = mat2(0.70711, 0.70711, -0.70711, 0.70711) * uv * 14.0;
  float a = petalDist(p - vec2(floor(p.x) + 0.5, floor(p.y + 0.5)));
  float b = petalDist((p - vec2(floor(p.x + 0.5), floor(p.y) + 0.5)).yx);
  return mix(uGround, uInk, 1.0 - aastep(0.0, min(a, b)));
}
`
};
