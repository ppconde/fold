import { describe, expect, it } from 'vitest';
import { initPlayer, type PlayerState, playerReducer, playerStatus, STEP_SECONDS } from './player-state';

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
    expect(s).toMatchObject({ step: 1, t: 0, playing: true, direction: 1 });
    s = run(s, secs(STEP_SECONDS / 2));
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
    expect(s).toMatchObject({ step: 2, t: 1, playing: true, direction: -1 });
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
    expect(run(initPlayer(3, 2, false), { type: 'replay' })).toMatchObject({ step: 2, t: 0, playing: true });
  });

  it('respects speed', () => {
    const s = run(initPlayer(3, 0, false), { type: 'cycleSpeed' }, { type: 'next' }, secs(STEP_SECONDS / 3));
    expect(s.speed).toBe(1.5);
    expect(s.t).toBeCloseTo(0.5);
    expect(run(s, { type: 'cycleSpeed' }).speed).toBe(0.5);
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

  it('ignores a NaN or negative tick', () => {
    const playing = run(initPlayer(3, 0, false), { type: 'next' }, secs(0.1));
    expect(playerReducer(playing, secs(Number.NaN))).toBe(playing);
    expect(playerReducer(playing, secs(-1))).toBe(playing);
  });
});
