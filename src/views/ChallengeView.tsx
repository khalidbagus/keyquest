/**
 * Challenge View
 * Contains the sandbox and repair studio
 * Requirements: 2.1, 2.2, 2.4
 */

import { useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { ChallengeSandbox } from '../components/ChallengeSandbox';
import { RepairStudio } from '../components/RepairStudio';
import type { DefectType } from '../types';
import styles from './ChallengeView.module.css';

export function ChallengeView() {
  const { progress, dispatch } = useGame();

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

  // Count progress
  const discoveredCount = Object.values(progress.defects).filter(
    (d) => d.discovered
  ).length;
  const verifiedCount = Object.values(progress.defects).filter(
    (d) => d.verified
  ).length;

  return (
    <div className={styles.container}>
      {/* Progress indicator */}
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

      {/* Main content: Sandbox + Repair Studio */}
      <div className={styles.content}>
        <div className={styles.sandboxColumn}>
          <ChallengeSandbox onDefectInteraction={handleDefectInteraction} />
        </div>

        <div className={styles.studioColumn}>
          <RepairStudio />
        </div>
      </div>
    </div>
  );
}
