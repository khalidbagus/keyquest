/**
 * Clocktower reset, Start over, meaningful progress, Checkpoints, and resume in
 * the Game_Context.
 * Requirements: 14.4, 17.1, 17.2, 17.3, 17.5, 17.6, 17.7, 17.8, 17.9, 24.8, 24.9
 */
import { act, cleanup, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameProvider, createInitialProgressState, gameReducer, useGame } from '../../src/context/GameContext';
import { INITIAL_CLOCKTOWER_STATE } from '../../src/engines/clocktowerRules';
import { hasMeaningfulProgress } from '../../src/storage/progressHelpers';
import type {
  ClocktowerState,
  DefectType,
  GameContextValue,
  GameState,
  ProgressState,
} from '../../src/types';

// The room is tested through the development built override, as in the browser tests.
vi.mock('../../src/registry/devFlags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/registry/devFlags')>()),
  DEV_FLAGS: { preview: null, built: new Set(['clocktower']) },
}));

const KEY = 'keyquest-progress-v1';
const CHECKOUT: DefectType[] = [
  'invisible-focus',
  'mouse-only-activation',
  'missing-accessible-name',
  'insufficient-contrast',
];

const ROUTE: ClocktowerState = {
  checkpoints: ['apothecary-exit', 'courtyard', 'graveyard'],
  lastCheckpoint: 'graveyard',
  lanternLit: true,
  cluesFound: ['moon'],
  gateOpen: false,
  shortcutUnlocked: false,
  bellRings: [],
  lightsRestored: false,
};

function pantryCleared(clocktower: ClocktowerState = ROUTE): ProgressState {
  const base = createInitialProgressState();
  const defects = { ...base.defects };
  for (const type of [...CHECKOUT, 'color-only-ingredients'] as DefectType[]) {
    defects[type] = { ...defects[type], discovered: true, repaired: true, verified: true, verifiedAt: 1 };
  }
  return {
    ...base,
    defects,
    hintsUsed: { ...base.hintsUsed, 'bell-dialog-focus': 2 },
    currentRoom: 'clocktower',
    checkout: { lanternLit: true, candleAdded: true, orderPlaced: true, keyTaken: true },
    pantry: { cauldron: ['moonpetal', 'ember-salt', 'glowcap'], brewed: true, potionTaken: true },
    clocktower,
  };
}

function reducerState(progress: ProgressState, game: GameState = { phase: 'challenge' }) {
  return gameReducer({ game, progress } as never, { type: 'START_LOADING' });
}

describe('Clocktower reset in the reducer', () => {
  it('clears Clocktower_State, the bell curse, and its hints, and keeps the other rooms and the potion', () => {
    const progress = pantryCleared();
    progress.defects['bell-dialog-focus'] = {
      ...progress.defects['bell-dialog-focus'],
      discovered: true,
      hintLevel: 2,
    };
    const state = reducerState(progress);
    const reset = gameReducer(state, { type: 'RESET_ROOM', roomId: 'clocktower' });
    expect(reset.progress.clocktower).toEqual(INITIAL_CLOCKTOWER_STATE);
    expect(reset.progress.defects['bell-dialog-focus']).toMatchObject({ discovered: false, hintLevel: 0 });
    expect(reset.progress.hintsUsed['bell-dialog-focus']).toBe(0);
    expect(reset.progress.checkout).toEqual(progress.checkout);
    expect(reset.progress.pantry).toEqual(progress.pantry);
    for (const type of [...CHECKOUT, 'color-only-ingredients'] as DefectType[]) {
      expect(reset.progress.defects[type]).toEqual(progress.defects[type]);
    }
  });

  it('puts the Ghost at the Apothecary Exit spawn after a reset in the room', () => {
    const state = reducerState(pantryCleared());
    const reset = gameReducer(state, { type: 'RESET_ROOM', roomId: 'clocktower' });
    expect(reset.session.area).toBe('apothecary-exit');
    expect(reset.session.arrival.spawn).toBe('apothecary-start');
    // A new arrival, so the scene teleports even when the Area does not change.
    expect(reset.session.arrival.seq).toBeGreaterThan(0);
  });

  it('clears the route when the Pantry is reset, because the potion goes back', () => {
    const reset = gameReducer(reducerState(pantryCleared()), { type: 'RESET_ROOM', roomId: 'pantry' });
    expect(reset.progress.pantry.potionTaken).toBe(false);
    expect(reset.progress.clocktower).toEqual(INITIAL_CLOCKTOWER_STATE);
  });

  it('Start over clears every room', () => {
    const reset = gameReducer(reducerState(pantryCleared()), { type: 'RESET_CHALLENGE' });
    expect(reset.progress.clocktower).toEqual(INITIAL_CLOCKTOWER_STATE);
    expect(reset.progress.checkout.keyTaken).toBe(false);
    expect(reset.progress.pantry.potionTaken).toBe(false);
  });
});

