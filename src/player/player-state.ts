export const SPEEDS = [0.5, 1, 1.5, 2] as const;
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
  if (state.playing) {
    // a press against the running fold turns it around where it is
    if (action.type === 'next' && state.direction === -1) return { ...state, direction: 1, hold: 0 };
    if (action.type === 'prev' && state.direction === 1) return { ...state, direction: -1, hold: 0 };
  }
  // anything else skips the running fold to where it was heading, then acts from there
  const s = state.playing ? settle(state) : state;
  switch (action.type) {
    case 'next':
      if (s.step > 0 && s.t < 1) return { ...s, playing: true, direction: 1, hold: 0 };
      return s.step >= s.last
        ? s
        : { ...s, step: s.step + 1, t: 0, playing: true, direction: 1, hold: LEAD_IN_SECONDS };
    case 'prev':
      return s.step === 0 ? s : { ...s, playing: true, direction: -1, hold: 0 };
    case 'replay':
      return s.step === 0 ? s : { ...s, t: 0, playing: true, direction: 1, hold: LEAD_IN_SECONDS };
    case 'goTo':
      return { ...s, step: clampStep(action.step, s.last), t: 1, direction: 1, hold: 0 };
  }
}

const settle = (state: PlayerState): PlayerState => ({
  ...state,
  step: state.direction === 1 ? state.step : state.step - 1,
  t: 1,
  playing: false,
  direction: 1,
  hold: 0
});

export function playerStatus(state: PlayerState): 'idle' | 'playing' | 'done' {
  if (state.playing) return 'playing';
  return state.last > 0 && state.step === state.last && state.t === 1 ? 'done' : 'idle';
}
