/**
 * Unit tests for the Potion Pantry and the room route: recipe rules, door
 * states derived from verified progress, version 1 → 2 migration, and the
 * label verification on real DOM.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createInitialProgressState, gameReducer } from '../../src/context/GameContext';
import {
  LANTERN_POTION_RECIPE,
  getAddOutcome,
  getCauldronStatus,
  getPantryStage,
  normalizePantryState,
} from '../../src/registry/pantryRegistry';
import { getDoorState, isRoomUnlocked } from '../../src/registry/roomsRegistry';
import { migrateProgress } from '../../src/storage/progressSchema';
import { applyRepair, resetRepair } from '../../src/engines/RepairEngine';
import { verifyIngredientLabels } from '../../src/engines/VerificationEngine';
import type { DefectType, GameState, ProgressState } from '../../src/types';

const CHECKOUT: DefectType[] = [
  'invisible-focus',
  'mouse-only-activation',
  'missing-accessible-name',
  'insufficient-contrast',
];

function verify(progress: ProgressState, types: DefectType[]) {
  for (const t of types) {
    progress.defects[t] = { ...progress.defects[t], discovered: true, repaired: true, verified: true };
  }
  return progress;
}

function clearedCheckout(): ProgressState {
  const p = verify(createInitialProgressState(), CHECKOUT);
  p.checkout = { lanternLit: true, candleAdded: true, orderPlaced: true, keyTaken: true };
  return p;
}

describe('recipe rules', () => {
  it('blocks ingredients while the shelf is cursed', () => {
    expect(getAddOutcome(clearedCheckout(), 'moonpetal')).toEqual({ kind: 'blocked', reason: 'cursed' });
  });

  it('accepts the recipe in order and brews on the last step', () => {
    let state = { game: { phase: 'challenge' } as GameState, progress: verify(clearedCheckout(), ['color-only-ingredients']) };
    for (const id of LANTERN_POTION_RECIPE) {
      state = gameReducer(state, { type: 'PANTRY_ACTION', action: 'add', ingredient: id });
    }
    expect(state.progress.pantry.cauldron).toEqual([...LANTERN_POTION_RECIPE]);
    expect(state.progress.pantry.brewed).toBe(true);
    expect(getPantryStage(state.progress)).toBe('bottle');
  });

  it('a wrong ingredient turns the brew murky, blocks more, and can be removed', () => {
    let state = { game: { phase: 'challenge' } as GameState, progress: verify(clearedCheckout(), ['color-only-ingredients']) };
    state = gameReducer(state, { type: 'PANTRY_ACTION', action: 'add', ingredient: 'moonpetal' });
    state = gameReducer(state, { type: 'PANTRY_ACTION', action: 'add', ingredient: 'bog-moss' });
    expect(getCauldronStatus(state.progress.pantry.cauldron)).toEqual({ correct: 1, wrongIndex: 1, complete: false });
    expect(getAddOutcome(state.progress, 'ember-salt')).toEqual({ kind: 'blocked', reason: 'wrong-in-pot' });
    state = gameReducer(state, { type: 'PANTRY_ACTION', action: 'remove', index: 1 });
    expect(state.progress.pantry.cauldron).toEqual(['moonpetal']);
    expect(getAddOutcome(state.progress, 'ember-salt')).toMatchObject({ kind: 'added', correct: true });
  });

  it('bottling needs a brewed potion', () => {
    let state = { game: { phase: 'challenge' } as GameState, progress: verify(clearedCheckout(), ['color-only-ingredients']) };
    state = gameReducer(state, { type: 'PANTRY_ACTION', action: 'bottle' });
    expect(state.progress.pantry.potionTaken).toBe(false);
  });
});

describe('doors derived from verified progress', () => {
  it('locks the Pantry until every Checkout curse is verified and the order is placed', () => {
    const p = createInitialProgressState();
    expect(getDoorState(p, 'checkout')).toBe('available');
    expect(getDoorState(p, 'pantry')).toBe('locked');
    verify(p, CHECKOUT);
    expect(isRoomUnlocked(p, 'pantry')).toBe(false);
    p.checkout.orderPlaced = true;
    expect(getDoorState(p, 'pantry')).toBe('available');
    expect(getDoorState(p, 'clocktower')).toBe('coming-soon');
  });

  it('re-locks the Pantry if the Checkout is reset, while keeping Pantry progress', () => {
    let state = { game: { phase: 'challenge' } as GameState, progress: verify(clearedCheckout(), ['color-only-ingredients']) };
    state = gameReducer(state, { type: 'PANTRY_ACTION', action: 'add', ingredient: 'moonpetal' });
    state = gameReducer(state, { type: 'RESET_ROOM', roomId: 'checkout' });
    expect(getDoorState(state.progress, 'pantry')).toBe('locked');
    expect(state.progress.pantry.cauldron).toEqual(['moonpetal']);
    expect(state.progress.defects['color-only-ingredients'].verified).toBe(true);
  });

  it('shows a previously cleared Pantry as locked until the Checkout is cleared again', () => {
    const progress = verify(clearedCheckout(), ['color-only-ingredients']);
    progress.pantry = { cauldron: [...LANTERN_POTION_RECIPE], brewed: true, potionTaken: true };
    const reset = gameReducer(
      { game: { phase: 'challenge' }, progress },
      { type: 'RESET_ROOM', roomId: 'checkout' }
    );

    expect(getDoorState(reset.progress, 'pantry')).toBe('locked');
    expect(reset.progress.pantry).toEqual(progress.pantry);
    const restored = { ...reset.progress, checkout: progress.checkout };
    expect(getDoorState(verify(restored, CHECKOUT), 'pantry')).toBe('cleared');
  });

  it('ignores entering a locked room', () => {
    const state = { game: { phase: 'doors' } as GameState, progress: createInitialProgressState() };
    expect(gameReducer(state, { type: 'ENTER_ROOM', roomId: 'pantry' })).toBe(state);
  });

  it('resuming a cleared room opens the door selector', () => {
    const state = { game: { phase: 'menu' } as GameState, progress: clearedCheckout() };
    expect(gameReducer(state, { type: 'START_CHALLENGE' }).game.phase).toBe('doors');
  });
});

describe('version 1 → 2 migration', () => {
  function v1(complete: boolean) {
    const p = verify(createInitialProgressState(), complete ? CHECKOUT : ['invisible-focus']) as unknown as Record<string, unknown>;
    const defects = { ...(p.defects as Record<string, unknown>) };
    delete defects['color-only-ingredients'];
    const hints = { ...(p.hintsUsed as Record<string, number>), 'invisible-focus': 2 };
    delete hints['color-only-ingredients'];
    return { ...p, version: 1, defects, hintsUsed: hints, checkout: undefined, pantry: undefined, currentRoom: undefined, isComplete: complete };
  }

  it('keeps discoveries, repairs, verification, and hints, and adds the Pantry unset', () => {
    const migrated = migrateProgress(v1(false))!;
    expect(migrated.version).toBe(2);
    expect(migrated.currentRoom).toBe('checkout');
    expect(migrated.defects['invisible-focus'].verified).toBe(true);
    expect(migrated.hintsUsed['invisible-focus']).toBe(2);
    expect(migrated.defects['color-only-ingredients'].discovered).toBe(false);
    expect(migrated.pantry).toEqual({ cauldron: [], brewed: false, potionTaken: false });
  });

  it('a completed version 1 save earns the key and resumes in the Pantry', () => {
    const migrated = migrateProgress(v1(true))!;
    expect(migrated.checkout.keyTaken).toBe(true);
    expect(migrated.currentRoom).toBe('pantry');
    expect(getDoorState(migrated, 'pantry')).toBe('available');
    expect(migrated.isComplete).toBe(false);
  });

  it('drops an impossible pantry state and rejects incomplete saves', () => {
    expect(normalizePantryState({ cauldron: ['moonpetal', 'nope'], brewed: true, potionTaken: true })).toEqual({
      cauldron: ['moonpetal'],
      brewed: false,
      potionTaken: false,
    });
    expect(migrateProgress({ version: 2, sessionId: 'x' })).toBeNull();
    expect(migrateProgress({ version: 3 })).toBeNull();
  });
});

describe('label repair and verification on real DOM', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.head.querySelectorAll('style').forEach((s) => s.remove());
  });

  function mountShelf() {
    const style = document.createElement('style');
    style.textContent =
      '.keyquest-ingredient-label{display:none}.keyquest-labels-repaired .keyquest-ingredient-label{display:inline-flex}';
    document.head.appendChild(style);
    const shelf = document.createElement('div');
    shelf.innerHTML = ['Moonpetal', 'Glowcap']
      .map(
        (name) =>
          `<button data-ingredient="${name.toLowerCase()}"><span aria-hidden="true" class="swatch"></span><span class="keyquest-ingredient-label"><span aria-hidden="true">✦</span><span data-ingredient-label>${name}</span></span></button>`
      )
      .join('');
    document.body.appendChild(shelf);
    return shelf;
  }

  it('fails while labels are hidden and passes after the repair', () => {
    const shelf = mountShelf();
    const before = verifyIngredientLabels(shelf);
    expect(before.passed).toBe(false);
    expect(before.details).toMatchObject({ type: 'labels', total: 2, labelled: 0 });
    applyRepair('color-only-ingredients', shelf);
    expect(verifyIngredientLabels(shelf).passed).toBe(true);
    resetRepair('color-only-ingredients', shelf);
    expect(verifyIngredientLabels(shelf).passed).toBe(false);
  });

  it('fails when the accessible name does not contain the visible label', () => {
    const shelf = mountShelf();
    applyRepair('color-only-ingredients', shelf);
    shelf.querySelector('button')!.setAttribute('aria-label', 'Jar one');
    const result = verifyIngredientLabels(shelf);
    expect(result.passed).toBe(false);
    expect(result.details).toMatchObject({ failing: ['moonpetal'] });
  });
});
