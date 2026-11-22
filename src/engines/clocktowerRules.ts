/**
 * Clocktower Gate rules.
 * Pure functions: the same input gives the same output. No React, DOM, or Phaser.
 * Checkpoint 2 covers the whole route: the lantern, the three graveyard Clues, the
 * clockworks gate and shortcut, travel, and Checkpoints. Ringing the bells is task 24.1.
 */

import {
  COPY,
  EXIT_NEEDS_GATE,
  OBJECTIVE_COPY,
  actionButtonLabel,
  actionForInteractableId,
  alreadyInArea,
  areaUnreachable,
  bellJammed,
  bellOutOfOrder,
  bellRung,
  bellRungLights,
  clueAgain,
  clueFound,
  clueLabel,
  enteredArea,
  enteredNewArea,
  exitNeedsClues,
  gateNeedsClues,
  travelButtonLabel,
  type ObjectiveCopy,
} from '../registry/clocktowerCopy';
import {
  ALL_AREA_IDS,
  AREAS,
  BELLS,
  BELL_SEQUENCE,
  CLUES,
  CLUE_IDS,
  SHORTCUTS,
  getArea,
  getAreaName,
  getClue,
  isAreaId,
  isBellId,
  isClueId,
} from '../registry/clocktowerRoute';
import type {
  AreaId,
  BellId,
  ClocktowerState,
  ClueId,
  ExitDefinition,
  InteractableDefinition,
  InteractableId,
  RulesContext,
  WorldAction,
  WorldOutcome,
  WorldSession,
} from '../types/clocktower';

export const INITIAL_CLOCKTOWER_STATE: ClocktowerState = Object.freeze({
  checkpoints: [],
  lastCheckpoint: null,
  lanternLit: false,
  cluesFound: [],
  gateOpen: false,
  shortcutUnlocked: false,
  bellRings: [],
  lightsRestored: false,
}) as ClocktowerState;

/** A fresh state whose arrays are not shared with the constant. */
export function createInitialClocktowerState(): ClocktowerState {
  return { ...INITIAL_CLOCKTOWER_STATE, checkpoints: [], cluesFound: [], bellRings: [] };
}

/** The Area every resume and reset starts from when no Checkpoint is recorded. */
export const START_AREA: AreaId = 'apothecary-exit';

export interface EvaluationResult {
  state: ClocktowerState;
  session: WorldSession;
  outcome: WorldOutcome;
}

/** A monotonic count of progress made, used as a stable effect id. */
function progressStep(state: ClocktowerState): number {
  return (
    state.checkpoints.length +
    state.cluesFound.length +
    state.bellRings.length +
    (state.lanternLit ? 1 : 0) +
    (state.gateOpen ? 1 : 0) +
    (state.shortcutUnlocked ? 1 : 0) +
    (state.lightsRestored ? 1 : 0)
  );
}

type ActionKind = WorldAction['type'];

const ACTION_KINDS: readonly ActionKind[] = [
  'light-lantern',
  'find-clue',
  'open-gate',
  'enter-area',
  'ring-bell',
];

/** Check the shape and ids of an action received at runtime from any input. */
function isValidAction(action: unknown): action is WorldAction {
  if (typeof action !== 'object' || action === null) return false;
  const candidate = action as Record<string, unknown>;
  if (!ACTION_KINDS.includes(candidate.type as ActionKind)) return false;
  switch (candidate.type) {
    case 'find-clue':
      return isClueId(candidate.clue);
    case 'ring-bell':
      return isBellId(candidate.bell);
    case 'enter-area': {
      if (!isAreaId(candidate.area) || typeof candidate.spawn !== 'string') return false;
      return Object.prototype.hasOwnProperty.call(AREAS[candidate.area].spawns, candidate.spawn);
    }
    default:
      return true;
  }
}

function unchanged(
  state: ClocktowerState,
  session: WorldSession,
  outcome: WorldOutcome
): EvaluationResult {
  return { state, session, outcome };
}

