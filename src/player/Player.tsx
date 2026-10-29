import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { landingAt, progress } from '../fold/fold';
import { isReverseFold } from '../fold/reverse';
import type { Model } from '../fold/types';
import { useLang, useT } from '../i18n/LanguageProvider';
import { localized } from '../i18n/lang';
import type { ModelEntry } from '../models/catalog';
import {
  hasWebGL,
  markHintSeen,
  markMarksKeySeen,
  readPanelOpen,
  readPaper,
  shouldOpenMarksKey,
  shouldShowHint,
  writePanelOpen,
  writePaper
} from './browser';
import { CreaseDiagram } from './CreaseDiagram';
import { HowSketch } from './HowSketch';
import { sketchFrame } from './how';
import { AgainIcon, BackIcon, CreasesIcon, MarksIcon, MovesIcon, NextIcon, StartIcon, ViewIcon } from './icons';
import { loadStage } from './load-stage';
import { PaperPicker } from './PaperPicker';
import styles from './Player.module.css';
import { playerStatus } from './player-state';
import { StageBoundary } from './StageBoundary';
import { usePlayer } from './use-player';
import { softenTowardIvory } from './washi';

type Props = { entry: ModelEntry; model: Model; initialStep: number; onSettle: (step: number) => void };

const LazyStage = lazy(loadStage);

