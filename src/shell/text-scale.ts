export const TEXT_SCALES = [1, 1.15, 1.3] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

const KEY = 'fold:textScale';

export function readTextScale(): TextScale {
  try {
    const stored = Number(localStorage.getItem(KEY));
    return TEXT_SCALES.find((s) => s === stored) ?? 1;
  } catch {
    return 1;
  }
}

export function setTextScale(scale: TextScale): void {
  document.documentElement.style.setProperty('--text-scale', String(scale));
  try {
    localStorage.setItem(KEY, String(scale));
  } catch {
    // Storage blocked (e.g. private mode): the size still applies for this visit.
  }
}

export function applyStoredTextScale(): void {
  setTextScale(readTextScale());
}
