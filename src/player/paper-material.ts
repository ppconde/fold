import { Color } from 'three';
import type { PaperPattern } from './papers';

/** What every paper's `paperColor` may use: its two colours (linear) and an anti-aliased step. */
export const PAPER_GLSL_HEAD = /* glsl */ `
uniform vec3 uGround;
uniform vec3 uInk;
float aastep(float edge, float x) {
  float w = fwidth(x) * 0.7;
  return smoothstep(edge - w, edge + w, x);
}
`;

type Shader = { vertexShader: string; fragmentShader: string; uniforms: Record<string, { value: unknown }> };

function inject(source: string, anchor: string, code: string): string {
  if (!source.includes(anchor)) throw new Error(`paper pattern: three's shader no longer has ${anchor}`);
  return source.replace(anchor, `${anchor}\n${code}`);
}

/** Spread onto the front face's meshStandardMaterial: the pattern tints it under the washi map, lighting untouched. */
export function patternHooks(p: PaperPattern) {
  return {
    onBeforeCompile(shader: Shader) {
      shader.uniforms.uGround = { value: new Color(p.ground) };
      shader.uniforms.uInk = { value: new Color(p.ink) };
      shader.vertexShader = inject(
        `varying vec2 vSheetUv;\n${shader.vertexShader}`,
        '#include <uv_vertex>',
        'vSheetUv = uv;'
      );
      shader.fragmentShader = inject(
        `varying vec2 vSheetUv;\n${PAPER_GLSL_HEAD}\n${p.glsl}\n${shader.fragmentShader}`,
        '#include <map_fragment>',
        'diffuseColor.rgb *= paperColor(vSheetUv);'
      );
    },
    customProgramCacheKey: () => `paper:${p.id}`
  };
}
