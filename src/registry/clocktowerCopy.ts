/**
 * Clocktower Gate copy.
 * Message builders take only facts about the outcome, never the input method or
 * the motion setting, so every input produces the same text (Requirements 3.2, 12.1).
 */

import type { AreaId, ClueId, InteractableId, WorldAction } from '../types/clocktower';

export const PLAY_AREA_LABEL = 'Clocktower Gate play area';
export const CONTROLS_INSTRUCTION = 'Arrow keys move. Enter interacts. Tab leaves the play area.';
export const PREVIEW_LABEL = 'Courtyard preview. Progress is not saved.';
export const SCENE_LOADING_TEXT = 'Loading the map…';
export const MAP_UNAVAILABLE_NOTICE = 'The visual map is unavailable. Use the route panel to play.';

/** Shown in the Apothecary Exit: every way to play, at once (Requirement 13.4). */
export const APOTHECARY_CONTROLS_TEXT =
  'How to play: with the play area focused, the arrow keys move the Ghost and Enter or Space interacts. ' +
  'On a touch screen, use the Move and Interact buttons under the map. ' +
  'The route panel lists every action and travel option as a button, so you can also play from there.';

export function sceneFailedText(resource: string): string {
  return `The map could not load (${resource}). Use the route panel to play.`;
}

export const AREA_NAMES: Readonly<Record<AreaId, string>> = {
  'apothecary-exit': 'Apothecary Exit',
  courtyard: 'Moonlit Courtyard',
  graveyard: 'Overgrown Graveyard',
  passage: 'Clockworks Passage',
  belfry: 'Belfry',
};

const CLUE_LABEL: Readonly<Record<ClueId, string>> = { moon: 'Moon', thorn: 'Thorn', key: 'Key' };

export const COPY = {
  lanternLit: 'Lantern post: the lantern is lit and the way toward the Overgrown Graveyard is open.',
  lanternAlreadyLit: 'The lantern is already lit.',
  lanternNeedsPotion:
    'You need the lantern potion to light the lantern. Brew it in the Potion Pantry first.',
  nothingCloseEnough: 'Nothing is close enough to use. Walk to an object, then press Enter.',
  exitNeedsLantern: 'The way east is closed. The lantern must be lit before the way opens.',
  findCluesFirst: 'Light the courtyard lantern first, then read the plaques.',
  gateAlreadyOpen: 'The gate is already open.',
  gateClosed: 'The clockworks gate is closed. All three clues are found: press Enter here to open it.',
  gateOpened:
    'Clockworks gate: the gate is open. The return shortcut to the Moonlit Courtyard is unlocked.',
  graveyardLater: 'The Overgrown Graveyard opens in a later checkpoint.',
  previewStaysInCourtyard: 'The courtyard preview stays in the Moonlit Courtyard.',
  lightsAlreadyBack: 'The apothecary lights are already back. The bells have done their work.',
  bellCurseFound:
    'Curse found: the bell dialog loses keyboard focus. Opening it leaves focus outside, and closing it drops focus to the page.',
  invalidTarget: 'That object is not part of this area.',
  notAvailableYet: 'That action is not available yet.',
  previewExit: 'Preview ended. Your saved progress was not changed.',
  roomReset:
    'The Clocktower room was reset. You are back at the Apothecary Exit with the lantern unlit and no clues found.',
  previewReset: 'The courtyard is reset. The lantern is unlit again.',
} as const;

export function clueLabel(id: ClueId): string {
  return CLUE_LABEL[id];
}

/** "Moon", "Moon and Key", "Moon, Thorn, and Key". */
export function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export function clueFound(label: string, text: string, count: number): string {
  return `${label} clue found: “${text}” ${count} of 3 clues found.`;
}

export function clueAgain(label: string, text: string): string {
  return `${label} clue: “${text}” You already found this clue.`;
}

export function gateNeedsClues(missing: readonly string[]): string {
  return `The gate stays shut. Still missing: the ${listNames(missing)} ${missing.length === 1 ? 'clue' : 'clues'}.`;
}

export function exitNeedsClues(missing: readonly string[]): string {
  return `The way east is closed. Find the missing ${missing.length === 1 ? 'clue' : 'clues'} first: ${listNames(missing)}.`;
}

export const EXIT_NEEDS_GATE = 'The way north is closed. Open the clockworks gate first.';

export function enteredArea(areaName: string): string {
  return `You are in the ${areaName}.`;
}

