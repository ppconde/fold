import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Model } from '../fold/types';
import { useLang, useT } from '../i18n/LanguageProvider';
import { localized } from '../i18n/lang';
import type { ModelEntry } from '../models/catalog';
import { hasWebGL, markHintSeen, readPanelOpen, shouldShowHint, writePanelOpen } from './browser';
import { CreaseDiagram } from './CreaseDiagram';
import { AgainIcon, BackIcon, NextIcon, StartIcon, ViewIcon } from './icons';
import { loadStage } from './load-stage';
import styles from './Player.module.css';
import { playerStatus } from './player-state';
import { StageBoundary } from './StageBoundary';
import { usePlayer } from './use-player';

type Props = { entry: ModelEntry; model: Model; initialStep: number; onSettle: (step: number) => void };

const LazyStage = lazy(loadStage);

export function Player({ entry, model, initialStep, onSettle }: Props) {
  const t = useT().player;
  const [lang] = useLang();
  const [state, dispatch] = usePlayer(model, initialStep);
  const status = playerStatus(state);
  const [panelOpen, setPanelOpen] = useState(readPanelOpen);
  const [resetCount, setResetCount] = useState(0);
  const [frameStep, setFrameStep] = useState(state.step);
  const [webgl] = useState(hasWebGL);
  const [stageFailed, setStageFailed] = useState(false);
  const [hint, setHint] = useState<'show' | 'fading' | 'gone'>(() => (shouldShowHint() ? 'show' : 'gone'));
  const showPanel = panelOpen || !webgl || stageFailed;
  const instruction = state.step === 0 ? t.firstInstruction : localized(model.steps[state.step].instruction, lang);

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
      if (e.target instanceof HTMLInputElement && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' '))
        return;
      if (document.querySelector('dialog[open]') || e.altKey || e.ctrlKey || e.metaKey) return;
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
    >
      <div className={styles.title}>
        <h1>{localized(entry.name, lang)}</h1>
        {entry.japaneseName && <p className={styles.japanese}>{entry.japaneseName}</p>}
      </div>

      <div className={styles.stage}>
        {webgl ? (
          <StageBoundary onError={() => setStageFailed(true)} message={t.stageFailed} retryLabel={t.tryAgain}>
            <Suspense fallback={<div className={styles.stagePlaceholder} aria-hidden="true" />}>
              <LazyStage model={model} step={state.step} t={state.t} resetCount={resetCount} frameStep={frameStep} />
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
      </div>

      <aside
        id="instructions"
        className={`${styles.panel} paper`}
        aria-label={t.instructions}
        hidden={!showPanel}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the sheet scrolls on phones and must be keyboard reachable
        tabIndex={0}
      >
        <p className={styles.stepLabel}>{t.stepOf(state.step, state.last)}</p>
        {status === 'done' && (
          <span className={styles.seal} aria-hidden="true">
            完
          </span>
        )}
        <p className={styles.instruction} aria-live="polite">
          {instruction}
        </p>
        <CreaseDiagram model={model} step={state.step} />
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
            aria-disabled={state.step === 0 || state.playing}
            onClick={() => dispatch({ type: 'goTo', step: 0 })}
          >
            <StartIcon />
          </button>
          <button
            type="button"
            aria-label={t.previous}
            title={t.previous}
            aria-disabled={state.step === 0 || state.playing}
            onClick={() => dispatch({ type: 'prev' })}
          >
            <BackIcon />
          </button>
          <button
            type="button"
            aria-label={t.replay}
            title={t.replay}
            aria-disabled={state.step === 0 || state.playing}
            onClick={() => dispatch({ type: 'replay' })}
          >
            <AgainIcon />
          </button>
          <button
            type="button"
            className={styles.next}
            aria-label={t.next}
            title={t.next}
            aria-disabled={(state.step === state.last && state.t === 1) || state.playing}
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
          <span className={styles.count}>{t.count(state.step, state.last)}</span>
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
