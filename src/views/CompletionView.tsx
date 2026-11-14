/**
 * Completion View
 * Shown when all defects are repaired and verified
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import styles from './CompletionView.module.css';

const WCAG_INFO: Record<string, { criterion: string; name: string }> = {
  'invisible-focus': {
    criterion: '2.4.7',
    name: 'Focus Visible',
  },
  'mouse-only-activation': {
    criterion: '2.1.1',
    name: 'Keyboard',
  },
  'missing-accessible-name': {
    criterion: '4.1.2',
    name: 'Name, Role, Value',
  },
  'insufficient-contrast': {
    criterion: '1.4.3',
    name: 'Contrast (Minimum)',
  },
};

export function CompletionView() {
  const { state, dispatch, progress } = useGame();
  const announceRef = useRef<HTMLDivElement>(null);

  // Get completion summary
  const summary = state.phase === 'completion' ? state.summary : null;

  // Announce completion to screen readers
  useEffect(() => {
    if (announceRef.current) {
      announceRef.current.textContent =
        'Congratulations! You have completed the KeyQuest challenge. All four accessibility defects have been repaired.';
    }
  }, []);

  function handleReplay() {
    dispatch({ type: 'RESET_CHALLENGE' });
    dispatch({ type: 'START_CHALLENGE' });
  }

  function handleReturnToMenu() {
    dispatch({ type: 'RESET_CHALLENGE' });
  }

  // Format time as mm:ss
  function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  if (!summary) return null;

  return (
    <div className={styles.container}>
      {/* Screen reader announcement */}
      <div
        ref={announceRef}
        aria-live="assertive"
        className="visually-hidden"
      />

      <div className={styles.card} data-testid="level-complete">
        <div className={styles.header}>
          <span className={styles.icon} aria-hidden="true">
            🎉
          </span>
          <h2 className={styles.title}>Challenge Complete!</h2>
        </div>

        <p className={styles.subtitle}>
          You've escaped the Midnight Checkout! Here's what you learned:
        </p>

        {/* Repaired defects summary */}
        <div className={styles.summarySection}>
          <h3 className={styles.sectionTitle}>Accessibility Repairs</h3>
          <ul className={styles.defectList}>
            {summary.defectsRepaired.map((defectType) => {
              const info = WCAG_INFO[defectType];
              return (
                <li key={defectType} className={styles.defectItem}>
                  <span className={styles.defectCheck} aria-hidden="true">
                    ✓
                  </span>
                  <div className={styles.defectInfo}>
                    <span className={styles.defectName}>
                      {defectType
                        .split('-')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                    </span>
                    {info && (
                      <span className={styles.wcagRef}>
                        WCAG {info.criterion}: {info.name}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Stats */}
        <div className={styles.summarySection}>
          <h3 className={styles.sectionTitle}>Statistics</h3>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Completion Time</span>
              <span className={styles.statValue}>
                {formatTime(summary.totalTime)}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Hints Used</span>
              <span className={styles.statValue}>
                {Object.values(progress.hintsUsed).reduce((a, b) => a + b, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleReplay}
          >
            Play Again
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleReturnToMenu}
          >
            Return to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
