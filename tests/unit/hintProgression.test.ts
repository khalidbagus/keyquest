/**
 * Unit Tests for Progressive Hint System (Task 12.3)
 * Drives the real game reducer to verify hint progression behavior
 * Property 6: Hint Progression
 * Requirements: 10.2, 10.3, 10.4, 10.6
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialProgressState,
  gameReducer,
} from '../../src/context/GameContext';
import { DEFECT_ORDER } from '../../src/registry/hintRegistry';
import type { DefectType, GameAction, GameState } from '../../src/types';

type ReducerState = { game: GameState; progress: ReturnType<typeof createInitialProgressState> };

function initialState(): ReducerState {
  return {
    game: { phase: 'challenge' },
    progress: createInitialProgressState(),
  };
}

function requestHint(defectType: DefectType): GameAction {
  return { type: 'REQUEST_HINT', defectType };
}

describe('hint progression via gameReducer', () => {
  it('increments hintLevel monotonically from 0 to 3 for each defect type', () => {
    // Property 6: for any defect type, hint level increases 0 → 3
    for (const defectType of DEFECT_ORDER) {
      let state = initialState();

      expect(state.progress.defects[defectType].hintLevel).toBe(0);

      state = gameReducer(state, requestHint(defectType));
      expect(state.progress.defects[defectType].hintLevel).toBe(1);

      state = gameReducer(state, requestHint(defectType));
      expect(state.progress.defects[defectType].hintLevel).toBe(2);

      state = gameReducer(state, requestHint(defectType));
      expect(state.progress.defects[defectType].hintLevel).toBe(3);
    }
  });

  it('stays at level 3 for subsequent requests (never decreases)', () => {
    // Property 6: subsequent requests at level 3 keep returning level 3
    let state = initialState();
    const defectType = DEFECT_ORDER[0];

    for (let i = 0; i < 3; i++) {
      state = gameReducer(state, requestHint(defectType));
    }
    expect(state.progress.defects[defectType].hintLevel).toBe(3);

    // Five more requests: level must remain exactly 3
    for (let i = 0; i < 5; i++) {
      state = gameReducer(state, requestHint(defectType));
      expect(state.progress.defects[defectType].hintLevel).toBe(3);
    }
  });

  it('tracks hint usage per request without capping', () => {
    let state = initialState();
    const defectType = DEFECT_ORDER[0];

    expect(state.progress.hintsUsed[defectType]).toBe(0);

    for (let request = 1; request <= 5; request++) {
      state = gameReducer(state, requestHint(defectType));
      expect(state.progress.hintsUsed[defectType]).toBe(request);
    }
  });

  it('tracks hint levels independently per defect', () => {
    let state = initialState();
    const [first, second] = DEFECT_ORDER;

    state = gameReducer(state, requestHint(first));
    state = gameReducer(state, requestHint(first));
    state = gameReducer(state, requestHint(second));

    expect(state.progress.defects[first].hintLevel).toBe(2);
    expect(state.progress.defects[second].hintLevel).toBe(1);
    expect(state.progress.defects[DEFECT_ORDER[2]].hintLevel).toBe(0);
  });

  it('hints never mark a defect as repaired or verified', () => {
    // Hints must not replace the player's repair action
    let state = initialState();

    for (const defectType of DEFECT_ORDER) {
      for (let i = 0; i < 4; i++) {
        state = gameReducer(state, requestHint(defectType));
      }
    }

    for (const defectType of DEFECT_ORDER) {
      const defect = state.progress.defects[defectType];
      expect(defect.discovered).toBe(false);
      expect(defect.repaired).toBe(false);
      expect(defect.verified).toBe(false);
    }
    expect(state.game.phase).toBe('challenge');
  });

  it('preserves discovered and repaired status when hinting', () => {
    let state = initialState();
    const defectType = DEFECT_ORDER[0];

    state = gameReducer(state, {
      type: 'DISCOVER_DEFECT',
      defectType,
    });
    state = gameReducer(state, { type: 'APPLY_REPAIR', defectType });
    const discoveredAt = state.progress.defects[defectType].discoveredAt;
    const repairedAt = state.progress.defects[defectType].repairedAt;

    state = gameReducer(state, requestHint(defectType));

    const defect = state.progress.defects[defectType];
    expect(defect.hintLevel).toBe(1);
    expect(defect.discovered).toBe(true);
    expect(defect.repaired).toBe(true);
    expect(defect.verified).toBe(false);
    expect(defect.discoveredAt).toBe(discoveredAt);
    expect(defect.repairedAt).toBe(repairedAt);
  });

  it('updates lastUpdatedAt on hint requests', () => {
    let state = initialState();
    const before = state.progress.lastUpdatedAt;

    state = gameReducer(state, requestHint(DEFECT_ORDER[0]));
    expect(state.progress.lastUpdatedAt).toBeGreaterThanOrEqual(before);
  });

  it('reset challenge clears all hint levels and usage', () => {
    let state = initialState();

    for (const defectType of DEFECT_ORDER) {
      for (let i = 0; i < 3; i++) {
        state = gameReducer(state, requestHint(defectType));
      }
    }
    expect(
      Object.values(state.progress.defects).every((d) => d.hintLevel === 3)
    ).toBe(true);

    state = gameReducer(state, { type: 'RESET_CHALLENGE' });

    expect(state.game.phase).toBe('menu');
    expect(
      Object.values(state.progress.defects).every((d) => d.hintLevel === 0)
    ).toBe(true);
    expect(
      Object.values(state.progress.hintsUsed).every((count) => count === 0)
    ).toBe(true);
  });

  it('emergency exit preserves hint state', () => {
    let state = initialState();
    const defectType = DEFECT_ORDER[0];

    state = gameReducer(state, requestHint(defectType));
    state = gameReducer(state, requestHint(defectType));
    state = gameReducer(state, { type: 'EMERGENCY_EXIT' });

    expect(state.game.phase).toBe('menu');
    expect(state.progress.defects[defectType].hintLevel).toBe(2);
    expect(state.progress.hintsUsed[defectType]).toBe(2);
  });

  it('restores hint state from saved progress (round-trip)', () => {
    const saved = createInitialProgressState();
    saved.defects[DEFECT_ORDER[1]].hintLevel = 3;
    saved.hintsUsed[DEFECT_ORDER[1]] = 7;

    let state = initialState();
    state = gameReducer(state, {
      type: 'RESTORE_PROGRESS',
      progress: saved,
    });

    expect(state.game.phase).toBe('challenge');
    expect(state.progress.defects[DEFECT_ORDER[1]].hintLevel).toBe(3);
    expect(state.progress.hintsUsed[DEFECT_ORDER[1]]).toBe(7);
  });
});
