/**
 * Challenge View
 * Contains the sandbox and repair studio
 * Requirements: 2.1, 2.2, 2.4
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { ChallengeSandbox } from '../components/ChallengeSandbox';
import { HintPanel } from '../components/HintPanel';
import { RepairStudio } from '../components/RepairStudio';
import { ResetConfirmDialog } from '../components/ResetConfirmDialog';
import { applyRepair, resetAllRepairs } from '../engines/RepairEngine';
import type { DefectType } from '../types';
import styles from './ChallengeView.module.css';

// Map defect types to their data-testid selectors
const DEFECT_SELECTORS: Record<DefectType, string> = {
  'invisible-focus': '[data-testid="defect-invisible-focus"]',
  'mouse-only-activation': '[data-testid="defect-mouse-only"]',
  'missing-accessible-name': '[data-testid="defect-missing-name"]',
  'insufficient-contrast': '[data-testid="defect-low-contrast"]',
};

export function ChallengeView() {
  const { progress, dispatch, resetProgress } = useGame();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const hasAppliedRestoredRepairs = useRef(false);

  // Apply restored repairs to the DOM when restoring progress
  useEffect(() => {
    // Only run once after initial render when there are repairs to restore
    if (hasAppliedRestoredRepairs.current) return;

    const repairedDefects = Object.entries(progress.defects)
      .filter(([, state]) => state.repaired)
      .map(([type]) => type as DefectType);

    if (repairedDefects.length === 0) return;

    // Function to apply repairs when elements are available
    const applyRestoredRepairs = () => {
      let allApplied = true;
      repairedDefects.forEach((defectType) => {
        const selector = DEFECT_SELECTORS[defectType];
        const element = document.querySelector(selector) as HTMLElement | null;
        if (element) {
          applyRepair(defectType, element);
        } else {
          allApplied = false;
        }
      });
      return allApplied;
    };

    // Try immediately
    if (applyRestoredRepairs()) {
      hasAppliedRestoredRepairs.current = true;
      return;
    }

    // If elements aren't ready, use MutationObserver to wait for them
    const observer = new MutationObserver(() => {
      if (applyRestoredRepairs()) {
        hasAppliedRestoredRepairs.current = true;
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, [progress.defects]);

  // Check if all defects are verified for level completion
  useEffect(() => {
    const allVerified = Object.values(progress.defects).every(
      (defect) => defect.verified
    );

    if (allVerified && !progress.isComplete) {
      dispatch({ type: 'COMPLETE_LEVEL' });
    }
  }, [progress.defects, progress.isComplete, dispatch]);

  const handleDefectInteraction = useCallback(
    (defectType: string) => {
      // Auto-discover defect when interacted with
      dispatch({ type: 'DISCOVER_DEFECT', defectType: defectType as DefectType });
    },
    [dispatch]
  );

  const handleResetClick = useCallback(() => {
    setShowResetDialog(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    setShowResetDialog(false);
    // Reset DOM repairs before resetting state
    resetAllRepairs();
    resetProgress();
    dispatch({ type: 'START_CHALLENGE' });
    // Reset the flag so repairs can be reapplied if needed
    hasAppliedRestoredRepairs.current = false;
  }, [resetProgress, dispatch]);

  const handleResetCancel = useCallback(() => {
    setShowResetDialog(false);
    // Return focus to reset button
    resetButtonRef.current?.focus();
  }, []);

  // Count progress
  const discoveredCount = Object.values(progress.defects).filter(
    (d) => d.discovered
  ).length;
  const verifiedCount = Object.values(progress.defects).filter(
    (d) => d.verified
  ).length;

  return (
    <div className={styles.container}>
      {/* Progress indicator with reset button */}
      <div className={styles.progress}>
        <span className={styles.progressLabel}>Progress:</span>
        <span className={styles.progressValue}>
          {verifiedCount} / 4 defects repaired
        </span>
        {discoveredCount < 4 && (
          <span className={styles.progressHint}>
            ({discoveredCount} / 4 discovered)
          </span>
        )}
        <button
          ref={resetButtonRef}
          type="button"
          className={styles.resetButton}
          onClick={handleResetClick}
          data-testid="reset-button"
          aria-label="Reset challenge progress"
        >
          Reset
        </button>
      </div>

      {/* Introduction message on first visit */}
      {discoveredCount === 0 && (
        <div className={styles.intro} role="status" aria-live="polite">
          <h2>🔍 Welcome to the Midnight Checkout</h2>
          <p>
            Explore the checkout below. When you interact with defective
            elements, they will be added to your repair list. Press{' '}
            <kbd>Escape</kbd> at any time to exit safely.
          </p>
        </div>
      )}

      {/* Hint panel (app shell zone: Emergency Exit → Hint Button → Sandbox) */}
      <HintPanel />

      {/* Main content: Sandbox + Repair Studio */}
      <div className={styles.content}>
        <div className={styles.sandboxColumn}>
          <ChallengeSandbox onDefectInteraction={handleDefectInteraction} />
        </div>

        <div className={styles.studioColumn}>
          <RepairStudio />
        </div>
      </div>

      {/* Reset confirmation dialog */}
      <ResetConfirmDialog
        isOpen={showResetDialog}
        onConfirm={handleResetConfirm}
        onCancel={handleResetCancel}
      />
    </div>
  );
}
