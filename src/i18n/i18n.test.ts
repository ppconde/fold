import { afterEach, describe, expect, it, vi } from 'vitest';
import { en } from './en';
import { detectLang, localized, readLang, writeLang } from './lang';
import { pt } from './pt';

const keys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
const strings = (o: object): string[] =>
  Object.values(o).flatMap((v) =>
    typeof v === 'string' ? [v] : Array.isArray(v) ? v : v && typeof v === 'object' ? strings(v) : []
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('dictionaries', () => {
  it('have the same keys', () => {
    expect(keys(pt).sort()).toEqual(keys(en).sort());
  });
  it('have no empty strings', () => {
    for (const s of [...strings(en), ...strings(pt)]) expect(s.trim()).not.toBe('');
  });
  it('keep the EN accessible names the tests rely on', () => {
    expect([en.shell.menu, en.player.next, en.player.speed(1), en.player.foldProgress]).toEqual([
      'Menu',
      'Next step',
      'Speed 1×',
      'Fold progress'
    ]);
  });
});

describe('detectLang', () => {
  it('picks Portuguese for any pt locale and English otherwise', () => {
    expect(detectLang(['pt-PT'])).toBe('pt');
    expect(detectLang(['pt-BR', 'en'])).toBe('pt');
    expect(detectLang(['fr-FR', 'pt-PT'])).toBe('en');
    expect(detectLang([])).toBe('en');
  });
});

describe('stored language', () => {
  it('round-trips and survives blocked storage', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v)
    });
    vi.stubGlobal('navigator', { languages: ['fr'] });
    expect(readLang()).toBe('en');
    writeLang('pt');
    expect(readLang()).toBe('pt');

    const blocked = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    vi.stubGlobal('navigator', { languages: ['pt-PT'] });
    expect(readLang()).toBe('pt');
    expect(() => writeLang('en')).not.toThrow();
  });
});

describe('localized', () => {
  it('falls back to English when Portuguese is missing', () => {
    expect(localized({ en: 'Cup', pt: 'Copo' }, 'pt')).toBe('Copo');
    expect(localized({ en: 'Cup' }, 'pt')).toBe('Cup');
  });
});
