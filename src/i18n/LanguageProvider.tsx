import { useRouter } from '@tanstack/react-router';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { Dictionary } from './en';
import { dictionary, type Lang, readLang, setCurrentLang, writeLang } from './lang';

const HTML_LANG: Record<Lang, string> = { en: 'en-US', pt: 'pt-PT' };

const Ctx = createContext<{ lang: Lang; setLang: (lang: Lang) => void } | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(() => {
    const initial = readLang();
    setCurrentLang(initial);
    document.documentElement.lang = HTML_LANG[initial];
    return initial;
  });
  const setLang = useCallback(
    (next: Lang) => {
      setCurrentLang(next);
      writeLang(next);
      document.documentElement.lang = HTML_LANG[next];
      setLangState(next);
      void router.invalidate(); // re-run head() so <title> follows the language
    },
    [router]
  );
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const useCtx = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('LanguageProvider missing');
  return ctx;
};
export const useLang = (): [Lang, (lang: Lang) => void] => {
  const { lang, setLang } = useCtx();
  return [lang, setLang];
};
export const useT = (): Dictionary => dictionary(useCtx().lang);
