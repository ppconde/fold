import { useSyncExternalStore } from 'react';
import { readStored, writeStored } from '../player/browser';

export const TEXT_SCALES = [1, 1.15, 1.3] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

const KEY = 'fold:textScale';
const listeners = new Set<() => void>();

export function readTextScale(): TextScale {
  const stored = Number(readStored(KEY));
  return TEXT_SCALES.find((s) => s === stored) ?? 1;
}

export function setTextScale(scale: TextScale): void {
  document.documentElement.style.setProperty('--text-scale', String(scale));
  writeStored(KEY, String(scale));
  for (const listener of listeners) listener();
}

/** Call `listener` after every setTextScale; returns the unsubscribe function. */
export function subscribeTextScale(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** The current text scale, re-rendering when the reader changes it in the menu. */
export const useTextScale = (): TextScale => useSyncExternalStore(subscribeTextScale, readTextScale, () => 1);

export function applyStoredTextScale(): void {
  setTextScale(readTextScale());
}
