/**
 * Progress Schema
 * Initial progress, validation, and migration of saved progress.
 *
 * Version 1 (Checkout only) saves migrate to version 2 (rooms) with their
 * discoveries, repairs, verification, hints, and room actions kept. A version 1
 * save that finished the Checkout earns the Pantry Key, so its Pantry door opens.
 */

import type { DefectState, DefectType, ProgressState, RoomId } from '../types';
import {
  INITIAL_CHECKOUT_STATE,
  normalizeCheckoutState,
} from '../registry/roomRegistry';
import { INITIAL_PANTRY_STATE, normalizePantryState } from '../registry/pantryRegistry';
import {
  ALL_DEFECT_TYPES,
  ROOM_DEFECTS,
  ROOMS,
  isRoomBuilt,
  isRoomCleared,
  isRoomUnlocked,
} from '../registry/roomsRegistry';
import {
  createInitialClocktowerState,
  normalizeClocktowerState,
} from '../engines/clocktowerRules';

/** Version 3 adds the Clocktower route and the bell curse (Requirement 16.1). */
export const PROGRESS_VERSION = 3;

export function createInitialDefectState(type: DefectType): DefectState {
  return {
    type,
    discovered: false,
    discoveredAt: null,
    repaired: false,
    repairedAt: null,
    verified: false,
    verifiedAt: null,
    hintLevel: 0,
  };
}

export function createInitialProgressState(): ProgressState {
  const defects = {} as Record<DefectType, DefectState>;
  const hintsUsed = {} as Record<DefectType, number>;
  for (const type of ALL_DEFECT_TYPES) {
    defects[type] = createInitialDefectState(type);
    hintsUsed[type] = 0;
  }
  return {
    version: PROGRESS_VERSION,
    sessionId: crypto.randomUUID(),
    startedAt: Date.now(),
    lastUpdatedAt: Date.now(),
    currentRoom: 'checkout',
    defects,
    hintsUsed,
    checkout: { ...INITIAL_CHECKOUT_STATE },
    pantry: { ...INITIAL_PANTRY_STATE, cauldron: [] },
    clocktower: createInitialClocktowerState(),
    isComplete: false,
    completedAt: null,
  };
}

function isValidDefectState(data: unknown): data is DefectState {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.type === 'string' &&
    typeof obj.discovered === 'boolean' &&
    (obj.discoveredAt === null || typeof obj.discoveredAt === 'number') &&
    typeof obj.repaired === 'boolean' &&
    (obj.repairedAt === null || typeof obj.repairedAt === 'number') &&
    typeof obj.verified === 'boolean' &&
    (obj.verifiedAt === null || typeof obj.verifiedAt === 'number') &&
    typeof obj.hintLevel === 'number' &&
    obj.hintLevel >= 0 &&
    obj.hintLevel <= 3
  );
}

/** Rooms a save may name as its current room. */
const ROOM_IDS: readonly RoomId[] = ['checkout', 'pantry', 'clocktower'];

/**
 * Validate and migrate raw saved data. Returns null for anything that is not
 * a complete version 1, 2, or 3 save (Requirement 16.7). Never throws.
 * `built` says whether the Clocktower room is built; unit tests pass it directly.
 */
export function migrateProgress(
  data: unknown,
  built: boolean = isRoomBuilt('clocktower')
): ProgressState | null {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;
  if (obj.version !== 1 && obj.version !== 2 && obj.version !== 3) return null;
  if (typeof obj.sessionId !== 'string') return null;
  if (typeof obj.startedAt !== 'number' || typeof obj.lastUpdatedAt !== 'number') return null;
  if (typeof obj.isComplete !== 'boolean') return null;
  if (obj.completedAt !== null && typeof obj.completedAt !== 'number') return null;
  if (typeof obj.defects !== 'object' || obj.defects === null) return null;
  if (typeof obj.hintsUsed !== 'object' || obj.hintsUsed === null) return null;

  const rawDefects = obj.defects as Record<string, unknown>;
  const rawHints = obj.hintsUsed as Record<string, unknown>;

  // The four Checkout curses are required in every version.
  for (const type of ROOM_DEFECTS.checkout) {
    if (!isValidDefectState(rawDefects[type])) return null;
    if (typeof rawHints[type] !== 'number') return null;
  }

  const fresh = createInitialProgressState();
  const defects = { ...fresh.defects };
  const hintsUsed = { ...fresh.hintsUsed };
  for (const type of ALL_DEFECT_TYPES) {
    const d = rawDefects[type];
    if (isValidDefectState(d)) defects[type] = { ...d, type };
    const h = rawHints[type];
    if (typeof h === 'number' && h >= 0) hintsUsed[type] = h;
  }

  const checkout = normalizeCheckoutState(obj.checkout);
  // A version 1 save marked complete finished the Checkout before room
  // actions existed: it rang up the order and earned the key.
  if (obj.version === 1 && obj.isComplete === true) {
    const allVerified = ROOM_DEFECTS.checkout.every((t) => defects[t].verified);
    if (allVerified) {
      checkout.lanternLit = true;
      checkout.candleAdded = true;
      checkout.orderPlaced = true;
      checkout.keyTaken = true;
    }
  }

  const pantry = normalizePantryState(obj.pantry);
  if (!defects['color-only-ingredients'].verified) {
    pantry.cauldron = [];
    pantry.brewed = false;
    pantry.potionTaken = false;
  }

  // Without the potion the Clocktower holds no progress (Requirement 16.3).
  // Otherwise the prerequisite chain clears what is not earned (Requirement 16.4).
  const clocktower = pantry.potionTaken
    ? normalizeClocktowerState(obj.clocktower, defects['bell-dialog-focus'].verified)
    : createInitialClocktowerState();

  const fallbackRoom: RoomId = checkout.keyTaken ? 'pantry' : 'checkout';
  const savedRoom =
    typeof obj.currentRoom === 'string' && ROOM_IDS.includes(obj.currentRoom as RoomId)
      ? (obj.currentRoom as RoomId)
      : fallbackRoom;

  const migrated: ProgressState = {
    version: PROGRESS_VERSION,
    sessionId: obj.sessionId,
    startedAt: obj.startedAt,
    lastUpdatedAt: obj.lastUpdatedAt,
    currentRoom: savedRoom,
    defects,
    hintsUsed,
    checkout,
    pantry,
    clocktower,
    isComplete: false,
    completedAt: null,
  };

  // A save never resumes into a room that is not built, or whose door is not open
  // (Requirements 16.6, 18.6).
  if (savedRoom === 'clocktower' && !isRoomUnlocked(migrated, 'clocktower', built)) {
    migrated.currentRoom = fallbackRoom;
  }

  // Every built room is cleared, including the lights while the Clocktower is built.
  const isComplete = ROOMS.filter((room) =>
    room.id === 'clocktower' ? built : isRoomBuilt(room.id)
  ).every((room) => isRoomCleared(migrated, room.id));
  migrated.isComplete = isComplete;
  migrated.completedAt = isComplete ? ((obj.completedAt as number | null) ?? null) : null;
  return migrated;
}
