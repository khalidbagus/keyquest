/**
 * Game_Context wiring for World_Actions and the courtyard preview.
 * Requirements: 2.4, 3.3, 4.1, 4.3, 4.5, 4.6
 */
import { act, cleanup, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameProvider, createInitialProgressState, gameReducer, useGame } from '../../src/context/GameContext';
import type { GameContextValue, GameState, ProgressState } from '../../src/types';

const PROGRESS_STORAGE_KEY = 'keyquest-progress-v1';

function stateOf(progress: ProgressState, game: GameState = { phase: 'challenge' }) {
  return gameReducer(
    { game, progress } as never,
    { type: 'START_LOADING' }
  );
}

function potionProgress(): ProgressState {
  const progress = createInitialProgressState();
  progress.pantry = { cauldron: [], brewed: true, potionTaken: true };
  return progress;
}

describe('WORLD_ACTION in the reducer', () => {
  it('applies an accepted lantern action', () => {
    const start = gameReducer(stateOf(potionProgress()), { type: 'ENTER_COURTYARD_PREVIEW' });
    const next = gameReducer(start, { type: 'WORLD_ACTION', action: { type: 'light-lantern' } });
    expect(next).not.toBe(start);
    expect(next.progress.clocktower.lanternLit).toBe(true);
  });

  it('returns the same state object for a repeated action', () => {
    const start = gameReducer(stateOf(potionProgress()), { type: 'ENTER_COURTYARD_PREVIEW' });
    const lit = gameReducer(start, { type: 'WORLD_ACTION', action: { type: 'light-lantern' } });
    expect(gameReducer(lit, { type: 'WORLD_ACTION', action: { type: 'light-lantern' } })).toBe(lit);
  });

  it('returns the same state object for a rejected action (no potion)', () => {
    const state = stateOf(createInitialProgressState());
    expect(gameReducer(state, { type: 'WORLD_ACTION', action: { type: 'light-lantern' } })).toBe(state);
  });

  it('returns the same state object for an invalid action', () => {
    const state = stateOf(potionProgress());
    const bad = { type: 'enter-area', area: 'nowhere', spawn: 'x' } as never;
    expect(gameReducer(state, { type: 'WORLD_ACTION', action: bad })).toBe(state);
  });
});

describe('ENTER_COURTYARD_PREVIEW in the reducer', () => {
  it('builds the same preview state on every activation', () => {
    const base = stateOf(createInitialProgressState(), { phase: 'menu' });
    const once = gameReducer(base, { type: 'ENTER_COURTYARD_PREVIEW' });
    const twice = gameReducer(once, { type: 'ENTER_COURTYARD_PREVIEW' });
    for (const state of [once, twice]) {
      expect(state.game).toEqual({ phase: 'challenge' });
      expect(state.progress.currentRoom).toBe('clocktower');
      expect(state.progress.pantry.potionTaken).toBe(true);
      expect(state.progress.clocktower.lanternLit).toBe(false);
      expect(state.session).toEqual({ area: 'courtyard', arrival: { spawn: 'courtyard-west', seq: 1 } });
    }
    expect(twice.preview?.stash).toBe(base.progress);
  });

  it('keeps the real progress in the stash and restores it on Emergency Exit', () => {
    const real = createInitialProgressState();
    real.checkout.lanternLit = true;
    const base = stateOf(real, { phase: 'menu' });
    let state = gameReducer(base, { type: 'ENTER_COURTYARD_PREVIEW' });
    state = gameReducer(state, { type: 'WORLD_ACTION', action: { type: 'light-lantern' } });
    state = gameReducer(state, { type: 'EMERGENCY_EXIT' });
    expect(state.game).toEqual({ phase: 'menu' });
    expect(state.progress).toBe(real);
    expect(state.preview).toBeNull();
    expect(state.progress.clocktower.lanternLit).toBe(false);
  });

  it('does nothing when the build is not a development build', () => {
    vi.stubEnv('DEV', false);
    try {
      const base = stateOf(createInitialProgressState(), { phase: 'menu' });
      expect(gameReducer(base, { type: 'ENTER_COURTYARD_PREVIEW' })).toBe(base);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('GameProvider storage writes', () => {
  let game: GameContextValue | null = null;

  function Probe() {
    const value = useGame();
    useEffect(() => {
      game = value;
    });
    return null;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    game = null;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.localStorage.clear();
  });

  function mount() {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );
  }

  it('leaves an absent save absent through the preview, a lantern action, and exit', () => {
    mount();
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    act(() => game!.dispatch({ type: 'ENTER_COURTYARD_PREVIEW' }));
    expect(game!.preview).toBe(true);
    act(() => {
      game!.dispatchWorldAction({ type: 'light-lantern' });
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => game!.saveProgress());
    expect(game!.clocktower.lanternLit).toBe(true);
    act(() => game!.dispatch({ type: 'EMERGENCY_EXIT' }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
    expect(writes.mock.calls.filter(([key]) => key === PROGRESS_STORAGE_KEY)).toHaveLength(0);
    writes.mockRestore();
  });

  it('keeps an existing save byte-identical through the preview', () => {
    const saved = createInitialProgressState();
    saved.checkout.lanternLit = true;
    saved.checkout.candleAdded = true;
    const raw = JSON.stringify({ ...saved, version: 2 });
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, raw);
    mount();
    act(() => game!.dispatch({ type: 'ENTER_COURTYARD_PREVIEW' }));
    act(() => {
      game!.dispatchWorldAction({ type: 'light-lantern' });
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => game!.saveProgress());
    expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).toBe(raw);
    act(() => game!.dispatch({ type: 'EMERGENCY_EXIT' }));
    expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).toBe(raw);
    expect(game!.progress.checkout.candleAdded).toBe(true);
  });

  it('makes no storage write for a rejected or repeated world action', () => {
    mount();
    act(() => game!.dispatch({ type: 'ENTER_COURTYARD_PREVIEW' }));
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    let first: ReturnType<GameContextValue['dispatchWorldAction']> | null = null;
    let second: ReturnType<GameContextValue['dispatchWorldAction']> | null = null;
    act(() => {
      first = game!.dispatchWorldAction({ type: 'light-lantern' });
      second = game!.dispatchWorldAction({ type: 'light-lantern' });
    });
    expect(first!.kind).toBe('changed');
    // Two calls in one event: the second sees the first's change.
    expect(second!.kind).toBe('repeat');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(writes.mock.calls.filter(([key]) => key === PROGRESS_STORAGE_KEY)).toHaveLength(0);
    writes.mockRestore();
  });
});
