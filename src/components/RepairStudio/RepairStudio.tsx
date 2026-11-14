/**
 * Repair Studio Component
 * Interface for discovering and repairing defects
 * Requirements: 4.4, 5.4, 6.4, 7.4
 */

import { useCallback, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { applyRepair, type RepairResult } from '../../engines/RepairEngine';
import { verify } from '../../engines/VerificationEngine';
import type { DefectType } from '../../types';
import styles from './RepairStudio.module.css';

interface DefectInfo {
  type: DefectType;
  name: string;
  description: string;
  testId: string;
  repairTestId: string;
}

const DEFECTS: DefectInfo[] = [
  {
    type: 'mouse-only-activation',
    name: 'Mouse-Only Activation',
    description:
      'The "Add to Cart" element can only be clicked with a mouse. Keyboard users cannot activate it.',
    testId: 'defect-mouse-only',
    repairTestId: 'repair-mouse-only',
  },
  {
    type: 'invisible-focus',
    name: 'Invisible Focus',
    description:
      'The "Buy Now" button has no visible focus indicator. Keyboard users cannot see which element is focused.',
    testId: 'defect-invisible-focus',
    repairTestId: 'repair-invisible-focus',
  },
  {
    type: 'missing-accessible-name',
    name: 'Missing Accessible Name',
    description:
      'The cart icon button has no accessible name. Screen reader users cannot identify its purpose.',
    testId: 'defect-missing-name',
    repairTestId: 'repair-missing-name',
  },
  {
    type: 'insufficient-contrast',
    name: 'Insufficient Contrast',
    description:
      'The price text has low color contrast, making it hard to read for users with low vision.',
    testId: 'defect-low-contrast',
    repairTestId: 'repair-low-contrast',
  },
];

export function RepairStudio() {
  const { progress, dispatch } = useGame();
  const [repairResults, setRepairResults] = useState<
    Record<DefectType, RepairResult | null>
  >({
    'invisible-focus': null,
    'mouse-only-activation': null,
    'missing-accessible-name': null,
    'insufficient-contrast': null,
  });

  const handleRepair = useCallback(
    async (defect: DefectInfo) => {
      // Find the defective element
      const element = document.querySelector(
        `[data-testid="${defect.testId}"]`
      ) as HTMLElement | null;

      if (!element) {
        console.error(`Could not find element with testId: ${defect.testId}`);
        return;
      }

      // Apply the repair
      const result = applyRepair(defect.type, element);
      setRepairResults((prev) => ({
        ...prev,
        [defect.type]: result,
      }));

      if (result.success) {
        // Update game state
        dispatch({ type: 'APPLY_REPAIR', defectType: defect.type });

        // Verify the repair
        const verificationResult = await verify(defect.type, element);
        dispatch({ type: 'VERIFICATION_RESULT', result: verificationResult });
      }
    },
    [dispatch]
  );

  const handleDiscover = useCallback(
    (defectType: DefectType) => {
      dispatch({ type: 'DISCOVER_DEFECT', defectType });
    },
    [dispatch]
  );

  function getStatus(defect: DefectInfo): string {
    const state = progress.defects[defect.type];
    if (state.verified) return 'Verified ✓';
    if (state.repaired) return 'Repaired';
    if (state.discovered) return 'Discovered';
    return 'Hidden';
  }

  function getStatusClass(defect: DefectInfo): string {
    const state = progress.defects[defect.type];
    if (state.verified) return styles.statusVerified!;
    if (state.repaired) return styles.statusRepaired!;
    if (state.discovered) return styles.statusDiscovered!;
    return styles.statusUndiscovered!;
  }

  return (
    <div className={styles.studio}>
      <h3 className={styles.title}>
        <span aria-hidden="true">🔧</span>
        Repair Studio
      </h3>

      <div className={styles.cards}>
        {DEFECTS.map((defect) => {
          const state = progress.defects[defect.type];
          const result = repairResults[defect.type];

          return (
            <div key={defect.type} className={styles.card}>
              <div className={styles.cardHeader}>
                <h4 className={styles.cardTitle}>
                  {defect.name}
                </h4>
                <span className={`${styles.statusBadge} ${getStatusClass(defect)}`}>
                  {getStatus(defect)}
                </span>
              </div>

              <p className={styles.cardDescription}>{defect.description}</p>

              {!state.discovered && (
                <button
                  type="button"
                  className={styles.repairButton}
                  onClick={() => handleDiscover(defect.type)}
                >
                  Discover Defect
                </button>
              )}

              {state.discovered && !state.repaired && (
                <button
                  type="button"
                  className={styles.repairButton}
                  onClick={() => handleRepair(defect)}
                  data-testid={defect.repairTestId}
                >
                  Apply Repair
                </button>
              )}

              {state.repaired && result && (
                <div className={styles.feedback}>
                  <p className={styles.feedbackTitle}>Educational Feedback:</p>
                  <p className={styles.feedbackText}>{result.message}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
