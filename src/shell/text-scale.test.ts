import { afterEach, describe, expect, it, vi } from 'vitest';
import { readTextScale, setTextScale } from './text-scale';

const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v)
};
const fakeRoot = { style: { setProperty: vi.fn() } };

afterEach(() => {
  store.clear();
  vi.unstubAllGlobals();
});

describe('text scale', () => {
  it('defaults to 1 when nothing is stored', () => {
    vi.stubGlobal('localStorage', fakeStorage);
    expect(readTextScale()).toBe(1);
  });

  it('round-trips a valid scale and sets the CSS variable', () => {
    vi.stubGlobal('localStorage', fakeStorage);
    vi.stubGlobal('document', { documentElement: fakeRoot });
    setTextScale(1.3);
    expect(fakeRoot.style.setProperty).toHaveBeenCalledWith('--text-scale', '1.3');
    expect(readTextScale()).toBe(1.3);
  });

  it('ignores a stored value that is not an allowed scale', () => {
    vi.stubGlobal('localStorage', fakeStorage);
    store.set('fold:textScale', '7');
    expect(readTextScale()).toBe(1);
  });

  it('keeps working when localStorage throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      }
    };
    vi.stubGlobal('localStorage', throwing);
    vi.stubGlobal('document', { documentElement: fakeRoot });
    expect(readTextScale()).toBe(1);
    expect(() => setTextScale(1.15)).not.toThrow();
    expect(fakeRoot.style.setProperty).toHaveBeenCalledWith('--text-scale', '1.15');
  });
});
