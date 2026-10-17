/** Which of the three "how" sketches goes with eased progress `s`: open, push in, flatten, in thirds up to the landing. */
export const sketchFrame = (s: number, landing: number): 0 | 1 | 2 =>
  s < landing / 3 ? 0 : s < (2 * landing) / 3 ? 1 : 2;
