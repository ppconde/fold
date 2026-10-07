import { foldedPositions } from '../src/fold/fold';
import type { Model } from '../src/fold/types';

const BACK = '#F3EDE2';
const INK = '#33302C';

/**
 * The paper at the end of `step` seen from above, as a small washi-grain SVG.
 * ponytail: faces are painted far-to-near by mean height, which can misorder stacked flaps; use the
 * layer order from the layer-order milestone once it exists.
 */
export function thumbnail(model: Model, step = model.steps.length - 1): string {
  const faces = foldedPositions(model, step, 1);
  const xs = faces.flat().map((p) => p[0]);
  const ys = faces.flat().map((p) => -p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(x1 - x0, y1 - y0);
  const pad = span * 0.08;
  const n = (v: number) => +v.toFixed(4);
  // square view box, the paper centred in it
  const box = [(x0 + x1 - span) / 2 - pad, (y0 + y1 - span) / 2 - pad, span + 2 * pad, span + 2 * pad].map(n).join(' ');
  const polygons = faces
    .map((face) => ({ face, z: face.reduce((s, p) => s + p[2], 0) / face.length }))
    .sort((a, b) => a.z - b.z)
    .map(({ face }) => {
      // counter-clockwise seen from above means the front (coloured) side faces up
      const turn = face.reduce(
        (s, p, i) => s + p[0] * face[(i + 1) % face.length][1] - face[(i + 1) % face.length][0] * p[1],
        0
      );
      return `<polygon points="${face.map((p) => `${n(p[0])},${n(-p[1])}`).join(' ')}" fill="${turn > 0 ? model.paperColor : BACK}"/>`;
    })
    .join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="240" height="240">`,
    '<filter id="washi"><feTurbulence type="fractalNoise" baseFrequency="6" numOctaves="2" seed="4"/>',
    '<feColorMatrix values="0 0 0 0 0.2 0 0 0 0 0.19 0 0 0 0 0.17 0 0 0 0.09 0"/>',
    '<feComposite in2="SourceGraphic" operator="in"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode/></feMerge></filter>',
    `<g filter="url(#washi)" stroke="${INK}" stroke-width="${n(span / 220)}" stroke-linejoin="round">${polygons}</g>`,
    '</svg>\n'
  ].join('');
}
