import { afterEach, describe, expect, it, vi } from 'vitest';
import { markHintSeen, readPanelOpen, shouldShowHint, writePanelOpen } from './browser';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('stored preferences', () => {
  it('defaults to open and round-trips', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v)
    });
    expect(readPanelOpen()).toBe(true);
    writePanelOpen(false);
    expect(readPanelOpen()).toBe(false);
    expect(shouldShowHint()).toBe(true);
    markHintSeen();
    expect(shouldShowHint()).toBe(false);
  });

  it('survives blocked storage', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    expect(readPanelOpen()).toBe(true);
    expect(() => writePanelOpen(false)).not.toThrow();
    expect(shouldShowHint()).toBe(true);
    expect(() => markHintSeen()).not.toThrow();
  });
});
