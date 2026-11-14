/**
 * Challenge View
 * Contains the progress bar, hint panel, sandbox, and repair studio
 * Requirements: 2.1, 2.2, 2.4, 17.1-17.5
 */

import { useEffect, useLayoutEffect, useCallback, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { ChallengeSandbox } from '../components/ChallengeSandbox';
import { ErrorBoundary } from '../components/ErrorBoundary';
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
  const { progress, dispatch, resetProgress, saveProgress } = useGame();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
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
  }, [resetProgress, dispatch]);

  const handleResetCancel = useCallback(() => {
    setShowResetDialog(false);
    resetButtonRef.current?.focus();
  }, []);

  // Error boundary handlers
  const handleErrorResetSandbox = useCallback(() => {
    // Reset repairs but preserve progress structure (discoveries, hints, etc.)
    resetAllRepairs();
    // Re-dispatch START_CHALLENGE to refresh sandbox state
    dispatch({ type: 'START_CHALLENGE' });
  }, [dispatch]);

  const handleErrorReturnToMenu = useCallback(() => {
    // Progress is auto-saved; simply navigate to menu
    dispatch({ type: 'EMERGENCY_EXIT' });
  }, [dispatch]);

  // Count progress
  const discoveredCount = Object.values(progress.defects).filter(
    (d) => d.discovered
  ).length;
  const verifiedCount = Object.values(progress.defects).filter(
    (d) => d.verified
  ).length;

  return (
    <div className={styles.container}>
      <h2 className="visually-hidden">Midnight Checkout Challenge</h2>

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
          <h3>🔍 Welcome to the Midnight Checkout</h3>
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
      <ErrorBoundary
        progress={progress}
        saveProgress={saveProgress}
        onResetSandbox={handleErrorResetSandbox}
        onReturnToMenu={handleErrorReturnToMenu}
      >
        <SandboxSession onDefectInteraction={handleDefectInteraction} />
      </ErrorBoundary>

      {/* Reset confirmation dialog */}
      <ResetConfirmDialog
        isOpen={showResetDialog}
        onConfirm={handleResetConfirm}
        onCancel={handleResetCancel}
      />
    </div>
  );
}

/** Remount repairs and the studio together after retry or sandbox reset. */
function SandboxSession({ onDefectInteraction }: { onDefectInteraction: (type: string) => void }) {
  const { progress } = useGame();

  useLayoutEffect(() => {
    for (const defect of Object.values(progress.defects)) {
      if (!defect.repaired) continue;
      const element = document.querySelector<HTMLElement>(DEFECT_SELECTORS[defect.type]);
      if (element) applyRepair(defect.type, element);
    }
  }, [progress.defects]);

  return (
    <div className={styles.content}>
      <div className={styles.sandboxColumn}>
        <ChallengeSandbox onDefectInteraction={onDefectInteraction} />
      </div>
      <div className={styles.studioColumn}><RepairStudio /></div>
    </div>
  );
}
