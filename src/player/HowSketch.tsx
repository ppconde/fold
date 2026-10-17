import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/LanguageProvider';
import { prefersReducedMotion } from './browser';
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
  const frames = useRef<HTMLOListElement>(null);
  // on the phone sheet the sketches are a swipeable row: the animation moves it to its sketch, a swipe moves it
  // anywhere until the animation reaches the next one; the dots follow what's on screen
  const [shown, setShown] = useState(frame);
  useEffect(() => {
    const el = frames.current;
    el?.scrollTo?.({ left: frame * el.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    setShown(frame);
  }, [frame]);
  return (
    <div className={styles.how} role="img" aria-label={[t.shortcut, ...t.howSteps].join(' ')}>
      <ol
        ref={frames}
        className={styles.frames}
        onScroll={(e) => setShown(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth) as 0 | 1 | 2)}
      >
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
          <i key={s.layers + s.flap} data-current={i === shown} />
        ))}
      </span>
    </div>
  );
}
