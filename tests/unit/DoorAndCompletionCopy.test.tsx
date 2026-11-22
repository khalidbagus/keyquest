/**
 * Clocktower door states, entry rules, and door copy with and without the built override.
 * Task 17.2 adds the Cleared state once the progress schema holds the lights.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9, 18.4, 18.5, 24.1
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameContextValue, GameState, ProgressState } from '../../src/types';

vi.mock('../../src/components/RiveMascot', () => ({ RiveMascot: () => null }));

const CHECKOUT = [
  'invisible-focus',
  'mouse-only-activation',
  'missing-accessible-name',
  'insufficient-contrast',
] as const;

/** Load the modules fresh, with the address carrying (or not) the built override. */
async function load(search: string) {
  window.history.replaceState(null, '', `/${search}`);
  vi.resetModules();
  const [game, rooms, schema, router, doors, completion, clocktowerRules, mascot] = await Promise.all([
    import('../../src/context/GameContext'),
    import('../../src/registry/roomsRegistry'),
    import('../../src/storage/progressSchema'),
    import('../../src/context/GameContext'),
    import('../../src/views/DoorSelectorView'),
    import('../../src/views/CompletionView'),
    import('../../src/engines/clocktowerRules'),
    import('../../src/context/MascotContext'),
  ]);
  return { game, rooms, schema, router, doors, completion, clocktowerRules, mascot };
}

function progressWith(
  base: ProgressState,
  { potion, pantryVerified = potion }: { potion: boolean; pantryVerified?: boolean }
): ProgressState {
  const progress: ProgressState = JSON.parse(JSON.stringify(base));
  for (const type of CHECKOUT) {
    progress.defects[type] = { ...progress.defects[type], discovered: true, repaired: true, verified: true };
  }
  progress.checkout = { lanternLit: true, candleAdded: true, orderPlaced: true, keyTaken: true };
  progress.defects['color-only-ingredients'] = {
    ...progress.defects['color-only-ingredients'],
    discovered: true,
    repaired: pantryVerified,
    verified: pantryVerified,
  };
  progress.pantry = { cauldron: [], brewed: potion, potionTaken: potion };
  return progress;
}

function reducerState(progress: ProgressState, game: GameState = { phase: 'doors' }) {
  return { game, progress };
}

function contextValue(progress: ProgressState, game: GameState): GameContextValue {
  return {
    state: game,
    dispatch: vi.fn(),
    progress,
    saveProgress: vi.fn(),
    resetProgress: vi.fn(),
    resetRoom: vi.fn(),
    clocktower: {
      checkpoints: [],
      lastCheckpoint: null,
      lanternLit: false,
      cluesFound: [],
      gateOpen: false,
      shortcutUnlocked: false,
      bellRings: [],
      lightsRestored: false,
    },
    world: { area: 'courtyard', arrival: { spawn: 'courtyard-west', seq: 0 } },
    preview: false,
    dispatchWorldAction: vi.fn(),
  };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.resetModules();
});

beforeEach(() => {
  window.localStorage.clear();
});

describe('Clocktower door state', () => {
  it('is Coming later when the room is not built, with or without the potion', async () => {
    const { game, rooms } = await load('');
    const base = game.createInitialProgressState();
    for (const potion of [false, true]) {
      expect(rooms.getDoorState(progressWith(base, { potion }), 'clocktower', false)).toBe('coming-soon');
    }
  });

  it('is published without the override: Locked without the potion, Open with it (Task 26)', async () => {
    const { game, rooms } = await load('');
    const base = game.createInitialProgressState();
    expect(rooms.isRoomBuilt('clocktower')).toBe(true);
    expect(rooms.getDoorState(progressWith(base, { potion: false }), 'clocktower')).toBe('locked');
    expect(rooms.getDoorState(progressWith(base, { potion: true }), 'clocktower')).toBe('available');
  });

  it('is Locked when built without the potion', async () => {
    const { game, rooms } = await load('');
    const progress = progressWith(game.createInitialProgressState(), { potion: false });
    expect(rooms.getDoorState(progress, 'clocktower', true)).toBe('locked');
  });

  it('is Open when built with the potion before the lights are restored', async () => {
    const { game, rooms } = await load('');
    const progress = progressWith(game.createInitialProgressState(), { potion: true });
    expect(rooms.getDoorState(progress, 'clocktower', true)).toBe('available');
  });

  it('is Locked again after a Pantry reset', async () => {
    const { game, rooms } = await load('?built=clocktower');
    const open = progressWith(game.createInitialProgressState(), { potion: true });
    expect(rooms.getDoorState(open, 'clocktower')).toBe('available');
    const reset = game.gameReducer(reducerState(open) as never, { type: 'RESET_ROOM', roomId: 'pantry' });
    expect(rooms.getDoorState(reset.progress, 'clocktower')).toBe('locked');
  });

  it('migrates a save with the potion but an unverified Pantry curse to Locked', async () => {
    const { game, rooms, schema } = await load('?built=clocktower');
    const bad = progressWith(game.createInitialProgressState(), { potion: true, pantryVerified: false });
    bad.pantry.potionTaken = true;
    const migrated = schema.migrateProgress(JSON.parse(JSON.stringify(bad)))!;
    expect(migrated.pantry.potionTaken).toBe(false);
    expect(rooms.getDoorState(migrated, 'clocktower')).toBe('locked');
  });

  it('migrates an unbuilt save to Coming later', async () => {
    const { game, rooms, schema } = await load('');
    const bad = progressWith(game.createInitialProgressState(), { potion: true, pantryVerified: false });
    const migrated = schema.migrateProgress(JSON.parse(JSON.stringify(bad)), false)!;
    expect(rooms.getDoorState(migrated, 'clocktower', false)).toBe('coming-soon');
  });

  it('never resumes into the Clocktower room when it is not built', async () => {
    const { game, schema } = await load('');
    const saved = progressWith(game.createInitialProgressState(), { potion: true });
    saved.currentRoom = 'clocktower';
    expect(schema.migrateProgress(JSON.parse(JSON.stringify(saved)), false)!.currentRoom).toBe('pantry');
  });
});

