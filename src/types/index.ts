/**
 * KeyQuest Type Definitions
 * Based on approved design spec
 */

import type { ClocktowerState, WorldAction, WorldOutcome, WorldSession } from './clocktower';

export type * from './clocktower';

// ============================================
// DEFECT TYPES
// ============================================

export type DefectType =
  // Room 1: Midnight Checkout
  | 'invisible-focus'
  | 'mouse-only-activation'
  | 'missing-accessible-name'
  | 'insufficient-contrast'
  // Room 2: Potion Pantry
  | 'color-only-ingredients'
  // Room 3: Clocktower Gate (the bell dialog curse; its repair is Checkpoint 3)
  | 'bell-dialog-focus';

// ============================================
// ROOMS
// ============================================

export type RoomId = 'checkout' | 'pantry' | 'clocktower';

export type IngredientId =
  | 'moonpetal'
  | 'ember-salt'
  | 'glowcap'
  | 'nightshade'
  | 'bog-moss'
  | 'ash-dust';

export interface DefectDefinition {
  type: DefectType;
  elementSelector: string;
  description: string;
  educationalContext: string;
  wcagCriteria: string[];
}

export interface DefectState {
  type: DefectType;
  discovered: boolean;
  discoveredAt: number | null;
  repaired: boolean;
  repairedAt: number | null;
  verified: boolean;
  verifiedAt: number | null;
  hintLevel: 0 | 1 | 2 | 3;
}

// ============================================
// REPAIR DEFINITIONS
// ============================================

export interface RepairDefinition {
  defectType: DefectType;
  repairId: string;
  displayName: string;
  educationalFeedback: string;
}

// ============================================
// VERIFICATION
// ============================================

export interface VerificationResult {
  passed: boolean;
  defectType: DefectType;
  checkedAt: number;
  details: VerificationDetails;
}

export type VerificationDetails =
  | FocusVerificationDetails
  | KeyboardVerificationDetails
  | AccessibleNameVerificationDetails
  | ContrastVerificationDetails
  | LabelVerificationDetails
  | DialogFocusVerificationDetails;

/** The four live checks of the bell dialog (Requirement 20.7). */
export type DialogFocusCheckId = 'entry' | 'return-ring' | 'return-cancel' | 'return-escape';

export interface DialogFocusVerificationDetails {
  type: 'dialog-focus';
  checks: { id: DialogFocusCheckId; label: string; passed: boolean; focused: string }[];
}

export interface FocusVerificationDetails {
  type: 'focus';
  outlineStyle: string;
  outlineWidth: string;
  outlineColor: string;
  boxShadow: string;
  hasVisibleIndicator: boolean;
  contrastRatio: number | null;
}

export interface KeyboardVerificationDetails {
  type: 'keyboard';
  enterKeyWorks: boolean;
  spaceKeyWorks: boolean;
  eventFired: boolean;
}

export interface AccessibleNameVerificationDetails {
  type: 'accessible-name';
  computedName: string;
  nameSource: 'aria-label' | 'aria-labelledby' | 'visible-text' | 'title' | 'none';
  isEmpty: boolean;
}

export interface ContrastVerificationDetails {
  type: 'contrast';
  foregroundColor: string;
  backgroundColor: string;
  contrastRatio: number;
  requiredRatio: number;
  isLargeText: boolean;
  meetsRequirement: boolean;
}

/** Every ingredient control shows a visible label that is also its name. */
export interface LabelVerificationDetails {
  type: 'labels';
  total: number;
  labelled: number;
  /** Ingredient ids whose visible label or accessible name is missing. */
  failing: string[];
}

// ============================================
// PROGRESS STATE (localStorage)
// ============================================

/** Actions the player takes with repaired controls in the Midnight Checkout. */
export interface CheckoutRoomState {
  lanternLit: boolean;
  candleAdded: boolean;
  orderPlaced: boolean;
  /** The player took the Pantry Key; the Checkout is cleared. */
  keyTaken: boolean;
}

export type CheckoutRoomAction =
  | 'light-lantern'
  | 'add-candle'
  | 'place-order'
  | 'take-key';