/** The Area whose Route_Data holds an Interactable. */
function areaOfInteractable(id: InteractableId): AreaId | null {
  for (const areaId of ALL_AREA_IDS) {
    if (AREAS[areaId].interactables.some((item) => item.id === id)) return areaId;
  }
  return null;
}

function notHere(
  state: ClocktowerState,
  session: WorldSession,
  id: InteractableId
): EvaluationResult | null {
  const home = areaOfInteractable(id);
  if (home === session.area) return null;
  const item = home ? AREAS[home].interactables.find((entry) => entry.id === id) : undefined;
  const name = item?.name ?? 'object';
  return unchanged(state, session, {
    kind: 'rejected',
    reason: 'unreachable',
    missing: [name],
    message: `The ${name} is not in this area.`,
  });
}

/** Insert ids into a list in route order, without duplicates. */
function inOrder<T extends string>(order: readonly T[], values: readonly T[]): T[] {
  return order.filter((id) => values.includes(id));
}

export function missingClues(state: ClocktowerState): ClueId[] {
  return CLUE_IDS.filter((id) => !state.cluesFound.includes(id));
}

/** How the session Area connects to a target: through an exit, travel, or the shortcut. */
function findExit(session: WorldSession, area: AreaId, spawn: string): ExitDefinition | undefined {
  return getArea(session.area)?.exits.find((exit) => exit.to === area && exit.spawnInTarget === spawn);
}

export function isExitOpenFor(exit: ExitDefinition, state: ClocktowerState): boolean {
  switch (exit.gate) {
    case 'always-open':
      return true;
    case 'lantern':
      return state.lanternLit;
    case 'clues':
      return state.cluesFound.length >= CLUE_IDS.length;
    case 'gate':
      return state.gateOpen;
    default:
      return false;
  }
}

/** The Room_Status text for a closed exit: the unmet condition (Requirement 13.8). */
export function closedExitMessage(exit: ExitDefinition, state: ClocktowerState): string {
  switch (exit.gate) {
    case 'lantern':
      return COPY.exitNeedsLantern;
    case 'clues':
      return exitNeedsClues(missingClues(state).map(clueLabel));
    case 'gate':
      return EXIT_NEEDS_GATE;
    default:
      return areaUnreachable(getAreaName(exit.to));
  }
}

function isShortcut(area: AreaId, spawn: string): boolean {
  return SHORTCUTS.some((entry) => entry.area === area && entry.spawn === spawn);
}

function enterArea(
  state: ClocktowerState,
  session: WorldSession,
  area: AreaId,
  spawn: string
): EvaluationResult {
  const nextSession: WorldSession = { area, arrival: { spawn, seq: session.arrival.seq + 1 } };
  const name = getAreaName(area);
  if (state.checkpoints.includes(area)) {
    return {
      state,
      session: nextSession,
      outcome: { kind: 'changed', message: enteredArea(name), celebrate: false, saveNow: false, effect: null },
    };
  }
  // The Area being left was entered too (the Apothecary Exit on the first move), so
  // it is recorded with the new one and stays reachable by travel.
  const next: ClocktowerState = {
    ...state,
    checkpoints: inOrder(ALL_AREA_IDS, [...state.checkpoints, session.area, area]),
    lastCheckpoint: area,
  };
  return {
    state: next,
    session: nextSession,
    outcome: { kind: 'changed', message: enteredNewArea(name), celebrate: false, saveNow: true, effect: null },
  };
}

