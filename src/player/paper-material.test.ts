import { Color, ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { patternHooks } from './paper-material';
import { ichimatsu } from './papers/ichimatsu';

describe('patternHooks', () => {
  // runs on three's real standard shader, so a chunk renamed in a three upgrade fails here instead of drawing plain
  it('injects the pattern into the standard shader', () => {
    const shader = {
      vertexShader: ShaderLib.standard.vertexShader,
      fragmentShader: ShaderLib.standard.fragmentShader,
      uniforms: {} as Record<string, { value: unknown }>
    };
    const hooks = patternHooks(ichimatsu);
    hooks.onBeforeCompile(shader);
    expect(shader.vertexShader).toContain('vSheetUv = uv;');
    expect(shader.fragmentShader).toContain('paperColor(vSheetUv)');
    expect(shader.uniforms.uGround.value).toBeInstanceOf(Color);
    expect(hooks.customProgramCacheKey()).toBe('paper:ichimatsu');
  });
});
