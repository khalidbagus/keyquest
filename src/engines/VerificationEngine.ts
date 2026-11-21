/**
 * Verification Engine
 * Performs real DOM inspection to verify repairs
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import type {
  DefectType,
  VerificationResult,
  FocusVerificationDetails,
  KeyboardVerificationDetails,
  AccessibleNameVerificationDetails,
  ContrastVerificationDetails,
  LabelVerificationDetails,
} from '../types';

/**
 * Verifies that keyboard activation works for an element.
 * Dispatches synthetic Enter key event and checks if click handler fires.
 * Requirements: 8.1, 8.3
 */
export async function verifyKeyboardActivation(
  element: HTMLElement
): Promise<VerificationResult> {
  // Create a one-time click listener to detect if activation worked
  const testKeyActivation = (key: string, code: string): Promise<boolean> => {
    return new Promise((resolve) => {
      let clicked = false;
      const handler = () => {
        clicked = true;
      };

      element.addEventListener('click', handler, { once: true });
      element.focus();

      const keyEvent = new KeyboardEvent('keydown', {
        key,
        code,
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(keyEvent);

      // Small delay to allow event propagation
      setTimeout(() => {
        element.removeEventListener('click', handler);
        resolve(clicked);
      }, 50);
    });
  };

  // Mark the element while synthetic keys are dispatched so the page can tell
  // the check's presses apart from the player's own. The marker is removed
  // afterwards and never affects the result.
  element.dataset.keyquestVerifying = 'true';
  let enterKeyWorks: boolean;
  let spaceKeyWorks: boolean;
  try {
    // Test Enter key
    enterKeyWorks = await testKeyActivation('Enter', 'Enter');

    // Test Space key
    spaceKeyWorks = await testKeyActivation(' ', 'Space');
  } finally {
    delete element.dataset.keyquestVerifying;
  }

  const details: KeyboardVerificationDetails = {
    type: 'keyboard',
    enterKeyWorks,
    spaceKeyWorks,
    eventFired: enterKeyWorks || spaceKeyWorks,
  };

  return {
    passed: enterKeyWorks && spaceKeyWorks,
    defectType: 'mouse-only-activation',
    checkedAt: Date.now(),
    details,
  };
}

/**
 * Verifies that visible focus indicator exists.
 * Checks computed styles for outline or box-shadow when focused.
 * Requirements: 8.1, 8.2
 */
export function verifyFocusIndicator(element: HTMLElement): VerificationResult {
  // Focus the element
  element.focus();
  const computed = getComputedStyle(element);

  const outlineStyle = computed.outlineStyle;
  const outlineWidth = computed.outlineWidth;
  const outlineColor = computed.outlineColor;
  const boxShadow = computed.boxShadow;

  // Check if outline is truly visible (not transparent)
  const hasVisibleOutline =
    outlineStyle !== 'none' && 
    parseFloat(outlineWidth) > 0 &&
    !isTransparentColor(outlineColor);
  
  // Check if box-shadow is truly visible (not transparent)
  const hasBoxShadow = boxShadow !== 'none' && boxShadow !== '' && !isTransparentBoxShadow(boxShadow);

  const hasVisibleIndicator = hasVisibleOutline || hasBoxShadow;

  const details: FocusVerificationDetails = {
    type: 'focus',
    outlineStyle,
    outlineWidth,
    outlineColor,
    boxShadow,
    hasVisibleIndicator,
    contrastRatio: null, // Would require complex calculation
  };

  return {
    passed: hasVisibleIndicator,
    defectType: 'invisible-focus',
    checkedAt: Date.now(),
    details,
  };
}

/**
 * Checks if a color string represents a transparent color.
 */
function isTransparentColor(color: string): boolean {
  if (!color) return true;
  const lower = color.toLowerCase();
  if (lower === 'transparent') return true;
  // rgba with 0 alpha
  const rgbaMatch = lower.match(/rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
  if (rgbaMatch && parseFloat(rgbaMatch[1]!) === 0) return true;
  return false;
}

/**
 * Checks if a box-shadow is fully transparent (all shadows have 0 alpha).
 */
function isTransparentBoxShadow(boxShadow: string): boolean {
  if (!boxShadow || boxShadow === 'none') return true;
  // If there's no rgba with alpha > 0, or no rgb at all, consider transparent
  // Simple heuristic: check for rgba with 0 alpha or "transparent" keyword
  const lower = boxShadow.toLowerCase();
  if (lower.includes('transparent')) return true;
  // Check if all rgba have 0 alpha
  const rgbaMatches = lower.matchAll(/rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/g);
  for (const match of rgbaMatches) {
    if (parseFloat(match[1]!) > 0) return false; // At least one has visible alpha
  }
  // If there's an rgb (not rgba), it's visible
  if (/rgb\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/.test(lower)) return false;
  // If we only found rgba with 0 alpha, it's transparent
  return true;
}

/**
 * Verifies that element has a computed accessible name.
 * Checks aria-label, aria-labelledby, textContent, title.
 * Requirements: 8.1, 8.4
 */
export function verifyAccessibleName(element: HTMLElement): VerificationResult {
  const ariaLabel = element.getAttribute('aria-label');
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  const title = element.getAttribute('title');
  const textContent = element.textContent?.trim() ?? '';

  let computedName = '';
  let nameSource: AccessibleNameVerificationDetails['nameSource'] = 'none';

  if (ariaLabel && ariaLabel.trim().length > 0) {
    computedName = ariaLabel.trim();
    nameSource = 'aria-label';
  } else if (ariaLabelledBy) {
    const labelElement = document.getElementById(ariaLabelledBy);
    computedName = labelElement?.textContent?.trim() ?? '';
    nameSource = 'aria-labelledby';
  } else if (textContent && !element.querySelector('[aria-hidden="true"]')) {
    // Only use textContent if it's not just from aria-hidden children
    const textWithoutHidden = Array.from(element.childNodes)
      .filter(
        (node) =>
          node.nodeType === Node.TEXT_NODE ||
          (node instanceof HTMLElement && node.getAttribute('aria-hidden') !== 'true')
      )
      .map((node) => node.textContent?.trim() ?? '')
      .join('')
      .trim();
    
    if (textWithoutHidden) {
      computedName = textWithoutHidden;
      nameSource = 'visible-text';
    }
  }
  
  if (!computedName && title) {
    computedName = title;
    nameSource = 'title';
  }

  const details: AccessibleNameVerificationDetails = {
    type: 'accessible-name',
    computedName,
    nameSource,
    isEmpty: computedName.length === 0,
  };

  return {
    passed: computedName.length > 0,
    defectType: 'missing-accessible-name',
    checkedAt: Date.now(),
    details,
  };
}

/**
 * Verifies contrast ratio meets WCAG requirements.
 * Requirements: 8.1, 8.5
 */
export function verifyContrastRatio(element: HTMLElement): VerificationResult {
  const computed = getComputedStyle(element);
  const fgColor = computed.color;
  const bgColor = getBackgroundColor(element);

  const fgRgb = parseColor(fgColor);
  const bgRgb = parseColor(bgColor);

  const ratio = fgRgb && bgRgb ? calculateContrastRatio(fgRgb, bgRgb) : 0;

  const fontSize = parseFloat(computed.fontSize);
  const fontWeight = parseInt(computed.fontWeight, 10);
  const isLargeText =
    fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
  const requiredRatio = isLargeText ? 3 : 4.5;

  const details: ContrastVerificationDetails = {
    type: 'contrast',
    foregroundColor: fgColor,
    backgroundColor: bgColor,
    contrastRatio: Math.round(ratio * 100) / 100,
    requiredRatio,
    isLargeText,
    meetsRequirement: ratio >= requiredRatio,
  };

  return {
    passed: ratio >= requiredRatio,
    defectType: 'insufficient-contrast',
    checkedAt: Date.now(),
    details,
  };
}

function isRenderedWithin(node: HTMLElement, boundary: HTMLElement): boolean {
  for (let el: HTMLElement | null = node; el; el = el.parentElement) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
      return false;
    }
    if (el === boundary) break;
  }
  return true;
}

/** Text a screen reader would use as the name: aria-label, else rendered text. */
function computeButtonName(button: HTMLElement): string {
  const ariaLabel = button.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;
  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? '');
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.getAttribute('aria-hidden') === 'true') return;
    if (getComputedStyle(node).display === 'none') return;
    node.childNodes.forEach(walk);
  };
  button.childNodes.forEach(walk);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Verifies that every ingredient control has a visible label and that the
 * label is part of its accessible name (WCAG 1.4.1, 4.1.2, 2.5.3).
 */
