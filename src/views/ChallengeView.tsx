/**
 * Challenge View (Adventure Room 1: Midnight Checkout)
 * One objective at a time, the counter lantern and Buy Now first, the repair
 * beside the scene, and a key on the counter at the end.
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
import type { DefectInteraction } from '../components/MidnightCheckout/MidnightCheckout';
import { applyRepair, resetAllRepairs } from '../engines/RepairEngine';
import { getCurseByType, getRoomCurses } from '../registry/patchRegistry';
import { ROOM_DEFECTS, roomFoundCount } from '../registry/roomsRegistry';
import { MidnightCheckout } from '../components/MidnightCheckout/MidnightCheckout';
import { DEFECT_ORDER } from '../registry/hintRegistry';
import {
  OBJECTIVE_COPY,
  ORDER_CURSES,
  ORDER_TASK_COPY,
  countVerified,
  getBuyNowOutcome,
  getCheckoutStage,
  getNextOrderTask,
} from '../registry/roomRegistry';
import type { DefectType } from '../types';
import styles from './ChallengeView.module.css';

const DEFECT_SELECTORS: Partial<Record<DefectType, string>> = {
  'invisible-focus': '[data-testid="defect-invisible-focus"]',
  'mouse-only-activation': '[data-testid="defect-mouse-only"]',
  'missing-accessible-name': '[data-testid="defect-missing-name"]',
  'insufficient-contrast': '[data-testid="defect-low-contrast"]',
};

function isDefectType(value: string): value is DefectType {
  return (DEFECT_ORDER as readonly string[]).includes(value);
}

export function ChallengeView() {
  const { progress, dispatch, saveProgress, resetRoom } = useGame();
  const { companion, companionSignal, triggerCompanion } = useMascot();

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [lockerOpen, setLockerOpen] = useState(false);
  const [selectedCurse, setSelectedCurse] = useState<DefectType | null>(null);
  const [studioFocusRequest, setStudioFocusRequest] = useState(0);
  const [roomStatus, setRoomStatus] = useState('');
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const costumeButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const stage = getCheckoutStage(progress);
  const objective = OBJECTIVE_COPY[stage];
  const verifiedCount = countVerified(progress);
  const foundCount = roomFoundCount(progress, 'checkout');

  // The Repair Studio shows the curse the player picked, else the first found
  // curse that is still unfixed.
  const activeCurse: DefectType | null =
    selectedCurse ??
    DEFECT_ORDER.find(
      (type) => progress.defects[type].discovered && !progress.defects[type].verified
    ) ??
    null;

  // Move focus to the room heading on entry, unless recovery UI already has it.
  useEffect(() => {
    const active = document.activeElement;
    if (!active || active === document.body || active.id === 'main-content') {
      headingRef.current?.focus();
    }
  }, []);

  // One brief greeting on entry.
  useEffect(() => {
    triggerCompanion('greet');
  }, [triggerCompanion]);

  const discover = useCallback(
    (type: DefectType, select = true) => {
      if (progress.defects[type].discovered) return false;
      dispatch({ type: 'DISCOVER_DEFECT', defectType: type });
      const curse = getCurseByType(type);
      // Passing focus over a control finds its curse but does not swap the
      // repair the player is already working on.
      if (select) setSelectedCurse(type);
      setRoomStatus(`Curse found: ${curse.roomTitle}.`);
      triggerCompanion('reactFailure', curse.symptom, 'warning');
      return true;
    },
    [dispatch, progress.defects, triggerCompanion]
  );

  const handleDefectInteraction = useCallback(
    (defectType: string, interaction: DefectInteraction = 'activate') => {
      if (!isDefectType(defectType)) return;
      const isNew = discover(defectType, interaction !== 'focus');
      if (!isNew && interaction === 'blocked') {
        setRoomStatus('Add to Cart ignored the key. Its curse is still active.');
      }
    },
    [discover]
  );

  const handleInspect = useCallback(
    (type: DefectType) => {
      discover(type);
      setSelectedCurse(type);
      setStudioFocusRequest((n) => n + 1);
    },
    [discover]
  );

  const handleBuyNow = useCallback(() => {
    const outcome = getBuyNowOutcome(progress);
    switch (outcome.kind) {
      case 'discover':
        handleDefectInteraction('invisible-focus', 'activate');
        return;
      case 'room-action':
        dispatch({ type: 'ROOM_ACTION', action: outcome.action });
        setRoomStatus(outcome.status);
        triggerCompanion(
          'celebrate',
          outcome.action === 'light-lantern'
            ? 'The lantern is lit!'
            : 'Order placed. That key is ours!',
          'celebrate'
        );
        return;
      case 'blocked':
        setRoomStatus(outcome.status);
        return;
      default:
        return;
    }
  }, [dispatch, handleDefectInteraction, progress, triggerCompanion]);

  const handleAddToCart = useCallback(() => {
    if (progress.checkout.candleAdded) {
      setRoomStatus('The candle is already in the order.');
      return;
    }
    dispatch({ type: 'ROOM_ACTION', action: 'add-candle' });
    setRoomStatus('Candle added to the order.');
  }, [dispatch, progress.checkout.candleAdded]);

  const handleBagChecked = useCallback(
    (open: boolean) => {
      setRoomStatus(
        open
          ? progress.checkout.candleAdded
            ? 'Bag opened: the Enchanted Candle is in the order.'
            : 'Bag opened: it is empty.'
          : 'Bag closed.'
      );
    },
    [progress.checkout.candleAdded]
  );

  const handleVerified = useCallback((type: DefectType) => {
    // Keep the verified result and its explanation on screen.
    setSelectedCurse(type);
    const curse = getCurseByType(type);
    setRoomStatus(`Fixed: ${curse.fixedSummary} ${curse.nextAction}`);
  }, []);

  const handleTakeKey = useCallback(() => {
    dispatch({ type: 'ROOM_ACTION', action: 'take-key' });
    dispatch({ type: 'COMPLETE_ROOM', roomId: 'checkout' });
  }, [dispatch]);

  const handleResetConfirm = useCallback(() => {
    setShowResetDialog(false);
    resetAllRepairs();
    resetRoom('checkout');
    setSelectedCurse(null);
    setRoomStatus('The room is reset. All four curses are back.');
    triggerCompanion('reset');
  }, [triggerCompanion, resetRoom]);

  const handleErrorResetSandbox = useCallback(() => {
    resetAllRepairs();
    dispatch({ type: 'START_CHALLENGE' });
  }, [dispatch]);

  const handleErrorReturnToMenu = useCallback(() => {
    dispatch({ type: 'EMERGENCY_EXIT' });
  }, [dispatch]);

  function renderObjectiveControl() {
    switch (stage) {
      case 'find-lantern-curse':
        return (
          <button
            type="button"
            className={styles.objectiveButton}
            onClick={() => handleInspect('invisible-focus')}
            data-testid="inspect-invisible-focus"
          >
            {ORDER_TASK_COPY['invisible-focus'].inspectLabel}
          </button>
        );
      case 'repair-lantern-curse':
        return (
          <button
            type="button"
            className={styles.objectiveButton}
            onClick={() => handleInspect('invisible-focus')}
            data-testid="goto-repair"
          >
            Go to the repair
          </button>
        );
      case 'finish-order':
      case 'place-order': {
        // One job at a time keeps the card height stable, so the lit lantern
        // and Buy Now stay where the player is looking. The journal lists all.
        const next = getNextOrderTask(progress);
        const lifted = ORDER_CURSES.filter((t) => progress.defects[t].verified).length;
        return (
          <div className={styles.nextTask} data-testid="order-next-task">
            <p className={styles.orderProgress} data-testid="order-progress">
              Order: {lifted} of 3 curses lifted ·{' '}
              {progress.checkout.candleAdded ? 'candle in the order' : 'candle not added'}
            </p>
            {next?.kind === 'curse' && (
              <div className={styles.nextTaskRow}>
                <span className={styles.nextTaskText}>
                  Next: {ORDER_TASK_COPY[next.type].task}
                  {progress.defects[next.type].discovered && ' (curse found)'}
                </span>
                <button
                  type="button"
                  className={styles.objectiveButton}
                  onClick={() => handleInspect(next.type)}
                  data-testid={
                    progress.defects[next.type].discovered
                      ? `goto-repair-${next.type}`
                      : `inspect-${next.type}`
                  }
                >
                  {progress.defects[next.type].discovered
                    ? 'Go to the repair'
                    : ORDER_TASK_COPY[next.type].inspectLabel}
                </button>
              </div>
            )}
            {next?.kind === 'candle' && (
              <p className={styles.nextTaskText}>
                Next: add the candle with Add to Cart. Enter and Space work now.
              </p>
            )}
          </div>
        );
      }
      case 'cleared':
        return (
          <button
            type="button"
            className={styles.objectiveButton}
            onClick={() => dispatch({ type: 'OPEN_DOORS' })}
            data-testid="back-to-doors"
          >
            Back to the doors
          </button>
        );
      case 'take-key':
        return (
          <button
            type="button"
            className={styles.keyButton}
            onClick={handleTakeKey}
            data-testid="take-key"
          >
            Take the key
          </button>
        );
      default:
        return null;
    }
  }

  return (
    <div className={styles.container}>
      {/* Room header */}
      <div className={styles.roomHeader}>
        <div className={styles.roomTitleGroup}>
          <span className={styles.roomEyebrow}>Room 1 · Nocturne Apothecary</span>
          <h2
            ref={headingRef}
            id="room-heading"
            tabIndex={-1}
            className={styles.roomTitle}
          >
            Midnight Checkout
          </h2>
        </div>

        <div className={styles.roomMeta}>
          <p className={styles.candles} data-testid="room-progress">
            <span className={styles.candlePips} aria-hidden="true">
              {getRoomCurses('checkout').map((curse) => (
                <span
                  key={curse.type}
                  className={`${styles.candlePip} ${
                    progress.defects[curse.type].verified ? styles.candlePipLit : ''
                  }`}
                />
              ))}
            </span>
            <span>
              {verifiedCount} of 4 candles lit
              <span className={styles.foundCount}> · {foundCount} of 4 curses found</span>
            </span>
          </p>
        </div>
      </div>

      {/* Objective: one job, one control, a polite status */}
      <section
        className={`${styles.objective} ${stage === 'take-key' || stage === 'cleared' ? styles.objectiveComplete : ''}`}
        aria-labelledby="objective-label"
        data-testid="room-objective"
        data-stage={stage}
      >
        <div className={styles.ghost}>
          <RiveMascot
            mascot={companion}
            signal={companionSignal}
            variant="medallion"
            size={64}
          />
        </div>
        <div className={styles.objectiveBody}>
          <p className={styles.objectiveEyebrow}>Objective</p>
          <h3 id="objective-label" className={styles.objectiveLabel}>
            {objective.label}
          </h3>
          <p className={styles.objectiveInstruction}>
            {stage === 'place-order' && !progress.checkout.candleAdded
              ? 'All four candles are lit. Add the candle with Add to Cart, then press Buy Now.'
              : objective.instruction}
          </p>
          <div className={styles.objectiveControl}>{renderObjectiveControl()}</div>
          <p
            className={styles.roomStatus}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid="room-status"
          >
            {roomStatus}
          </p>
        </div>
      </section>

      <ErrorBoundary
        progress={progress}
        saveProgress={saveProgress}
        onResetSandbox={handleErrorResetSandbox}
        onReturnToMenu={handleErrorReturnToMenu}
      >
        <SandboxSession
          onDefectInteraction={handleDefectInteraction}
          onBuyNow={handleBuyNow}
          onAddToCart={handleAddToCart}
          onBagChecked={handleBagChecked}
          activeCurse={activeCurse}
          onSelectCurse={(type) => {
            setSelectedCurse(type);
            setStudioFocusRequest((n) => n + 1);
          }}
          studioFocusRequest={studioFocusRequest}
          onInspect={handleInspect}
          onVerified={handleVerified}
        />
      </ErrorBoundary>

      {/* Room tools sit after the scene so the objective comes first in Tab order. */}
      <div className={styles.roomTools} role="group" aria-label="Room tools">
        <button
          ref={costumeButtonRef}
          type="button"
          className={styles.toolButton}
          onClick={() => setLockerOpen(true)}
          data-testid="challenge-costume-button"
          aria-label={`Costumes, change ghost (currently ${companion.name})`}
        >
          <CostumeMaskIcon size={14} />
          <span>Costumes</span>
        </button>
        <button
          ref={resetButtonRef}
          type="button"
          className={styles.toolButton}
          onClick={() => setShowResetDialog(true)}
          data-testid="reset-button"
          aria-label="Reset challenge progress"
        >
          <ResetArrowsIcon size={14} />
          <span>Reset</span>
        </button>
      </div>

      <ResetConfirmDialog
        isOpen={showResetDialog}
        onConfirm={handleResetConfirm}
        onCancel={() => setShowResetDialog(false)}
        returnFocusRef={resetButtonRef}
        title="Reset Midnight Checkout?"
        description="This will clear all your progress in this room: found curses, repairs, hints, the lantern, and the order. Other rooms keep their progress, but the Pantry door stays locked until you earn the key again."
      />

      <CostumeLockerModal
        isOpen={lockerOpen}
        onClose={() => setLockerOpen(false)}
        returnFocusRef={costumeButtonRef}
      />
    </div>
  );
}

