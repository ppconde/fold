export const SPEEDS = [0.5, 1, 1.5] as const;
export type Speed = (typeof SPEEDS)[number];
/** Seconds one step takes at 1×. */
export const STEP_SECONDS = 2.4;
/** Seconds (at 1×) the step's crease glows on the still paper before the fold starts. */
export const LEAD_IN_SECONDS = 0.6;

export type PlayerState = {
  step: number;
  t: number;
  playing: boolean;
  direction: 1 | -1;
  speed: Speed;
  last: number;
  /** Lead-in seconds (at 1×) still to wait before t starts moving. */
  hold: number;
};

export type PlayerAction =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'replay' }
  | { type: 'cycleSpeed' }
  | { type: 'tick'; dt: number }
  | { type: 'goTo'; step: number }
  | { type: 'scrub'; t: number };

const clampStep = (step: number, last: number) => Math.max(0, Math.min(last, Math.trunc(step) || 0));

export function initPlayer(last: number, step: number, reducedMotion: boolean): PlayerState {
  return {
    step: clampStep(step, last),
    t: 1,
    playing: false,
    direction: 1,
    speed: reducedMotion ? 0.5 : 1,
    last,
    hold: 0
  };
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'cycleSpeed':
      return { ...state, speed: SPEEDS[(SPEEDS.indexOf(state.speed) + 1) % SPEEDS.length] };
    case 'scrub':
      if (state.step === 0 || !Number.isFinite(action.t)) return state;
      return { ...state, t: Math.max(0, Math.min(1, action.t)), playing: false, direction: 1, hold: 0 };
    case 'tick': {
      if (!state.playing || !Number.isFinite(action.dt) || action.dt <= 0) return state;
      let moving = action.dt * state.speed;
      if (state.hold > 0) {
        if (moving < state.hold) return { ...state, hold: state.hold - moving };
        moving -= state.hold;
      }
      const t = state.t + (state.direction * moving) / STEP_SECONDS;
      if (state.direction === 1 && t >= 1) return { ...state, t: 1, playing: false, hold: 0 };
      if (state.direction === -1 && t <= 0)
        return { ...state, step: state.step - 1, t: 1, playing: false, direction: 1, hold: 0 };
      return { ...state, t, hold: 0 };
    }
  }
  if (state.playing) return state;
  switch (action.type) {
    case 'next':
      if (state.step > 0 && state.t < 1) return { ...state, playing: true, direction: 1, hold: 0 };
      return state.step >= state.last
        ? state
        : { ...state, step: state.step + 1, t: 0, playing: true, direction: 1, hold: LEAD_IN_SECONDS };
    case 'prev':
      return state.step === 0 ? state : { ...state, playing: true, direction: -1, hold: 0 };
    case 'replay':
      return state.step === 0 ? state : { ...state, t: 0, playing: true, direction: 1, hold: LEAD_IN_SECONDS };
    case 'goTo':
      return { ...state, step: clampStep(action.step, state.last), t: 1, direction: 1, hold: 0 };
  }
}

export function playerStatus(state: PlayerState): 'idle' | 'playing' | 'done' {
  if (state.playing) return 'playing';
  return state.last > 0 && state.step === state.last && state.t === 1 ? 'done' : 'idle';
}
