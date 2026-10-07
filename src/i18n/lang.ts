import { readStored, writeStored } from '../player/browser';
import { type Dictionary, en } from './en';
import { pt } from './pt';

export type Lang = 'en' | 'pt';
const KEY = 'fold:lang';
const HTML_LANG: Record<Lang, string> = { en: 'en-US', pt: 'pt-PT' };
let active: Lang = 'en';

export function detectLang(languages: readonly string[]): Lang {
  return languages[0]?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

export function readLang(): Lang {
  const stored = readStored(KEY);
  if (stored === 'en' || stored === 'pt') return stored;
  return detectLang(typeof navigator === 'undefined' ? [] : navigator.languages);
}

export const writeLang = (lang: Lang) => writeStored(KEY, lang);

/** Module-level current language, for route `head` functions that can't use hooks. */
export const currentLang = () => active;
export const setCurrentLang = (lang: Lang) => {
  active = lang;
  document.documentElement.lang = HTML_LANG[lang];
};

export const dictionary = (lang: Lang): Dictionary => (lang === 'pt' ? pt : en);
/** Page titles in the current language, for route `head` functions. */
export const titles = () => dictionary(active).titles;

export const localized = (text: { en: string; pt?: string }, lang: Lang) => (lang === 'pt' && text.pt) || text.en;
