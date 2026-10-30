/** Which of the three "how" sketches goes with eased progress `s`: open, push in, flatten, in thirds up to the landing. */
export const sketchFrame = (s: number, landing: number): 0 | 1 | 2 =>
  s < landing / 3 ? 0 : s < (2 * landing) / 3 ? 1 : 2;

/** Un-eased progress that shows `frame`: a little open, midway in, landed; the inverse of fold.ts's smoothstep. */
export const sketchT = (frame: 0 | 1 | 2, landing: number) =>
  0.5 - Math.sin(Math.asin(1 - 2 * [landing / 6, landing / 2, landing][frame]) / 3);
