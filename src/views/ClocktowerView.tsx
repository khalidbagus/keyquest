/**
 * Clocktower View (Adventure Room 3: Clocktower Gate)
 * React owns every decision here; the Phaser scene only draws and moves.
 * Every input (keyboard, touch, scene, Route_Panel) reaches the same World_Action
 * through `dispatchWorldAction`, and every outcome is announced in one polite
 * Room_Status region.
 *
 * Checkpoint 2 covers the whole route: Apothecary Exit, Moonlit Courtyard,
 * Overgrown Graveyard, Clockworks Passage, and Belfry.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useGame } from '../context/GameContext';
import { useMascot } from '../context/MascotContext';
import { CostumeLockerModal } from '../components/CostumeLocker';
import { BellTower } from '../components/BellTower/BellTower';
import { ChallengeSandbox } from '../components/ChallengeSandbox/ChallengeSandbox';
import { BELFRY_VISION_MODES } from '../components/ChallengeSandbox/visionModes';
import { HintPanel } from '../components/HintPanel';
import { RepairStudio } from '../components/RepairStudio';
import { ClocktowerJournal } from '../components/Clocktower/ClocktowerJournal';
import { PlayArea, PLAY_AREA_INSTRUCTIONS_ID } from '../components/Clocktower/PlayArea';
import { RoutePanel } from '../components/Clocktower/RoutePanel';
import { TouchControls } from '../components/Clocktower/TouchControls';
import { CostumeMaskIcon, ResetArrowsIcon } from '../components/Icons/ApothecaryIcons';
import { ResetConfirmDialog } from '../components/ResetConfirmDialog';
import { RiveMascot } from '../components/RiveMascot';
import {
  WorldSceneHost,
  type WorldSceneHostApi,
  type WorldSceneStatus,
} from '../components/WorldScene/WorldSceneHost';
import { resetRepair } from '../engines/RepairEngine';
import {
  actionForInteractable,
  bellProgressText,
  closedExitMessage,
  getAvailableActions,
  getClocktowerStage,
  getObjective,
  getTravelOptions,
  interactablePrompt,
  journalClues,
  missingClues,
} from '../engines/clocktowerRules';
import {
  APOTHECARY_CONTROLS_TEXT,
  COPY,
  CONTROLS_INSTRUCTION,
  MAP_UNAVAILABLE_NOTICE,
  PREVIEW_LABEL,
  SCENE_LOADING_TEXT,
  clueLabel,
  gateNeedsClues,
  nearbyAnnouncement,
  sceneFailedText,
} from '../registry/clocktowerCopy';
import { getArea } from '../registry/clocktowerRoute';
import { getCurseByType } from '../registry/patchRegistry';
import { ROOM_DEFECTS } from '../registry/roomsRegistry';
import { useHeldDirections } from '../hooks/useHeldDirections';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useReactionToken } from '../hooks/useReactionToken';
import { useRoomStatus } from '../hooks/useRoomStatus';
import type { DefectType } from '../types';
import type {
  BellId,
  InteractableId,
  RulesContext,
  WorldAction,
  WorldEffect,
  WorldOutcome,
  WorldSceneCallbacks,
  WorldSnapshot,
} from '../types/clocktower';
import styles from './ChallengeView.module.css';
import clocktowerStyles from './ClocktowerView.module.css';

const BELL_CURSE: DefectType = 'bell-dialog-focus';
const BELL_DIALOG_SELECTOR = '[data-testid="defect-bell-focus"]';

export function ClocktowerView() {
  const { progress, clocktower, world, preview, dispatch, resetRoom, dispatchWorldAction } =
    useGame();
  const { companion, companionSignal, triggerCompanion, hintKeeper, hintKeeperSignal } = useMascot();
  const { prefersReducedMotion } = usePrefersReducedMotion();
  const roomStatus = useRoomStatus();
  const { announce } = roomStatus;
  const reactionToken = useReactionToken();

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [lockerOpen, setLockerOpen] = useState(false);
  const [sceneStatus, setSceneStatus] = useState<WorldSceneStatus>({
    state: 'loading',
    resource: null,
    renderer: null,
  });
  const [nearbyId, setNearbyId] = useState<InteractableId | null>(null);
  const [landmarkIds, setLandmarkIds] = useState<readonly string[]>([]);
  const [bellDialogOpen, setBellDialogOpen] = useState(false);
  const [bellOpenRequest, setBellOpenRequest] = useState<{ bell: BellId; seq: number } | null>(null);
  const [studioFocusRequest, setStudioFocusRequest] = useState(0);
  // The latest accepted action's success cue. Its id is a per-view sequence, so a
  // reset that repeats a progress count still plays the cue again.
  const [effect, setEffect] = useState<WorldEffect | null>(null);
  const effectSeq = useRef(0);

  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const costumeButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sceneRef = useRef<WorldSceneHostApi>(null);
  // The scene reports the Nearby_Interactable between renders; Enter reads it here.
  const nearbyRef = useRef<InteractableId | null>(null);
  // Scene callbacks read the latest Clocktower_State without being rebuilt each change.
  const clocktowerRef = useRef(clocktower);
  useLayoutEffect(() => {
    clocktowerRef.current = clocktower;
  }, [clocktower]);

  const area = getArea(world.area);
  const inputBlocked = showResetDialog || lockerOpen || bellDialogOpen;
  const bellCurse = progress.defects[BELL_CURSE];
  const bellCurseVerified = bellCurse?.verified === true;
  // The Belfry and its bells exist for real once the gate is open (never in the preview).
  const belfryOpen = clocktower.gateOpen && !preview;
  // Discovery is recorded and announced once, even if two opens land before a render.
  const bellDiscoveredRef = useRef(bellCurse?.discovered === true);
  useLayoutEffect(() => {
    bellDiscoveredRef.current = bellCurse?.discovered === true;
  }, [bellCurse?.discovered]);

  const rulesContext = useMemo<RulesContext>(
    () => ({
      potionHeld: progress.pantry.potionTaken,
      bellCurseVerified: progress.defects['bell-dialog-focus']?.verified === true,
      previewCourtyardOnly: preview,
    }),
    [progress.pantry.potionTaken, progress.defects, preview]
  );

  const stage = getClocktowerStage(clocktower, preview, bellCurseVerified);
  const objective = getObjective(clocktower, preview, bellCurseVerified);
  const actions = useMemo(
    () => getAvailableActions(clocktower, world, rulesContext),
    [clocktower, world, rulesContext]
  );
  const travel = useMemo(
    () => getTravelOptions(clocktower, world, rulesContext),
    [clocktower, world, rulesContext]
  );
  const clues = useMemo(() => journalClues(clocktower), [clocktower]);

  // The scene gets the new world state in the same commit as the Clocktower_State change.
  const snapshot = useMemo<WorldSnapshot>(
    () => ({
      area: world.area,
      arrival: world.arrival,
      lanternLit: clocktower.lanternLit,
      cluesFound: clocktower.cluesFound,
      gateOpen: clocktower.gateOpen,
      bellRings: clocktower.bellRings,
      lightsRestored: clocktower.lightsRestored,
      inputBlocked,
      reducedMotion: prefersReducedMotion,
      effect,
      previewCourtyardOnly: preview,
    }),
    [world, clocktower, inputBlocked, prefersReducedMotion, effect, preview]
  );

  const held = useHeldDirections({
    setHeld: useCallback((direction) => sceneRef.current?.setHeld(direction), []),
    inputBlocked,
  });

  // Move focus to the room heading on entry, before any input is processed.
  useLayoutEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    triggerCompanion('greet');
  }, [triggerCompanion]);

  // A new Area clears what the old one reported; the scene reports the new Area itself.
  const shownArea = useRef(world.area);
  useLayoutEffect(() => {
    if (shownArea.current === world.area) return;
    shownArea.current = world.area;
    nearbyRef.current = null;
    setNearbyId(null);
    setLandmarkIds([]);
  }, [world.area]);

  /** Run a World_Action, announce the outcome, and send one celebrate when it earns it. */
  const perform = useCallback(
    (action: WorldAction): WorldOutcome => {
      const attempt = reactionToken.next();
      const outcome = dispatchWorldAction(action);
      announce(outcome.message);
      // Only a changed outcome carries a cue; it reaches the scene in the same
      // commit as the new state and the Room_Status text (Requirements 23.1, 23.12).
      if (outcome.kind === 'changed' && outcome.effect) {
        effectSeq.current += 1;
        setEffect({ ...outcome.effect, id: effectSeq.current });
      }
      if (outcome.kind === 'changed' && outcome.celebrate) {
        // After the commit that shows the change and announces it.
        requestAnimationFrame(() => {
          if (reactionToken.isCurrent(attempt)) {
            triggerCompanion('celebrate', companion.celebrationLine, 'celebrate');
          }
        });
      }
      return outcome;
    },
    [announce, companion.celebrationLine, dispatchWorldAction, reactionToken, triggerCompanion]
  );

  const interact = useCallback(() => {
    const target = nearbyRef.current;
    if (target === null) {
      announce(COPY.nothingCloseEnough);
      return;
    }
    // The interact cue plays for any Interact with something Nearby (Requirement 23.11).
    sceneRef.current?.pulseInteract();
    const action = actionForInteractable(target);
    if (action) {
      perform(action);
      return;
    }
    // A bell opens the same Bell_Dialog as its sandbox control (Requirement 19.10).
    if (target.startsWith('bell-')) {
      const bell = target.slice('bell-'.length) as BellId;
      setBellOpenRequest((current) => ({ bell, seq: (current?.seq ?? 0) + 1 }));
    }
  }, [announce, perform]);

  /** Record the bell curse as discovered and announce it, once (Requirements 19.6, 19.7). */
  const discoverBellCurse = useCallback(() => {
    if (bellDiscoveredRef.current) return;
    bellDiscoveredRef.current = true;
    dispatch({ type: 'DISCOVER_DEFECT', defectType: BELL_CURSE });
    announce(COPY.bellCurseFound);
    triggerCompanion('reactFailure', getCurseByType(BELL_CURSE).symptom, 'warning');
  }, [announce, dispatch, triggerCompanion]);

  // Inspect discovers the curse and moves focus to its repair (Requirement 19.9).
  const handleInspectBells = useCallback(() => {
    discoverBellCurse();
    setStudioFocusRequest((n) => n + 1);
  }, [discoverBellCurse]);

  const handleBellRing = useCallback(
    (bell: BellId) => {
      perform({ type: 'ring-bell', bell });
    },
    [perform]
  );

  const handleBellVerified = useCallback(() => {
    const curse = getCurseByType(BELL_CURSE);
    announce(`Fixed: ${curse.fixedSummary} ${curse.nextAction}`);
  }, [announce]);

  /** Route_Panel actions: a bell action opens the dialog instead of ringing at once. */
  const handleRouteAction = useCallback(
    (action: WorldAction): WorldOutcome => {
      if (action.type === 'ring-bell') {
        setBellOpenRequest((current) => ({ bell: action.bell, seq: (current?.seq ?? 0) + 1 }));
        // Nothing changed yet, so the Route_Panel keeps focus on the button.
        return { kind: 'repeat', message: '' };
      }
      return perform(action);
    },
    [perform]
  );

  const sceneCallbacks = useMemo<Omit<WorldSceneCallbacks, 'onReady' | 'onLoadError' | 'onDebug'>>(
    () => ({
      onNearbyChange: (id) => {
        nearbyRef.current = id;
        setNearbyId(id);
        const item = id ? getArea(world.area)?.interactables.find((entry) => entry.id === id) : null;
        if (item) announce(nearbyAnnouncement(item.name, interactablePrompt(item, clocktowerRef.current)));
      },
      onLandmarksInView: (ids) => setLandmarkIds(ids),
      onExitContact: (exitId, open) => {
        if (open) return;
        const state = clocktowerRef.current;
        // The closed gate itself names the Clues still missing (Requirement 13.8).
        if (exitId === 'passage-gate') {
          const missing = missingClues(state).map(clueLabel);
          announce(missing.length > 0 ? gateNeedsClues(missing) : COPY.gateClosed);
          return;
        }
        const exit = getArea(world.area)?.exits.find((entry) => entry.id === exitId);
        if (exit) announce(closedExitMessage(exit, state));
      },
      onExitEntered: (exitId) => {
        const exit = getArea(world.area)?.exits.find((entry) => entry.id === exitId);
        if (exit) perform({ type: 'enter-area', area: exit.to, spawn: exit.spawnInTarget });
      },
    }),
    [announce, perform, world.area]
  );

  const handleStatusChange = useCallback(
    (status: WorldSceneStatus) => {
      setSceneStatus(status);
      if (status.state === 'failed') {
        // The Route_Panel stays fully playable without the canvas.
        nearbyRef.current = null;
        setNearbyId(null);
        announce(MAP_UNAVAILABLE_NOTICE);
      }
    },
    [announce]
  );

  const handleResetConfirm = useCallback(() => {
    setShowResetDialog(false);
    const dialog = document.querySelector<HTMLElement>(BELL_DIALOG_SELECTOR);
    if (dialog) resetRepair(BELL_CURSE, dialog);
    resetRoom('clocktower');
    announce(preview ? COPY.previewReset : COPY.roomReset);
    triggerCompanion('reset');
  }, [announce, preview, resetRoom, triggerCompanion]);

  const sceneRunning = sceneStatus.state === 'ready';
  const areaLandmarks = area ? area.landmarks.map((landmark) => landmark.name) : [];
  // The camera-based list while the scene runs; every Landmark without it (Requirement 10.2).
  const landmarksInView = area
    ? area.landmarks
        .filter((landmark) => !sceneRunning || landmarkIds.includes(landmark.id))
        .map((landmark) => landmark.name)
    : [];
  const nearbyItem =
    sceneRunning && nearbyId ? area?.interactables.find((entry) => entry.id === nearbyId) : null;

  return (
    <div className={styles.container}>
      <div className={styles.roomHeader}>
        <div className={styles.roomTitleGroup}>
          <span className={styles.roomEyebrow}>Room 3 · Nocturne Apothecary</span>
          <h2 ref={headingRef} id="room-heading" tabIndex={-1} className={styles.roomTitle}>
            Clocktower Gate
          </h2>
        </div>
        <div className={styles.roomMeta}>
          <p className={styles.candles} data-testid="room-progress">
            Lantern: {clocktower.lanternLit ? 'lit' : 'unlit'}
            {!preview && ` · Clues: ${clocktower.cluesFound.length} of 3`}
            {!preview && ` · Gate: ${clocktower.gateOpen ? 'open' : 'closed'}`}
            {belfryOpen && ` · Bells: ${clocktower.bellRings.length} of 3`}
          </p>
        </div>
      </div>

      {preview && (
        <p className={clocktowerStyles.previewLabel} data-testid="preview-label">
          {PREVIEW_LABEL}
        </p>
      )}

      <section
        className={`${styles.objective} ${clocktower.lanternLit ? styles.objectiveComplete : ''}`}
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
          {stage === 'restored' && (
            <div className={styles.objectiveControl}>
              <button
                type="button"
                className={styles.objectiveButton}
                onClick={() => dispatch({ type: 'COMPLETE_ROOM', roomId: 'clocktower' })}
                data-testid="see-finale"
              >
                See the finale
              </button>
            </div>
          )}
          <p
            className={styles.roomStatus}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid="room-status"
          >
            {roomStatus.text}
          </p>
        </div>
      </section>

      <div className={clocktowerStyles.layout}>
        <div className={clocktowerStyles.worldColumn}>
          <p
            className={clocktowerStyles.sceneStatus}
            data-testid="scene-status"
            data-state={sceneStatus.state}
          >
            {sceneStatus.state === 'loading' && SCENE_LOADING_TEXT}
            {sceneStatus.state === 'failed' && sceneFailedText(sceneStatus.resource ?? 'Phaser module')}
          </p>

          <PlayArea
            held={held}
            onInteract={interact}
            sceneState={sceneStatus.state}
            debug={
              import.meta.env.DEV
                ? { area: world.area, lantern: clocktower.lanternLit, gate: clocktower.gateOpen }
                : undefined
            }
          >
            <WorldSceneHost
              ref={sceneRef}
              snapshot={snapshot}
              callbacks={sceneCallbacks}
              onStatusChange={handleStatusChange}
            />
          </PlayArea>

          <p id={PLAY_AREA_INSTRUCTIONS_ID} className={clocktowerStyles.instructions}>
            {CONTROLS_INSTRUCTION}
          </p>

          <TouchControls held={held} onInteract={interact} />
        </div>

        <div className={clocktowerStyles.routeColumn}>
          <RoutePanel
            areaName={area?.name ?? ''}
            objectiveLabel={objective.label}
            controlsText={world.area === 'apothecary-exit' ? APOTHECARY_CONTROLS_TEXT : null}
            landmarksInView={landmarksInView}
            areaLandmarks={areaLandmarks}
            nearby={
              nearbyItem ? { name: nearbyItem.name, prompt: interactablePrompt(nearbyItem, clocktower) } : null
            }
            actions={actions}
            travel={travel}
            onAction={handleRouteAction}
            bellProgress={belfryOpen ? bellProgressText(clocktower) : null}
          />
          {!preview && <ClocktowerJournal clues={clues} />}
        </div>
      </div>

      {belfryOpen && (
        <section
          className={clocktowerStyles.belfry}
          aria-labelledby="belfry-heading"
          data-testid="belfry-section"
        >
          <h3 id="belfry-heading" className={clocktowerStyles.belfryHeading}>
            Belfry bells
          </h3>
          <p className={clocktowerStyles.belfryIntro}>
            Each bell opens a small dialog with Ring and Cancel. Inspect the bells to find what
            is wrong with that dialog, then repair it in the Repair Studio.
          </p>
          <div>
            <button
              type="button"
              className={styles.objectiveButton}
              onClick={handleInspectBells}
              data-testid="inspect-bell-focus"
            >
              Inspect the bells
            </button>
          </div>
          <div className={styles.content}>
            <div className={styles.sandboxColumn}>
              <ChallengeSandbox curseTypes={ROOM_DEFECTS.clocktower} visionModes={BELFRY_VISION_MODES}>
                {(visionMode) => (
                  <BellTower
                    repaired={bellCurse?.repaired === true}
                    rungBells={clocktower.bellRings}
                    openRequest={bellOpenRequest}
                    onOpen={discoverBellCurse}
                    onRing={handleBellRing}
                    onOpenChange={setBellDialogOpen}
                    visionMode={visionMode}
                  />
                )}
              </ChallengeSandbox>
            </div>
            <div className={styles.studioColumn}>
              <RepairStudio
                roomTypes={ROOM_DEFECTS.clocktower}
                activeType={bellCurse?.discovered ? BELL_CURSE : null}
                onSelect={() => undefined}
                focusRequest={studioFocusRequest}
                onVerified={handleBellVerified}
              />
              <div className={clocktowerStyles.hintArea}>
                <div className={clocktowerStyles.hintKeeper}>
                  <RiveMascot mascot={hintKeeper} signal={hintKeeperSignal} variant="medallion" size={56} />
                </div>
                <HintPanel order={ROOM_DEFECTS.clocktower} />
              </div>
            </div>
          </div>
        </section>
      )}

      <div className={styles.roomTools} role="group" aria-label="Room tools">
        {/* The preview keeps progress in memory, so the door list would show a half-built save. */}
        {!preview && (
          <button
            type="button"
            className={styles.toolButton}
            onClick={() => dispatch({ type: 'OPEN_DOORS' })}
            data-testid="tools-doors"
          >
            <span>Doors</span>
          </button>
        )}
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
        title="Reset Clocktower Gate?"
        description={
          preview
            ? 'This will clear your progress in this room, including the lit lantern. The other rooms keep their progress.'
            : 'This clears the Clocktower route: the lantern, the clues, the gate, and your checkpoints. The Midnight Checkout and the Potion Pantry keep their progress, including the lantern potion.'
        }
      />

      <CostumeLockerModal
        isOpen={lockerOpen}
        onClose={() => setLockerOpen(false)}
        returnFocusRef={costumeButtonRef}
      />
    </div>
  );
}
