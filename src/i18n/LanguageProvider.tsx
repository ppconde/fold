import { useRouter } from '@tanstack/react-router';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { Dictionary } from './en';
import { currentLang, dictionary, type Lang, setCurrentLang, writeLang } from './lang';

const Ctx = createContext<{ lang: Lang; setLang: (lang: Lang) => void } | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState(currentLang); // main.tsx set it before the router started
  const setLang = useCallback(
    (next: Lang) => {
      setCurrentLang(next);
      writeLang(next);
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
