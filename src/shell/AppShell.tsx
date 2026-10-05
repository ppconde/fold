import { HeadContent, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import styles from './AppShell.module.css';
import { readTextScale, setTextScale, TEXT_SCALES, type TextScale } from './text-scale';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/library', label: 'Library' },
  { to: '/editor', label: 'Editor' },
  { to: '/about', label: 'About' }
] as const;

const SCALE_BUTTONS = [
  { glyph: 'A', label: 'Normal text' },
  { glyph: 'A+', label: 'Large text' },
  { glyph: 'A++', label: 'Larger text' }
];

export function AppShell() {
  const menu = useRef<HTMLDialogElement>(null);
  const [scale, setScale] = useState<TextScale>(readTextScale);
  const close = () => menu.current?.close();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const shownPath = useRef(pathname);
  useEffect(() => {
    // Screen-reader and keyboard users land on the new page's heading, not where the old page left them.
    if (shownPath.current === pathname) return;
    shownPath.current = pathname;
    const heading = document.querySelector<HTMLElement>('main h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus();
  }, [pathname]);

  return (
    <>
      <HeadContent />
      <header>
        <button type="button" className={styles.menuButton} aria-label="Menu" onClick={() => menu.current?.showModal()}>
          ☰
        </button>
      </header>
      <dialog ref={menu} className={styles.menu} aria-label="Menu" closedby="any">
        <nav>
          <ul>
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} onClick={close}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <fieldset className={styles.textSize}>
          <legend>Text size</legend>
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
              {SCALE_BUTTONS[i].glyph}
              <span className="sr-only"> {SCALE_BUTTONS[i].label}</span>
            </button>
          ))}
        </fieldset>
        <button type="button" className={styles.close} onClick={close}>
          Close
        </button>
      </dialog>
      <Outlet />
    </>
  );
}