export function Player({ entry, model, initialStep, onSettle }: Props) {
  const t = useT().player;
  const [lang] = useLang();
  const [state, dispatch] = usePlayer(model, initialStep);
  const status = playerStatus(state);
  const [panelOpen, setPanelOpen] = useState(readPanelOpen);
  const [paper, setPaper] = useState(readPaper);
  const [resetCount, setResetCount] = useState(0);
  const [frameStep, setFrameStep] = useState(state.step);
  const [webgl] = useState(hasWebGL);
  const [stageFailed, setStageFailed] = useState(false);
  const [hint, setHint] = useState<'show' | 'fading' | 'gone'>(() => (shouldShowHint() ? 'show' : 'gone'));
  const showPanel = panelOpen || !webgl || stageFailed;
  // the step whose slot was flipped to the crease pattern or the key to the marks; any other reverse fold opens on "how"
  const [picked, setPicked] = useState<{ step: number; slot: 'creases' | 'marks' } | null>(null);
  const reverse = isReverseFold(model, state.step);
  const slot = picked?.step === state.step ? picked.slot : 'how';
  const instruction = state.step === 0 ? t.firstInstruction : localized(model.steps[state.step].instruction, lang);

  const choosePaper = (id: string) => {
    setPaper(id);
    writePaper(id);
  };

  const togglePanel = (open: boolean) => {
    setPanelOpen(open);
    writePanelOpen(open);
  };

  // latest onSettle via ref: its identity changes with the URL step and must not re-fire a stale settle
  const settleRef = useRef(onSettle);
  useEffect(() => {
    settleRef.current = onSettle;
  });
  useEffect(() => {
    if (state.playing) return;
    settleRef.current(state.step);
    setFrameStep(state.step);
  }, [state.playing, state.step]);

  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current === 'playing' && status !== 'playing' && state.step >= 1) {
      markHintSeen();
      setHint((h) => (h === 'show' ? 'fading' : h));
    }
    prevStatus.current = status;
  }, [status, state.step]);

  useEffect(() => {
    if (hint !== 'fading') return;
    const id = setTimeout(() => setHint('gone'), 600);
    return () => clearTimeout(id);
  }, [hint]);

  // follow an external ?step change; while playing, state.step differs from the URL by design
  // biome-ignore lint/correctness/useExhaustiveDependencies: only react to the URL step changing
  useEffect(() => {
    if (!state.playing && initialStep !== state.step) dispatch({ type: 'goTo', step: initialStep });
  }, [initialStep]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ')
      )
        return;
      if (document.querySelector('dialog[open], :popover-open') || e.altKey || e.ctrlKey || e.metaKey) return;
      const onControl = e.target instanceof Element && e.target.closest('button, a, input, textarea, select');
      const inPanel = e.target instanceof Element && e.target.closest('#instructions');
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === ' ') && inPanel) return;
      if (e.key === 'ArrowRight') dispatch({ type: 'next' });
      else if (e.key === 'ArrowLeft') dispatch({ type: 'prev' });
      else if (e.key === ' ' && !onControl) {
        e.preventDefault();
        dispatch({ type: 'replay' });
      } else if (e.key === 'r' || e.key === 'R') setResetCount((n) => n + 1);
      else if (e.key === 'Escape') {
        setPanelOpen(false);
        writePanelOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  return (
    <main
      className={styles.player}
      data-step={state.step}
      data-state={status}
      data-progress={Math.round(state.t * 100)}
      data-panel={showPanel ? 'open' : 'closed'}
      data-paper={paper}
    >
      <div className={styles.title}>
        <h1>{localized(entry.name, lang)}</h1>
        {entry.japaneseName && <p className={styles.japanese}>{entry.japaneseName}</p>}
      </div>

      <div className={styles.stage}>
        {webgl ? (
          <StageBoundary onError={() => setStageFailed(true)} message={t.stageFailed} retryLabel={t.tryAgain}>
            <Suspense fallback={<div className={styles.stagePlaceholder} aria-hidden="true" />}>
              <LazyStage
                model={model}
                step={state.step}
                t={state.t}
                playing={state.playing}
                resetCount={resetCount}
                frameStep={frameStep}
                paper={paper}
              />
            </Suspense>
          </StageBoundary>
        ) : (
          <p className={styles.noWebgl}>{t.noWebgl}</p>
        )}
        {webgl && !stageFailed && (
          <button
            type="button"
            className={`${styles.panelToggle} ink-link`}
            aria-expanded={showPanel}
            aria-controls="instructions"
            onClick={() => togglePanel(!panelOpen)}
          >
            {panelOpen ? t.hideSteps : t.showSteps}
          </button>
        )}
        {status === 'done' && (
          <p className={styles.done} aria-hidden="true">
            <span className={styles.seal}>完</span>
            <span>{t.done}</span>
          </p>
        )}
      </div>

      <aside
        id="instructions"
        className={`${styles.panel} paper`}
        aria-label={t.instructions}
        hidden={!showPanel}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the sheet scrolls on phones and must be keyboard reachable
        tabIndex={0}
        data-slot={reverse ? slot : undefined}
      >
        <p className={styles.stepLabel}>
          {t.stepOf(state.step, state.last)}
          {reverse && ` · ${t.reverseFold}`}
        </p>
        <p className={styles.instruction} aria-live="polite">
          {instruction}
        </p>
        {reverse ? (
          <div className={styles.slot}>
            <div className={styles.slotToggle}>
              <button
                type="button"
                aria-label={t.how}
                title={t.how}
                aria-pressed={slot === 'how'}
                onClick={() => setPicked(null)}
              >
                <MovesIcon />
              </button>
              <button
                type="button"
                aria-label={t.creases}
                title={t.creases}
                aria-pressed={slot === 'creases'}
                onClick={() => setPicked({ step: state.step, slot: 'creases' })}
              >
                <CreasesIcon />
              </button>
              <button
                type="button"
                aria-label={t.marks.tab}
                title={t.marks.tab}
                aria-pressed={slot === 'marks'}
                onClick={() => setPicked({ step: state.step, slot: 'marks' })}
              >
                <MarksIcon />
              </button>
            </div>
            <HowSketch
              model={model}
              step={state.step}
              frame={sketchFrame(progress(state.t), landingAt(model, state.step))}
            />
            <p className={styles.insideOut}>{t.insideOut}</p>
            <MarksKey shown={slot === 'marks'} />
            <CreaseDiagram model={model} step={state.step} />
          </div>
        ) : (
          <CreaseDiagram model={model} step={state.step} />
        )}
      </aside>

      <div className={styles.dock} data-testid="dock">
        {state.step > 0 && (
          <input
            type="range"
            className={styles.progress}
            min={0}
            max={100}
            step={1}
            value={Math.round(state.t * 100)}
            aria-label={t.foldProgress}
            aria-valuetext={t.percentFolded(Math.round(state.t * 100))}
            onChange={(e) => dispatch({ type: 'scrub', t: Number(e.target.value) / 100 })}
          />
        )}
        <div className={styles.dockRow}>
          <button
            type="button"
            aria-label={t.startOver}
            title={t.startOver}
            aria-disabled={state.step === 0}
            onClick={() => dispatch({ type: 'goTo', step: 0 })}
          >
            <StartIcon />
          </button>
          <button
            type="button"
            aria-label={t.previous}
            title={t.previous}
            aria-disabled={state.step === 0}
            onClick={() => dispatch({ type: 'prev' })}
          >
            <BackIcon />
          </button>
          <button
            type="button"
            aria-label={t.replay}
            title={t.replay}
            aria-disabled={state.step === 0}
            onClick={() => dispatch({ type: 'replay' })}
          >
            <AgainIcon />
          </button>
          <button
            type="button"
            className={styles.next}
            aria-label={t.next}
            title={t.next}
            aria-disabled={state.step === state.last && state.t === 1}
            onClick={() => dispatch({ type: 'next' })}
          >
            <NextIcon />
          </button>
          <button
            type="button"
            className={styles.speed}
            aria-label={t.speed(state.speed)}
            title={t.speed(state.speed)}
            onClick={() => dispatch({ type: 'cycleSpeed' })}
          >
            {state.speed}×
          </button>
          {webgl && !stageFailed ? (
            <button
              type="button"
              aria-label={t.resetView}
              title={t.resetView}
              onClick={() => setResetCount((n) => n + 1)}
            >
              {/* Framing corners, not a circular arrow: this recentres the camera, it does not restart the fold. */}
              <ViewIcon />
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <select
            className={styles.count}
            aria-label={t.goToStep}
            value={state.step}
            onChange={(e) => dispatch({ type: 'goTo', step: Number(e.target.value) })}
          >
            {model.steps.map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: steps are a fixed list and the index is the step number
              <option key={i} value={i}>
                {t.count(i, state.last)}
              </option>
            ))}
          </select>
          {webgl && !stageFailed ? (
            <PaperPicker paper={paper} plainColor={softenTowardIvory(model.paperColor)} onChange={choosePaper} />
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
        {hint !== 'gone' && (
          <p className={`${styles.hint} ${hint === 'fading' ? styles.hintOut : ''}`} aria-hidden="true">
            {t.hint}
          </p>
        )}
      </div>
      <p className="sr-only" role="status">
        {status === 'done' ? t.isComplete(localized(entry.name, lang)) : ''}
      </p>
    </main>
  );
}

/** The marks a reverse fold draws on the paper, as a book's key to its symbols: the fold line, the push and the tip's
 * path, each drawn as on stage. `shown`: picked on the phone sheet's toggle, so open. */
function MarksKey({ shown }: { shown: boolean }) {
  const t = useT().player.marks;
  const [open] = useState(shouldOpenMarksKey);
  useEffect(markMarksKeySeen, []);
  return (
    <details className={styles.marks} open={open || shown}>
      <summary>{t.title}</summary>
      <ul>
        <li>
          <svg viewBox="0 0 40 16" aria-hidden="true">
            <line className={styles.markFold} x1="2" y1="8" x2="38" y2="8" />
          </svg>
          {t.foldLine}
        </li>
        <li>
          <svg viewBox="0 0 40 16" aria-hidden="true">
            <polygon className={styles.markPush} points="4,8 15,1 15,5 36,5 36,11 15,11 15,15" />
          </svg>
          {t.push}
        </li>
        <li>
          <svg viewBox="0 0 40 16" aria-hidden="true">
            <path className={styles.markTip} d="M4 14Q16 0 31 7" />
            <path className={styles.markHead} d="M37 10L28 11L32 3Z" />
          </svg>
          {t.tip}
        </li>
      </ul>
    </details>
  );
}
