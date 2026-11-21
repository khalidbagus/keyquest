/**
 * Unit Tests for Hint Registry (Task 12.1)
 * Verifies hint data completeness and deterministic hint selection
 * Requirements: 10.3, 10.4
 */

import { describe, it, expect } from 'vitest';
import {
  DEFECT_LABELS,
  DEFECT_ORDER,
  HINT_LEVEL_LABELS,
  HINT_MAX_LEVEL,
  HINT_REGISTRY,
  getHint,
  getHintStatusContext,
  getHintsForDefect,
  selectHintTarget,
} from '../../src/registry/hintRegistry';
import { createInitialProgressState } from '../../src/context/GameContext';
import type { DefectState, DefectType } from '../../src/types';

/** Checkout curses: DEFECT_ORDER is the Checkout's canonical hint order. */
const CHECKOUT_DEFECT_TYPES: DefectType[] = [
  'invisible-focus',
  'mouse-only-activation',
  'missing-accessible-name',
  'insufficient-contrast',
];

/** Every curse across built rooms (Checkout + Pantry). */
const ALL_DEFECT_TYPES: DefectType[] = [...CHECKOUT_DEFECT_TYPES, 'color-only-ingredients'];

function makeDefectState(
  type: DefectType,
  overrides: Partial<DefectState> = {}
): DefectState {
  return {
    type,
    discovered: false,
    discoveredAt: null,
    repaired: false,
    repairedAt: null,
    verified: false,
    verifiedAt: null,
    hintLevel: 0,
    ...overrides,
  };
}

describe('HINT_REGISTRY', () => {
  it('contains exactly three hints per defect type (15 total)', () => {
    expect(HINT_REGISTRY).toHaveLength(15);

    for (const defectType of ALL_DEFECT_TYPES) {
      const hints = getHintsForDefect(defectType);
      expect(hints).toHaveLength(3);
      expect(hints.map((h) => h.level)).toEqual([1, 2, 3]);
    }
  });

  it('every hint has non-empty, unique text per defect', () => {
    for (const defectType of ALL_DEFECT_TYPES) {
      const texts = getHintsForDefect(defectType).map((h) => h.text);
      texts.forEach((text) => {
        expect(typeof text).toBe('string');
        expect(text.trim().length).toBeGreaterThan(0);
      });
      expect(new Set(texts).size).toBe(3);
    }
  });

  it('hints become more specific as level increases (longest text last)', () => {
    // Educational progression: level 3 (direct answer + repair concept)
    // should carry at least as much information as level 1 guidance.
    for (const defectType of ALL_DEFECT_TYPES) {
      const hints = getHintsForDefect(defectType);
      expect(hints[2].text.length).toBeGreaterThanOrEqual(hints[0].text.length);
    }
  });

  it('level 3 hints explain the repair concept with WCAG criteria', () => {
    for (const defectType of ALL_DEFECT_TYPES) {
      const level3 = getHint(defectType, 3);
      expect(level3).not.toBeNull();
      expect(level3!.text).toMatch(/WCAG/);
    }
  });

  it('every registry entry matches the HintDefinition shape', () => {
    for (const hint of HINT_REGISTRY) {
      expect(ALL_DEFECT_TYPES).toContain(hint.defectType);
      expect([1, 2, 3]).toContain(hint.level);
      expect(typeof hint.text).toBe('string');
    }
  });

  it('exposes labels for every defect and hint level', () => {
    for (const defectType of ALL_DEFECT_TYPES) {
      expect(DEFECT_LABELS[defectType].length).toBeGreaterThan(0);
    }
    for (const level of [1, 2, 3] as const) {
      expect(HINT_LEVEL_LABELS[level].length).toBeGreaterThan(0);
    }
  });

  it('HINT_MAX_LEVEL is 3 and DEFECT_ORDER covers the Checkout curses', () => {
    expect(HINT_MAX_LEVEL).toBe(3);
    expect([...DEFECT_ORDER].sort()).toEqual([...CHECKOUT_DEFECT_TYPES].sort());
  });

  it('targets the Pantry curse when given the Pantry order', () => {
    const progress = createInitialProgressState();
    expect(selectHintTarget(progress.defects, ['color-only-ingredients'])).toBe(
      'color-only-ingredients'
    );
  });
});

describe('getHint', () => {
  it('returns the requested hint for valid levels', () => {
    const hint = getHint('invisible-focus', 2);
    expect(hint).not.toBeNull();
    expect(hint!.defectType).toBe('invisible-focus');
    expect(hint!.level).toBe(2);
  });

  it('returns null for out-of-range levels', () => {
    expect(getHint('invisible-focus', 0)).toBeNull();
    expect(getHint('invisible-focus', 4)).toBeNull();
  });
});

describe('selectHintTarget', () => {
  it('targets the first defect in canonical order on fresh progress', () => {
    const progress = createInitialProgressState();
    expect(selectHintTarget(progress.defects)).toBe(DEFECT_ORDER[0]);
  });

  it('keeps the same target regardless of its hint level', () => {
    // Property 6: repeated requests keep returning hints for the same
    // defect while it remains unverified (level 3 repeats level 3).
    const defects = createInitialProgressState().defects;
    defects[DEFECT_ORDER[0]] = makeDefectState(DEFECT_ORDER[0], {
      hintLevel: 3,
    });
    expect(selectHintTarget(defects)).toBe(DEFECT_ORDER[0]);
  });

  it('moves to the next unverified defect once the first is verified', () => {
    const defects = createInitialProgressState().defects;
    defects[DEFECT_ORDER[0]] = makeDefectState(DEFECT_ORDER[0], {
      discovered: true,
      repaired: true,
      verified: true,
      hintLevel: 2,
    });
    expect(selectHintTarget(defects)).toBe(DEFECT_ORDER[1]);
  });

  it('skips verified defects even when later defects are hinted more', () => {
    const defects = createInitialProgressState().defects;
    defects[DEFECT_ORDER[0]] = makeDefectState(DEFECT_ORDER[0], {
      hintLevel: 0,
    });
    defects[DEFECT_ORDER[1]] = makeDefectState(DEFECT_ORDER[1], {
      hintLevel: 3,
    });
    expect(selectHintTarget(defects)).toBe(DEFECT_ORDER[0]);
  });

  it('returns null when all defects are verified', () => {
    const defects = createInitialProgressState().defects;
    for (const type of ALL_DEFECT_TYPES) {
      defects[type] = makeDefectState(type, {
        discovered: true,
        repaired: true,
        verified: true,
      });
    }
    expect(selectHintTarget(defects)).toBeNull();
  });
});

describe('getHintStatusContext', () => {
  it('describes undiscovered defects', () => {
    const context = getHintStatusContext(makeDefectState('invisible-focus'));
    expect(context).toMatch(/has not been discovered/i);
  });

  it('describes discovered but unrepaired defects', () => {
    const context = getHintStatusContext(
      makeDefectState('invisible-focus', { discovered: true })
    );
    expect(context).toMatch(/discovered this defect/i);
  });

  it('describes repair attempted (repaired, not verified) defects', () => {
    const context = getHintStatusContext(
      makeDefectState('invisible-focus', {
        discovered: true,
        repaired: true,
      })
    );
    expect(context).toMatch(/repair has been applied/i);
  });

  it('describes verified defects', () => {
    const context = getHintStatusContext(
      makeDefectState('invisible-focus', {
        discovered: true,
        repaired: true,
        verified: true,
      })
    );
    expect(context).toMatch(/verified/i);
  });
});
