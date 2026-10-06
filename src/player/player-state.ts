export const SPEEDS = [0.5, 1, 1.5] as const;
export type Speed = (typeof SPEEDS)[number];
/** Seconds one step takes at 1×. */
export const STEP_SECONDS = 2.4;

export type PlayerState = { step: number; t: number; playing: boolean; direction: 1 | -1; speed: Speed; last: number };

export type PlayerAction =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'replay' }
  | { type: 'cycleSpeed' }
  | { type: 'tick'; dt: number }
  | { type: 'goTo'; step: number };

const clampStep = (step: number, last: number) => Math.max(0, Math.min(last, Math.trunc(step) || 0));

export function initPlayer(last: number, step: number, reducedMotion: boolean): PlayerState {
  return { step: clampStep(step, last), t: 1, playing: false, direction: 1, speed: reducedMotion ? 0.5 : 1, last };
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'cycleSpeed':
      return { ...state, speed: SPEEDS[(SPEEDS.indexOf(state.speed) + 1) % SPEEDS.length] };
    case 'tick': {
      if (!state.playing || !Number.isFinite(action.dt) || action.dt <= 0) return state;
      const t = state.t + (state.direction * action.dt * state.speed) / STEP_SECONDS;
      if (state.direction === 1 && t >= 1) return { ...state, t: 1, playing: false };
      if (state.direction === -1 && t <= 0)
        return { ...state, step: state.step - 1, t: 1, playing: false, direction: 1 };
      return { ...state, t };
    }
  }
  if (state.playing) return state;
  switch (action.type) {
    case 'next':
      return state.step >= state.last ? state : { ...state, step: state.step + 1, t: 0, playing: true, direction: 1 };
    case 'prev':
      return state.step === 0 ? state : { ...state, t: 1, playing: true, direction: -1 };
    case 'replay':
      return state.step === 0 ? state : { ...state, t: 0, playing: true, direction: 1 };
    case 'goTo':
      return { ...state, step: clampStep(action.step, state.last), t: 1, direction: 1 };
  }
}

export function playerStatus(state: PlayerState): 'idle' | 'playing' | 'done' {
  if (state.playing) return 'playing';
  return state.last > 0 && state.step === state.last ? 'done' : 'idle';
}
