/**
 * Room Registry: Midnight Checkout
 * Static objective copy and pure helpers that derive the room's current job
 * and the outcome of pressing Buy Now from verified progress.
 */

import type {
  CheckoutRoomAction,
  CheckoutRoomState,
  DefectType,
  ProgressState,
} from '../types';

export const INITIAL_CHECKOUT_STATE: CheckoutRoomState = {
  lanternLit: false,
  candleAdded: false,
  orderPlaced: false,
  keyTaken: false,
};

export type CheckoutDefectType = Exclude<DefectType, 'color-only-ingredients'>;

/** The four Checkout curses (the Pantry has its own). */
const CHECKOUT_CURSES: readonly CheckoutDefectType[] = [
  'invisible-focus',
  'mouse-only-activation',
  'missing-accessible-name',
  'insufficient-contrast',
];

/** Curses that make up the shopper's order once the lantern is lit. */
export const ORDER_CURSES: readonly CheckoutDefectType[] = [
  'mouse-only-activation',
  'missing-accessible-name',
  'insufficient-contrast',
];

export type CheckoutStage =
  | 'find-lantern-curse'
  | 'repair-lantern-curse'
  | 'light-lantern'
  | 'finish-order'
  | 'place-order'
  | 'take-key'
  | 'cleared';

export interface ObjectiveCopy {
  label: string;
  instruction: string;
}

export const OBJECTIVE_COPY: Record<CheckoutStage, ObjectiveCopy> = {
  'find-lantern-curse': {
    label: 'Light the counter lantern',
    instruction:
      'Buy Now lights it, but a curse hides keyboard focus on Buy Now. Tab to it or inspect it.',
  },
  'repair-lantern-curse': {
    label: 'Light the counter lantern',
    instruction:
      'Buy Now takes keyboard focus but shows no ring. Pick a patch in the Repair Studio.',
  },
  'light-lantern': {
    label: 'Light the counter lantern',
    instruction:
      'Buy Now shows a ring on keyboard focus now. Press Buy Now to light the lantern.',
  },
  'finish-order': {
    label: "Finish the shopper's order",
    instruction:
      'Three more curses jam the order. Lift them, add the candle, then ring it up with Buy Now.',
  },
  'place-order': {
    label: "Ring up the shopper's order",
    instruction: 'All four candles are lit. Press Buy Now to place the order.',
  },
  'take-key': {
    label: 'The Pantry Key is yours',
    instruction:
      'The order went through and the counter left a key. It opens the Potion Pantry.',
  },
  cleared: {
    label: 'Midnight Checkout is cleared',
    instruction: 'The lantern burns and the order is placed. Your key opens the Potion Pantry.',
  },
};

export interface OrderTaskCopy {
  /** Short task shown in the order checklist. */
  task: string;
  /** Inspect control label used in the objective card and journal. */
  inspectLabel: string;
  /** What the repaired control now does, shown once verified. */
  payoff: string;
}

export const ORDER_TASK_COPY: Record<CheckoutDefectType, OrderTaskCopy> = {
  'invisible-focus': {
    task: 'Show where focus lands on Buy Now',
    inspectLabel: 'Inspect Buy Now',
    payoff: 'Buy Now shows a ring on keyboard focus.',
  },
  'mouse-only-activation': {
    task: 'Let the keyboard press Add to Cart',
    inspectLabel: 'Inspect Add to Cart',
    payoff: 'Enter and Space press Add to Cart.',
  },
  'missing-accessible-name': {
    task: 'Give the bag button a name',
    inspectLabel: 'Inspect the bag button',
    payoff: 'The bag button is called “View shopping cart”.',
  },
  'insufficient-contrast': {
    task: 'Make the price readable',
    inspectLabel: 'Inspect the price',
    payoff: 'The $13.99 price is easy to read.',
  },
};

function allVerified(progress: ProgressState): boolean {
  return CHECKOUT_CURSES.every((t) => progress.defects[t].verified);
}

/** Verified Checkout curses (candles lit). */
export function countVerified(progress: ProgressState): number {
  return CHECKOUT_CURSES.filter((t) => progress.defects[t].verified).length;
}

