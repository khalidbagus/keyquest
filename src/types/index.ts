/**
 * KeyQuest Type Definitions
 * Based on approved design spec
 */

// ============================================
// DEFECT TYPES
// ============================================

export type DefectType =
  | 'invisible-focus'
  | 'mouse-only-activation'
  | 'missing-accessible-name'
  | 'insufficient-contrast';

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
  | ContrastVerificationDetails;

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

// ============================================
// PROGRESS STATE (localStorage)
// ============================================

export interface ProgressState {
  version: 1;
  sessionId: string;
  startedAt: number;
  lastUpdatedAt: number;
  defects: Record<DefectType, DefectState>;
  hintsUsed: Record<DefectType, number>;
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
  totalTime: number;
  defectsRepaired: DefectType[];
  hintsUsed: Record<DefectType, number>;
  conceptsLearned: string[];
}

export type GamePhase = 'loading' | 'menu' | 'challenge' | 'completion' | 'error';

export type GameState =
  | { phase: 'loading' }
  | { phase: 'menu' }
  | { phase: 'challenge' }
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
  | { type: 'RESTORE_PROGRESS'; progress: ProgressState };

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
}
