/**
 * Challenge View (v2 Unified Companion & Hint Command Bar + 2-Column Workspace)
 * Requirements: 2.1, 2.2, 2.4, 17.1-17.5
 */

import {
  useEffect,
  useLayoutEffect,
  useCallback,
  useState,
  useRef,
} from 'react';
import { useGame } from '../context/GameContext';
import { useMascot } from '../context/MascotContext';
import { ChallengeSandbox } from '../components/ChallengeSandbox';
import { CostumeLockerModal } from '../components/CostumeLocker';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { HintPanel } from '../components/HintPanel';
import { RepairStudio } from '../components/RepairStudio';
import { ResetConfirmDialog } from '../components/ResetConfirmDialog';
import { RiveMascot } from '../components/RiveMascot';
import { CostumeMaskIcon, ResetArrowsIcon } from '../components/Icons/ApothecaryIcons';
import { applyRepair, resetAllRepairs } from '../engines/RepairEngine';
import { CURSE_CATALOG } from '../registry/patchRegistry';
import type { DefectType } from '../types';
import styles from './ChallengeView.module.css';

const DEFECT_SELECTORS: Record<DefectType, string> = {
  'invisible-focus': '[data-testid="defect-invisible-focus"]',
  'mouse-only-activation': '[data-testid="defect-mouse-only"]',
  'missing-accessible-name': '[data-testid="defect-missing-name"]',
  'insufficient-contrast': '[data-testid="defect-low-contrast"]',
};

export function ChallengeView() {
  const { progress, dispatch, resetProgress, saveProgress } = useGame();
  const { companion, companionSignal, speechLine, speechTone, triggerCompanion } =
    useMascot();

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [lockerOpen, setLockerOpen] = useState(false);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const costumeButtonRef = useRef<HTMLButtonElement>(null);

  // Greet the player on challenge start
  useEffect(() => {
    triggerCompanion(
      'greet',
      'Tab through the Midnight Checkout or toggle Ghost Vision to uncover all four curses!',
      'neutral'
    );
  }, [triggerCompanion]);

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
      dispatch({
        type: 'DISCOVER_DEFECT',
        defectType: defectType as DefectType,
      });
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
    triggerCompanion(
      'reset',
      'Fresh cauldron! All four curses are restored — ready for another run!',
      'neutral'
    );
    dispatch({ type: 'START_CHALLENGE' });
  }, [resetProgress, triggerCompanion, dispatch]);

  const handleResetCancel = useCallback(() => {
    setShowResetDialog(false);
  }, []);

  const handleErrorResetSandbox = useCallback(() => {
    resetAllRepairs();
    dispatch({ type: 'START_CHALLENGE' });
  }, [dispatch]);

  const handleErrorReturnToMenu = useCallback(() => {
    dispatch({ type: 'EMERGENCY_EXIT' });
  }, [dispatch]);

  const discoveredCount = Object.values(progress.defects).filter(
    (d) => d.discovered
  ).length;
  const verifiedCount = Object.values(progress.defects).filter(
    (d) => d.verified
  ).length;

  const speechToneClass =
    speechTone === 'celebrate'
      ? styles.speechCelebrate
      : speechTone === 'warning'
        ? styles.speechWarning
        : speechTone === 'hint'
          ? styles.speechHint
          : '';

  return (
    <div className={styles.container}>
      <h2 className="visually-hidden">Midnight Checkout Challenge</h2>

      {/* Unified Companion + Progress & Plague Doctor Hint Command Deck */}
      <div className={styles.commandDeck}>
        {/* Companion + Speech Bubble + Progress Bar */}
        <section
          className={styles.companionCard}
          aria-label="Haunting companion and challenge progress"
        >
          <div className={styles.companionLeft}>
            <RiveMascot
              mascot={companion}
              signal={companionSignal}
              variant="medallion"
              size={76}
            />
            <button
              ref={costumeButtonRef}
              type="button"
              className={styles.costumeMiniButton}
              onClick={() => setLockerOpen(true)}
              data-testid="challenge-costume-button"
              aria-label={`Costumes — change companion (currently ${companion.name})`}
            >
              <CostumeMaskIcon size={14} />
              <span>Costumes</span>
            </button>
          </div>

          <div className={styles.companionBody}>
            <div className={`${styles.speechBubble} ${speechToneClass}`}>
              <span className={styles.speechSpeaker}>{companion.name}:</span>{' '}
              <span className={styles.speechText}>{speechLine}</span>
            </div>

            <div className={styles.progressRow}>
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

              <div className={styles.potionTrack} aria-hidden="true">
                {CURSE_CATALOG.map((curse) => {
                  const st = progress.defects[curse.type];
                  return (
                    <span
                      key={curse.type}
                      className={`${styles.potionPip} ${
                        st.verified
                          ? styles.potionPipVerified
                          : st.discovered
                            ? styles.potionPipDiscovered
                            : ''
                      }`}
                      title={curse.name}
                    >
                      <img
                        src={curse.potionArtUrl}
                        alt=""
                        className={styles.potionPipImg}
                      />
                    </span>
                  );
                })}
              </div>

              <button
                ref={resetButtonRef}
                type="button"
                className={styles.resetButton}
                onClick={handleResetClick}
                data-testid="reset-button"
                aria-label="Reset challenge progress"
              >
                <ResetArrowsIcon size={15} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </section>

        {/* Plague Doctor Hint Keeper Booth */}
        <div className={styles.hintColumn}>
          <HintPanel />
        </div>
      </div>

      {/* Main content: Ghost Vision + Sandbox | Repair Studio */}
      <ErrorBoundary
        progress={progress}
        saveProgress={saveProgress}
        onResetSandbox={handleErrorResetSandbox}
        onReturnToMenu={handleErrorReturnToMenu}
      >
        <SandboxSession onDefectInteraction={handleDefectInteraction} />
      </ErrorBoundary>

      {/* Modals */}
      <ResetConfirmDialog
        isOpen={showResetDialog}
        onConfirm={handleResetConfirm}
        onCancel={handleResetCancel}
        returnFocusRef={resetButtonRef}
      />

      <CostumeLockerModal
        isOpen={lockerOpen}
        onClose={() => setLockerOpen(false)}
        returnFocusRef={costumeButtonRef}
      />
    </div>
  );
}

/** Remount repairs and the studio together after retry or sandbox reset. */
function SandboxSession({
  onDefectInteraction,
}: {
  onDefectInteraction: (type: string) => void;
}) {
  const { progress } = useGame();

  useLayoutEffect(() => {
    for (const defect of Object.values(progress.defects)) {
      if (!defect.repaired) continue;
      const element = document.querySelector<HTMLElement>(
        DEFECT_SELECTORS[defect.type]
      );
      if (element) applyRepair(defect.type, element);
    }
  }, [progress.defects]);

  return (
    <div className={styles.content}>
      <div className={styles.sandboxColumn}>
        <ChallengeSandbox onDefectInteraction={onDefectInteraction} />
      </div>
      <div className={styles.studioColumn}>
        <RepairStudio />
      </div>
    </div>
  );
}