interface SandboxSessionProps {
  onDefectInteraction: (type: string, interaction?: DefectInteraction) => void;
  onBuyNow: () => void;
  onAddToCart: () => void;
  onBagChecked: (open: boolean) => void;
  activeCurse: DefectType | null;
  onSelectCurse: (type: DefectType) => void;
  studioFocusRequest: number;
  onInspect: (type: DefectType) => void;
  onVerified: (type: DefectType) => void;
}

/** Remount repairs and the studio together after retry or sandbox reset. */
function SandboxSession({
  onDefectInteraction,
  onBuyNow,
  onAddToCart,
  onBagChecked,
  activeCurse,
  onSelectCurse,
  studioFocusRequest,
  onInspect,
  onVerified,
}: SandboxSessionProps) {
  const { progress } = useGame();

  useLayoutEffect(() => {
    for (const type of ROOM_DEFECTS.checkout) {
      const defect = progress.defects[type];
      const selector = DEFECT_SELECTORS[type];
      if (!defect.repaired || !selector) continue;
      const element = document.querySelector<HTMLElement>(selector);
      if (element) applyRepair(type, element);
    }
  }, [progress.defects]);

  return (
    <div className={styles.content}>
      <div className={styles.sandboxColumn}>
        <ChallengeSandbox curseTypes={ROOM_DEFECTS.checkout}>
          {(visionMode) => (
            <MidnightCheckout
              onDefectInteraction={onDefectInteraction}
              onBuyNow={onBuyNow}
              onAddToCart={onAddToCart}
              onBagChecked={onBagChecked}
              visionMode={visionMode}
            />
          )}
        </ChallengeSandbox>
      </div>
      <div className={styles.studioColumn}>
        <RepairStudio
          roomTypes={ROOM_DEFECTS.checkout}
          activeType={activeCurse}
          onSelect={onSelectCurse}
          focusRequest={studioFocusRequest}
          onVerified={onVerified}
        />
        <HintPanel order={ROOM_DEFECTS.checkout} />
        <RoomJournal onInspect={onInspect} />
      </div>
    </div>
  );
}

