/**
 * Progress Helper Functions
 * Standalone functions for checking and clearing saved progress
 */

import { StorageAdapter } from './StorageAdapter';
import type { ProgressState } from '../types';

// Singleton storage adapter instance
const storageAdapter = new StorageAdapter();

/**
 * Check for saved progress on initial load
 */
export function checkSavedProgress(): ProgressState | null {
  return storageAdapter.loadProgress();
}

/**
 * Clear saved progress without resetting game state
 */
export function clearSavedProgress(): void {
  storageAdapter.clearProgress();
}