/** The Potion Pantry: what is in the cauldron and whether it brewed. */
export interface PantryRoomState {
  cauldron: IngredientId[];
  brewed: boolean;
  /** The player bottled the lantern potion; the Pantry is cleared. */
  potionTaken: boolean;
}

export type PantryAction =
  | { action: 'add'; ingredient: IngredientId }
  | { action: 'remove'; index: number }
  | { action: 'bottle' };

/**
 * Version 2 added rooms; version 3 adds the Clocktower route and the bell curse.
 * Version 1 (Checkout only) and version 2 saves are migrated on load with their
 * discoveries, repairs, verification, hints, and room actions kept.
 */
export interface ProgressState {
  version: 3;
  sessionId: string;
  startedAt: number;
  lastUpdatedAt: number;
  currentRoom: RoomId;
  defects: Record<DefectType, DefectState>;
  hintsUsed: Record<DefectType, number>;
  checkout: CheckoutRoomState;
  pantry: PantryRoomState;
  /** Clocktower_State: the route through the Clocktower Gate. */
  clocktower: ClocktowerState;
  /** Every room built so far is cleared. */
  isComplete: boolean;
  completedAt: number | null;
}

// ============================================
// GAME STATE
// ============================================

export interface ErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  recoverable: boolean;
  timestamp: number;
}

export interface CompletionSummary {
  roomId: RoomId;
  totalTime: number;
  defectsRepaired: DefectType[];
  hintsUsed: Record<DefectType, number>;
  conceptsLearned: string[];
}

export type GamePhase = 'loading' | 'menu' | 'challenge' | 'doors' | 'completion' | 'error';

export type GameState =
  | { phase: 'loading' }
  | { phase: 'menu' }
  | { phase: 'challenge' }
  | { phase: 'doors' }
  | { phase: 'completion'; summary: CompletionSummary }
  | { phase: 'error'; error: ErrorInfo };

export type GameAction =
  | { type: 'START_LOADING' }
  | { type: 'LOADING_COMPLETE' }
  | { type: 'LOADING_ERROR'; error: ErrorInfo }
  | { type: 'START_CHALLENGE' }
  | { type: 'DISCOVER_DEFECT'; defectType: DefectType }
  | { type: 'APPLY_REPAIR'; defectType: DefectType }
  | { type: 'VERIFICATION_RESULT'; result: VerificationResult }
  | { type: 'REQUEST_HINT'; defectType: DefectType }
  | { type: 'EMERGENCY_EXIT' }
  | { type: 'COMPLETE_LEVEL' }
  | { type: 'RESET_CHALLENGE' }
  | { type: 'RESTORE_PROGRESS'; progress: ProgressState }
  | { type: 'HYDRATE_PROGRESS'; progress: ProgressState }
  | { type: 'ROOM_ACTION'; action: CheckoutRoomAction }
  | ({ type: 'PANTRY_ACTION' } & PantryAction)
  | { type: 'ENTER_ROOM'; roomId: RoomId }
  | { type: 'OPEN_DOORS' }
  | { type: 'COMPLETE_ROOM'; roomId: RoomId }
  | { type: 'RESET_ROOM'; roomId: RoomId }
  | { type: 'WORLD_ACTION'; action: WorldAction }
  /** Development and test builds only: open the courtyard with progress kept in memory. */
  | { type: 'ENTER_COURTYARD_PREVIEW' };

// ============================================
// HINTS
// ============================================

export interface HintDefinition {
  defectType: DefectType;
  level: 1 | 2 | 3;
  text: string;
}

// ============================================
// CONTEXT
// ============================================

export interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  progress: ProgressState;
  saveProgress: () => void;
  resetProgress: () => void;
  /** Reset one room and save right away (not on the autosave debounce). */
  resetRoom: (roomId: RoomId) => void;
  /** Clocktower_State, read from `progress.clocktower`. */
  clocktower: ClocktowerState;
  /** The current Area and arrival spawn. Not saved. */
  world: WorldSession;
  /** True while the courtyard preview is active: nothing is written to storage. */
  preview: boolean;
  /**
   * Evaluate and apply a World_Action. Returns the same outcome the reducer
   * applies, so the view can announce it.
   */
  dispatchWorldAction: (action: WorldAction) => WorldOutcome;
}
