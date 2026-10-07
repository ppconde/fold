import { describe, expect, it } from 'vitest';
import { PALETTE, TEXT_PAIRS } from './palette';

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('palette', () => {
  it.each(TEXT_PAIRS)('%s text on %s passes WCAG AA (4.5:1)', (fg, bg) => {
    expect(contrast(PALETTE[fg], PALETTE[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps non-text accents at 3:1 or more on plaster', () => {
    for (const mark of ['clay', 'moss'] as const) {
      expect(contrast(PALETTE[mark], PALETTE.plaster)).toBeGreaterThanOrEqual(3);
    }
  });
});
