import { describe, expect, it } from 'vitest';
import {
  initPlayer,
  LEAD_IN_SECONDS,
  type PlayerState,
  playerReducer,
  playerStatus,
  STEP_SECONDS
} from './player-state';

const run = (s: PlayerState, ...actions: Parameters<typeof playerReducer>[1][]) => actions.reduce(playerReducer, s);
const secs = (n: number) => ({ type: 'tick' as const, dt: n });

describe('player state', () => {
  it('starts idle on the requested step, clamped, at the end of that step', () => {
    expect(initPlayer(3, 2, false)).toMatchObject({ step: 2, t: 1, playing: false, speed: 1 });
    expect(initPlayer(3, 99, false).step).toBe(3);
    expect(initPlayer(3, -4, false).step).toBe(0);
  });

  it('defaults to half speed when reduced motion is preferred', () => {
    expect(initPlayer(3, 0, true).speed).toBe(0.5);
  });

  it('plays the next step once and stops', () => {
    let s = run(initPlayer(3, 0, false), { type: 'next' });
    expect(s).toMatchObject({ step: 1, t: 0, playing: true, direction: 1, hold: LEAD_IN_SECONDS });
    s = run(s, secs(LEAD_IN_SECONDS / 2));
    expect(s.t).toBe(0);
    s = run(s, secs(LEAD_IN_SECONDS / 2 + STEP_SECONDS / 2));
    expect(s.t).toBeCloseTo(0.5);
    s = run(s, secs(STEP_SECONDS));
    expect(s).toMatchObject({ step: 1, t: 1, playing: false });
  });

  it('ignores next, prev, replay and goTo while a step is playing', () => {
    const playing = run(initPlayer(3, 0, false), { type: 'next' }, secs(0.1));
    for (const a of [{ type: 'next' }, { type: 'prev' }, { type: 'replay' }, { type: 'goTo', step: 3 }] as const) {
      expect(playerReducer(playing, a)).toBe(playing);
    }
  });

  it('plays the current step backwards and settles on the previous one', () => {
    let s = run(initPlayer(3, 2, false), { type: 'prev' });
    expect(s).toMatchObject({ step: 2, t: 1, playing: true, direction: -1, hold: 0 });
    s = run(s, secs(STEP_SECONDS * 2));
    expect(s).toMatchObject({ step: 1, t: 1, playing: false, direction: 1 });
  });

  it('cannot go before the flat sheet or past the last step', () => {
    const first = initPlayer(3, 0, false);
    expect(playerReducer(first, { type: 'prev' })).toBe(first);
    expect(playerReducer(first, { type: 'replay' })).toBe(first);
    const last = initPlayer(3, 3, false);
    expect(playerReducer(last, { type: 'next' })).toBe(last);
  });

  it('replays the current step from the start', () => {
    expect(run(initPlayer(3, 2, false), { type: 'replay' })).toMatchObject({
      step: 2,
      t: 0,
      playing: true,
      hold: LEAD_IN_SECONDS
    });
  });

  it('respects speed', () => {
    const s = run(
      initPlayer(3, 0, false),
      { type: 'cycleSpeed' },
      { type: 'next' },
      secs((LEAD_IN_SECONDS + STEP_SECONDS / 2) / 1.5)
    );
    expect(s.speed).toBe(1.5);
    expect(s.t).toBeCloseTo(0.5);
    expect(run(s, { type: 'cycleSpeed' }).speed).toBe(2);
    expect(run(s, { type: 'cycleSpeed' }, { type: 'cycleSpeed' }).speed).toBe(0.5);
  });

  it('jumps to a clamped step with goTo', () => {
    expect(run(initPlayer(3, 3, false), { type: 'goTo', step: 0 })).toMatchObject({ step: 0, t: 1, playing: false });
    expect(run(initPlayer(3, 0, false), { type: 'goTo', step: 9 }).step).toBe(3);
  });

  it('reports done only when settled on the last step', () => {
    expect(playerStatus(initPlayer(3, 3, false))).toBe('done');
    expect(playerStatus(initPlayer(3, 2, false))).toBe('idle');
    expect(playerStatus(initPlayer(0, 0, false))).toBe('idle');
    expect(playerStatus(run(initPlayer(3, 2, false), { type: 'next' }))).toBe('playing');
  });

  it('carries leftover time from the lead-in into the fold', () => {
    const s = run(initPlayer(3, 0, false), { type: 'next' }, secs(LEAD_IN_SECONDS + STEP_SECONDS / 4));
    expect(s.hold).toBe(0);
    expect(s.t).toBeCloseTo(0.25);
  });

  it('scrubs to a point in the current step and pauses there', () => {
    const playing = run(initPlayer(3, 1, false), { type: 'next' }, secs(1));
    const s = run(playing, { type: 'scrub', t: 0.4 });
    expect(s).toMatchObject({ step: 2, t: 0.4, playing: false, hold: 0 });
    expect(run(s, { type: 'scrub', t: 7 }).t).toBe(1);
    expect(run(s, { type: 'scrub', t: Number.NaN }).t).toBe(0.4);
  });

  it('cannot scrub the flat sheet', () => {
    const flat = initPlayer(3, 0, false);
    expect(playerReducer(flat, { type: 'scrub', t: 0.5 })).toBe(flat);
  });

  it('finishes the current step when Next is pressed part-way through it', () => {
    const s = run(initPlayer(3, 2, false), { type: 'scrub', t: 0.4 }, { type: 'next' });
    expect(s).toMatchObject({ step: 2, t: 0.4, playing: true, direction: 1, hold: 0 });
    expect(run(s, secs(STEP_SECONDS))).toMatchObject({ step: 2, t: 1, playing: false });
  });

  it('unfolds from the scrubbed point when Previous is pressed part-way through', () => {
    const s = run(initPlayer(3, 2, false), { type: 'scrub', t: 0.4 }, { type: 'prev' });
    expect(s).toMatchObject({ step: 2, t: 0.4, playing: true, direction: -1, hold: 0 });
    expect(run(s, secs(STEP_SECONDS))).toMatchObject({ step: 1, t: 1, playing: false });
  });

  it('is only done once the last step is fully folded', () => {
    const partWay = run(initPlayer(3, 3, false), { type: 'scrub', t: 0.3 });
    expect(playerStatus(partWay)).toBe('idle');
    expect(playerStatus(run(partWay, { type: 'scrub', t: 1 }))).toBe('done');
    expect(playerReducer(partWay, { type: 'next' }).playing).toBe(true);
  });

  it('ignores a NaN or negative tick', () => {
    const playing = run(initPlayer(3, 0, false), { type: 'next' }, secs(0.1));
    expect(playerReducer(playing, secs(Number.NaN))).toBe(playing);
    expect(playerReducer(playing, secs(-1))).toBe(playing);
  });

  it('ignores next during the lead-in', () => {
    const s = run(initPlayer(3, 0, false), { type: 'next' }, secs(0.1));
    expect(playerReducer(s, { type: 'next' })).toBe(s);
  });

  it('a scrub during the lead-in stops play', () => {
    const s = run(initPlayer(3, 0, false), { type: 'next' }, secs(0.1), { type: 'scrub', t: 0.3 });
    expect(s).toMatchObject({ playing: false, hold: 0, t: 0.3 });
  });
});