/** Optional journal: how to play and the four curses, with direct inspect. */
function RoomJournal({ onInspect }: { onInspect: (type: DefectType) => void }) {
  const { progress } = useGame();
  return (
    <details className={styles.journal} data-testid="room-journal">
      <summary className={styles.journalSummary}>Room journal</summary>
      <div className={styles.journalBody}>
        <p className={styles.journalText}>
          Find each curse by using the shop with Tab, Enter, Space, a mouse, or
          touch, or inspect it below. Pick a patch, and the game checks the live
          page. Then use the repaired control.
        </p>
        <ul className={styles.journalList}>
          {DEFECT_ORDER.map((type) => {
            const curse = getCurseByType(type);
            const state = progress.defects[type];
            return (
              <li key={type} className={styles.journalItem}>
                <span className={styles.journalName}>
                  {curse.roomTitle}
                  <span className={styles.journalMeta}>
                    {curse.wcagCode} ·{' '}
                    {state.verified ? 'Fixed' : state.discovered ? 'Found' : 'Not found yet'}
                  </span>
                </span>
                {!state.discovered && (
                  <button
                    type="button"
                    className={styles.checkButton}
                    onClick={() => onInspect(type)}
                    data-testid={`journal-inspect-${type}`}
                  >
                    Inspect
                    <span className="visually-hidden"> {curse.roomTitle}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
