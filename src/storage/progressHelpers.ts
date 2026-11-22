/**
 * Progress Helper Functions
 * Standalone functions for checking and clearing saved progress
 */

import { StorageAdapter } from './StorageAdapter';
import type { ProgressState } from '../types';
import { hasClocktowerProgress } from '../engines/clocktowerRules';

// Singleton storage adapter instance
const storageAdapter = new StorageAdapter();

/**
 * Check for saved progress on initial load
 */
export function checkSavedProgress(): ProgressState | null {
  return storageAdapter.loadProgress();
}

/**
 * A valid save worth resuming: at least one discovery, repair, or room
 * action. Finished adventures resume at the door selector.
 */
export function getMeaningfulSavedProgress(): ProgressState | null {
  const progress = checkSavedProgress();
  return progress && hasMeaningfulProgress(progress) ? progress : null;
}

/** Any discovery, repair, or room action worth resuming (any room). */
export function hasMeaningfulProgress(progress: ProgressState): boolean {
  const hasDefectProgress = Object.values(progress.defects).some(
    (d) => d.discovered || d.repaired
  );
  const hasCheckoutProgress = Object.values(progress.checkout).some(Boolean);
  const hasPantryProgress =
    progress.pantry.cauldron.length > 0 || progress.pantry.brewed;
  // A Checkpoint, the lantern, a Clue, the gate, the shortcut, or a ring (Requirement 17.6).
  const hasRouteProgress = progress.clocktower ? hasClocktowerProgress(progress.clocktower) : false;
  return hasDefectProgress || hasCheckoutProgress || hasPantryProgress || hasRouteProgress;
}

/**
 * Clear saved progress without resetting game state
 */
export function clearSavedProgress(): void {
  storageAdapter.clearProgress();
}