export function evaluateWorldAction(
  state: ClocktowerState,
  session: WorldSession,
  ctx: RulesContext,
  action: WorldAction
): EvaluationResult {
  if (!isValidAction(action)) {
    return unchanged(state, session, { kind: 'invalid', message: COPY.invalidTarget });
  }

  switch (action.type) {
    case 'light-lantern': {
      if (state.lanternLit) {
        return unchanged(state, session, { kind: 'repeat', message: COPY.lanternAlreadyLit });
      }
      const away = notHere(state, session, 'courtyard-lantern');
      if (away) return away;
      if (!ctx.potionHeld) {
        return unchanged(state, session, {
          kind: 'rejected',
          reason: 'no-potion',
          missing: ['lantern potion'],
          message: COPY.lanternNeedsPotion,
        });
      }
      const next: ClocktowerState = { ...state, lanternLit: true };
      return {
        state: next,
        session,
        outcome: {
          kind: 'changed',
          message: COPY.lanternLit,
          celebrate: true,
          saveNow: false,
          effect: { id: progressStep(next), kind: 'lantern', target: 'courtyard-lantern' },
        },
      };
    }

    case 'find-clue': {
      const clue = getClue(action.clue);
      if (state.cluesFound.includes(action.clue)) {
        return unchanged(state, session, { kind: 'repeat', message: clueAgain(clue.label, clue.text) });
      }
      const away = notHere(state, session, `clue-${action.clue}`);
      if (away) return away;
      if (!state.lanternLit) {
        return unchanged(state, session, {
          kind: 'rejected',
          reason: 'lantern-unlit',
          missing: ['lit lantern'],
          message: COPY.findCluesFirst,
        });
      }
      const next: ClocktowerState = {
        ...state,
        cluesFound: inOrder(CLUE_IDS, [...state.cluesFound, action.clue]),
      };
      return {
        state: next,
        session,
        outcome: {
          kind: 'changed',
          message: clueFound(clue.label, clue.text, next.cluesFound.length),
          celebrate: false,
          saveNow: false,
          effect: { id: progressStep(next), kind: 'clue', target: `clue-${action.clue}` },
        },
      };
    }

    case 'open-gate': {
      if (state.gateOpen) {
        return unchanged(state, session, { kind: 'repeat', message: COPY.gateAlreadyOpen });
      }
      const away = notHere(state, session, 'passage-gate');
      if (away) return away;
      const missing = missingClues(state).map(clueLabel);
      if (missing.length > 0) {
        return unchanged(state, session, {
          kind: 'rejected',
          reason: 'clues-missing',
          missing,
          message: gateNeedsClues(missing),
        });
      }
      // The gate and the shortcut open in the same update (Requirement 15.1).
      const next: ClocktowerState = { ...state, gateOpen: true, shortcutUnlocked: true };
      return {
        state: next,
        session,
        outcome: {
          kind: 'changed',
          message: COPY.gateOpened,
          celebrate: true,
          saveNow: true,
          effect: { id: progressStep(next), kind: 'gate', target: 'passage-gate' },
        },
      };
    }

    case 'enter-area': {
      const { area, spawn } = action;
      const name = getAreaName(area);
      if (ctx.previewCourtyardOnly) {
        if (area === session.area) {
          return unchanged(state, session, { kind: 'repeat', message: alreadyInArea(name) });
        }
        return unchanged(state, session, {
          kind: 'rejected',
          reason: 'unreachable',
          missing: [name],
          message: area === 'graveyard' ? COPY.graveyardLater : COPY.previewStaysInCourtyard,
        });
      }
      // The shortcut works from anywhere once unlocked, including the same Area.
      if (state.shortcutUnlocked && isShortcut(area, spawn)) {
        return enterArea(state, session, area, spawn);
      }
      if (area === session.area) {
        return unchanged(state, session, { kind: 'repeat', message: alreadyInArea(name) });
      }
      // Travel to any Area entered before, at its entry spawn.
      if (state.checkpoints.includes(area) && spawn === AREAS[area].entrySpawn) {
        return enterArea(state, session, area, spawn);
      }
      const exit = findExit(session, area, spawn);
      if (exit) {
        if (isExitOpenFor(exit, state)) return enterArea(state, session, area, spawn);
        const reason =
          exit.gate === 'lantern' ? 'lantern-unlit' : exit.gate === 'clues' ? 'clues-missing' : 'gate-closed';
        const missing =
          exit.gate === 'clues'
            ? missingClues(state).map(clueLabel)
            : exit.gate === 'lantern'
              ? ['lit lantern']
              : ['open gate'];
        return unchanged(state, session, {
          kind: 'rejected',
          reason,
          missing,
          message: closedExitMessage(exit, state),
        });
      }
      return unchanged(state, session, {
        kind: 'rejected',
        reason: 'unreachable',
        missing: [name],
        message: areaUnreachable(name),
      });
    }

    case 'ring-bell': {
      const label = bellLabel(action.bell);
      // After the lights, every ring changes nothing (Requirement 21.11).
      if (state.lightsRestored) {
        return unchanged(state, session, { kind: 'repeat', message: COPY.lightsAlreadyBack });
      }
      // Any ring needs an open gate (design decision 10, Requirement 16.4).
      if (!state.gateOpen) {
        return unchanged(state, session, {
          kind: 'rejected',
          reason: 'gate-closed',
          missing: ['open gate'],
          message: EXIT_NEEDS_GATE,
        });
      }
      if (!ctx.bellCurseVerified) {
        return unchanged(state, session, {
          kind: 'rejected',
          reason: 'jammed',
          missing: ['bell dialog repair'],
          message: bellJammed(label),
        });
      }
      const next = BELL_SEQUENCE[state.bellRings.length]!;
      // A bell out of order, including one already rung, keeps every earlier ring.
      if (action.bell !== next) {
        return unchanged(state, session, {
          kind: 'rejected',
          reason: 'out-of-order',
          missing: [bellLabel(next)],
          message: bellOutOfOrder(label, bellLabel(next)),
        });
      }
      const rings = [...state.bellRings, action.bell];
      const lights = rings.length === BELL_SEQUENCE.length;
      const nextState: ClocktowerState = { ...state, bellRings: rings, lightsRestored: lights };
      return {
        state: nextState,
        session,
        outcome: {
          kind: 'changed',
          message: lights ? bellRungLights(label) : bellRung(label, rings.length),
          celebrate: lights,
          saveNow: true,
          effect: {
            id: progressStep(nextState),
            kind: lights ? 'lights' : 'bell',
            target: `bell-${action.bell}`,
          },
        },
      };
    }
  }
}

