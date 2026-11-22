/**
 * Save schema version 3: migration from versions 1 and 2, the prerequisite chain,
 * malformed parts, the current-room fallback, rejection, and round trips.
 * Requirements: 1.4, 16.1 to 16.9, 18.3, 18.6, 24.1, 24.5, 24.6, 24.7
 */
import { describe, expect, it } from 'vitest';
import { StorageAdapter } from '../../src/storage/StorageAdapter';
import {
  PROGRESS_VERSION,
  createInitialProgressState,
  migrateProgress,
} from '../../src/storage/progressSchema';
import {
  INITIAL_CLOCKTOWER_STATE,
  normalizeClocktowerState,
} from '../../src/engines/clocktowerRules';
import { getDoorState, isAdventureComplete } from '../../src/registry/roomsRegistry';
import type { ClocktowerState, DefectType, ProgressState } from '../../src/types';

const CHECKOUT: DefectType[] = [
  'invisible-focus',
  'mouse-only-activation',
  'missing-accessible-name',
  'insufficient-contrast',
];

function verified(progress: ProgressState, types: DefectType[]): ProgressState {
  const defects = { ...progress.defects };
  for (const type of types) {
    defects[type] = {
      ...defects[type],
      discovered: true,
      discoveredAt: 1,
      repaired: true,
      repairedAt: 2,
      verified: true,
      verifiedAt: 3,
    };
  }
  return { ...progress, defects };
}

/** Checkout and Pantry cleared, the potion held. */
function pantryCleared(): ProgressState {
  const base = verified(createInitialProgressState(), [...CHECKOUT, 'color-only-ingredients']);
  return {
    ...base,
    currentRoom: 'pantry',
    checkout: { lanternLit: true, candleAdded: true, orderPlaced: true, keyTaken: true },
    pantry: { cauldron: ['moonpetal', 'ember-salt', 'glowcap'], brewed: true, potionTaken: true },
    hintsUsed: { ...base.hintsUsed, 'invisible-focus': 2, 'color-only-ingredients': 1 },
  };
}

/** A version 2 save as an older build wrote it: no Clocktower part, no bell curse. */
function asVersion2(progress: ProgressState): Record<string, unknown> {
  const raw = JSON.parse(JSON.stringify(progress)) as Record<string, unknown>;
  raw.version = 2;
  delete raw.clocktower;
  delete (raw.defects as Record<string, unknown>)['bell-dialog-focus'];
  delete (raw.hintsUsed as Record<string, unknown>)['bell-dialog-focus'];
  return raw;
}

const ROUTE: ClocktowerState = {
  checkpoints: ['apothecary-exit', 'courtyard', 'graveyard', 'passage'],
  lastCheckpoint: 'passage',
  lanternLit: true,
  cluesFound: ['moon', 'thorn', 'key'],
  gateOpen: true,
  shortcutUnlocked: true,
  bellRings: [],
  lightsRestored: false,
};

describe('migration to version 3', () => {
  it('writes version 3', () => {
    expect(PROGRESS_VERSION).toBe(3);
    expect(createInitialProgressState().version).toBe(3);
    expect(createInitialProgressState().clocktower).toEqual(INITIAL_CLOCKTOWER_STATE);
  });

  it('keeps a version 2 save’s Checkout and Pantry and adds the initial Clocktower part and bell curse', () => {
    const saved = pantryCleared();
    const migrated = migrateProgress(asVersion2(saved), false)!;
    expect(migrated.version).toBe(3);
    expect(migrated.checkout).toEqual(saved.checkout);
    expect(migrated.pantry).toEqual(saved.pantry);
    for (const type of [...CHECKOUT, 'color-only-ingredients'] as DefectType[]) {
      expect(migrated.defects[type]).toEqual(saved.defects[type]);
      expect(migrated.hintsUsed[type]).toBe(saved.hintsUsed[type]);
    }
    expect(migrated.clocktower).toEqual(INITIAL_CLOCKTOWER_STATE);
    expect(migrated.defects['bell-dialog-focus']).toMatchObject({
      discovered: false,
      repaired: false,
      verified: false,
      hintLevel: 0,
    });
    expect(migrated.hintsUsed['bell-dialog-focus']).toBe(0);
  });

  it('migrates a version 1 save (Checkout only) to version 3', () => {
    const v1 = asVersion2(verified(createInitialProgressState(), CHECKOUT));
    v1.version = 1;
    v1.isComplete = true;
    delete v1.checkout;
    delete v1.pantry;
    delete v1.currentRoom;
    delete (v1.defects as Record<string, unknown>)['color-only-ingredients'];
    delete (v1.hintsUsed as Record<string, unknown>)['color-only-ingredients'];
    const migrated = migrateProgress(v1, true)!;
    expect(migrated.version).toBe(3);
    expect(migrated.checkout.keyTaken).toBe(true);
    expect(migrated.defects['invisible-focus'].verified).toBe(true);
    expect(migrated.clocktower).toEqual(INITIAL_CLOCKTOWER_STATE);
    expect(migrated.defects['bell-dialog-focus'].verified).toBe(false);
    expect(migrated.currentRoom).toBe('pantry');
  });

  it('keeps a valid Clocktower part of a version 3 save', () => {
    const saved = { ...pantryCleared(), clocktower: ROUTE };
    expect(migrateProgress(JSON.parse(JSON.stringify(saved)), true)!.clocktower).toEqual(ROUTE);
  });

  it('rejects unsupported versions', () => {
    const raw = JSON.parse(JSON.stringify(pantryCleared())) as Record<string, unknown>;
    for (const version of [0, 4, '3', null, undefined]) {
      expect(migrateProgress({ ...raw, version }, true), String(version)).toBeNull();
    }
  });
});

