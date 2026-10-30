import { useEffect, useId, useMemo, useRef } from 'react';
import type { Model, Vec2 } from '../fold/types';
import { useT } from '../i18n/LanguageProvider';
import styles from './HowSketch.module.css';
import { type HowDrawing, type HowFrame, howDrawing } from './how-drawing';

const pts = (ps: Vec2[]) => ps.map((p) => p.join(',')).join(' ');
const path = (segs: [Vec2, Vec2][]) => segs.map(([a, b]) => `M${a}L${b}`).join('');

/** One frame, as a book draws it: the paper, the fold line, the flipping edge in yellow, the push and the tip's path. */
function Frame({ frame, paperColor, k, head }: { frame: HowFrame; paperColor: string; k: number; head: string }) {
  const { push, arrow } = frame;
  // the Yoshizawa–Randlett push: a broad arrow pointing at `at`
  const pushAt =
    push &&
    ((a: number, b: number): Vec2 => [
      push.at[0] - push.dir[0] * a * k - push.dir[1] * b * k,
      push.at[1] - push.dir[1] * a * k + push.dir[0] * b * k
    ]);
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
          className={styles.fold}
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
          className={s.ghost ? styles.ghost : styles.spine}
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
      {arrow && <path className={styles.arrow} d={`M${arrow.join('L')}`} markerEnd={`url(#${head})`} />}
    </>
  );
}

/** One frame's drawing, with its own arrow head (ids are per page, and a frame shows in more than one place). */
function Drawing({ box, frame, paperColor }: { box: HowDrawing['box']; frame: HowFrame; paperColor: string }) {
  const head = useId();
  // the push mark and arrow head are sized for a frame 300 units wide
  const k = box[2] / 300;
  return (
    <svg viewBox={box.join(' ')} aria-hidden="true">
      {frame.arrow && (
        // the arrow's filled head, sized in screen pixels like its stroke
        <marker
          id={head}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth={16 * k}
          markerHeight={16 * k}
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path className={styles.head} d="M0 0L10 5L0 10Z" />
        </marker>
      )}
      <Frame frame={frame} paperColor={paperColor} k={k} head={head} />
    </svg>
  );
}

/** How your hands make this reverse fold, in three drawings made from the model: `frame`, the one that goes with the
 * fold on stage, drawn large, and all three small underneath; picking one calls `onPick` with it. On the phone sheet
 * the three are a row you swipe through instead, with dots: a swipe picks, and the row follows the fold as it plays. */
export function HowSketch({
  model,
  step,
  frame,
  onPick
}: {
  model: Model;
  step: number;
  frame: 0 | 1 | 2;
  onPick: (frame: 0 | 1 | 2) => void;
}) {
  const t = useT().player;
  const drawing = useMemo(() => howDrawing(model, step), [model, step]);
  const row = useRef<HTMLOListElement>(null);
  const settle = useRef(0);
  // a hand on the row since it last came to rest: only then is a scroll a swipe, not the row following the fold
  const swiped = useRef(false);
  const latest = useRef({ frame, onPick });
  latest.current = { frame, onPick };
  // a no-op on wide screens, where the row doesn't scroll
  useEffect(() => {
    const el = row.current;
    el?.scrollTo({ left: frame * el.clientWidth, behavior: 'smooth' });
  }, [frame]);
  useEffect(() => () => clearTimeout(settle.current), []);
  const onScroll = (el: HTMLOListElement) => {
    clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      if (!swiped.current) return;
      swiped.current = false;
      const shown = Math.round(el.scrollLeft / el.clientWidth) as 0 | 1 | 2;
      if (shown !== latest.current.frame) latest.current.onPick(shown);
    }, 150);
  };
  const hand = () => {
    swiped.current = true;
  };
  if (!drawing) return null;
  return (
    <figure className={styles.how}>
      <Drawing box={drawing.box} frame={drawing.frames[frame]} paperColor={model.paperColor} />
      {/* every caption in one cell, the others hidden, so the longest sets its height and nothing jumps */}
      <figcaption>
        {t.howSteps.map((caption, i) => (
          <span key={caption} hidden={i !== frame}>
            {caption}
          </span>
        ))}
      </figcaption>
      <ol
        ref={row}
        className={styles.frames}
        aria-label={t.insideOut}
        onScroll={(e) => onScroll(e.currentTarget)}
        onPointerDown={hand}
        onWheel={hand}
        onKeyDown={hand}
      >
        {drawing.frames.map((f, i) => (
          <li key={t.howSteps[i]}>
            <button
              type="button"
              aria-label={`${i + 1}. ${t.howSteps[i]}`}
              aria-current={i === frame ? 'step' : undefined}
              onClick={() => onPick(i as 0 | 1 | 2)}
            >
              <Drawing box={drawing.box} frame={f} paperColor={model.paperColor} />
            </button>
          </li>
        ))}
      </ol>
      <span className={styles.dots} aria-hidden="true">
        {drawing.frames.map((_, i) => (
          <i key={t.howSteps[i]} data-current={i === frame} />
        ))}
      </span>
    </figure>
  );
}
