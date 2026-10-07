/** Wabi-sabi palette. Keep in sync with the custom properties in global.css. */
export const PALETTE = {
  plaster: '#E6DCCB',
  ivory: '#F3EDE2',
  sand: '#B08A6A',
  clay: '#A5633F',
  moss: '#6F7A55',
  indigo: '#4F6177',
  charcoal: '#33302C',
  muted: '#5E5649'
} as const;

export type Token = keyof typeof PALETTE;

/** Every foreground/background pair the UI uses for text. */
export const TEXT_PAIRS: [Token, Token][] = [
  ['charcoal', 'plaster'],
  ['charcoal', 'ivory'],
  ['muted', 'plaster'],
  ['muted', 'ivory'],
  ['indigo', 'plaster'],
  ['indigo', 'ivory'],
  ['ivory', 'charcoal']
];
