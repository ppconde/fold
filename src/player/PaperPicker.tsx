import { type CSSProperties, useId, useState } from 'react';
import { useT } from '../i18n/LanguageProvider';
import styles from './PaperPicker.module.css';
import { PAPERS, PLAIN, paperById } from './papers';
import { swatchUrl } from './papers/swatch';

const IDS = [PLAIN, ...PAPERS.map((p) => p.id)];

type Props = { paper: string; plainColor: string; onChange: (id: string) => void };

/** The dock's paper swatch: opens a grid of papers (a sheet on phones); each pick applies at once and stays open. */
export function PaperPicker({ paper, plainColor, onChange }: Props) {
  const t = useT();
  const id = useId();
  // thumbnails are drawn the first time the grid opens, not on page load
  const [opened, setOpened] = useState(false);
  const swatch = (pid: string): CSSProperties => {
    const p = paperById(pid);
    if (!p) return { background: plainColor };
    const url = opened || pid === paper ? swatchUrl(p) : '';
    return url ? { backgroundImage: `url(${url})` } : { background: p.ground };
  };

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        popoverTarget={id}
        aria-label={t.player.paperIs(t.papers[paper])}
        title={t.player.paperIs(t.papers[paper])}
      >
        <span className={styles.swatch} style={swatch(paper)} />
      </button>
      <div
        id={id}
        popover="auto"
        className={`${styles.popover} paper`}
        onToggle={(e) => {
          if ((e.nativeEvent as ToggleEvent).newState === 'open') setOpened(true);
        }}
      >
        <fieldset className={styles.grid}>
          <legend>{t.player.paper}</legend>
          {IDS.map((pid) => (
            <label key={pid} className={styles.option} title={t.papers[pid]}>
              <input
                type="radio"
                name={id}
                value={pid}
                checked={pid === paper}
                aria-label={t.papers[pid]}
                onChange={() => onChange(pid)}
              />
              <span className={styles.swatch} style={swatch(pid)} />
            </label>
          ))}
        </fieldset>
        <button type="button" className={styles.close} popoverTarget={id} popoverTargetAction="hide">
          {t.shell.close}
        </button>
      </div>
    </>
  );
}
