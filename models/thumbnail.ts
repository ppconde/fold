import { foldedPositions } from '../src/fold/fold';
import type { Model } from '../src/fold/types';

const BACK = '#F3EDE2';
const INK = '#33302C';
const SIZE = 240;

/** The last step that ends with the paper lying flat: from above, a model stood up or opened out is a sliver. */
export function flatStep(model: Model): number {
  for (let k = model.steps.length - 1; k > 0; k--) {
    const zs = foldedPositions(model, k, 1).flatMap((face) => face.map((p) => p[2]));
    if (Math.max(...zs) - Math.min(...zs) < 0.1) return k;
  }
  return 0;
}

/**
 * The paper at the end of `step` (by default the last flat one) seen from above, as a small SVG. Faces are
 * painted far to near by mean height, which follows the stack because every layer is lifted by its place in it.
 */
export function thumbnail(model: Model, step = flatStep(model)): string {
  const faces = foldedPositions(model, step, 1);
  const xs = faces.flat().map((p) => p[0]);
  const ys = faces.flat().map((p) => -p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(x1 - x0, y1 - y0);
  const pad = span * 0.08;
  const n = (v: number) => +v.toFixed(2);
  // the paper centred in a square, in pixel units
  const k = SIZE / (span + 2 * pad);
  const [ox, oy] = [(x0 + x1 - span) / 2 - pad, (y0 + y1 - span) / 2 - pad];
  const polygons = faces
    .map((face) => ({ face, z: face.reduce((s, p) => s + p[2], 0) / face.length }))
    .sort((a, b) => a.z - b.z)
    .map(({ face }) => {
      // counter-clockwise seen from above means the front (coloured) side faces up
      const turn = face.reduce(
        (s, p, i) => s + p[0] * face[(i + 1) % face.length][1] - face[(i + 1) % face.length][0] * p[1],
        0
      );
      return `<polygon points="${face.map((p) => `${n((p[0] - ox) * k)},${n((-p[1] - oy) * k)}`).join(' ')}" fill="${turn > 0 ? model.paperColor : BACK}"/>`;
    })
    .join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">`,
    // no SVG filter (the washi grain was one): Safari draws a filtered SVG image at 1×, blurry on Retina screens
    `<g stroke="${INK}" stroke-width="${n((span / 220) * k)}" stroke-linejoin="round">${polygons}</g>`,
    '</svg>\n'
  ].join('');
}