function bellLabel(bell: BellId): string {
  return BELLS.find((entry) => entry.id === bell)?.label ?? bell;
}

/** "N of 3 bells rung" (Requirement 21.8). */
export function bellProgressText(state: ClocktowerState): string {
  return `${state.bellRings.length} of ${BELL_SEQUENCE.length} bells rung`;
}

// ---------------------------------------------------------------------------
// Stage, objective, and available actions
// ---------------------------------------------------------------------------

export type ClocktowerStage =
  | 'leave-apothecary'
  | 'light-lantern'
  | 'lantern-lit'
  | 'find-clues'
  | 'open-gate'
  | 'reach-belfry'
  /** In the Belfry with the bell dialog curse not yet verified: the rope is jammed. */
  | 'bells-silent'
  | 'ring-bells'
  | 'restored';

export function getClocktowerStage(
  state: ClocktowerState,
  preview = false,
  bellCurseVerified = false
): ClocktowerStage {
  if (preview) return state.lanternLit ? 'lantern-lit' : 'light-lantern';
  if (state.lightsRestored) return 'restored';
  if (!state.lanternLit) {
    return state.checkpoints.includes('courtyard') ? 'light-lantern' : 'leave-apothecary';
  }
  if (state.cluesFound.length < CLUE_IDS.length) return 'find-clues';
  if (!state.gateOpen) return 'open-gate';
  if (!state.checkpoints.includes('belfry')) return 'reach-belfry';
  return bellCurseVerified ? 'ring-bells' : 'bells-silent';
}

export function getObjective(
  state: ClocktowerState,
  preview = false,
  bellCurseVerified = false
): ObjectiveCopy {
  return OBJECTIVE_COPY[getClocktowerStage(state, preview, bellCurseVerified)];
}

/** The World_Action an Interactable stands for, or null when it opens a dialog. */
export function actionForInteractable(id: InteractableId): WorldAction | null {
  return actionForInteractableId(id);
}

