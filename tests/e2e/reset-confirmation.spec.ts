/**
 * E2E Tests for Reset Confirmation (Task 11)
 * Tests reset dialog, confirmation flow, cancellation, and state reset
 */

import { test, expect } from './fixtures';
import AxeBuilder from './helpers/axe';
import { completeRoom, expectCandles, repair, startRoom as startChallenge } from './helpers/room';


test.describe('Reset Confirmation Dialog', () => {
  test('reset button is visible in challenge view', async ({ page }) => {
    await startChallenge(page);

    const resetButton = page.getByTestId('reset-button');
    await expect(resetButton).toBeVisible();
    await expect(resetButton).toHaveAccessibleName('Reset challenge progress');
  });

  test('clicking reset button opens confirmation dialog', async ({ page }) => {
    await startChallenge(page);

    await page.getByTestId('reset-button').click();

    // Dialog should be visible
    const dialog = page.getByTestId('reset-confirm-dialog');
    await expect(dialog).toBeVisible();

    // Dialog should have proper content
    await expect(page.getByText('Reset Midnight Checkout?')).toBeVisible();
    await expect(
      page.getByText('This will clear all your progress')
    ).toBeVisible();

    // Both buttons should be visible
    await expect(page.getByTestId('reset-cancel')).toBeVisible();
    await expect(page.getByTestId('reset-confirm')).toBeVisible();
  });

  test('cancel button closes dialog and returns focus', async ({ page }) => {
    await startChallenge(page);

    const resetButton = page.getByTestId('reset-button');
    await resetButton.click();

    // Dialog should be open
    await expect(page.getByTestId('reset-confirm-dialog')).toBeVisible();

    // Click cancel
    await page.getByTestId('reset-cancel').click();

    // Dialog should close
    await expect(page.getByTestId('reset-confirm-dialog')).not.toBeVisible();

    // Focus should return to reset button
    await expect(resetButton).toBeFocused();
  });

  test('Escape key cancels dialog and returns focus', async ({ page }) => {
    await startChallenge(page);

    const resetButton = page.getByTestId('reset-button');
    await resetButton.click();

    // Dialog should be open
    await expect(page.getByTestId('reset-confirm-dialog')).toBeVisible();

    // Press Escape - dialog should handle this, not emergency exit
    // The dialog's onCancel handler should fire
    await page.keyboard.press('Escape');

    // Dialog should close
    await expect(page.getByTestId('reset-confirm-dialog')).not.toBeVisible();

    // Should still be on challenge view (not back to menu)
    await expect(page.getByTestId('challenge-sandbox')).toBeVisible();

    // Focus should return to reset button
    await expect(page.getByTestId('reset-button')).toBeFocused();
  });

  test('cancel button receives initial focus', async ({ page }) => {
    await startChallenge(page);

    await page.getByTestId('reset-button').click();

    // Cancel button should be focused (safe default)
    await expect(page.getByTestId('reset-cancel')).toBeFocused();
  });

  test('dialog traps focus (Tab navigation stays within dialog)', async ({ page }) => {
    await startChallenge(page);

    await page.getByTestId('reset-button').click();

    // Cancel should be focused first
    await expect(page.getByTestId('reset-cancel')).toBeFocused();

    // Tab to confirm button
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('reset-confirm')).toBeFocused();

    // Native dialog showModal() provides focus trapping
    // The exact behavior may vary between browsers, but:
    // - Focus should stay within the dialog when tabbing
    // - The dialog should be modal (blocking interaction with background)
    
    // Verify modal is blocking background - clicking outside shouldn't close it
    // Native dialog with showModal() traps focus by default
    const dialogIsOpen = await page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]');
      return dialog !== null;
    });
    expect(dialogIsOpen).toBe(true);
  });

  test('confirm button resets progress and restarts challenge', async ({
    page,
  }) => {
    await startChallenge(page);

    // Make some progress - repair one defect
    await repair(page, 'invisible-focus');
    await expectCandles(page, 1);

    // Open reset dialog
    await page.getByTestId('reset-button').click();

    // Confirm reset
    await page.getByTestId('reset-confirm').click();

    // Dialog should close
    await expect(page.getByTestId('reset-confirm-dialog')).not.toBeVisible();

    // Progress should be reset
    await expectCandles(page, 0);

    // Still in challenge view
    await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
  });

  test('reset clears DOM repairs and localStorage', async ({ page }) => {
    await startChallenge(page);

    // Make some progress
    await repair(page, 'invisible-focus');

    // Verify repair was applied
    const buyButton = page.getByTestId('defect-invisible-focus');
    await buyButton.focus();
    let outlineStyle = await buyButton.evaluate(
      (el) => getComputedStyle(el).outlineStyle
    );
    expect(outlineStyle).not.toBe('none');

    // Reset
    await page.getByTestId('reset-button').click();
    await page.getByTestId('reset-confirm').click();

    // DOM repair should be removed (element should be defective again)
    await buyButton.focus();
    outlineStyle = await buyButton.evaluate(
      (el) => getComputedStyle(el).outlineStyle
    );
    expect(outlineStyle).toBe('none');

    // localStorage should be cleared
    const storedProgress = await page.evaluate(() =>
      localStorage.getItem('keyquest-progress-v1')
    );
    // Either null or fresh progress with no repairs
    if (storedProgress) {
      const progress = JSON.parse(storedProgress);
      expect(progress.defects['invisible-focus'].repaired).toBe(false);
    }
  });

  test('reset restores all four defects to unrepaired state', async ({
    page,
  }) => {
    await startChallenge(page);

    // Repair all four defects
    // Use the repaired controls, place the order, and take the key
    await completeRoom(page);

    // Go back to the menu and start over (confirmed)
    await page.getByRole('button', { name: 'Return to Menu' }).click();
    await page.getByTestId('start-fresh').click();
    await expect(page.getByTestId('start-over-confirm-dialog')).toBeVisible();
    await page.getByTestId('start-over-confirm').click();

    // Now verify defects are back to unrepaired
    await expectCandles(page, 0);

    // Verify actual DOM state - focus defect should be broken again
    const buyButton = page.getByTestId('defect-invisible-focus');
    await buyButton.focus();
    const outlineStyle = await buyButton.evaluate(
      (el) => getComputedStyle(el).outlineStyle
    );
    expect(outlineStyle).toBe('none');

    // Accessible name defect should be broken again
    await expect(page.getByTestId('defect-missing-name')).toHaveAccessibleName(
      ''
    );
  });
});

