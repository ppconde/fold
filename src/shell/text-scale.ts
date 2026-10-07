import { readStored, writeStored } from '../player/browser';

export const TEXT_SCALES = [1, 1.15, 1.3] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

const KEY = 'fold:textScale';

export function readTextScale(): TextScale {
  const stored = Number(readStored(KEY));
  return TEXT_SCALES.find((s) => s === stored) ?? 1;
}

export function setTextScale(scale: TextScale): void {
  document.documentElement.style.setProperty('--text-scale', String(scale));
  writeStored(KEY, String(scale));
}

export function applyStoredTextScale(): void {
  setTextScale(readTextScale());
}
