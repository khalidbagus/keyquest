/**
 * Repair Engine
 * Applies code-backed repairs to defective elements
 * Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3
 */

import type { DefectType } from '../types';

export interface RepairResult {
  success: boolean;
  defectType: DefectType;
  message: string;
  domChanges: string[];
}

// Store references to added event listeners for removal during reset
const addedListeners = new Map<HTMLElement, { event: string; handler: EventListener }[]>();

/**
 * Applies the repair for Mouse-Only Activation defect.
 * Adds keyboard event handlers so Enter and Space trigger click().
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export function repairMouseOnlyActivation(element: HTMLElement): RepairResult {
  const domChanges: string[] = [];

  // Check if already repaired to prevent duplicate handlers
  if (element.dataset.keyquestRepaired === 'mouse-only') {
    return {
      success: true,
      defectType: 'mouse-only-activation',
      message: 'Element was already repaired.',
      domChanges: [],
    };
  }

  // Add keyboard event handler
  const keydownHandler = (e: Event) => {
    const keyEvent = e as KeyboardEvent;
    if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
      keyEvent.preventDefault();
      element.click();
    }
  };

  // Store handler reference for removal later
  if (!addedListeners.has(element)) {
    addedListeners.set(element, []);
  }
  addedListeners.get(element)!.push({ event: 'keydown', handler: keydownHandler });
  
  element.dataset.keyquestRepaired = 'mouse-only';
  element.addEventListener('keydown', keydownHandler);
  domChanges.push('Added keydown listener for Enter/Space keys');

  // Ensure tabindex is present (should already be 0, but verify)
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '0');
    domChanges.push('Added tabindex="0"');
  }

  // Add role="button" for non-button elements
  if (element.tagName.toLowerCase() !== 'button' && !element.hasAttribute('role')) {
    element.setAttribute('role', 'button');
    domChanges.push('Added role="button"');
  }

  return {
    success: true,
    defectType: 'mouse-only-activation',
    message:
      'Repair applied: Added keyboard event handlers for Enter and Space keys, matching native button behavior. This meets WCAG 2.1.1 (Keyboard).',
    domChanges,
  };
}

/**
 * Applies the repair for Invisible Focus defect.
 * Adds a visible focus indicator via CSS class.
 * Requirements: 4.1, 4.2, 4.3
 */
export function repairInvisibleFocus(element: HTMLElement): RepairResult {
  const domChanges: string[] = [];

  // Add repair class that provides focus-visible styles
  element.classList.add('keyquest-focus-repaired');
  domChanges.push('Added class "keyquest-focus-repaired"');

  // Mark as repaired
  element.dataset.keyquestRepaired = 'invisible-focus';

  // Remove the inline outline:none if present
  if (element.style.outline === 'none') {
    element.style.outline = '';
    domChanges.push('Removed inline outline:none');
  }

  return {
    success: true,
    defectType: 'invisible-focus',
    message:
      'Repair applied: Added a visible focus indicator using the :focus-visible pseudo-class. The 3px blue outline has a contrast ratio of at least 3:1 against adjacent colors, meeting WCAG 2.4.7 (Focus Visible).',
    domChanges,
  };
}

/**
 * Applies the repair for Missing Accessible Name defect.
 * Adds aria-label with descriptive text.
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export function repairMissingAccessibleName(element: HTMLElement): RepairResult {
  const domChanges: string[] = [];

  // Add aria-label
  element.setAttribute('aria-label', 'View shopping cart');
  domChanges.push('Added aria-label="View shopping cart"');

  // Mark as repaired
  element.dataset.keyquestRepaired = 'missing-accessible-name';

  return {
    success: true,
    defectType: 'missing-accessible-name',
    message:
      'Repair applied: Added aria-label="View shopping cart" to provide a programmatic name. Screen readers will now announce this label, meeting WCAG 4.1.2 (Name, Role, Value).',
    domChanges,
  };
}

/**
 * Applies the repair for Insufficient Contrast defect.
 * Changes text color to meet WCAG AA contrast requirements.
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export function repairInsufficientContrast(element: HTMLElement): RepairResult {
  const domChanges: string[] = [];

  // Store original color for potential undo
  const computed = window.getComputedStyle(element);
  element.dataset.originalColor = computed.color;

  // Apply high-contrast color (#595959 is ~7:1 against white, ~4.6:1 against #0d1520)
  // For dark backgrounds, we'll use a lighter color
  element.style.color = '#e0e0e0'; // High contrast against dark background
  domChanges.push('Changed color to #e0e0e0 (high contrast)');

  // Mark as repaired
  element.dataset.keyquestRepaired = 'insufficient-contrast';

  return {
    success: true,
    defectType: 'insufficient-contrast',
    message:
      'Repair applied: Changed text color from low-contrast gray to high-contrast color. WCAG 1.4.3 requires at least 4.5:1 for normal text. The new color exceeds this requirement for better readability.',
    domChanges,
  };
}

/**
 * Main repair function - dispatches to specific repair based on defect type.
 */
export function applyRepair(
  defectType: DefectType,
  element: HTMLElement
): RepairResult {
  switch (defectType) {
    case 'mouse-only-activation':
      return repairMouseOnlyActivation(element);
    case 'invisible-focus':
      return repairInvisibleFocus(element);
    case 'missing-accessible-name':
      return repairMissingAccessibleName(element);
    case 'insufficient-contrast':
      return repairInsufficientContrast(element);
    default:
      return {
        success: false,
        defectType,
        message: `Unknown defect type: ${defectType}`,
        domChanges: [],
      };
  }
}

/**
 * Resets a single repaired element back to its defective state.
 */
export function resetRepair(defectType: DefectType, element: HTMLElement): void {
  if (!element) return;

  switch (defectType) {
    case 'invisible-focus':
      element.classList.remove('keyquest-focus-repaired');
      delete element.dataset.keyquestRepaired;
      break;

    case 'mouse-only-activation': {
      // Remove added event listeners
      const listeners = addedListeners.get(element);
      if (listeners) {
        for (const { event, handler } of listeners) {
          element.removeEventListener(event, handler);
        }
        addedListeners.delete(element);
      }
      // Remove added attributes
      element.removeAttribute('role');
      delete element.dataset.keyquestRepaired;
      break;
    }

    case 'missing-accessible-name':
      element.removeAttribute('aria-label');
      delete element.dataset.keyquestRepaired;
      break;

    case 'insufficient-contrast':
      // Restore original color if stored
      if (element.dataset.originalColor) {
        element.style.color = element.dataset.originalColor;
        delete element.dataset.originalColor;
      } else {
        element.style.removeProperty('color');
      }
      delete element.dataset.keyquestRepaired;
      break;
  }
}

/**
 * Resets all repairs for all defect types.
 * Selectors map to the data-testid values used in MidnightCheckout.
 */
export function resetAllRepairs(): void {
  const defectSelectors: Record<DefectType, string> = {
    'invisible-focus': '[data-testid="defect-invisible-focus"]',
    'mouse-only-activation': '[data-testid="defect-mouse-only"]',
    'missing-accessible-name': '[data-testid="defect-missing-name"]',
    'insufficient-contrast': '[data-testid="defect-low-contrast"]',
  };

  for (const [defectType, selector] of Object.entries(defectSelectors)) {
    const element = document.querySelector(selector) as HTMLElement | null;
    if (element) {
      resetRepair(defectType as DefectType, element);
    }
  }
}
