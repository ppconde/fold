import { useMemo, useState } from 'react';
import type { Model, Vec2 } from '../fold/types';
import { useT } from '../i18n/LanguageProvider';
import styles from './HowSketch.module.css';
import { type HowFrame, howDrawing } from './how-drawing';

const pts = (ps: Vec2[]) => ps.map((p) => p.join(',')).join(' ');
const path = (segs: [Vec2, Vec2][]) => segs.map(([a, b]) => `M${a}L${b}`).join('');

/** One frame, as a book draws it: the paper, the fold line, the flipping edge in yellow, the push and the tip's path. */
function Frame({ frame, paperColor, k }: { frame: HowFrame; paperColor: string; k: number }) {
  const { push, arrow } = frame;
  // the Yoshizawa–Randlett push: a broad arrow pointing at `at`
  const pushAt =
    push &&
    ((a: number, b: number): Vec2 => [
      push.at[0] - push.dir[0] * a * k - push.dir[1] * b * k,
      push.at[1] - push.dir[1] * a * k + push.dir[0] * b * k
    ]);
  let head: Vec2[] | null = null;
  if (arrow) {
    const [dx, dy] = [arrow.to[0] - arrow.control[0], arrow.to[1] - arrow.control[1]];
    const l = Math.hypot(dx, dy);
    const s = 9 * k;
    const back = (side: number): Vec2 => [
      arrow.to[0] - (dx / l) * s - (dy / l) * side * 0.55 * s,
      arrow.to[1] - (dy / l) * s + (dx / l) * side * 0.55 * s
    ];
    head = [arrow.to, back(1), back(-1)];
  }
  return (
    <>
      {frame.peek && <polygon className={styles.peek} points={pts(frame.peek)} />}
      {frame.faces.map((f) => (
        <g key={pts(f.points)}>
          <polygon
            className={f.side === 'front' ? styles.front : styles.back}
            // the paper the frame isn't about: lighter, still opaque, so lower layers don't show through
            style={
              f.side === 'front'
                ? { fill: f.subject ? paperColor : `color-mix(in srgb, ${paperColor} 40%, var(--ivory))` }
                : undefined
            }
            points={pts(f.points)}
          />
          <path className={f.subject ? styles.edge : `${styles.edge} ${styles.muted}`} d={path(f.edges)} />
        </g>
      ))}
      {frame.landing && <polygon className={styles.landing} points={pts(frame.landing)} />}
      {frame.fold.map((s) => (
        <line
          key={`${s.from}${s.to}`}
          className={s.hidden ? styles.hidden : styles.fold}
          x1={s.from[0]}
          y1={s.from[1]}
          x2={s.to[0]}
          y2={s.to[1]}
        />
      ))}
      {frame.spine.map((s) => (
        <line
          key={`${s.ghost}${s.from}${s.to}`}
          data-spine
          className={s.ghost || s.hidden ? styles.ghost : styles.spine}
          x1={s.from[0]}
          y1={s.from[1]}
          x2={s.to[0]}
          y2={s.to[1]}
        />
      ))}
      {pushAt && (
        <polygon
          className={styles.push}
          points={pts(
            [
              [0, 0],
              [16, 13],
              [16, 6],
              [46, 6],
              [46, -6],
              [16, -6],
              [16, -13]
            ].map(([a, b]) => pushAt(a, b))
          )}
        />
      )}
      {arrow && head && (
        <>
          <path className={styles.arrow} d={`M${arrow.from}Q${arrow.control} ${arrow.to}`} />
          <polygon className={styles.head} points={pts(head)} />
        </>
      )}
    </>
  );
}

/** How your hands make this reverse fold, in three drawings made from the model; on wide screens `frame`, the one
 * that goes with the fold on screen, is outlined. */
export function HowSketch({ model, step, frame }: { model: Model; step: number; frame: 0 | 1 | 2 }) {
  const t = useT().player;
  // on the phone sheet the sketches are a row you swipe through at your own pace, apart from the animation;
  // the dots follow what's on screen
  const [shown, setShown] = useState(0);
  const drawing = useMemo(() => howDrawing(model, step), [model, step]);
  if (!drawing) return null;
  // the push mark and arrow head are sized for a frame 300 units wide
  const k = drawing.box[2] / 300;
  return (
    <div className={styles.how} role="img" aria-label={[t.insideOut, ...t.howSteps].join(' ')}>
      <ol
        className={styles.frames}
        onScroll={(e) => setShown(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth) as 0 | 1 | 2)}
      >
        {drawing.frames.map((f, i) => (
          <li key={t.howSteps[i]} data-current={i === frame}>
            <svg viewBox={drawing.box.join(' ')} aria-hidden="true">
              <Frame frame={f} paperColor={model.paperColor} k={k} />
            </svg>
            <span>{t.howSteps[i]}</span>
          </li>
        ))}
      </ol>
      <span className={styles.dots} aria-hidden="true">
        {drawing.frames.map((_, i) => (
          <i key={t.howSteps[i]} data-current={i === shown} />
        ))}
      </span>
    </div>
  );
}
