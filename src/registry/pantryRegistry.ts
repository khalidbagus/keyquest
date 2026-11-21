/**
 * Pantry Registry: Potion Pantry
 * Ingredients, the lantern potion recipe, objective copy, and pure helpers for
 * what the cauldron accepts.
 */

import type { IngredientId, PantryRoomState, ProgressState } from '../types';

export interface IngredientDefinition {
  id: IngredientId;
  name: string;
  /** Visible symbol restored by the repair (decorative; the name is the label). */
  symbol: string;
  /** Jar color. Before the repair this is the only way to tell jars apart. */
  color: string;
}

/**
 * Colors are deliberately close for common color-vision deficiencies
 * (red/green and blue/purple pairs) so color alone is not enough.
 */
export const INGREDIENTS: readonly IngredientDefinition[] = [
  { id: 'bog-moss', name: 'Bog moss', symbol: '●', color: '#5f9e5a' },
  { id: 'ember-salt', name: 'Ember salt', symbol: '▲', color: '#b8624e' },
  { id: 'moonpetal', name: 'Moonpetal', symbol: '☾', color: '#6d7fd6' },
  { id: 'nightshade', name: 'Nightshade', symbol: '◆', color: '#8a6fd1' },
  { id: 'glowcap', name: 'Glowcap', symbol: '✦', color: '#c9a43a' },
  { id: 'ash-dust', name: 'Ash dust', symbol: '■', color: '#9a9a8e' },
] as const;

export const LANTERN_POTION_RECIPE: readonly IngredientId[] = [
  'moonpetal',
  'ember-salt',
  'glowcap',
];

export const MAX_CAULDRON = LANTERN_POTION_RECIPE.length;

export const INITIAL_PANTRY_STATE: PantryRoomState = {
  cauldron: [],
  brewed: false,
  potionTaken: false,
};

export function getIngredient(id: IngredientId): IngredientDefinition {
  return INGREDIENTS.find((i) => i.id === id) ?? INGREDIENTS[0]!;
}

export function isIngredientId(value: unknown): value is IngredientId {
  return INGREDIENTS.some((i) => i.id === value);
}

export type PantryStage =
  | 'find-shelf-curse'
  | 'repair-shelf-curse'
  | 'brew'
  | 'bottle'
  | 'done';

export const PANTRY_OBJECTIVE_COPY: Record<PantryStage, { label: string; instruction: string }> = {
  'find-shelf-curse': {
    label: 'Brew the lantern potion',
    instruction:
      'The recipe names three ingredients, but the shelf jars show only colors. Inspect the shelf, or try a jar.',
  },
  'repair-shelf-curse': {
    label: 'Brew the lantern potion',
    instruction:
      'The jars have no names or symbols, only colors. Pick a patch in the Repair Studio.',
  },
  brew: {
    label: 'Brew the lantern potion',
    instruction: 'Add the recipe’s ingredients to the cauldron in order.',
  },
  bottle: {
    label: 'Bottle the lantern potion',
    instruction: 'The cauldron glows gold. Bottle the potion at the cauldron to take it with you.',
  },
  done: {
    label: 'The lantern potion is yours',
    instruction: 'The Clocktower Gate needs it next.',
  },
};

export function getPantryStage(progress: ProgressState): PantryStage {
  const curse = progress.defects['color-only-ingredients'];
  const pantry = progress.pantry;
  if (pantry.potionTaken) return 'done';
  if (pantry.brewed) return 'bottle';
  if (curse.verified) return 'brew';
  if (curse.discovered) return 'repair-shelf-curse';
  return 'find-shelf-curse';
}

export interface CauldronStatus {
  /** Number of leading ingredients that match the recipe. */
  correct: number;
  /** Index of the first ingredient that does not match, or -1. */
  wrongIndex: number;
  complete: boolean;
}

export function getCauldronStatus(cauldron: readonly IngredientId[]): CauldronStatus {
  let correct = 0;
  let wrongIndex = -1;
  for (let i = 0; i < cauldron.length; i++) {
    if (cauldron[i] === LANTERN_POTION_RECIPE[i] && wrongIndex === -1) {
      correct++;
    } else if (wrongIndex === -1) {
      wrongIndex = i;
    }
  }
  return {
    correct,
    wrongIndex,
    complete: wrongIndex === -1 && correct === LANTERN_POTION_RECIPE.length,
  };
}

export type AddOutcome =
  | { kind: 'added'; ingredient: IngredientId; correct: boolean; brewed: boolean }
  | { kind: 'blocked'; reason: 'cursed' | 'wrong-in-pot' | 'full' | 'brewed' };

/** What adding an ingredient does now. Pure; the reducer applies "added". */
export function getAddOutcome(progress: ProgressState, ingredient: IngredientId): AddOutcome {
  const pantry = progress.pantry;
  if (!progress.defects['color-only-ingredients'].verified) {
    return { kind: 'blocked', reason: 'cursed' };
  }
  if (pantry.brewed) return { kind: 'blocked', reason: 'brewed' };
  const status = getCauldronStatus(pantry.cauldron);
  if (status.wrongIndex !== -1) return { kind: 'blocked', reason: 'wrong-in-pot' };
  if (pantry.cauldron.length >= MAX_CAULDRON) return { kind: 'blocked', reason: 'full' };
  const next = [...pantry.cauldron, ingredient];
  const correct = LANTERN_POTION_RECIPE[pantry.cauldron.length] === ingredient;
  return {
    kind: 'added',
    ingredient,
    correct,
    brewed: getCauldronStatus(next).complete,
  };
}

/** Normalize a possibly missing or malformed pantry state from an older save. */
export function normalizePantryState(value: unknown): PantryRoomState {
  if (typeof value !== 'object' || value === null) {
    return { ...INITIAL_PANTRY_STATE, cauldron: [] };
  }
  const obj = value as Record<string, unknown>;
  const cauldron = Array.isArray(obj.cauldron)
    ? obj.cauldron.filter(isIngredientId).slice(0, MAX_CAULDRON)
    : [];
  const brewed = obj.brewed === true && getCauldronStatus(cauldron).complete;
  return {
    cauldron,
    brewed,
    potionTaken: brewed && obj.potionTaken === true,
  };
}
