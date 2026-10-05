import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
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
  const [resetCount, setResetCount] = useState(0);
  const [webgl] = useState(hasWebGL);
  const showPanel = panelOpen || !webgl;
  const instruction = state.step === 0 ? FIRST_INSTRUCTION : model.steps[state.step].instruction;

  const togglePanel = (open: boolean) => {
    setPanelOpen(open);
    writePanelOpen(open);
  };

  useEffect(() => {
    if (!state.playing) onSettle(state.step);
  }, [state.playing, state.step, onSettle]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]') || e.altKey || e.ctrlKey || e.metaKey) return;
      const onControl = e.target instanceof Element && e.target.closest('button, a, input, textarea, select');
      if (e.key === 'ArrowRight') dispatch({ type: 'next' });
      else if (e.key === 'ArrowLeft') dispatch({ type: 'prev' });
      else if (e.key === ' ' && !onControl) {
        e.preventDefault();
        dispatch({ type: 'replay' });
      } else if (e.key === 'r' || e.key === 'R') setResetCount((n) => n + 1);
      else if (e.key === 'Escape') setPanelOpen(false);
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
          <Stage model={model} step={state.step} t={state.t} resetCount={resetCount} />
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
            ◀
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
            className={styles.primary}
            aria-label="Next step"
            aria-disabled={state.step === state.last || state.playing}
            onClick={() => dispatch({ type: 'next' })}
          >
            ▶
          </button>
          <button type="button" aria-label={`Speed ${state.speed}×`} onClick={() => dispatch({ type: 'cycleSpeed' })}>
            {state.speed}×
          </button>
          {webgl && (
            <button type="button" aria-label="Reset view" onClick={() => setResetCount((n) => n + 1)}>
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
          <h2 id="done-title">Well folded!</h2>
          <p>{entry.name} is complete.</p>
          <div className={styles.doneActions}>
            <button type="button" className={styles.primary} onClick={() => dispatch({ type: 'goTo', step: 0 })}>
              Fold again
            </button>
            <Link to="/library">Back to library</Link>
          </div>
        </section>
      )}
    </main>
  );
}