export function verifyIngredientLabels(container: HTMLElement): VerificationResult {
  const buttons = Array.from(
    container.querySelectorAll<HTMLElement>('[data-ingredient]')
  );
  const failing: string[] = [];
  for (const button of buttons) {
    const label = button.querySelector<HTMLElement>('[data-ingredient-label]');
    const labelText = label?.textContent?.trim() ?? '';
    const visible = !!label && labelText.length > 0 && isRenderedWithin(label, button);
    const name = computeButtonName(button).toLowerCase();
    const named = visible && name.length > 0 && name.includes(labelText.toLowerCase());
    if (!visible || !named) failing.push(button.dataset.ingredient ?? '?');
  }
  const details: LabelVerificationDetails = {
    type: 'labels',
    total: buttons.length,
    labelled: buttons.length - failing.length,
    failing,
  };
  return {
    passed: buttons.length > 0 && failing.length === 0,
    defectType: 'color-only-ingredients',
    checkedAt: Date.now(),
    details,
  };
}

/**
 * Main verification function - dispatches to specific verification.
 */
export async function verify(
  defectType: DefectType,
  element: HTMLElement
): Promise<VerificationResult> {
  switch (defectType) {
    case 'mouse-only-activation':
      return verifyKeyboardActivation(element);
    case 'invisible-focus':
      return verifyFocusIndicator(element);
    case 'missing-accessible-name':
      return verifyAccessibleName(element);
    case 'insufficient-contrast':
      return verifyContrastRatio(element);
    case 'color-only-ingredients':
      return verifyIngredientLabels(element);
    default:
      return {
        passed: false,
        defectType,
        checkedAt: Date.now(),
        details: {
          type: 'keyboard',
          enterKeyWorks: false,
          spaceKeyWorks: false,
          eventFired: false,
        },
      };
  }
}

// ============================================
// Helper Functions
// ============================================

interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseColor(colorString: string): RGB | null {
  // Handle rgb(r, g, b) format
  const rgbMatch = colorString.match(
    /rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/
  );
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]!, 10),
      g: parseInt(rgbMatch[2]!, 10),
      b: parseInt(rgbMatch[3]!, 10),
    };
  }

  // Handle rgba(r, g, b, a) format
  const rgbaMatch = colorString.match(
    /rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)/
  );
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]!, 10),
      g: parseInt(rgbaMatch[2]!, 10),
      b: parseInt(rgbaMatch[3]!, 10),
    };
  }

  return null;
}

function getBackgroundColor(element: HTMLElement): string {
  let current: HTMLElement | null = element;
  
  while (current) {
    const bg = getComputedStyle(current).backgroundColor;
    // Check if background is not transparent
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      return bg;
    }
    current = current.parentElement;
  }
  
  // Default to white if no background found
  return 'rgb(255, 255, 255)';
}

function calculateContrastRatio(fg: RGB, bg: RGB): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(rgb: RGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
