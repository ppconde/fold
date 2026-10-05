import { useEffect, useReducer } from 'react';
import type { Model } from '../fold/types';
import { prefersReducedMotion } from './browser';
import { initPlayer, playerReducer } from './player-state';

export function usePlayer(model: Model, initialStep: number) {
  const [state, dispatch] = useReducer(playerReducer, undefined, () =>
    initPlayer(model.steps.length - 1, initialStep, prefersReducedMotion())
  );

  useEffect(() => {
    if (!state.playing) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      dispatch({ type: 'tick', dt: (now - last) / 1000 });
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.playing]);

  return [state, dispatch] as const;
}
