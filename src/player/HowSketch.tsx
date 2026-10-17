import { useT } from '../i18n/LanguageProvider';
import styles from './HowSketch.module.css';

// a reverse fold seen end-on: the body's two layers (a V hinged at the bottom) and the flap going in between
const SKETCHES = [
  { layers: 'M40 74 L16 12 M40 74 L64 12', flap: '' },
  { layers: 'M40 74 L16 12 M40 74 L64 12', flap: 'M39 52 L40 14' },
  { layers: 'M40 74 L35 10 M40 74 L45 10', flap: 'M40 50 L40 6' }
];

/** How your hands make a reverse fold, in three sketches; `frame` is the one that goes with the fold on screen. */
export function HowSketch({ frame }: { frame: 0 | 1 | 2 }) {
  const t = useT().player;
  return (
    <div className={styles.how} role="img" aria-label={[t.shortcut, ...t.howSteps].join(' ')}>
      <ol className={styles.frames}>
        {SKETCHES.map((s, i) => (
          <li key={s.layers + s.flap} data-current={i === frame}>
            <svg viewBox="0 0 80 80" aria-hidden="true">
              <path className={styles.layers} d={s.layers} />
              {s.flap && <path className={styles.flap} d={s.flap} />}
            </svg>
            <span>{t.howSteps[i]}</span>
          </li>
        ))}
      </ol>
      <span className={styles.dots} aria-hidden="true">
        {SKETCHES.map((s, i) => (
          <i key={s.layers + s.flap} data-current={i === frame} />
        ))}
      </span>
    </div>
  );
}