describe('ENTER_ROOM for the Clocktower', () => {
  it('enters the published room without the override when the potion is held (Task 26)', async () => {
    const { game } = await load('');
    const state = reducerState(progressWith(game.createInitialProgressState(), { potion: true }));
    const next = game.gameReducer(state as never, { type: 'ENTER_ROOM', roomId: 'clocktower' });
    expect(next.game).toEqual({ phase: 'challenge' });
    expect(next.progress.currentRoom).toBe('clocktower');
  });

  it('is rejected while the door is Locked, leaving the state untouched', async () => {
    const { game } = await load('?built=clocktower');
    const state = reducerState(progressWith(game.createInitialProgressState(), { potion: false }));
    const next = game.gameReducer(state as never, { type: 'ENTER_ROOM', roomId: 'clocktower' });
    expect(next).toBe(state);
    expect(next.progress.currentRoom).toBe(state.progress.currentRoom);
    expect(next.game).toEqual({ phase: 'doors' });
  });

  it('enters when built and the potion is held', async () => {
    const { game } = await load('?built=clocktower');
    const state = reducerState(progressWith(game.createInitialProgressState(), { potion: true }));
    const next = game.gameReducer(state as never, { type: 'ENTER_ROOM', roomId: 'clocktower' });
    expect(next.game).toEqual({ phase: 'challenge' });
    expect(next.progress.currentRoom).toBe('clocktower');
  });
});

describe('door and completion copy', () => {
  it('shows the published door as Open with no later-update text and no override (Task 26)', async () => {
    const { game, doors } = await load('');
    const progress = progressWith(game.createInitialProgressState(), { potion: true });
    render(
      <game.GameContext.Provider value={contextValue(progress, { phase: 'doors' })}>
        <doors.DoorSelectorView />
      </game.GameContext.Provider>
    );
    const door = screen.getByTestId('door-clocktower');
    expect(door.getAttribute('data-state')).toBe('available');
    expect(door.textContent).toContain('Open');
    expect(door.textContent).not.toContain('Coming later');
    expect(door.textContent).not.toContain('later update');
    expect(screen.getByTestId('enter-clocktower')).toBeTruthy();
  });

  it('shows Locked text without "later update" while built and without the potion', async () => {
    const { game, doors } = await load('?built=clocktower');
    const progress = progressWith(game.createInitialProgressState(), { potion: false });
    render(
      <game.GameContext.Provider value={contextValue(progress, { phase: 'doors' })}>
        <doors.DoorSelectorView />
      </game.GameContext.Provider>
    );
    const door = screen.getByTestId('door-clocktower');
    expect(door.getAttribute('data-state')).toBe('locked');
    expect(door.textContent).toContain('Locked');
    expect(door.textContent).toContain('Needs the lantern potion from the Potion Pantry.');
    expect(door.textContent).not.toContain('later update');
    expect(screen.queryByTestId('enter-clocktower')).toBeNull();
  });

  it('shows Open and one enabled Enter action while built with the potion', async () => {
    const { game, doors } = await load('?built=clocktower');
    const progress = progressWith(game.createInitialProgressState(), { potion: true });
    render(
      <game.GameContext.Provider value={contextValue(progress, { phase: 'doors' })}>
        <doors.DoorSelectorView />
      </game.GameContext.Provider>
    );
    const door = screen.getByTestId('door-clocktower');
    expect(door.getAttribute('data-state')).toBe('available');
    expect(door.textContent).toContain('Open');
    expect(door.textContent).not.toContain('later update');
    expect((screen.getByTestId('enter-clocktower') as HTMLButtonElement).disabled).toBe(false);
  });

  async function renderPantryCompletion(search: string, potion: boolean) {
    const { game, completion, mascot } = await load(search);
    const progress = progressWith(game.createInitialProgressState(), { potion });
    const value = contextValue(progress, {
      phase: 'completion',
      summary: {
        roomId: 'pantry',
        totalTime: 1000,
        defectsRepaired: ['color-only-ingredients'],
        hintsUsed: progress.hintsUsed,
        conceptsLearned: [],
      },
    });
    render(
      <mascot.MascotProvider>
        <game.GameContext.Provider value={value}>
          <completion.CompletionView />
        </game.GameContext.Provider>
      </mascot.MascotProvider>
    );
    return screen.getByTestId('next-door');
  }

  it('says Open in the Pantry summary without the override now that the room is published (Task 26)', async () => {
    const next = await renderPantryCompletion('', true);
    expect(next.textContent).toContain('Open');
    expect(next.textContent).not.toContain('Coming later');
    expect(next.textContent).not.toContain('later update');
  });

  it('says Open in the Pantry summary while built with the potion, with no later-update text', async () => {
    const next = await renderPantryCompletion('?built=clocktower', true);
    expect(next.textContent).toContain('Open');
    expect(next.textContent).not.toContain('later update');
  });
});
