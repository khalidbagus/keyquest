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
import { CostumeMaskIcon, KeyCrestIcon } from '../components/Icons/ApothecaryIcons';
import { getCurseByType } from '../registry/patchRegistry';
import type { DefectType, RoomId } from '../types';
import { ROOM_DEFECTS, isRoomUnlocked } from '../registry/roomsRegistry';
import { LanternPotion } from '../components/PotionPantry/PantryProps';
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
  'color-only-ingredients': {
    criterion: '1.4.1',
    level: 'A',
    name: 'Use of Color',
    remedy: 'Revealed a symbol and a visible name on every ingredient jar; the name is the button text.',
    impact:
      'Players who cannot tell the colors apart, and screen reader users, can pick the right ingredient.',
  },
};

interface RoomCompletionCopy {
  badge: string;
  title: string;
  subtitle: (ghost: string) => string;
  announcement: string;
  nextTitle: string;
  nextDetail: string;
  nextState: string;
}

const ROOM_COPY: Record<RoomId, RoomCompletionCopy> = {
  checkout: {
    badge: 'ROOM 1 CLEARED · MIDNIGHT CHECKOUT',
    title: 'You earned the Pantry Key',
    subtitle: (ghost) =>
      `You and ${ghost} relit the counter lantern and rang up the shopper’s order. Every repair was checked on the live page.`,
    announcement:
      'Midnight Checkout cleared. You earned the Pantry Key. All four accessibility defects were repaired and verified.',
    nextTitle: 'Next door: Potion Pantry',
    nextDetail: 'Brew a lantern potion from a three-ingredient recipe. Your key opens it now.',
    nextState: 'Open',
  },
  pantry: {
    badge: 'ROOM 2 CLEARED · POTION PANTRY',
    title: 'You brewed the lantern potion',
    subtitle: (ghost) =>
      `You and ${ghost} labelled the shelf and brewed a lantern potion. The repair was checked on the live page.`,
    announcement:
      'Potion Pantry cleared. You brewed the lantern potion. The ingredient labels were repaired and verified.',
    nextTitle: 'Next door: Clocktower Gate',
    nextDetail: 'Ring three bells in order to bring the lights back. This door opens in a later update.',
    nextState: 'Coming later',
  },
  clocktower: {
    badge: 'ROOM 3 CLEARED',
    title: 'The bells ring again',
    subtitle: (ghost) => `You and ${ghost} rang the clocktower bells.`,
    announcement: 'Clocktower Gate cleared.',
    nextTitle: 'The apothecary is lit',
    nextDetail: '',
    nextState: 'Done',
  },
};

export function CompletionView() {
  const { state, dispatch, progress } = useGame();
  const { companion, companionSignal, triggerCompanion } = useMascot();
  const announceRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const costumeButtonRef = useRef<HTMLButtonElement>(null);
  const [lockerOpen, setLockerOpen] = useState(false);

  const summary = state.phase === 'completion' ? state.summary : null;
  const roomId: RoomId = summary?.roomId ?? 'checkout';
  const copy = ROOM_COPY[roomId];

  useEffect(() => {
    titleRef.current?.focus();
    if (announceRef.current) {
      announceRef.current.textContent = copy.announcement;
    }
  }, [copy.announcement]);

  function handleOpenPantry() {
    dispatch({ type: 'ENTER_ROOM', roomId: 'pantry' });
  }

  function handleDoors() {
    dispatch({ type: 'OPEN_DOORS' });
  }

  // Progress stays saved; the menu offers Resume.
  function handleReturnToMenu() {
    dispatch({ type: 'EMERGENCY_EXIT' });
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

  const roomTypes = ROOM_DEFECTS[roomId];
  const totalHints = roomTypes.reduce((sum, t) => sum + progress.hintsUsed[t], 0);
  const pantryOpen = roomId === 'checkout' && isRoomUnlocked(progress, 'pantry');

  return (
    <div className={styles.container}>
      {/* Screen reader announcement */}
      <div
        ref={announceRef}
        aria-live="polite"
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

          <span className={styles.escapeBadge}>{copy.badge}</span>
          <h2 ref={titleRef} tabIndex={-1} className={styles.title}>
            {copy.title}
          </h2>
          <p className={styles.subtitle}>{copy.subtitle(companion.name)}</p>
        </div>

        {/* What the key opens */}
        <div className={styles.keyReward} data-testid="next-door">
          <span className={styles.keyIcon} aria-hidden="true">
            {roomId === 'pantry' ? <LanternPotion /> : <KeyCrestIcon size={40} />}
          </span>
          <div className={styles.keyText}>
            <p className={styles.keyTitle}>{copy.nextTitle}</p>
            <p className={styles.keyDetail}>{copy.nextDetail}</p>
          </div>
          <span className={styles.doorState}>{copy.nextState}</span>
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
                {summary.defectsRepaired.length} / {roomTypes.length}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {pantryOpen ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleOpenPantry}
              data-testid="open-pantry"
            >
              Open the Pantry door
            </button>
          ) : null}
          <button
            type="button"
            className={pantryOpen ? styles.secondaryButton : styles.primaryButton}
            onClick={handleDoors}
            data-testid="completion-doors"
          >
            Back to the doors
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
