/**
 * Main Menu View (Adventure opening)
 * Enter or Resume the Midnight Checkout up front. Costume selection is on
 * demand; the briefing and curse catalog live in a collapsed journal.
 * Keyboard contract: the Enter/Resume control is the first focusable control in <main>.
 */

import { useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useMascot } from '../context/MascotContext';
import { RiveMascot } from '../components/RiveMascot';
import { CostumeLockerModal } from '../components/CostumeLocker';
import { ResetConfirmDialog } from '../components/ResetConfirmDialog';
import { getRoomCurses } from '../registry/patchRegistry';
import { getCauldronStatus } from '../registry/pantryRegistry';
import {
  ROOMS,
  getRoom,
  isRoomCleared,
  roomFoundCount,
  roomVerifiedCount,
} from '../registry/roomsRegistry';
import { hasMeaningfulProgress } from '../storage/progressHelpers';
import { countVerified } from '../registry/roomRegistry';
import { CostumeMaskIcon, ShieldNoticeIcon } from '../components/Icons/ApothecaryIcons';
import styles from './MainMenuView.module.css';

function formatLastPlayed(timestamp: number): string {
  const diffMins = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function MainMenuView() {
  const { progress, dispatch, resetProgress } = useGame();
  const { companion, companionSignal } = useMascot();
  const [lockerOpen, setLockerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const costumeButtonRef = useRef<HTMLButtonElement>(null);
  const startOverRef = useRef<HTMLButtonElement>(null);

  const hasProgress = hasMeaningfulProgress(progress);
  const room = getRoom(progress.currentRoom);
  const atDoors = isRoomCleared(progress, progress.currentRoom);
  const resumeLabel = atDoors ? 'Resume at the doors' : `Resume ${room.name}`;

  function roomSummary(): string {
    if (atDoors) {
      const cleared = ROOMS.filter((r) => isRoomCleared(progress, r.id)).map((r) => r.name);
      return `${cleared.join(' and ')} cleared`;
    }
    if (progress.currentRoom === 'pantry') {
      const steps = progress.pantry.brewed
        ? 3
        : getCauldronStatus(progress.pantry.cauldron).correct;
      return `Potion Pantry, ${roomVerifiedCount(progress, 'pantry')} of 1 curse lifted, ${steps} of 3 recipe steps`;
    }
    return `${countVerified(progress)} of 4 candles lit, ${roomFoundCount(progress, 'checkout')} of 4 curses found, ${
      progress.checkout.lanternLit ? 'lantern lit' : 'lantern out'
    }`;
  }

  function handleEnter() {
    dispatch({ type: 'START_CHALLENGE' });
  }

  function handleStartOverConfirmed() {
    setConfirmOpen(false);
    resetProgress();
    dispatch({ type: 'START_CHALLENGE' });
  }

  return (
    <div className={styles.container}>
      <section className={styles.heroCard} aria-labelledby="menu-hero-heading">
        <div className={styles.heroCopyColumn}>
          <span className={styles.caseBadge}>Nocturne Apothecary · after midnight</span>

          <h2 id="menu-hero-heading" tabIndex={-1} className={styles.heading}>
            The apothecary has gone dark
          </h2>

          <p className={styles.description}>
            Its bell stopped ringing and the counter lantern went out. Fix what
            is broken at the <strong>Midnight Checkout</strong> to bring the shop
            back to life.
          </p>

          <div className={styles.ctaGroup}>
            <button
              type="button"
              className={styles.startButton}
              onClick={handleEnter}
              data-testid="start-challenge"
              aria-describedby={hasProgress ? 'resume-summary' : undefined}
            >
              <span>{hasProgress ? resumeLabel : 'Enter Midnight Checkout'}</span>
              <span className={styles.startArrow} aria-hidden="true">
                →
              </span>
            </button>

            {hasProgress && (
              <>
                <p id="resume-summary" className={styles.resumeSummary} data-testid="resume-summary">
                  Saved {formatLastPlayed(progress.lastUpdatedAt)}: {roomSummary()}.
                </p>
                <button
                  ref={startOverRef}
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setConfirmOpen(true)}
                  data-testid="start-fresh"
                >
                  Start over
                </button>
              </>
            )}
          </div>

          <p className={styles.notice}>
            <ShieldNoticeIcon size={16} className={styles.noticeIcon} />
            <span>
              The shop has intentional accessibility defects inside a labelled
              sandbox. Press <kbd>Escape</kbd> anytime to leave. Progress is saved.
            </span>
          </p>
        </div>

        <div className={styles.heroStageColumn}>
          <RiveMascot
            mascot={companion}
            signal={companionSignal}
            initialTrigger="greet"
            variant="hero"
            size={200}
          />
          <div className={styles.companionPlate}>
            <span className={styles.companionName}>
              Your ghost: {companion.name}
            </span>
            <button
              ref={costumeButtonRef}
              type="button"
              className={styles.costumeButton}
              onClick={() => setLockerOpen(true)}
              data-testid="open-costume-locker"
            >
              <CostumeMaskIcon size={16} />
              <span>Change ghost</span>
            </button>
          </div>
        </div>
      </section>

      <details className={styles.journal} data-testid="menu-journal">
        <summary className={styles.journalSummary}>
          Journal: how to play and the four curses
        </summary>
        <div className={styles.journalBody}>
          <ol className={styles.steps}>
            <li>
              <strong>Find a curse.</strong> Use the shop with Tab, Enter, Space,
              a mouse, or touch, or press Inspect. Ghost Vision shows what
              screen readers hear and where contrast fails.
            </li>
            <li>
              <strong>Pick a patch.</strong> One of three patches really fixes
              the control. The game checks the live page to confirm it.
            </li>
            <li>
              <strong>Use what you fixed.</strong> Each repaired control does
              something in the room. Hints are free and come one clue at a time.
            </li>
          </ol>

          <h3 className={styles.cursesHeading}>The curses, room by room</h3>
          <ul className={styles.cursesList}>
            {[...getRoomCurses('checkout'), ...getRoomCurses('pantry')].map((item) => (
              <li key={item.type} className={styles.curseItem}>
                <span className={styles.potionThumb} aria-hidden="true">
                  <img
                    src={item.potionArtUrl}
                    alt=""
                    className={styles.potionImg}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className={styles.curseText}>
                  <strong className={styles.curseTitle}>{item.roomTitle}</strong>
                  <span className={styles.curseMeta}>
                    {item.name} · {item.wcagCode} (Level {item.wcagLevel})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <CostumeLockerModal
        isOpen={lockerOpen}
        onClose={() => setLockerOpen(false)}
        returnFocusRef={costumeButtonRef}
      />

      <ResetConfirmDialog
        isOpen={confirmOpen}
        onConfirm={handleStartOverConfirmed}
        onCancel={() => setConfirmOpen(false)}
        returnFocusRef={startOverRef}
        idPrefix="start-over"
        title="Start over?"
        description="This clears your saved progress in every room: found curses, repairs, hints, and room items. It cannot be undone."
        confirmLabel="Start over"
      />
    </div>
  );
}
