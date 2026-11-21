/**
 * Storage Adapter
 * Handles localStorage persistence with graceful degradation.
 * The key stays `keyquest-progress-v1`; the schema version lives in the data
 * and older versions are migrated on load (see progressSchema).
 */

import type { ProgressState } from '../types';
import { migrateProgress } from './progressSchema';

const PROGRESS_KEY = 'keyquest-progress-v1';

export class StorageAdapter {
  private available: boolean;

  constructor() {
    this.available = this.checkAvailability();
  }

  private checkAvailability(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  saveProgress(state: ProgressState): boolean {
    if (!this.available) return false;
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      // Quota exceeded or other error
      console.error('Failed to save progress:', e);
      return false;
    }
  }

  /** Load, validate, and migrate saved progress. Invalid data returns null. */
  loadProgress(): ProgressState | null {
    if (!this.available) return null;
    try {
      const data = localStorage.getItem(PROGRESS_KEY);
      if (!data) return null;
      return migrateProgress(JSON.parse(data) as unknown);
    } catch {
      return null;
    }
  }

  clearProgress(): void {
    if (!this.available) return;
    localStorage.removeItem(PROGRESS_KEY);
  }
}