/** True when the Interactable's action is already done in this state. */
export function isInteractableDone(id: InteractableId, state: ClocktowerState): boolean {
  if (id === 'courtyard-lantern') return state.lanternLit;
  if (id === 'passage-gate') return state.gateOpen;
  if (id.startsWith('clue-')) return state.cluesFound.includes(id.slice(5) as ClueId);
  if (id.startsWith('bell-')) return state.bellRings.includes(id.slice(5) as BellId);
  return false;
}

/** The Nearby prompt: the action while it is open, the done text once completed. */
export function interactablePrompt(item: InteractableDefinition, state: ClocktowerState): string {
  return isInteractableDone(item.id, state) ? item.doneLabel : item.actionLabel;
}

export interface AvailableAction {
  action: WorldAction;
  /** The visible and accessible name: the action and its target. */
  label: string;
  /** The Interactable the action uses, or null for a move to the next Area. */
  interactable: InteractableId | null;
}

/**
 * Exactly the Area_Actions in the current Area that would be accepted right now:
 * Interactable actions, then moves through open exits into Areas not entered yet.
 * Travel to entered Areas and the shortcut are listed by `getTravelOptions`.
 */
export function getAvailableActions(
  state: ClocktowerState,
  session: WorldSession,
  ctx: RulesContext
): AvailableAction[] {
  const area = getArea(session.area);
  if (!area) return [];
  const available: AvailableAction[] = [];
  for (const item of area.interactables) {
    // A bell stands for ring-bell here; the view opens the bell dialog for it.
    const action: WorldAction | null = item.id.startsWith('bell-')
      ? { type: 'ring-bell', bell: item.id.slice('bell-'.length) as BellId }
      : actionForInteractable(item.id);
    if (!action) continue;
    const result = evaluateWorldAction(state, session, ctx, action);
    if (result.outcome.kind === 'changed') {
      available.push({ action, label: actionButtonLabel(action), interactable: item.id });
    }
  }
  for (const exit of area.exits) {
    if (state.checkpoints.includes(exit.to)) continue;
    const action: WorldAction = { type: 'enter-area', area: exit.to, spawn: exit.spawnInTarget };
    const result = evaluateWorldAction(state, session, ctx, action);
    if (result.outcome.kind === 'changed') {
      available.push({ action, label: actionButtonLabel(action), interactable: null });
    }
  }
  return available;
}

export interface TravelOption {
  action: Extract<WorldAction, { type: 'enter-area' }>;
  label: string;
  kind: 'travel' | 'shortcut';
}

/**
 * Travel buttons: one per entered Area other than the current one, in route
 * order (Requirement 13.10), then the two shortcut buttons once unlocked
 * (Requirements 15.4, 15.6).
 */
export function getTravelOptions(
  state: ClocktowerState,
  session: WorldSession,
  ctx: RulesContext
): TravelOption[] {
  if (ctx.previewCourtyardOnly) return [];
  const options: TravelOption[] = [];
  for (const area of ALL_AREA_IDS) {
    if (area === session.area || !state.checkpoints.includes(area)) continue;
    options.push({
      action: { type: 'enter-area', area, spawn: AREAS[area].entrySpawn },
      label: travelButtonLabel(area),
      kind: 'travel',
    });
  }
  if (state.shortcutUnlocked) {
    for (const shortcut of SHORTCUTS) {
      options.push({
        action: { type: 'enter-area', area: shortcut.area, spawn: shortcut.spawn },
        label: shortcut.label,
        kind: 'shortcut',
      });
    }
  }
  return options;
}

/** The Journal: found Clues in Route_Data order, whatever order they were found in. */
export function journalClues(state: ClocktowerState): { id: ClueId; label: string; text: string }[] {
  return CLUES.filter((clue) => state.cluesFound.includes(clue.id)).map((clue) => ({
    id: clue.id,
    label: clue.label,
    text: clue.text,
  }));
}

// ---------------------------------------------------------------------------
// Session, progress, and normalization
// ---------------------------------------------------------------------------