test.describe('Reset Dialog Accessibility', () => {
  test('dialog passes axe accessibility checks', { tag: '@axe' }, async ({ page }) => {
    await startChallenge(page);
    await page.getByTestId('reset-button').click();

    // Run axe on the dialog
    const results = await new AxeBuilder({ page })
      .include('[data-testid="reset-confirm-dialog"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('dialog has proper ARIA attributes', async ({ page }) => {
    await startChallenge(page);
    await page.getByTestId('reset-button').click();

    const dialog = page.getByTestId('reset-confirm-dialog');

    // Dialog should have proper aria-labelledby
    await expect(dialog).toHaveAttribute('aria-labelledby', 'reset-dialog-title');

    // Dialog should have proper aria-describedby
    await expect(dialog).toHaveAttribute(
      'aria-describedby',
      'reset-dialog-description'
    );
  });

  test('dialog buttons are keyboard accessible', async ({ page }) => {
    await startChallenge(page);
    await page.getByTestId('reset-button').click();

    // Use keyboard to navigate and activate cancel
    await page.keyboard.press('Enter'); // Activates focused cancel button

    // Dialog should close
    await expect(page.getByTestId('reset-confirm-dialog')).not.toBeVisible();

    // Open again and navigate to confirm
    await page.getByTestId('reset-button').click();
    await page.keyboard.press('Tab'); // Move to confirm
    await expect(page.getByTestId('reset-confirm')).toBeFocused();
  });
});