describe('clearing Clocktower fields whose prerequisite is unmet', () => {
  function load(clocktower: unknown, progress: ProgressState = pantryCleared()): ClocktowerState {
    const raw = JSON.parse(JSON.stringify({ ...progress, clocktower })) as Record<string, unknown>;
    return migrateProgress(raw, true)!.clocktower;
  }

  it('replaces the Clocktower part with the initial state without the potion', () => {
    const progress = pantryCleared();
    progress.pantry = { cauldron: [], brewed: false, potionTaken: false };
    expect(load(ROUTE, progress)).toEqual(INITIAL_CLOCKTOWER_STATE);
  });

  it('closes an open gate with fewer than three Clues, with the shortcut and the Belfry checkpoint', () => {
    const result = load({
      ...ROUTE,
      checkpoints: [...ROUTE.checkpoints, 'belfry'],
      lastCheckpoint: 'belfry',
      cluesFound: ['moon', 'key'],
    });
    expect(result).toMatchObject({
      cluesFound: ['moon', 'key'],
      gateOpen: false,
      shortcutUnlocked: false,
      checkpoints: ['apothecary-exit', 'courtyard', 'graveyard'],
      lastCheckpoint: 'graveyard',
    });
  });

  it('drops Clues and later Checkpoints when the lantern is unlit', () => {
    const result = load({ ...ROUTE, lanternLit: false });
    expect(result).toMatchObject({
      lanternLit: false,
      cluesFound: [],
      gateOpen: false,
      checkpoints: ['apothecary-exit', 'courtyard'],
      lastCheckpoint: 'courtyard',
    });
  });

  it('drops bell rings without a verified bell curse, and lights without all three rings', () => {
    const result = load({ ...ROUTE, bellRings: ['moon', 'key'], lightsRestored: true });
    expect(result.bellRings).toEqual([]);
    expect(result.lightsRestored).toBe(false);
  });

  it('keeps only the correct prefix of the bell sequence with a verified curse', () => {
    expect(normalizeClocktowerState({ ...ROUTE, bellRings: ['moon', 'thorn'] }, true).bellRings).toEqual(['moon']);
    expect(normalizeClocktowerState({ ...ROUTE, bellRings: ['moon', 'key'] }, true).bellRings).toEqual(['moon', 'key']);
  });

  it('sorts Clues and Checkpoints into route order and removes duplicates', () => {
    const result = load({
      ...ROUTE,
      checkpoints: ['passage', 'courtyard', 'apothecary-exit', 'courtyard', 'graveyard'],
      cluesFound: ['key', 'moon', 'thorn', 'key'],
    });
    expect(result.checkpoints).toEqual(['apothecary-exit', 'courtyard', 'graveyard', 'passage']);
    expect(result.cluesFound).toEqual(['moon', 'thorn', 'key']);
  });
});

