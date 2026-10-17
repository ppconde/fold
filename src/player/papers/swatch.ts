import { Color, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, WebGLRenderer } from 'three';
import { PAPER_GLSL_HEAD } from '../paper-material';
import type { PaperPattern } from '.';

const SIZE = 96;
/** A quarter of the sheet: the pattern at a scale a 44px swatch can show. */
const CROP = 0.25;

const cache = new Map<string, string>();
let renderer: WebGLRenderer | undefined;

/** The paper as a small image, drawn once by the same shader as the sheet and kept for the visit. */
export function swatchUrl(p: PaperPattern): string {
  const hit = cache.get(p.id);
  if (hit) return hit;
  renderer ??= new WebGLRenderer({ canvas: document.createElement('canvas'), preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE, false);
  const material = new ShaderMaterial({
    uniforms: { uGround: { value: new Color(p.ground) }, uInk: { value: new Color(p.ink) } },
    vertexShader: /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}`,
    fragmentShader: /* glsl */ `
varying vec2 vUv;
${PAPER_GLSL_HEAD}
${p.glsl}
void main() {
  gl_FragColor = vec4(paperColor(vUv * ${CROP.toFixed(2)}), 1.0);
  #include <colorspace_fragment>
}`
  });
  const geometry = new PlaneGeometry(1, 1);
  const scene = new Scene().add(new Mesh(geometry, material));
  renderer.render(scene, new OrthographicCamera());
  const url = renderer.domElement.toDataURL();
  material.dispose();
  geometry.dispose();
  cache.set(p.id, url);
  return url;
}
