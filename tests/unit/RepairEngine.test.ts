/**
 * Unit Tests for RepairEngine
 * Tests that repairs apply the expected DOM changes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  repairMouseOnlyActivation,
  repairInvisibleFocus,
  repairMissingAccessibleName,
  repairInsufficientContrast,
} from '../../src/engines/RepairEngine';

describe('RepairEngine', () => {
  describe('repairMouseOnlyActivation', () => {
    let element: HTMLDivElement;

    beforeEach(() => {
      element = document.createElement('div');
      element.tabIndex = 0;
      document.body.appendChild(element);
    });

    it('adds keydown event listener', () => {
      const result = repairMouseOnlyActivation(element);
      
      expect(result.success).toBe(true);
      expect(result.defectType).toBe('mouse-only-activation');
      expect(result.domChanges).toContain('Added keydown listener for Enter/Space keys');
    });

    it('adds role="button" to non-button elements', () => {
      repairMouseOnlyActivation(element);
      
      expect(element.getAttribute('role')).toBe('button');
    });

    it('marks element as repaired with data attribute', () => {
      repairMouseOnlyActivation(element);
      
      expect(element.dataset.keyquestRepaired).toBe('mouse-only');
    });

    it('Enter key triggers click after repair', () => {
      const clickHandler = vi.fn();
      element.addEventListener('click', clickHandler);
      
      repairMouseOnlyActivation(element);
      
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      });
      element.dispatchEvent(enterEvent);
      
      expect(clickHandler).toHaveBeenCalled();
    });

    it('Space key triggers click after repair', () => {
      const clickHandler = vi.fn();
      element.addEventListener('click', clickHandler);
      
      repairMouseOnlyActivation(element);
      
      const spaceEvent = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
      });
      element.dispatchEvent(spaceEvent);
      
      expect(clickHandler).toHaveBeenCalled();
    });

    it('does not add tabindex if already present', () => {
      element.setAttribute('tabindex', '0');
      
      const result = repairMouseOnlyActivation(element);
      
      expect(result.domChanges).not.toContain('Added tabindex="0"');
    });
  });

  describe('repairInvisibleFocus', () => {
    let element: HTMLButtonElement;

    beforeEach(() => {
      element = document.createElement('button');
      element.style.outline = 'none';
      document.body.appendChild(element);
    });

    it('adds focus repair class', () => {
      const result = repairInvisibleFocus(element);
      
      expect(result.success).toBe(true);
      expect(element.classList.contains('keyquest-focus-repaired')).toBe(true);
    });

    it('marks element as repaired', () => {
      repairInvisibleFocus(element);
      
      expect(element.dataset.keyquestRepaired).toBe('invisible-focus');
    });

    it('includes educational feedback about WCAG 2.4.7', () => {
      const result = repairInvisibleFocus(element);
      
      expect(result.message).toContain('WCAG 2.4.7');
      expect(result.message).toContain('Focus Visible');
    });
  });

  describe('repairMissingAccessibleName', () => {
    let element: HTMLButtonElement;

    beforeEach(() => {
      element = document.createElement('button');
      document.body.appendChild(element);
    });

    it('adds aria-label attribute', () => {
      const result = repairMissingAccessibleName(element);
      
      expect(result.success).toBe(true);
      expect(element.getAttribute('aria-label')).toBe('View shopping cart');
    });

    it('marks element as repaired', () => {
      repairMissingAccessibleName(element);
      
      expect(element.dataset.keyquestRepaired).toBe('missing-accessible-name');
    });

    it('includes educational feedback about WCAG 4.1.2', () => {
      const result = repairMissingAccessibleName(element);
      
      expect(result.message).toContain('WCAG 4.1.2');
      expect(result.message).toContain('Name, Role, Value');
    });
  });

  describe('repairInsufficientContrast', () => {
    let element: HTMLParagraphElement;

    beforeEach(() => {
      element = document.createElement('p');
      element.style.color = '#999999';
      document.body.appendChild(element);
    });

    it('changes text color to high contrast value', () => {
      repairInsufficientContrast(element);
      
      expect(element.style.color).toBe('rgb(224, 224, 224)');
    });

    it('stores original color in data attribute', () => {
      repairInsufficientContrast(element);
      
      expect(element.dataset.originalColor).toBeDefined();
    });

    it('marks element as repaired', () => {
      repairInsufficientContrast(element);
      
      expect(element.dataset.keyquestRepaired).toBe('insufficient-contrast');
    });

    it('includes educational feedback about WCAG 1.4.3', () => {
      const result = repairInsufficientContrast(element);
      
      expect(result.message).toContain('WCAG 1.4.3');
      expect(result.message).toContain('4.5:1');
    });
  });
});
