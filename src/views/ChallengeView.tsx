/**
 * Challenge View
 * Contains the progress bar, hint panel, sandbox, and repair studio
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
    if (hasAppliedRestoredRepairs.current) return;

    const repairedDefects = Object.entries(progress.defects)
      .filter(([, state]) => state.repaired)
      .map(([type]) => type as DefectType);

    if (repairedDefects.length === 0) return;

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

    if (applyRestoredRepairs()) {
      hasAppliedRestoredRepairs.current = true;
      return;
    }

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
      dispatch({ type: 'DISCOVER_DEFECT', defectType: defectType as DefectType });
    },
    [dispatch]
  );

  const handleResetClick = useCallback(() => {
    setShowResetDialog(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    setShowResetDialog(false);
    resetAllRepairs();
    resetProgress();
    dispatch({ type: 'START_CHALLENGE' });
    hasAppliedRestoredRepairs.current = false;
  }, [resetProgress, dispatch]);

  const handleResetCancel = useCallback(() => {
    setShowResetDialog(false);
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
      {/* Progress indicator with segmented meter and reset button */}
      <div className={styles.progress}>
        <div className={styles.progressInfo}>
          <span className={styles.progressLabel}>Progress:</span>
          <span className={styles.progressValue}>
            {verifiedCount} / 4 defects repaired
          </span>
          {discoveredCount < 4 && (
            <span className={styles.progressHint}>
              ({discoveredCount} / 4 discovered)
            </span>
          )}
        </div>

        <div
          className={styles.progressSegments}
          aria-hidden="true"
        >
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={
                idx < verifiedCount
                  ? styles.segmentVerified
                  : idx < discoveredCount
                    ? styles.segmentDiscovered
                    : styles.segmentEmpty
              }
            />
          ))}
        </div>

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
            Explore the haunted checkout below using <kbd>Tab</kbd> and your
            mouse, or reveal defects directly in the{' '}
            <strong>Repair Studio</strong>. Press <kbd>Escape</kbd> at any time
            to exit safely.
          </p>
        </div>
      )}

      {/* Hint panel (app shell zone: Emergency Exit → Reset → Hint Button → Sandbox) */}
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
