/**
 * Completion View
 * Shown when all four defects are repaired and verified
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { resetAllRepairs } from '../engines/RepairEngine';
import styles from './CompletionView.module.css';

interface WcagSummaryDetail {
  criterion: string;
  level: 'A' | 'AA';
  name: string;
  remedy: string;
  impact: string;
}

const WCAG_INFO: Record<string, WcagSummaryDetail> = {
  'invisible-focus': {
    criterion: '2.4.7',
    level: 'AA',
    name: 'Focus Visible',
    remedy:
      'Restored :focus-visible outline (3px solid #005fcc) with ≥ 3:1 contrast.',
    impact:
      'Sighted keyboard users can always track which interactive control is active.',
  },
  'mouse-only-activation': {
    criterion: '2.1.1',
    level: 'A',
    name: 'Keyboard',
    remedy:
      'Added Enter/Space keydown handlers and role="button" to the custom control.',
    impact:
      'Keyboard-only and switch-device users can trigger actions identically to mouse users.',
  },
  'missing-accessible-name': {
    criterion: '4.1.2',
    level: 'A',
    name: 'Name, Role, Value',
    remedy:
      'Added aria-label="View shopping cart" to the icon-only cart button.',
    impact:
      'Screen reader and voice-control users can identify and activate the button by name.',
  },
  'insufficient-contrast': {
    criterion: '1.4.3',
    level: 'AA',
    name: 'Contrast (Minimum)',
    remedy:
      'Updated price foreground color from #555555 (2.09:1) to #e0e0e0 (> 9.5:1).',
    impact:
      'People with low vision or color vision deficiencies can read pricing effortlessly.',
  },
};

export function CompletionView() {
  const { state, dispatch, progress } = useGame();
  const announceRef = useRef<HTMLDivElement>(null);

  const summary = state.phase === 'completion' ? state.summary : null;

  useEffect(() => {
    if (announceRef.current) {
      announceRef.current.textContent =
        'Congratulations! You have completed the KeyQuest challenge. All four accessibility defects have been repaired and verified.';
    }
  }, []);

  function handleReplay() {
    resetAllRepairs();
    dispatch({ type: 'RESET_CHALLENGE' });
    dispatch({ type: 'START_CHALLENGE' });
  }

  function handleReturnToMenu() {
    resetAllRepairs();
    dispatch({ type: 'RESET_CHALLENGE' });
  }

  function formatTime(ms: number): string {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  if (!summary) return null;

  const totalHints = Object.values(progress.hintsUsed).reduce(
    (a, b) => a + b,
    0
  );

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
          <div className={styles.crestWrapper} aria-hidden="true">
            <svg
              viewBox="0 0 88 88"
              width="76"
              height="76"
              className={styles.crestSvg}
              aria-hidden="true"
              focusable="false"
            >
              <circle
                cx="44"
                cy="44"
                r="40"
                fill="#0f291e"
                stroke="#4ade80"
                strokeWidth="2.5"
              />
              <circle
                cx="44"
                cy="44"
                r="33"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <path
                d="M28 45L39 56L61 33"
                fill="none"
                stroke="#4ade80"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <span className={styles.escapeBadge}>
            CURSE LIFTED · SANCTUARY UNLOCKED
          </span>
          <h2 className={styles.title}>Challenge Complete!</h2>
          <p className={styles.subtitle}>
            You&apos;ve escaped the Midnight Checkout! Every intentional defect
            was repaired in the DOM and verified through live browser inspection.
            Here&apos;s what you accomplished:
          </p>
        </div>

        {/* Repaired defects summary */}
        <div className={styles.summarySection}>
          <h3 className={styles.sectionTitle}>
            Verified Accessibility Repairs
          </h3>
          <ul className={styles.defectList} role="list">
            {summary.defectsRepaired.map((defectType) => {
              const info = WCAG_INFO[defectType];
              const displayTitle = defectType
                .split('-')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');

              return (
                <li key={defectType} className={styles.defectItem}>
                  <span className={styles.defectCheck} aria-hidden="true">
                    ✓
                  </span>
                  <div className={styles.defectInfo}>
                    <div className={styles.defectHeaderRow}>
                      <span className={styles.defectName}>{displayTitle}</span>
                      {info && (
                        <span className={styles.wcagRef}>
                          WCAG {info.criterion}: {info.name} ({info.level})
                        </span>
                      )}
                    </div>
                    {info && (
                      <>
                        <p className={styles.defectRemedy}>{info.remedy}</p>
                        <p className={styles.defectImpact}>
                          <strong>Impact:</strong> {info.impact}
                        </p>
                      </>
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
              <span className={styles.statValue}>{totalHints}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>DOM Checks Verified</span>
              <span className={styles.statValue}>
                {summary.defectsRepaired.length} / 4
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
