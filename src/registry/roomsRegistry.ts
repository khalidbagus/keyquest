/**
 * Rooms Registry
 * The adventure route, which curses belong to each room, and door states
 * derived from verified progress.
 */

import type { DefectType, ProgressState, RoomId } from '../types';
import { DEV_FLAGS } from './devFlags';

export interface RoomDefinition {
  id: RoomId;
  number: number;
  name: string;
  /** One line on the door: what the player does inside. */
  goal: string;
  /** What the player brings back from the room. */
  reward: string;
  /** Built rooms can be entered; others show as coming in a later update. */
  built: boolean;
}

export const ROOMS: readonly RoomDefinition[] = [
  {
    id: 'checkout',
    number: 1,
    name: 'Midnight Checkout',
    goal: 'Relight the counter and ring up a shopper’s order.',
    reward: 'Pantry Key',
    built: true,
  },
  {
    id: 'pantry',
    number: 2,
    name: 'Potion Pantry',
    goal: 'Brew a lantern potion from a three-ingredient recipe.',
    reward: 'Lantern Potion',
    built: true,
  },
  {
    id: 'clocktower',
    number: 3,
    name: 'Clocktower Gate',
    goal: 'Ring three bells in order to bring the lights back.',
    reward: 'Bell rope',
    built: true,
  },
] as const;

/** Curses in each room, in the order hints and journals list them. */
export const ROOM_DEFECTS: Record<RoomId, readonly DefectType[]> = {
  checkout: [
    'invisible-focus',
    'mouse-only-activation',
    'missing-accessible-name',
    'insufficient-contrast',
  ],
  pantry: ['color-only-ingredients'],
  clocktower: ['bell-dialog-focus'],
};

export const ALL_DEFECT_TYPES: readonly DefectType[] = [
  ...ROOM_DEFECTS.checkout,
  ...ROOM_DEFECTS.pantry,
  ...ROOM_DEFECTS.clocktower,
];

export function getRoom(id: RoomId): RoomDefinition {
  return ROOMS.find((room) => room.id === id) ?? ROOMS[0]!;
}

/**
 * A room can be entered when its `built` flag is set. Development and test
 * builds can also mark a room built with `?built=<room>`; production ignores it.
 */
export function isRoomBuilt(id: RoomId): boolean {
  return getRoom(id).built || DEV_FLAGS.built.has(id);
}

export function roomVerifiedCount(progress: ProgressState, room: RoomId): number {
  return ROOM_DEFECTS[room].filter((t) => progress.defects[t].verified).length;
}

export function roomFoundCount(progress: ProgressState, room: RoomId): number {
  return ROOM_DEFECTS[room].filter((t) => progress.defects[t].discovered).length;
}

export function isRoomCleared(progress: ProgressState, room: RoomId): boolean {
  switch (room) {
    case 'checkout':
      return progress.checkout.keyTaken;
    case 'pantry':
      return progress.pantry.potionTaken;
    case 'clocktower':
      return progress.clocktower?.lightsRestored === true;
    default:
      return false;
  }
}

/**
 * Doors unlock from verified progress, not from a stored flag: the Pantry
 * opens once every Checkout curse is verified and the order earned the key.
 */
export function isRoomUnlocked(
  progress: ProgressState,
  room: RoomId,
  built: boolean = isRoomBuilt(room)
): boolean {
  switch (room) {
    case 'checkout':
      return true;
    case 'pantry':
      return (
        roomVerifiedCount(progress, 'checkout') === ROOM_DEFECTS.checkout.length &&
        progress.checkout.orderPlaced
      );
    case 'clocktower':
      return built && isRoomCleared(progress, 'pantry');
    default:
      return false;
  }
}

export type DoorState = 'cleared' | 'available' | 'locked' | 'coming-soon';

export function getDoorState(
  progress: ProgressState,
  room: RoomId,
  built: boolean = isRoomBuilt(room)
): DoorState {
  if (!built) return 'coming-soon';
  if (!isRoomUnlocked(progress, room, built)) return 'locked';
  return isRoomCleared(progress, room) ? 'cleared' : 'available';
}

/** What unlocks a built, locked door, in the player's terms. */
export const DOOR_REQUIREMENT: Record<RoomId, string> = {
  checkout: '',
  pantry: 'Opens with the Pantry Key from the Midnight Checkout.',
  clocktower: 'Needs the lantern potion from the Potion Pantry.',
};

/** Shown instead of the requirement while a room is not built. */
export const DOOR_COMING_LATER: Record<RoomId, string> = {
  checkout: '',
  pantry: '',
  clocktower: 'Needs the lantern potion. This room opens in a later update.',
};

/** The door text for a state: the requirement, the coming-later line, or nothing. */
export function getDoorRequirementText(room: RoomId, state: DoorState): string {
  if (state === 'coming-soon') return DOOR_COMING_LATER[room];
  if (state === 'locked') return DOOR_REQUIREMENT[room];
  return '';
}

/**
 * Every built room is cleared. While the Clocktower is built (including the
 * development override), that needs the apothecary lights (Requirement 18.3).
 */
export function isAdventureComplete(
  progress: ProgressState,
  built: (id: RoomId) => boolean = isRoomBuilt
): boolean {
  return ROOMS.filter((r) => built(r.id)).every((r) => isRoomCleared(progress, r.id));
}

/** The first built room that is unlocked but not cleared, if any. */
export function nextOpenRoom(progress: ProgressState): RoomId | null {
  const room = ROOMS.find(
    (r) => isRoomBuilt(r.id) && isRoomUnlocked(progress, r.id) && !isRoomCleared(progress, r.id)
  );
  return room?.id ?? null;
}
