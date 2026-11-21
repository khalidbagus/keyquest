/**
 * Unit tests for the Midnight Checkout room: objective stages, Buy Now
 * outcomes, room-action guards, and migration of older version 1 saves.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createInitialProgressState, gameReducer } from '../../src/context/GameContext';
import {
  canPerformRoomAction,
  getBuyNowOutcome,
  getCheckoutStage,
  normalizeCheckoutState,
} from '../../src/registry/roomRegistry';
import { StorageAdapter } from '../../src/storage/StorageAdapter';
import { getMeaningfulSavedProgress } from '../../src/storage/progressHelpers';
import type { DefectType, GameState, ProgressState } from '../../src/types';

const ALL: DefectType[] = [
  'invisible-focus',
  'mouse-only-activation',
  'missing-accessible-name',
  'insufficient-contrast',
];

function withDefects(
  overrides: Partial<Record<DefectType, { discovered?: boolean; verified?: boolean }>>,
  checkout: Partial<ProgressState['checkout']> = {}
): ProgressState {
  const progress = createInitialProgressState();
  for (const [type, value] of Object.entries(overrides)) {
    const t = type as DefectType;
    progress.defects[t] = {
      ...progress.defects[t],
      discovered: value?.discovered ?? value?.verified ?? false,
      repaired: value?.verified ?? false,
      verified: value?.verified ?? false,
    };
  }
  progress.checkout = { ...progress.checkout, ...checkout };
  return progress;
}

const allVerified = Object.fromEntries(ALL.map((t) => [t, { verified: true }]));

describe('getCheckoutStage', () => {
  it('walks find → repair → light lantern → finish order → place order → take key', () => {
    expect(getCheckoutStage(withDefects({}))).toBe('find-lantern-curse');
    expect(getCheckoutStage(withDefects({ 'invisible-focus': { discovered: true } }))).toBe(
      'repair-lantern-curse'
    );
    expect(getCheckoutStage(withDefects({ 'invisible-focus': { verified: true } }))).toBe(
      'light-lantern'
    );
    expect(
      getCheckoutStage(withDefects({ 'invisible-focus': { verified: true } }, { lanternLit: true }))
    ).toBe('finish-order');
    expect(getCheckoutStage(withDefects(allVerified, { lanternLit: true }))).toBe('place-order');
    expect(
      getCheckoutStage(withDefects(allVerified, { lanternLit: true, orderPlaced: true }))
    ).toBe('take-key');
  });

  it('keeps the lantern as the job even when other curses were fixed first', () => {
    const progress = withDefects({ 'mouse-only-activation': { verified: true } });
    expect(getCheckoutStage(progress)).toBe('find-lantern-curse');
  });
});

describe('getBuyNowOutcome', () => {
  it('discovers the focus curse before it is found and blocks until verified', () => {
    expect(getBuyNowOutcome(withDefects({})).kind).toBe('discover');
    expect(getBuyNowOutcome(withDefects({ 'invisible-focus': { discovered: true } })).kind).toBe(
      'blocked'
    );
  });

  it('lights the lantern once focus is verified', () => {
    const outcome = getBuyNowOutcome(withDefects({ 'invisible-focus': { verified: true } }));
    expect(outcome).toMatchObject({ kind: 'room-action', action: 'light-lantern' });
  });

  it('reports remaining curses, then an empty order, then places the order', () => {
    const lit = { lanternLit: true };
    const remaining = getBuyNowOutcome(withDefects({ 'invisible-focus': { verified: true } }, lit));
    expect(remaining.kind).toBe('blocked');
    expect(remaining.kind === 'blocked' && remaining.status).toContain('3 curses left');

    const empty = getBuyNowOutcome(withDefects(allVerified, lit));
    expect(empty.kind === 'blocked' && empty.status).toContain('Add the candle');

    const ready = getBuyNowOutcome(withDefects(allVerified, { ...lit, candleAdded: true }));
    expect(ready).toMatchObject({ kind: 'room-action', action: 'place-order' });
  });
});

describe('ROOM_ACTION reducer guards', () => {
  const game: GameState = { phase: 'challenge' };

  it('ignores lighting the lantern before the focus repair is verified', () => {
    const state = { game, progress: withDefects({ 'invisible-focus': { discovered: true } }) };
    const next = gameReducer(state, { type: 'ROOM_ACTION', action: 'light-lantern' });
    expect(next).toBe(state);
    expect(canPerformRoomAction(state.progress, 'light-lantern')).toBe(false);
  });

  it('lights the lantern and places the order only when allowed', () => {
    let state = { game, progress: withDefects(allVerified) };
    state = gameReducer(state, { type: 'ROOM_ACTION', action: 'place-order' });
    expect(state.progress.checkout.orderPlaced).toBe(false);
    state = gameReducer(state, { type: 'ROOM_ACTION', action: 'light-lantern' });
    state = gameReducer(state, { type: 'ROOM_ACTION', action: 'add-candle' });
    state = gameReducer(state, { type: 'ROOM_ACTION', action: 'place-order' });
    expect(state.progress.checkout).toEqual({
      lanternLit: true,
      candleAdded: true,
      orderPlaced: true,
      keyTaken: false,
    });
    expect(state.game.phase).toBe('challenge');
  });

  it('hydrates saved progress without changing phase', () => {
    const saved = withDefects({ 'invisible-focus': { verified: true } });
    const state = { game: { phase: 'menu' } as GameState, progress: createInitialProgressState() };
    const next = gameReducer(state, { type: 'HYDRATE_PROGRESS', progress: saved });
    expect(next.game.phase).toBe('menu');
    expect(next.progress).toBe(saved);
  });
});

describe('saved progress migration', () => {
  afterEach(() => localStorage.clear());

  it('loads an older version 1 save without room actions and keeps its repairs', () => {
    const legacy = withDefects({
      'invisible-focus': { verified: true },
      'mouse-only-activation': { discovered: true },
    }) as Partial<ProgressState>;
    delete legacy.checkout;
    legacy.hintsUsed = { ...legacy.hintsUsed!, 'invisible-focus': 2 };
    localStorage.setItem('keyquest-progress-v1', JSON.stringify(legacy));

    const loaded = new StorageAdapter().loadProgress();
    expect(loaded).not.toBeNull();
    expect(loaded!.checkout).toEqual({
      lanternLit: false,
      candleAdded: false,
      orderPlaced: false,
      keyTaken: false,
    });
    expect(loaded!.defects['invisible-focus'].verified).toBe(true);
    expect(loaded!.defects['mouse-only-activation'].discovered).toBe(true);
    expect(loaded!.hintsUsed['invisible-focus']).toBe(2);
    expect(getMeaningfulSavedProgress()).not.toBeNull();
  });

  it('treats malformed room actions as unset and keeps finished saves resumable', () => {
    expect(normalizeCheckoutState({ lanternLit: 'yes', orderPlaced: true })).toEqual({
      lanternLit: false,
      candleAdded: false,
      orderPlaced: true,
      keyTaken: false,
    });
    const done = withDefects(allVerified);
    done.isComplete = true;
    done.completedAt = Date.now();
    localStorage.setItem('keyquest-progress-v1', JSON.stringify(done));
    // With rooms, a finished save is no longer discarded: it resumes (the
    // completion flag is recomputed from room state, not trusted).
    const resumed = getMeaningfulSavedProgress();
    expect(resumed).not.toBeNull();
    expect(resumed!.isComplete).toBe(false);
  });
});