export function enteredNewArea(areaName: string): string {
  return `You reach the ${areaName}. Checkpoint saved.`;
}

export function alreadyInArea(areaName: string): string {
  return `You are already in the ${areaName}.`;
}

export function areaLater(areaName: string): string {
  return `The ${areaName} opens in a later checkpoint.`;
}

export function areaUnreachable(areaName: string): string {
  return `You cannot reach the ${areaName} from here yet.`;
}

export function nearbyAnnouncement(name: string, actionLabel: string): string {
  return `${name} is close. ${actionLabel}.`;
}

/** A ring while the Bell_Focus_Curse is not verified (Requirement 21.2). */
export function bellJammed(label: string): string {
  return `The ${label} rope is jammed. Repair the bell dialog's focus in the Repair Studio, then ring again.`;
}

/** A ring out of order keeps every earlier ring and names the next bell (Requirement 21.4). */
export function bellOutOfOrder(label: string, nextLabel: string): string {
  return `The ${label} is out of order and does not ring. Ring the ${nextLabel} next.`;
}

/** A correct ring before the third (Requirement 21.3). */
export function bellRung(label: string, count: number): string {
  return `The ${label} rings and an apothecary window lights. ${count} of 3 bells rung.`;
}

/** The third correct ring (Requirement 21.6). */
export function bellRungLights(label: string): string {
  return `The ${label} rings. 3 of 3 bells rung: the apothecary lights are back.`;
}

/** The visible name of a Route_Panel button: the action and its target. */
export function actionButtonLabel(action: WorldAction): string {
  switch (action.type) {
    case 'light-lantern':
      return 'Light the lantern post';
    case 'find-clue':
      return `Read the ${CLUE_LABEL[action.clue]} plaque`;
    case 'open-gate':
      return 'Open the clockworks gate';
    case 'enter-area':
      return `Go to the ${AREA_NAMES[action.area]}`;
    case 'ring-bell':
      return `Ring the ${CLUE_LABEL[action.bell]} bell`;
  }
}

export function travelButtonLabel(area: AreaId): string {
  return `Travel to the ${AREA_NAMES[area]}`;
}

/** The World_Action that an Interactable stands for, or null when it opens a dialog. */
export function actionForInteractableId(id: InteractableId): WorldAction | null {
  if (id === 'courtyard-lantern') return { type: 'light-lantern' };
  if (id === 'passage-gate') return { type: 'open-gate' };
  if (id.startsWith('clue-')) {
    const clue = id.slice('clue-'.length);
    if (clue === 'moon' || clue === 'thorn' || clue === 'key') return { type: 'find-clue', clue };
  }
  return null;
}

export interface ObjectiveCopy {
  label: string;
  instruction: string;
}

export const OBJECTIVE_COPY = {
  'leave-apothecary': {
    label: 'Leave the apothecary',
    instruction: 'Walk east out of the Apothecary Exit into the Moonlit Courtyard, or use the Go to button.',
  },
  'light-lantern': {
    label: 'Light the courtyard lantern',
    instruction:
      'Walk the Ghost to the lantern post, then press Enter. You can also use the Light the lantern post button.',
  },
  'lantern-lit': {
    label: 'The way east is open',
    instruction:
      'The lantern is lit. Walk to the east gate. The Overgrown Graveyard opens in a later checkpoint.',
  },
  'find-clues': {
    label: 'Find the three graveyard clues',
    instruction:
      'Go east into the Overgrown Graveyard and read the Moon, Thorn, and Key plaques. The journal keeps what you find.',
  },
  'open-gate': {
    label: 'Open the clockworks gate',
    instruction: 'All three clues are found. Open the clockworks gate in the Clockworks Passage, east of the graveyard.',
  },
  'reach-belfry': {
    label: 'Climb to the Belfry',
    instruction: 'The gate is open. Walk north through it into the Belfry.',
  },
  'bells-silent': {
    label: 'Repair the bell dialog',
    instruction:
      'The bell ropes are jammed. Inspect the bells, then repair the bell dialog so focus moves into it and back.',
  },
  'ring-bells': {
    label: 'Ring the bells in order',
    instruction:
      'Ring the Moon bell, then the Key bell, then the Thorn bell. The journal keeps the bell order.',
  },
  restored: {
    label: 'The apothecary lights are back',
    instruction: 'All three bells rang and the windows are lit. See the finale when you are ready.',
  },
} as const satisfies Record<string, ObjectiveCopy>;
