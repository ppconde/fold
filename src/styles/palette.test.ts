import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** The palette's custom properties, read from global.css (`--plaster: #e6dccb;` → plaster: #e6dccb). */
const PALETTE = Object.fromEntries(
  [...readFileSync(new URL('./global.css', import.meta.url), 'utf8').matchAll(/--(\w+):\s*(#[0-9a-f]{6});/gi)].map(
    ([, name, hex]) => [name, hex]
  )
);

/** Every foreground/background pair the UI uses for text. */
const TEXT_PAIRS = [
  ['charcoal', 'plaster'],
  ['charcoal', 'ivory'],
  ['muted', 'plaster'],
  ['muted', 'ivory'],
  ['indigo', 'plaster'],
  ['indigo', 'ivory'],
  ['ivory', 'charcoal']
];

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
    for (const mark of ['clay', 'moss']) {
      expect(contrast(PALETTE[mark], PALETTE.plaster)).toBeGreaterThanOrEqual(3);
    }
  });
});
