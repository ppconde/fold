import { afterEach, describe, expect, it, vi } from 'vitest';
import { ichimatsu } from './ichimatsu';
import { swatchUrl } from './swatch';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('swatchUrl', () => {
  // the picker renders outside the stage's error boundary, so a refused context must not throw
  it('gives no image, rather than throwing, when WebGL is refused', () => {
    vi.stubGlobal('document', {
      createElement: () => ({ getContext: () => null, addEventListener: () => {}, removeEventListener: () => {} })
    });
    expect(swatchUrl(ichimatsu)).toBe('');
  });
});