/** Where the Ghost starts on entry, resume, and reset (Requirements 17.2, 17.7). */
export function resumeSession(state: ClocktowerState, seq: number): WorldSession {
  const area = state.lastCheckpoint ?? START_AREA;
  return { area, arrival: { spawn: AREAS[area].entrySpawn, seq } };
}

/** Record the starting Area as the first Checkpoint when the room is entered. */
export function withStartCheckpoint(state: ClocktowerState): ClocktowerState {
  if (state.checkpoints.length > 0) return state;
  return { ...state, checkpoints: [START_AREA], lastCheckpoint: START_AREA };
}

/** Meaningful Clocktower progress for the opening screen's Resume (Requirement 17.6). */
export function hasClocktowerProgress(state: ClocktowerState): boolean {
  return (
    state.checkpoints.length > 0 ||
    state.lanternLit ||
    state.cluesFound.length > 0 ||
    state.gateOpen ||
    state.shortcutUnlocked ||
    state.bellRings.length > 0
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/** The longest prefix of the bell sequence that `rings` starts with. */
function bellPrefix(rings: readonly string[]): BellId[] {
  const prefix: BellId[] = [];
  for (let i = 0; i < rings.length && i < BELL_SEQUENCE.length; i += 1) {
    if (rings[i] !== BELL_SEQUENCE[i]) break;
    prefix.push(BELL_SEQUENCE[i]!);
  }
  return prefix;
}

/**
 * Validate and normalize a saved Clocktower_State. Total and never throws.
 * A wrong shape returns the initial state (Requirement 16.5). Otherwise the
 * prerequisite chain clears each unmet field and everything that depends on it
 * (Requirement 16.4).
 */
export function normalizeClocktowerState(raw: unknown, bellCurseVerified: boolean): ClocktowerState {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return createInitialClocktowerState();
  const obj = raw as Record<string, unknown>;
  const {
    checkpoints,
    lastCheckpoint,
    lanternLit,
    cluesFound,
    gateOpen,
    shortcutUnlocked,
    bellRings,
    lightsRestored,
  } = obj;
  if (
    !isStringArray(checkpoints) ||
    !(lastCheckpoint === null || typeof lastCheckpoint === 'string') ||
    typeof lanternLit !== 'boolean' ||
    !isStringArray(cluesFound) ||
    typeof gateOpen !== 'boolean' ||
    typeof shortcutUnlocked !== 'boolean' ||
    !isStringArray(bellRings) ||
    typeof lightsRestored !== 'boolean'
  ) {
    return createInitialClocktowerState();
  }
  if (
    !checkpoints.every(isAreaId) ||
    (lastCheckpoint !== null && !isAreaId(lastCheckpoint)) ||
    !cluesFound.every(isClueId) ||
    !bellRings.every(isBellId)
  ) {
    return createInitialClocktowerState();
  }

  const lit = lanternLit;
  const clues = lit ? inOrder(CLUE_IDS, cluesFound) : [];
  const allClues = clues.length === CLUE_IDS.length;
  const gate = gateOpen && allClues;
  const shortcut = shortcutUnlocked && gate;
  const rings = gate && bellCurseVerified ? bellPrefix(bellRings) : [];
  const lights = lightsRestored && rings.length === BELL_SEQUENCE.length;

  const allowed = (area: AreaId): boolean => {
    switch (area) {
      case 'graveyard':
        return lit;
      case 'passage':
        return allClues;
      case 'belfry':
        return gate;
      default:
        return true;
    }
  };
  const kept = inOrder(ALL_AREA_IDS, checkpoints).filter(allowed);
  // `kept` is already in route order, so its last entry is the furthest Area.
  const last =
    lastCheckpoint !== null && kept.includes(lastCheckpoint)
      ? lastCheckpoint
      : (kept[kept.length - 1] ?? null);

  return {
    checkpoints: kept,
    lastCheckpoint: last,
    lanternLit: lit,
    cluesFound: clues,
    gateOpen: gate,
    shortcutUnlocked: shortcut,
    bellRings: rings,
    lightsRestored: lights,
  };
}
