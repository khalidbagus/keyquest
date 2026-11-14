import { describe, expect, it } from 'vitest';
import { verifyAccessibleName, verifyFocusIndicator, verifyKeyboardActivation } from '../../src/engines/VerificationEngine';
import { repairMouseOnlyActivation } from '../../src/engines/RepairEngine';

describe('verification against actual DOM behavior', () => {
  it('requires both keys to activate, and accepts the real repair', async () => {
    const element = document.createElement('div');
    element.tabIndex = 0;
    document.body.append(element);
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') element.click();
    });
    expect((await verifyKeyboardActivation(element)).passed).toBe(false);
    element.replaceWith(element.cloneNode());
    const repaired = document.body.lastElementChild as HTMLElement;
    repairMouseOnlyActivation(repaired);
    expect((await verifyKeyboardActivation(repaired)).passed).toBe(true);
    repaired.remove();
  });

  it('rejects a transparent focus outline', () => {
    const button = document.createElement('button');
    button.style.outline = '3px solid transparent';
    document.body.append(button);
    expect(verifyFocusIndicator(button).passed).toBe(false);
    button.remove();
  });

  it('rejects whitespace-only accessible names', () => {
    const button = document.createElement('button');
    button.setAttribute('aria-label', '   ');
    expect(verifyAccessibleName(button).passed).toBe(false);
  });

  it('does not activate twice when the same repair is applied twice', () => {
    const element = document.createElement('div');
    let clicks = 0;
    element.addEventListener('click', () => { clicks += 1; });
    repairMouseOnlyActivation(element);
    repairMouseOnlyActivation(element);
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(clicks).toBe(1);
  });
});
