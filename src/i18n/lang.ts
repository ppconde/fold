import { type Dictionary, en } from './en';
import { pt } from './pt';

export type Lang = 'en' | 'pt';
const KEY = 'fold:lang';
let active: Lang = 'en';

export function detectLang(languages: readonly string[]): Lang {
  return languages[0]?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

export function readLang(): Lang {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'en' || stored === 'pt') return stored;
  } catch {
    // storage blocked: fall through to the browser's preference
  }
  return detectLang(typeof navigator === 'undefined' ? [] : navigator.languages);
}

export function writeLang(lang: Lang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // storage blocked: the choice still applies for this visit
  }
}

/** Module-level current language, for route `head` functions that can't use hooks. */
export const currentLang = () => active;
export const setCurrentLang = (lang: Lang) => {
  active = lang;
};

export const dictionary = (lang: Lang): Dictionary => (lang === 'pt' ? pt : en);

export const localized = (text: { en: string; pt?: string }, lang: Lang) => (lang === 'pt' && text.pt) || text.en;
