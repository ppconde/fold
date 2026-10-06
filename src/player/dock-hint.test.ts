import { afterEach, describe, expect, it, vi } from 'vitest';
import { markHintSeen, shouldShowHint } from './dock-hint';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('dock hint', () => {
  it('shows until it has been seen', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v)
    });
    expect(shouldShowHint()).toBe(true);
    markHintSeen();
    expect(shouldShowHint()).toBe(false);
  });

  it('survives blocked storage', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    expect(shouldShowHint()).toBe(true);
    expect(() => markHintSeen()).not.toThrow();
  });
});
