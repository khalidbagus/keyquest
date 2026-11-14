/**
 * Storage Adapter
 * Handles localStorage persistence with graceful degradation
 */

import type { ProgressState, DefectType } from '../types';

const PROGRESS_KEY = 'keyquest-progress-v1';

// All four defect types that must be present in a valid ProgressState
const DEFECT_TYPES: DefectType[] = [
  'invisible-focus',
  'mouse-only-activation',
  'missing-accessible-name',
  'insufficient-contrast',
];

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

  loadProgress(): ProgressState | null {
    if (!this.available) return null;
    try {
      const data = localStorage.getItem(PROGRESS_KEY);
      if (!data) return null;

      const parsed = JSON.parse(data) as unknown;
      
      // Validate the structure is complete
      if (!this.isValidProgressState(parsed)) {
        return null;
      }
      
      return parsed as ProgressState;
    } catch {
      return null;
    }
  }

  /**
   * Validates that the parsed object is a complete, valid ProgressState.
   */
  private isValidProgressState(data: unknown): data is ProgressState {
    if (typeof data !== 'object' || data === null) return false;
    
    const obj = data as Record<string, unknown>;
    
    // Check version
    if (obj.version !== 1) return false;
    
    // Check required string fields
    if (typeof obj.sessionId !== 'string') return false;
    
    // Check required number fields
    if (typeof obj.startedAt !== 'number') return false;
    if (typeof obj.lastUpdatedAt !== 'number') return false;
    
    // Check required boolean field
    if (typeof obj.isComplete !== 'boolean') return false;
    
    // Check completedAt (number or null)
    if (obj.completedAt !== null && typeof obj.completedAt !== 'number') return false;
    
    // Check defects object contains all four defect types
    if (typeof obj.defects !== 'object' || obj.defects === null) return false;
    const defects = obj.defects as Record<string, unknown>;
    for (const defectType of DEFECT_TYPES) {
      if (!this.isValidDefectState(defects[defectType])) return false;
    }
    
    // Check hintsUsed object
    if (typeof obj.hintsUsed !== 'object' || obj.hintsUsed === null) return false;
    const hintsUsed = obj.hintsUsed as Record<string, unknown>;
    for (const defectType of DEFECT_TYPES) {
      if (typeof hintsUsed[defectType] !== 'number') return false;
    }
    
    return true;
  }

  /**
   * Validates that a defect state object is complete.
   */
  private isValidDefectState(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) return false;
    
    const obj = data as Record<string, unknown>;
    
    if (typeof obj.type !== 'string') return false;
    if (typeof obj.discovered !== 'boolean') return false;
    if (obj.discoveredAt !== null && typeof obj.discoveredAt !== 'number') return false;
    if (typeof obj.repaired !== 'boolean') return false;
    if (obj.repairedAt !== null && typeof obj.repairedAt !== 'number') return false;
    if (typeof obj.verified !== 'boolean') return false;
    if (obj.verifiedAt !== null && typeof obj.verifiedAt !== 'number') return false;
    if (typeof obj.hintLevel !== 'number' || obj.hintLevel < 0 || obj.hintLevel > 3) return false;
    
    return true;
  }

  clearProgress(): void {
    if (!this.available) return;
    localStorage.removeItem(PROGRESS_KEY);
  }
}
