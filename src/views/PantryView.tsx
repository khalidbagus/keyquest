/**
 * Pantry View (Adventure Room 2: Potion Pantry)
 * One objective at a time: lift the color-only curse on the ingredient shelf,
 * then use the labelled jars to brew a three-ingredient lantern potion.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useMascot } from '../context/MascotContext';
import { ChallengeSandbox } from '../components/ChallengeSandbox/ChallengeSandbox';
import { PANTRY_VISION_MODES } from '../components/ChallengeSandbox/visionModes';
import { CostumeLockerModal } from '../components/CostumeLocker';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { HintPanel } from '../components/HintPanel';
import { RepairStudio } from '../components/RepairStudio';
import { ResetConfirmDialog } from '../components/ResetConfirmDialog';
import { RiveMascot } from '../components/RiveMascot';
import { PotionPantry } from '../components/PotionPantry/PotionPantry';
import type { DefectInteraction } from '../components/MidnightCheckout/MidnightCheckout';
import { CostumeMaskIcon, ResetArrowsIcon } from '../components/Icons/ApothecaryIcons';
import { applyRepair, resetRepair } from '../engines/RepairEngine';
import { getCurseByType } from '../registry/patchRegistry';
import {
  LANTERN_POTION_RECIPE,
  PANTRY_OBJECTIVE_COPY,
  getAddOutcome,
  getCauldronStatus,
  getIngredient,
  getPantryStage,
} from '../registry/pantryRegistry';
import { ROOM_DEFECTS, roomVerifiedCount } from '../registry/roomsRegistry';
import type { DefectType, IngredientId } from '../types';
import styles from './ChallengeView.module.css';
import pantryStyles from './PantryView.module.css';

const SHELF_SELECTOR = '[data-testid="defect-color-only"]';
const CURSE: DefectType = 'color-only-ingredients';

export function PantryView() {
  const { progress, dispatch, saveProgress, resetRoom } = useGame();
  const { companion, companionSignal, triggerCompanion } = useMascot();

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [lockerOpen, setLockerOpen] = useState(false);
  const [studioFocusRequest, setStudioFocusRequest] = useState(0);
  const [roomStatus, setRoomStatus] = useState('');
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const costumeButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const stage = getPantryStage(progress);
  const objective = PANTRY_OBJECTIVE_COPY[stage];
  const pantry = progress.pantry;
  const cauldronStatus = getCauldronStatus(pantry.cauldron);
  const curseState = progress.defects[CURSE];
  const activeCurse: DefectType | null = curseState.discovered ? CURSE : null;

  // Move focus to the room heading on entry, unless recovery UI already has it.
  useEffect(() => {
    const active = document.activeElement;
    if (!active || active === document.body || active.id === 'main-content') {
      headingRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    triggerCompanion('greet');
  }, [triggerCompanion]);

  /** Find the shelf curse once; returns false if it was already found. */
  const discover = useCallback(() => {
    if (progress.defects[CURSE].discovered) return false;
    dispatch({ type: 'DISCOVER_DEFECT', defectType: CURSE });
    const curse = getCurseByType(CURSE);
    setRoomStatus(`Curse found: ${curse.roomTitle}.`);
    triggerCompanion('reactFailure', curse.symptom, 'warning');
    return true;
  }, [dispatch, progress.defects, triggerCompanion]);

  // Focus or a press on a jar finds the curse without moving focus.
  const handleDefectInteraction = useCallback(
    (type: string) => {
      if (type === CURSE) discover();
    },
    [discover]
  );

  // Inspect finds the curse and moves focus to its repair.
  const handleInspect = useCallback(() => {
    discover();
    setStudioFocusRequest((n) => n + 1);
  }, [discover]);

  const handleJar = useCallback(
    (id: IngredientId) => {
      const item = getIngredient(id);
      const outcome = getAddOutcome(progress, id);
      if (outcome.kind === 'blocked') {
        switch (outcome.reason) {
          case 'cursed':
            if (!discover()) {
              setRoomStatus(
                'The shelf shows colors only: this jar has no name or symbol. Pick a patch in the Repair Studio.'
              );
            }
            return;
          case 'wrong-in-pot':
            setRoomStatus('Remove the ingredient that does not belong before adding another.');
            return;
          case 'full':
            setRoomStatus('The cauldron is full.');
            return;
          case 'brewed':
            setRoomStatus('The lantern potion is already brewed.');
            return;
        }
      }
      dispatch({ type: 'PANTRY_ACTION', action: 'add', ingredient: id });
      const step = pantry.cauldron.length + 1;
      if (outcome.brewed) {
        setRoomStatus(`${item.name} added. The brew turns gold: lantern potion brewed. Bottle it at the cauldron.`);
        triggerCompanion('celebrate', 'Gold and glowing! That is a lantern potion.', 'celebrate');
        // The new Bottle action appears beside the cauldron; move focus there.
        requestAnimationFrame(() => {
          document.querySelector<HTMLElement>('[data-testid="bottle-potion"]')?.focus();
        });
      } else if (outcome.correct) {
        setRoomStatus(`${item.name} added. Step ${step} of ${LANTERN_POTION_RECIPE.length} done.`);
      } else {
        const expected = getIngredient(LANTERN_POTION_RECIPE[step - 1]!);
        setRoomStatus(
          `${item.name} is not step ${step}; the recipe needs ${expected.name}. The brew turns murky. Remove ${item.name} from the cauldron.`
        );
        triggerCompanion('reactFailure', 'Murky! That jar is not next in the recipe.', 'warning');
      }
    },
    [discover, dispatch, pantry.cauldron.length, progress, triggerCompanion]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const id = pantry.cauldron[index];
      if (!id) return;
      dispatch({ type: 'PANTRY_ACTION', action: 'remove', index });
      setRoomStatus(`${getIngredient(id).name} removed from the cauldron.`);
      // Keep focus in the cauldron list; fall back to the shelf when it empties.
      const remaining = pantry.cauldron.length - 1;
      requestAnimationFrame(() => {
        const next =
          remaining > 0
            ? document.querySelector<HTMLElement>(
                `[data-testid="remove-ingredient-${Math.min(index, remaining - 1)}"]`
              )
            : document.querySelector<HTMLElement>(`${SHELF_SELECTOR} [data-ingredient]`);
        next?.focus();
      });
    },
    [dispatch, pantry.cauldron]
  );

  const handleVerified = useCallback(() => {
    const curse = getCurseByType(CURSE);
    setRoomStatus(`Fixed: ${curse.fixedSummary} ${curse.nextAction}`);
  }, []);

  const handleBottle = useCallback(() => {
    dispatch({ type: 'PANTRY_ACTION', action: 'bottle' });
    dispatch({ type: 'COMPLETE_ROOM', roomId: 'pantry' });
  }, [dispatch]);

  const handleResetConfirm = useCallback(() => {
    setShowResetDialog(false);
    const shelf = document.querySelector<HTMLElement>(SHELF_SELECTOR);
    if (shelf) resetRepair(CURSE, shelf);
    resetRoom('pantry');
    setRoomStatus('The pantry is reset. The shelf labels are hidden again.');
    triggerCompanion('reset');
  }, [resetRoom, triggerCompanion]);

  const handleErrorResetSandbox = useCallback(() => {
    const shelf = document.querySelector<HTMLElement>(SHELF_SELECTOR);
    if (shelf) resetRepair(CURSE, shelf);
    dispatch({ type: 'START_CHALLENGE' });
  }, [dispatch]);

  function renderObjectiveControl() {
    switch (stage) {
      case 'find-shelf-curse':
        return (
          <button
            type="button"
            className={styles.objectiveButton}
            onClick={handleInspect}
            data-testid="inspect-color-only-ingredients"
          >
            Inspect the shelf
          </button>
        );
      case 'repair-shelf-curse':
        return (
          <button
            type="button"
            className={styles.objectiveButton}
            onClick={handleInspect}
            data-testid="goto-repair"
          >
            Go to the repair
          </button>
        );
      case 'done':
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
      default:
        return null;
    }
  }

  const verified = roomVerifiedCount(progress, 'pantry');

  return (
    <div className={styles.container}>
      <div className={styles.roomHeader}>
        <div className={styles.roomTitleGroup}>
          <span className={styles.roomEyebrow}>Room 2 · Nocturne Apothecary</span>
          <h2 ref={headingRef} id="room-heading" tabIndex={-1} className={styles.roomTitle}>
            Potion Pantry
          </h2>
        </div>
        <div className={styles.roomMeta}>
          <p className={styles.candles} data-testid="room-progress">
            <span>
              Cauldron: {pantry.brewed ? LANTERN_POTION_RECIPE.length : cauldronStatus.correct} of{' '}
              {LANTERN_POTION_RECIPE.length} steps
              <span className={styles.foundCount}>
                {' '}
                · {verified} of {ROOM_DEFECTS.pantry.length} curse lifted
              </span>
            </span>
          </p>
        </div>
      </div>

      <section
        className={`${styles.objective} ${stage === 'done' || stage === 'bottle' ? styles.objectiveComplete : ''}`}
        aria-labelledby="objective-label"
        data-testid="room-objective"
        data-stage={stage}
      >
        <div className={styles.ghost}>
          <RiveMascot mascot={companion} signal={companionSignal} variant="medallion" size={64} />
        </div>
        <div className={styles.objectiveBody}>
          <p className={styles.objectiveEyebrow}>Objective</p>
          <h3 id="objective-label" className={styles.objectiveLabel}>
            {objective.label}
          </h3>
          <p className={styles.objectiveInstruction}>{objective.instruction}</p>

          {stage !== 'done' && (
            <div className={pantryStyles.recipe} data-testid="recipe-card">
              <p className={pantryStyles.recipeTitle} id="recipe-title">
                Recipe: lantern potion
              </p>
              <ol className={pantryStyles.recipeList} aria-labelledby="recipe-title">
                {LANTERN_POTION_RECIPE.map((id, index) => {
                  const item = getIngredient(id);
                  const done = pantry.brewed || index < cauldronStatus.correct;
                  return (
                    <li
                      key={id}
                      className={`${pantryStyles.recipeStep} ${done ? pantryStyles.recipeDone : ''}`}
                    >
                      <span aria-hidden="true" className={pantryStyles.recipeMark}>
                        {done ? '✓' : index + 1}
                      </span>
                      <span aria-hidden="true">{item.symbol}</span> {item.name}
                      {done && <span className="visually-hidden"> (in the cauldron)</span>}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

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
        onReturnToMenu={() => dispatch({ type: 'EMERGENCY_EXIT' })}
      >
        <PantrySession
          onDefectInteraction={handleDefectInteraction}
          onJar={handleJar}
          onRemove={handleRemove}
          onBottle={handleBottle}
          activeCurse={activeCurse}
          studioFocusRequest={studioFocusRequest}
          onInspect={handleInspect}
          onVerified={handleVerified}
        />
      </ErrorBoundary>

      <div className={styles.roomTools} role="group" aria-label="Room tools">
        <button
          type="button"
          className={styles.toolButton}
          onClick={() => dispatch({ type: 'OPEN_DOORS' })}
          data-testid="tools-doors"
        >
          <span>Doors</span>
        </button>
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
        title="Reset Potion Pantry?"
        description="This will clear all your progress in this room: the found curse, its repair, hints, and the cauldron. The Midnight Checkout keeps its progress."
      />

      <CostumeLockerModal
        isOpen={lockerOpen}
        onClose={() => setLockerOpen(false)}
        returnFocusRef={costumeButtonRef}
      />
    </div>
  );
}

interface PantrySessionProps {
  onDefectInteraction: (type: string, interaction?: DefectInteraction) => void;
  onJar: (id: IngredientId) => void;
  onRemove: (index: number) => void;
  onBottle: () => void;
  activeCurse: DefectType | null;
  studioFocusRequest: number;
  onInspect: () => void;
  onVerified: (type: DefectType) => void;
}

/** Remount the repair and the studio together after retry or sandbox reset. */
function PantrySession({
  onDefectInteraction,
  onJar,
  onRemove,
  onBottle,
  activeCurse,
  studioFocusRequest,
  onInspect,
  onVerified,
}: PantrySessionProps) {
  const { progress } = useGame();
  const repaired = progress.defects[CURSE].repaired;

  useLayoutEffect(() => {
    if (!repaired) return;
    const shelf = document.querySelector<HTMLElement>(SHELF_SELECTOR);
    if (shelf) applyRepair(CURSE, shelf);
  }, [repaired]);

  return (
    <div className={styles.content}>
      <div className={styles.sandboxColumn}>
        <ChallengeSandbox curseTypes={ROOM_DEFECTS.pantry} visionModes={PANTRY_VISION_MODES}>
          {(visionMode) => (
            <PotionPantry
              visionMode={visionMode}
              onDefectInteraction={onDefectInteraction}
              onJar={onJar}
              onRemove={onRemove}
              onBottle={onBottle}
            />
          )}
        </ChallengeSandbox>
      </div>
      <div className={styles.studioColumn}>
        <RepairStudio
          roomTypes={ROOM_DEFECTS.pantry}
          activeType={activeCurse}
          onSelect={() => undefined}
          focusRequest={studioFocusRequest}
          onVerified={onVerified}
        />
        <HintPanel order={ROOM_DEFECTS.pantry} />
        <details className={styles.journal} data-testid="room-journal">
          <summary className={styles.journalSummary}>Room journal</summary>
          <div className={styles.journalBody}>
            <p className={styles.journalText}>
              Match the recipe to the shelf. If you can’t tell the jars apart, inspect the
              shelf, pick a patch, and the game checks the live page. Then use the labelled
              jars to brew. Any ingredient can be removed from the cauldron.
            </p>
            <ul className={styles.journalList}>
              <li className={styles.journalItem}>
                <span className={styles.journalName}>
                  {getCurseByType(CURSE).roomTitle}
                  <span className={styles.journalMeta}>
                    {getCurseByType(CURSE).wcagCode} ·{' '}
                    {progress.defects[CURSE].verified
                      ? 'Fixed'
                      : progress.defects[CURSE].discovered
                        ? 'Found'
                        : 'Not found yet'}
                  </span>
                </span>
                {!progress.defects[CURSE].discovered && (
                  <button
                    type="button"
                    className={styles.checkButton}
                    onClick={onInspect}
                    data-testid={`journal-inspect-${CURSE}`}
                  >
                    Inspect
                    <span className="visually-hidden"> {getCurseByType(CURSE).roomTitle}</span>
                  </button>
                )}
              </li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
}