/** The room's single current job, derived from verified progress. */
export function getCheckoutStage(progress: ProgressState): CheckoutStage {
  const focus = progress.defects['invisible-focus'];
  const room = progress.checkout;
  if (room.keyTaken) return 'cleared';
  if (room.orderPlaced) return 'take-key';
  if (!room.lanternLit) {
    if (focus.verified) return 'light-lantern';
    if (focus.discovered) return 'repair-lantern-curse';
    return 'find-lantern-curse';
  }
  if (allVerified(progress)) return 'place-order';
  return 'finish-order';
}

/** Whether a room action is allowed for the current progress. */
export function canPerformRoomAction(
  progress: ProgressState,
  action: CheckoutRoomAction
): boolean {
  const room = progress.checkout;
  switch (action) {
    case 'light-lantern':
      return progress.defects['invisible-focus'].verified && !room.lanternLit;
    case 'add-candle':
      return !room.candleAdded;
    case 'place-order':
      return (
        allVerified(progress) &&
        room.lanternLit &&
        room.candleAdded &&
        !room.orderPlaced
      );
    case 'take-key':
      return room.orderPlaced && !room.keyTaken;
    default:
      return false;
  }
}

export type BuyNowOutcome =
  | { kind: 'discover' }
  | { kind: 'room-action'; action: 'light-lantern' | 'place-order'; status: string }
  | { kind: 'blocked'; status: string }
  | { kind: 'none' };

/** What pressing Buy Now does right now. */
export function getBuyNowOutcome(progress: ProgressState): BuyNowOutcome {
  const focus = progress.defects['invisible-focus'];
  const room = progress.checkout;
  if (room.orderPlaced) return { kind: 'none' };
  if (!focus.verified) {
    return focus.discovered
      ? {
          kind: 'blocked',
          status:
            'The lantern stays dark until Buy Now shows where keyboard focus lands.',
        }
      : { kind: 'discover' };
  }
  if (!room.lanternLit) {
    return {
      kind: 'room-action',
      action: 'light-lantern',
      status: 'Lantern lit. The counter glows again.',
    };
  }
  const remaining = 4 - countVerified(progress);
  if (remaining > 0) {
    return {
      kind: 'blocked',
      status: `The order is still jammed: ${remaining} ${
        remaining === 1 ? 'curse' : 'curses'
      } left on the counter.`,
    };
  }
  if (!room.candleAdded) {
    return {
      kind: 'blocked',
      status: 'The order is empty. Add the candle with Add to Cart first.',
    };
  }
  return {
    kind: 'room-action',
    action: 'place-order',
    status: 'Order placed. A key appears on the counter.',
  };
}

/**
 * The one order task to show next: the first order curse not yet verified,
 * then the candle. Null when the order is ready to place.
 */
export function getNextOrderTask(
  progress: ProgressState
): { kind: 'curse'; type: CheckoutDefectType } | { kind: 'candle' } | null {
  const type = ORDER_CURSES.find((t) => !progress.defects[t].verified);
  if (type) return { kind: 'curse', type };
  if (!progress.checkout.candleAdded) return { kind: 'candle' };
  return null;
}

/** What to do with a repaired control, given what the player already did. */
export function getRepairNextAction(
  type: DefectType,
  progress: ProgressState,
  defaultAction: string
): string {
  const room = progress.checkout;
  if (type === 'invisible-focus' && room.lanternLit) {
    return room.orderPlaced
      ? 'The order is placed.'
      : 'The lantern is lit. Buy Now rings up the order once the other curses are lifted.';
  }
  if (type === 'mouse-only-activation' && room.candleAdded) {
    return 'The candle is in the order.';
  }
  if (type === 'color-only-ingredients' && progress.pantry.brewed) {
    return 'The lantern potion is brewed.';
  }
  return defaultAction;
}

/** Normalize a possibly missing or malformed room state from an older save. */
export function normalizeCheckoutState(value: unknown): CheckoutRoomState {
  if (typeof value !== 'object' || value === null) {
    return { ...INITIAL_CHECKOUT_STATE };
  }
  const obj = value as Record<string, unknown>;
  const orderPlaced = obj.orderPlaced === true;
  return {
    lanternLit: obj.lanternLit === true,
    candleAdded: obj.candleAdded === true,
    orderPlaced,
    keyTaken: orderPlaced && obj.keyTaken === true,
  };
}
