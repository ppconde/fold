import { Link, Outlet } from '@tanstack/react-router';
import { useRef, useState } from 'react';
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

  return (
    <>
      <header>
        <button type="button" className={styles.menuButton} aria-label="Menu" onClick={() => menu.current?.showModal()}>
          ☰
        </button>
      </header>
      <dialog ref={menu} className={styles.menu} aria-label="Menu">
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
              aria-label={SCALE_BUTTONS[i].label}
              aria-pressed={scale === s}
              onClick={() => {
                setTextScale(s);
                setScale(s);
              }}
            >
              {SCALE_BUTTONS[i].glyph}
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
