import { Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import type { Model } from '../fold/types';
import type { ModelEntry } from '../models/catalog';
import { hasWebGL, readPanelOpen, writePanelOpen } from './browser';
import { CreaseDiagram } from './CreaseDiagram';
import styles from './Player.module.css';
import { playerStatus } from './player-state';
import { Stage } from './Stage';
import { usePlayer } from './use-player';

type Props = { entry: ModelEntry; model: Model; initialStep: number; onSettle: (step: number) => void };

const FIRST_INSTRUCTION = 'Start with your sheet of paper, colored side up.';

export function Player({ entry, model, initialStep, onSettle }: Props) {
  const [state, dispatch] = usePlayer(model, initialStep);
  const status = playerStatus(state);
  const [panelOpen, setPanelOpen] = useState(readPanelOpen);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [resetCount, setResetCount] = useState(0);
  const [frameStep, setFrameStep] = useState(state.step);
  const [webgl] = useState(hasWebGL);
  const showPanel = panelOpen || !webgl;
  const instruction = state.step === 0 ? FIRST_INSTRUCTION : model.steps[state.step].instruction;

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

  useEffect(() => {
    if (status === 'done') doneRef.current?.focus();
  }, [status]);

  // follow an external ?step change; while playing, state.step differs from the URL by design
  // biome-ignore lint/correctness/useExhaustiveDependencies: only react to the URL step changing
  useEffect(() => {
    if (!state.playing && initialStep !== state.step) dispatch({ type: 'goTo', step: initialStep });
  }, [initialStep]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
      data-panel={showPanel ? 'open' : 'closed'}
    >
      <div className={styles.title}>
        <h1>{entry.name}</h1>
        {entry.japaneseName && <p className={styles.japanese}>{entry.japaneseName}</p>}
      </div>

      <div className={styles.stage}>
        {webgl ? (
          <Stage model={model} step={state.step} t={state.t} resetCount={resetCount} frameStep={frameStep} />
        ) : (
          <p className={styles.noWebgl}>
            The 3D view isn't available on this device. Follow the crease pattern and instructions instead.
          </p>
        )}
        {webgl && (
          <button
            type="button"
            className={styles.panelToggle}
            aria-expanded={showPanel}
            aria-controls="instructions"
            onClick={() => togglePanel(!panelOpen)}
          >
            {panelOpen ? 'Hide steps' : 'Show steps'}
          </button>
        )}
      </div>

      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: the sheet scrolls on phones and must be keyboard reachable */}
      <aside id="instructions" className={styles.panel} aria-label="Instructions" hidden={!showPanel} tabIndex={0}>
        <p className={styles.stepLabel}>
          Step {state.step} of {state.last}
        </p>
        <p className={styles.instruction} aria-live="polite">
          {instruction}
        </p>
        <CreaseDiagram model={model} step={state.step} />
      </aside>

      <div className={styles.dock} data-testid="dock">
        <div className={styles.pill}>
          <button
            type="button"
            aria-label="Previous step"
            aria-disabled={state.step === 0 || state.playing}
            onClick={() => dispatch({ type: 'prev' })}
          >
            {'\u25C0\uFE0E'}
          </button>
          <button
            type="button"
            aria-label="Replay step"
            aria-disabled={state.step === 0 || state.playing}
            onClick={() => dispatch({ type: 'replay' })}
          >
            ↻
          </button>
          <button
            type="button"
            ref={nextRef}
            className={styles.primary}
            aria-label="Next step"
            aria-disabled={state.step === state.last || state.playing}
            onClick={() => dispatch({ type: 'next' })}
          >
            {'\u25B6\uFE0E'}
          </button>
          <button type="button" aria-label={`Speed ${state.speed}×`} onClick={() => dispatch({ type: 'cycleSpeed' })}>
            {state.speed}×
          </button>
          {webgl && (
            <button
              type="button"
              className={styles.big}
              aria-label="Reset view"
              onClick={() => setResetCount((n) => n + 1)}
            >
              ⟲
            </button>
          )}
          {!showPanel && (
            <span className={styles.count}>
              {state.step} / {state.last}
            </span>
          )}
        </div>
      </div>

      {status === 'done' && (
        <section className={styles.done} aria-labelledby="done-title">
          <h2 id="done-title" ref={doneRef} tabIndex={-1}>
            Well folded!
          </h2>
          <p>{entry.name} is complete.</p>
          <div className={styles.doneActions}>
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                dispatch({ type: 'goTo', step: 0 });
                nextRef.current?.focus();
              }}
            >
              Fold again
            </button>
            <Link to="/library">Back to library</Link>
          </div>
        </section>
      )}
    </main>
  );
}
