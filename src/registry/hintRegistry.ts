/**
 * Hint Registry
 * Static hint definitions and pure hint-selection helpers
 * Requirements: 10.3, 10.4
 *
 * Hint levels per design spec:
 * - Level 1: General guidance — points at the general problem area
 * - Level 2: Specific direction — names the element and describes the problem
 * - Level 3: Direct answer — explains the defect and the repair concept
 *   without performing the repair for the player
 */

import type { DefectState, DefectType, HintDefinition } from '../types';

/** Maximum hint level per defect (design spec: Property 6) */
export const HINT_MAX_LEVEL = 3;

/**
 * Canonical defect order used for deterministic hint targeting.
 * The hint target is always the first defect in this order that is
 * not yet verified, and it stays the target until it is verified
 * (or progress is reset), so repeated requests are deterministic.
 */
export const DEFECT_ORDER: readonly DefectType[] = [
  'invisible-focus',
  'mouse-only-activation',
  'missing-accessible-name',
  'insufficient-contrast',
];

/** Human-readable defect names for hint display */
export const DEFECT_LABELS: Record<DefectType, string> = {
  'invisible-focus': 'Invisible Focus',
  'mouse-only-activation': 'Mouse-Only Activation',
  'missing-accessible-name': 'Missing Accessible Name',
  'insufficient-contrast': 'Insufficient Contrast',
};

/** Label for each hint level, per design spec */
export const HINT_LEVEL_LABELS: Record<1 | 2 | 3, string> = {
  1: 'General guidance',
  2: 'Specific direction',
  3: 'Direct answer',
};

/**
 * All hint definitions: three progressive levels per defect type.
 * Level 3 hints teach the repair concept but never perform or
 * mark a repair — verification stays the only path to completion.
 */
export const HINT_REGISTRY: readonly HintDefinition[] = [
  // ============================================
  // Invisible Focus (Buy Now button) — WCAG 2.4.7
  // ============================================
  {
    defectType: 'invisible-focus',
    level: 1,
    text: 'Try moving through the checkout with the Tab key only, and watch the page closely as you go. One control accepts focus, but the page gives you no visual clue about where the focus landed.',
  },
  {
    defectType: 'invisible-focus',
    level: 2,
    text: 'Focus the "Buy Now" button using the keyboard. It does receive focus, but no outline or highlight appears — the button\'s focus style has been removed, leaving keyboard users lost.',
  },
  {
    defectType: 'invisible-focus',
    level: 3,
    text: 'The "Buy Now" button has no visible focus indicator. The repair restores a :focus-visible outline (3px solid #005fcc) so sighted keyboard users can always see which control is active — WCAG 2.4.7 Focus Visible.',
  },

  // ============================================
  // Mouse-Only Activation (Add to Cart) — WCAG 2.1.1
  // ============================================
  {
    defectType: 'mouse-only-activation',
    level: 1,
    text: 'Not everything in this haunted shop responds to the keyboard. Tab to each control and try activating it with Enter — one of them will stay completely silent.',
  },
  {
    defectType: 'mouse-only-activation',
    level: 2,
    text: 'The "Add to Cart" element can be focused with Tab but ignores Enter and Space. It only listens for mouse clicks, so keyboard users can reach it but can never activate it.',
  },
  {
    defectType: 'mouse-only-activation',
    level: 3,
    text: 'The "Add to Cart" element is a plain clickable <div>. The repair gives it role="button" plus Enter and Space key handlers, so keyboard activation works exactly like a click — WCAG 2.1.1 Keyboard.',
  },

  // ============================================
  // Missing Accessible Name (cart icon button) — WCAG 4.1.2
  // ============================================
  {
    defectType: 'missing-accessible-name',
    level: 1,
    text: 'Screen readers announce every control by name. Move through the shop control by control and listen — one button announces nothing at all.',
  },
  {
    defectType: 'missing-accessible-name',
    level: 2,
    text: 'The shopping cart icon button contains only an SVG image, with no text and no aria-label, so screen readers read it as an unnamed button.',
  },
  {
    defectType: 'missing-accessible-name',
    level: 3,
    text: 'The cart icon button has no accessible name. The repair adds aria-label="View shopping cart" so assistive technology can announce what the button does — WCAG 4.1.2 Name, Role, Value.',
  },

  // ============================================
  // Insufficient Contrast (price text) — WCAG 1.4.3
  // ============================================
  {
    defectType: 'insufficient-contrast',
    level: 1,
    text: 'Read the checkout carefully by eye. One important piece of information is unusually faint and hard to make out against its background.',
  },
  {
    defectType: 'insufficient-contrast',
    level: 2,
    text: 'The price text is displayed in light gray (#999999) on a white background — a contrast ratio of about 2.85:1, below the 4.5:1 minimum for normal text.',
  },
  {
    defectType: 'insufficient-contrast',
    level: 3,
    text: 'The repair raises the price text color to #595959, reaching roughly 7:1 contrast so users with low vision can read it — WCAG 1.4.3 Contrast (Minimum).',
  },
];

/**
 * Get all hints for a defect, ordered from most general to most specific.
 */
export function getHintsForDefect(defectType: DefectType): HintDefinition[] {
  return HINT_REGISTRY.filter((hint) => hint.defectType === defectType).sort(
    (a, b) => a.level - b.level
  );
}

/**
 * Get a single hint by defect type and level.
 * Returns null for unknown levels (defensive: level is typed 1|2|3).
 */
export function getHint(
  defectType: DefectType,
  level: 1 | 2 | 3
): HintDefinition | null {
  if (level < 1 || level > HINT_MAX_LEVEL) return null;
  return (
    HINT_REGISTRY.find(
      (hint) => hint.defectType === defectType && hint.level === level
    ) ?? null
  );
}

/**
 * Deterministically pick the defect a new hint should target:
 * the first defect in canonical order that is not yet verified.
 * Returns null when every defect is verified (nothing left to hint).
 *
 * The target does not depend on hintLevel, so repeated requests
 * advance the same defect from level 1 to 3 and then keep returning
 * its level-3 hint (Property 6: Hint Progression).
 */
export function selectHintTarget(
  defects: Record<DefectType, DefectState>
): DefectType | null {
  return DEFECT_ORDER.find((type) => !defects[type].verified) ?? null;
}

/**
 * Contextual status line describing where the player stands with a
 * defect (undiscovered vs discovered vs repair attempted). Shown
 * alongside the hint text so hints adapt to current progress.
 */
export function getHintStatusContext(state: DefectState): string {
  if (state.verified) {
    return 'This defect is fully repaired and verified — nice work!';
  }
  if (state.repaired) {
    return 'A repair has been applied — check its verification status in the Repair Studio.';
  }
  if (state.discovered) {
    return 'You have discovered this defect. Apply its repair from the Repair Studio when you are ready.';
  }
  return 'This defect has not been discovered yet — explore the Midnight Checkout, or reveal it with the Discover Defect button in the Repair Studio.';
}
