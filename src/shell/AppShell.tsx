import { HeadContent, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { LanguageProvider, useLang, useT } from '../i18n/LanguageProvider';
import styles from './AppShell.module.css';
import { readTextScale, setTextScale, TEXT_SCALES, type TextScale } from './text-scale';

const LINKS = [
  { to: '/', key: 'home' },
  { to: '/library', key: 'library' },
  { to: '/about', key: 'about' }
] as const;

const GLYPHS = ['A', 'A+', 'A++'];

export function AppShell() {
  return (
    <LanguageProvider>
      <Shell />
    </LanguageProvider>
  );
}

function Shell() {
  const t = useT();
  const [lang, setLang] = useLang();
  const menu = useRef<HTMLDialogElement>(null);
  const [scale, setScale] = useState<TextScale>(readTextScale);
  const close = () => menu.current?.close();
  const pathname = useRouterState({ select: (s) => s.resolvedLocation?.pathname });
  const shownPath = useRef(pathname);
  useEffect(() => {
    // Screen-reader and keyboard users land on the new page's heading, not where the old page left them.
    if (!pathname || shownPath.current === pathname) return;
    shownPath.current = pathname;
    const heading = document.querySelector<HTMLElement>('main h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus();
  }, [pathname]);

  return (
    <>
      <HeadContent />
      <header>
        <button
          type="button"
          className={styles.menuButton}
          aria-label={t.shell.menu}
          onClick={() => menu.current?.showModal()}
        >
          ☰
        </button>
      </header>
      <dialog ref={menu} className={styles.menu} aria-label={t.shell.menu} closedby="any">
        <nav>
          <ul>
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} onClick={close}>
                  {t.shell.nav[link.key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <fieldset className={styles.textSize}>
          <legend>{t.shell.textSize}</legend>
          {TEXT_SCALES.map((s, i) => (
            <button
              key={s}
              type="button"
              aria-pressed={scale === s}
              onClick={() => {
                setTextScale(s);
                setScale(s);
              }}
            >
              {GLYPHS[i]}
              <span className="sr-only"> {t.shell.textSizes[i]}</span>
            </button>
          ))}
        </fieldset>
        <fieldset className={styles.textSize}>
          <legend>{t.shell.language}</legend>
          {(['en', 'pt'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
              <span className="sr-only" lang={l}>
                {' '}
                {t.shell.languageNames[l]}
              </span>
            </button>
          ))}
        </fieldset>
        <button type="button" className={styles.close} onClick={close}>
          {t.shell.close}
        </button>
      </dialog>
      <Outlet />
    </>
  );
}
