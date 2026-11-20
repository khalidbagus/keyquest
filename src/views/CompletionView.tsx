/**
 * Completion View (v2 Sanctuary Unlocked Celebration Stage)
 * Celebrates with the player's animated Rive companion performing its signature
 * victory action, purified Curse Potion trophies, and Costume Locker showcase.
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useMascot } from '../context/MascotContext';
import { RiveMascot } from '../components/RiveMascot';
import { CostumeLockerModal } from '../components/CostumeLocker';
import { CostumeMaskIcon } from '../components/Icons/ApothecaryIcons';
import { resetAllRepairs } from '../engines/RepairEngine';
import { getCurseByType } from '../registry/patchRegistry';
import type { DefectType } from '../types';
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
      'Restored :focus-visible outline (3px solid high-contrast indicator) with > 8:1 contrast.',
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
      'Updated price foreground color from #555555 (~2.0:1) to #e0e0e0 (> 10:1).',
    impact:
      'People with low vision or color vision deficiencies can read pricing effortlessly.',
  },
};

export function CompletionView() {
  const { state, dispatch, progress } = useGame();
  const { companion, companionSignal, triggerCompanion } = useMascot();
  const announceRef = useRef<HTMLDivElement>(null);
  const costumeButtonRef = useRef<HTMLButtonElement>(null);
  const [lockerOpen, setLockerOpen] = useState(false);

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

  function handleEncore() {
    triggerCompanion('celebrate', companion.celebrationLine, 'celebrate');
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
          {/* Animated Companion Sanctuary Celebration Stage */}
          <div className={styles.celebrationStageWrap}>
            <RiveMascot
              mascot={companion}
              signal={companionSignal}
              initialTrigger="celebrate"
              variant="sanctuary"
              size={240}
            />
            <div className={styles.stageControls}>
              <button
                type="button"
                className={styles.stageActionBtn}
                onClick={handleEncore}
              >
                Replay {companion.signatureAction}
              </button>
              <button
                ref={costumeButtonRef}
                type="button"
                className={styles.stageActionBtn}
                onClick={() => setLockerOpen(true)}
              >
                <CostumeMaskIcon size={15} />
                <span>Try Another Ghost</span>
              </button>
            </div>
          </div>

          <span className={styles.escapeBadge}>
            CURSE LIFTED · SANCTUARY UNLOCKED
          </span>
          <h2 className={styles.title}>Challenge Complete!</h2>
          <p className={styles.subtitle}>
            You and <strong>{companion.name}</strong> purified the Midnight
            Checkout! Every intentional defect was repaired in the live DOM and
            verified through real browser inspection.
          </p>
        </div>

        {/* Repaired defects summary with Purified Curse Potion Trophies */}
        <div className={styles.summarySection}>
          <h3 className={styles.sectionTitle}>
            Verified Accessibility Repairs
          </h3>
          <ul className={styles.defectList} role="list">
            {summary.defectsRepaired.map((defectType) => {
              const info = WCAG_INFO[defectType];
              const curse = getCurseByType(defectType as DefectType);
              const displayTitle = defectType
                .split('-')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');

              return (
                <li key={defectType} className={styles.defectItem}>
                  <span className={styles.trophyPotion} aria-hidden="true">
                    <img
                      src={curse.potionArtUrl}
                      alt=""
                      className={styles.trophyPotionImg}
                    />
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

      <CostumeLockerModal
        isOpen={lockerOpen}
        onClose={() => setLockerOpen(false)}
        returnFocusRef={costumeButtonRef}
      />
    </div>
  );
}