describe('malformed Clocktower data', () => {
  it.each([
    ['missing', undefined],
    ['not an object', 'route'],
    ['an array', []],
    ['a wrong field type', { ...ROUTE, gateOpen: 'yes' }],
    ['an unknown Clue', { ...ROUTE, cluesFound: ['moon', 'sun'] }],
    ['an unknown Area', { ...ROUTE, checkpoints: ['courtyard', 'moon'] }],
    ['an unknown bell', { ...ROUTE, bellRings: ['gong'] }],
    ['a bad last Checkpoint', { ...ROUTE, lastCheckpoint: 7 }],
  ])('replaces only the Clocktower part when it is %s', (_name, clocktower) => {
    const saved = pantryCleared();
    const raw = JSON.parse(JSON.stringify({ ...saved, clocktower })) as Record<string, unknown>;
    if (clocktower === undefined) delete raw.clocktower;
    const migrated = migrateProgress(raw, true)!;
    expect(migrated).not.toBeNull();
    expect(migrated.clocktower).toEqual(INITIAL_CLOCKTOWER_STATE);
    expect(migrated.checkout).toEqual(saved.checkout);
    expect(migrated.pantry).toEqual(saved.pantry);
    expect(migrated.defects['color-only-ingredients']).toEqual(saved.defects['color-only-ingredients']);
  });

  it('replaces only a malformed bell curse state and its hint count', () => {
    const raw = JSON.parse(JSON.stringify({ ...pantryCleared(), clocktower: ROUTE })) as Record<string, unknown>;
    (raw.defects as Record<string, unknown>)['bell-dialog-focus'] = { type: 'bell-dialog-focus', verified: 'yes' };
    (raw.hintsUsed as Record<string, unknown>)['bell-dialog-focus'] = 'many';
    const migrated = migrateProgress(raw, true)!;
    expect(migrated.defects['bell-dialog-focus']).toMatchObject({ discovered: false, verified: false });
    expect(migrated.hintsUsed['bell-dialog-focus']).toBe(0);
    expect(migrated.clocktower).toEqual(ROUTE);
  });
});

describe('current room and door', () => {
  it('falls back from the Clocktower to the Pantry while the room is not built', () => {
    const saved = { ...pantryCleared(), currentRoom: 'clocktower' as const, clocktower: ROUTE };
    const migrated = migrateProgress(JSON.parse(JSON.stringify(saved)), false)!;
    expect(migrated.currentRoom).toBe('pantry');
    // The route is kept for when the room opens (Requirement 18.6).
    expect(migrated.clocktower).toEqual(ROUTE);
  });

  it('falls back to the Checkout without the Pantry Key', () => {
    const saved = createInitialProgressState();
    const raw = JSON.parse(JSON.stringify({ ...saved, currentRoom: 'clocktower' }));
    expect(migrateProgress(raw, true)!.currentRoom).toBe('checkout');
  });

  it('keeps the Clocktower as the current room while built and open', () => {
    const saved = { ...pantryCleared(), currentRoom: 'clocktower' as const, clocktower: ROUTE };
    expect(migrateProgress(JSON.parse(JSON.stringify(saved)), true)!.currentRoom).toBe('clocktower');
  });

  it('reports Coming later, Locked, Open, and Cleared', () => {
    const locked = createInitialProgressState();
    const open = pantryCleared();
    const cleared = { ...open, clocktower: { ...ROUTE, lightsRestored: true } };
    expect(getDoorState(open, 'clocktower', false)).toBe('coming-soon');
    expect(getDoorState(locked, 'clocktower', true)).toBe('locked');
    expect(getDoorState(open, 'clocktower', true)).toBe('available');
    expect(getDoorState(cleared, 'clocktower', true)).toBe('cleared');
  });

  it('needs the lights for adventure completion only while the Clocktower is built', () => {
    const open = pantryCleared();
    expect(isAdventureComplete(open, (id) => id !== 'clocktower')).toBe(true);
    expect(isAdventureComplete(open, () => true)).toBe(false);
    expect(isAdventureComplete({ ...open, clocktower: { ...ROUTE, lightsRestored: true } }, () => true)).toBe(true);
  });
});

describe('round trip and idempotence (Requirement 24.7)', () => {
  const examples: [string, ClocktowerState][] = [
    ['initial', INITIAL_CLOCKTOWER_STATE],
    ['courtyard lit', { ...INITIAL_CLOCKTOWER_STATE, checkpoints: ['apothecary-exit', 'courtyard'], lastCheckpoint: 'courtyard', lanternLit: true }],
    ['two clues', { ...ROUTE, checkpoints: ['apothecary-exit', 'courtyard', 'graveyard'], lastCheckpoint: 'graveyard', cluesFound: ['moon', 'key'], gateOpen: false, shortcutUnlocked: false }],
    ['gate open', ROUTE],
  ];

  it.each(examples)('saving then loading returns the same progress (%s)', (_name, clocktower) => {
    window.localStorage.clear();
    const adapter = new StorageAdapter();
    // The Clocktower is published (Task 26), so none of these examples completes the adventure.
    const progress: ProgressState = { ...pantryCleared(), clocktower, isComplete: false, completedAt: null };
    expect(adapter.saveProgress(progress)).toBe(true);
    const loaded = adapter.loadProgress();
    expect(loaded).toEqual(progress);
    window.localStorage.clear();
  });

  it.each(examples)('normalizing a normalized state returns the same state (%s)', (_name, clocktower) => {
    const once = normalizeClocktowerState(clocktower, false);
    expect(normalizeClocktowerState(once, false)).toEqual(once);
    expect(once).toEqual(clocktower);
  });
});
