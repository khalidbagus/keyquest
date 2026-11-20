/**
 * Unit Tests for KeyQuest v2 Mascot Roster & Pick-the-Patch Catalog
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_COMPANION_ID,
  HINT_KEEPER_ID,
  MASCOT_ROSTER,
  getMascotById,
  isMascotId,
} from '../../src/registry/mascotRegistry';
import { CURSE_CATALOG, getCurseByType } from '../../src/registry/patchRegistry';
import { DEFECT_ORDER, getHint } from '../../src/registry/hintRegistry';

describe('mascotRegistry', () => {
  it('registers all 10 KeyQuest v2 Rive characters with consistent controller contract', () => {
    expect(MASCOT_ROSTER).toHaveLength(10);
    for (const mascot of MASCOT_ROSTER) {
      expect(mascot.stateMachine).toBe('CharacterController');
      expect(mascot.rivUrl).toBe(`/rive/${mascot.id}.riv`);
      expect(mascot.posterUrl).toBe(`/rive/posters/${mascot.id}.png`);
      expect(mascot.artboard.length).toBeGreaterThan(0);
      expect(mascot.signatureAction.length).toBeGreaterThan(0);
    }
  });

  it('defaults companion to pumpkin_ghost and hint keeper to plague_doctor_ghost', () => {
    expect(DEFAULT_COMPANION_ID).toBe('pumpkin_ghost');
    expect(HINT_KEEPER_ID).toBe('plague_doctor_ghost');
    expect(getMascotById(DEFAULT_COMPANION_ID).artboard).toBe('Pumpkin Ghost');
    expect(getMascotById(HINT_KEEPER_ID).artboard).toBe('Plague Doctor Ghost');
  });

  it('falls back safely to the default mascot for invalid IDs', () => {
    expect(isMascotId('pumpkin_ghost')).toBe(true);
    expect(isMascotId('unknown_ghost')).toBe(false);
    expect(getMascotById('unknown_ghost').id).toBe('pumpkin_ghost');
    expect(getMascotById(null).id).toBe('pumpkin_ghost');
  });
});

describe('patchRegistry (Pick-the-Patch)', () => {
  it('covers all 4 canonical WCAG defects with 3 patch choices each (1 correct, 2 traps)', () => {
    expect(CURSE_CATALOG).toHaveLength(4);
    for (const defectType of DEFECT_ORDER) {
      const curse = getCurseByType(defectType);
      expect(curse.type).toBe(defectType);
      expect(curse.patches).toHaveLength(3);

      const correctPatches = curse.patches.filter((p) => p.isCorrect);
      const trapPatches = curse.patches.filter((p) => !p.isCorrect);

      expect(correctPatches).toHaveLength(1);
      expect(trapPatches).toHaveLength(2);
      for (const trap of trapPatches) {
        expect(trap.failureDiagnosis.trim().length).toBeGreaterThan(10);
        expect(trap.mascotReaction.trim().length).toBeGreaterThan(5);
      }
    }
  });

  it('uses updated dark-theme contrast values in contrast hints', () => {
    const level2 = getHint('insufficient-contrast', 2);
    const level3 = getHint('insufficient-contrast', 3);
    expect(level2?.text).toContain('#555555');
    expect(level3?.text).toContain('#e0e0e0');
  });
});