describe('meaningful progress', () => {
  it('counts a save whose only progress is Clocktower_State', () => {
    const empty = createInitialProgressState();
    expect(hasMeaningfulProgress(empty)).toBe(false);
    expect(hasMeaningfulProgress({ ...empty, clocktower: { ...INITIAL_CLOCKTOWER_STATE, checkpoints: ['apothecary-exit'], lastCheckpoint: 'apothecary-exit' } })).toBe(true);
    expect(hasMeaningfulProgress({ ...empty, clocktower: { ...INITIAL_CLOCKTOWER_STATE, lanternLit: true } })).toBe(true);
  });
});

describe('Checkpoints and resume in the reducer', () => {
  it('Resume into the Clocktower starts at the last Checkpoint with the route state kept', () => {
    const state = reducerState(pantryCleared(), { phase: 'menu' });
    const resumed = gameReducer(state, { type: 'START_CHALLENGE' });
    expect(resumed.game.phase).toBe('challenge');
    expect(resumed.session).toMatchObject({ area: 'graveyard', arrival: { spawn: 'graveyard-west' } });
    expect(resumed.progress.clocktower).toEqual(ROUTE);
  });

  it('starts at the Apothecary Exit when no Checkpoint is recorded', () => {
    const state = reducerState(pantryCleared(INITIAL_CLOCKTOWER_STATE), { phase: 'menu' });
    const resumed = gameReducer(state, { type: 'START_CHALLENGE' });
    expect(resumed.session).toMatchObject({ area: 'apothecary-exit', arrival: { spawn: 'apothecary-start' } });
  });

  it('a move within known Areas changes only the session, so progress is not rewritten', () => {
    const state = gameReducer(reducerState(pantryCleared(), { phase: 'menu' }), { type: 'START_CHALLENGE' });
    const moved = gameReducer(state, {
      type: 'WORLD_ACTION',
      action: { type: 'enter-area', area: 'courtyard', spawn: 'courtyard-east-side' },
    });
    expect(moved.session.area).toBe('courtyard');
    expect(moved.progress).toBe(state.progress);
  });
});

describe('GameProvider saves', () => {
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

  function mount(progress: ProgressState) {
    window.localStorage.setItem(KEY, JSON.stringify(progress));
    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );
  }

  it('saves a new Checkpoint at once, before the autosave delay', () => {
    // Courtyard entered, lantern lit; the next move enters the graveyard for the first time.
    mount(
      pantryCleared({
        ...ROUTE,
        checkpoints: ['apothecary-exit', 'courtyard'],
        lastCheckpoint: 'courtyard',
        cluesFound: [],
      })
    );
    act(() => game!.dispatch({ type: 'START_CHALLENGE' }));
    expect(game!.world.area).toBe('courtyard');
    act(() => {
      game!.dispatchWorldAction({ type: 'enter-area', area: 'graveyard', spawn: 'graveyard-west' });
    });
    const saved = JSON.parse(window.localStorage.getItem(KEY)!) as ProgressState;
    expect(saved.version).toBe(3);
    expect(saved.clocktower.lastCheckpoint).toBe('graveyard');
    expect(saved.clocktower.checkpoints).toEqual(['apothecary-exit', 'courtyard', 'graveyard']);
  });

  it('a confirmed Clocktower reset saves at once and a cancelled one changes nothing', () => {
    mount(pantryCleared());
    act(() => game!.dispatch({ type: 'START_CHALLENGE' }));
    const before = window.localStorage.getItem(KEY);
    // Cancelling is the view closing its dialog: no dispatch, no write.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(window.localStorage.getItem(KEY)).toBe(before);
    act(() => game!.resetRoom('clocktower'));
    const saved = JSON.parse(window.localStorage.getItem(KEY)!) as ProgressState;
    expect(saved.clocktower).toEqual(INITIAL_CLOCKTOWER_STATE);
    expect(saved.pantry.potionTaken).toBe(true);
    expect(saved.checkout.keyTaken).toBe(true);
    expect(game!.world.area).toBe('apothecary-exit');
  });

  it('a malformed saved route loads as the initial state and keeps the other rooms', () => {
    const progress = pantryCleared();
    window.localStorage.setItem(KEY, JSON.stringify({ ...progress, clocktower: { lanternLit: 'on' } }));
    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );
    expect(game!.progress.clocktower).toEqual(INITIAL_CLOCKTOWER_STATE);
    expect(game!.progress.pantry.potionTaken).toBe(true);
  });
});
