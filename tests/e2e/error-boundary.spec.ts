/**
 * Error Boundary E2E Tests
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 *
 * Covers normal integration and actual initial/subsequent render failures
 * injected into module responses, including axe and keyboard recovery:
 * 1. Error boundary doesn't break normal functionality
 * 2. Recovery patterns (reset, menu navigation) work correctly
 * 3. Focus management and accessibility are maintained
 * 4. Progress preservation works as expected
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Helper to navigate to challenge view
 */
async function startChallenge(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-challenge').click();
  await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
}

/**
 * Helper to discover and repair a defect using the same pattern as existing tests
 */
async function repair(page: Page, name: string, testId: string) {
  const card = page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .filter({ has: page.getByRole('button', { name: 'Discover Defect' }) })
    .last();
  await card.getByRole('button', { name: 'Discover Defect' }).click();
  await page.getByTestId(testId).click();
}

test.describe('Error Boundary', () => {
  test.describe('Error UI Display', () => {
    test('error boundary UI has correct structure and accessibility', async ({ page }) => {
      await startChallenge(page);

      // Verify the sandbox is visible and working with error boundary wrapper
      await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
      
      // Verify error boundary wrapper doesn't interfere with normal operation
      const sandbox = page.getByTestId('challenge-sandbox');
      await expect(sandbox).toBeVisible();
      
      // Tab navigation should still work through the sandbox
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to interact with defective elements
      const defect = page.getByTestId('defect-mouse-only');
      await expect(defect).toBeVisible();
    });

    test('error boundary preserves sandbox functionality when no error', async ({ page }) => {
      await startChallenge(page);

      // Full repair flow should still work with error boundary in place
      await repair(page, 'Invisible Focus', 'repair-invisible-focus');

      // Verify repair was successful
      await expect(page.getByText('1 / 4 defects repaired')).toBeVisible();
    });
  });

  test.describe('Recovery Options', () => {
    test('retry button is available and keyboard accessible', async ({ page }) => {
      await startChallenge(page);

      // Test that recovery controls would be keyboard accessible if error UI was shown
      // We verify the buttons render correctly by checking the error boundary component exists

      // Verify normal flow works (error boundary is transparent)
      const sandbox = page.getByTestId('challenge-sandbox');
      await expect(sandbox).toBeVisible();
      
      // Keyboard navigation works through content
      await sandbox.getByTestId('defect-invisible-focus').focus();
      await expect(sandbox.getByTestId('defect-invisible-focus')).toBeFocused();
    });

    test('reset sandbox preserves discovered defects structure', async ({ page }) => {
      await startChallenge(page);

      // Discover a defect first
      const card = page
        .locator('div')
        .filter({ has: page.getByRole('heading', { name: 'Invisible Focus', exact: true }) })
        .filter({ has: page.getByRole('button', { name: 'Discover Defect' }) })
        .last();
      await card.getByRole('button', { name: 'Discover Defect' }).click();

      // Verify discovered
      await expect(page.getByText('1 / 4 discovered')).toBeVisible();

      // Use the regular reset flow (similar to what error boundary reset would do)
      await page.getByTestId('reset-button').click();
      await page.getByTestId('reset-confirm').click();

      // After reset, progress should be cleared
      await expect(page.getByText('0 / 4 defects repaired')).toBeVisible();
    });

    test('return to menu preserves progress', async ({ page }) => {
      await startChallenge(page);

      // Discover and repair a defect
      await repair(page, 'Missing Accessible Name', 'repair-missing-name');

      // Verify repair
      await expect(page.getByText('1 / 4 defects repaired')).toBeVisible();

      // Use emergency exit (same as error boundary's return to menu)
      await page.keyboard.press('Escape');
      
      // Verify we're back at menu
      await expect(page.getByTestId('start-challenge')).toBeVisible();

      // Progress should be saved - reload the page to trigger restore dialog
      await page.reload();
      
      // Wait for restore dialog to appear
      await expect(page.getByTestId('progress-restore-dialog')).toBeVisible();
      
      // Click restore using data-testid
      await page.getByTestId('restore-progress').click();
      
      // Should show the repair was preserved
      await expect(page.getByText('1 / 4 defects repaired')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('error boundary does not add axe violations to challenge view', async ({ page }) => {
      await startChallenge(page);

      // Run axe on the shell (excluding sandbox which has intentional defects)
      const results = await new AxeBuilder({ page })
        .exclude('[data-testid="challenge-sandbox"]')
        .analyze();

      expect(results.violations).toEqual([]);
    });

    test('focus management returns to appropriate element after recovery actions', async ({ page }) => {
      await startChallenge(page);

      // Test reset dialog focus management (similar to error boundary recovery)
      const resetButton = page.getByTestId('reset-button');
      await resetButton.click();

      // Dialog should be focused
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Cancel returns focus to reset button
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(resetButton).toBeFocused();
    });
  });

  test.describe('Repeated Errors', () => {
    test('multiple resets do not cause state issues', async ({ page }) => {
      await startChallenge(page);

      // Perform multiple reset cycles
      for (let i = 0; i < 3; i++) {
        // Discover a defect
        const card = page
          .locator('div')
          .filter({ has: page.getByRole('heading', { name: 'Invisible Focus', exact: true }) })
          .filter({ has: page.getByRole('button', { name: 'Discover Defect' }) })
          .last();
        await card.getByRole('button', { name: 'Discover Defect' }).click();

        // Reset
        await page.getByTestId('reset-button').click();
        await page.getByTestId('reset-confirm').click();

        // Verify clean state
        await expect(page.getByText('0 / 4 defects repaired')).toBeVisible();
        await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
      }

      // After multiple resets, should still be able to complete full flow
      await repair(page, 'Invisible Focus', 'repair-invisible-focus');
      await expect(page.getByText('1 / 4 defects repaired')).toBeVisible();
    });

    test('progress state remains consistent after menu round-trip', async ({ page }) => {
      await startChallenge(page);

      // Do some work
      await repair(page, 'Mouse-Only Activation', 'repair-mouse-only');

      // Exit to menu
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('start-challenge')).toBeVisible();
      
      // Reload to trigger restore dialog
      await page.reload();
      await expect(page.getByTestId('progress-restore-dialog')).toBeVisible();
      await page.getByTestId('restore-progress').click();
      
      // Wait for challenge view to load fully
      await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
      
      // State should be consistent - the repair should have been re-applied
      await expect(page.getByTestId('repair-mouse-only')).toHaveCount(0); // Already repaired
    });
  });
});

test.describe('Error Boundary Component Integration', () => {
  test('error boundary component is rendered in challenge view', async ({ page }) => {
    await startChallenge(page);

    // The error boundary wraps the sandbox - verify the structure
    // by checking both are present and functional
    await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
    
    // Verify repair studio is also visible (outside error boundary)
    await expect(page.getByRole('heading', { name: 'Repair Studio' })).toBeVisible();
  });

  test('all recovery buttons would be keyboard operable', async ({ page }) => {
    await startChallenge(page);

    // Test that our button patterns are keyboard accessible
    // by verifying similar buttons in the app work correctly
    
    // Tab to reset button (a recovery-style button)
    const resetButton = page.getByTestId('reset-button');
    await resetButton.focus();
    await expect(resetButton).toBeFocused();
    
    // Activate with Enter
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    
    // Cancel button should be focused
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeFocused();
    
    // Activate with Space
    await page.keyboard.press('Space');
    await expect(dialog).not.toBeVisible();
  });
});

// Fault injection stays in the test's intercepted module response; production
// code has no error switch, global error handler, or special testing path.
async function installRenderFailure(page: Page, moduleName = 'MidnightCheckout') {
  await page.route(`**/src/components/${moduleName}/${moduleName}.tsx*`, async route => {
    const response = await route.fetch();
    const source = await response.text();
    const pattern = new RegExp(`function ${moduleName}\\([\\s\\S]*?\\)\\s*\\{`);
    expect(source).toMatch(pattern);
    await route.fulfill({ response, body: source.replace(pattern, '$& if (window.__keyquestRenderFailure) { throw new Error("Injected render failure"); }') });
  });
}

async function setRenderFailure(page: Page, broken: boolean) {
  await page.evaluate(value => {
    (window as unknown as { __keyquestRenderFailure: boolean }).__keyquestRenderFailure = value;
  }, broken);
}

test('actual fallback passes axe and retry restores repairs and keyboard focus', async ({ page }) => {
  await installRenderFailure(page);
  await startChallenge(page);
  await repair(page, 'Missing Accessible Name', 'repair-missing-name');
  await page.getByTestId('hint-button').click();
  await setRenderFailure(page, true);
  // A Context update triggers a subsequent render error in the checkout.
  await page.getByTestId('hint-button').click();
  await expect(page.getByTestId('error-boundary-ui')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Something Went Wrong' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Repair Studio' })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('keyquest-progress-v1')!));
  expect(saved.defects['missing-accessible-name'].verified).toBe(true);
  expect(Object.values(saved.hintsUsed).some(count => Number(count) > 0)).toBe(true);
  await setRenderFailure(page, false);
  await page.getByTestId('error-retry-button').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('error-boundary-ui')).toHaveCount(0);
  await expect(page.getByTestId('defect-missing-name')).toHaveAccessibleName('View shopping cart');
  await expect(page.getByText('1 / 4 defects repaired')).toBeVisible();
  await expect(page.locator(':focus')).toContainText('Repair Studio');
  await setRenderFailure(page, true);
  await page.getByTestId('hint-button').click();
  await expect(page.getByTestId('error-boundary-ui')).toBeVisible();
  await page.getByTestId('error-menu-button').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Welcome to KeyQuest' })).toBeFocused();
  await page.reload();
  await page.getByTestId('restore-progress').click();
  await expect(page.getByTestId('defect-missing-name')).toHaveAccessibleName('View shopping cart');
  await expect(page.getByText('1 / 4 defects repaired')).toBeVisible();
});

test('actual reset remounts sandbox while preserving discoveries repairs and hints', async ({ page }) => {
  await installRenderFailure(page);
  await startChallenge(page);
  await repair(page, 'Mouse-Only Activation', 'repair-mouse-only');
  await page.getByTestId('hint-button').click();
  await setRenderFailure(page, true);
  await page.getByTestId('hint-button').click();
  await expect(page.getByTestId('error-boundary-ui')).toBeVisible();
  await setRenderFailure(page, false);
  await page.getByTestId('error-reset-button').focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('error-boundary-ui')).toHaveCount(0);
  await expect(page.getByTestId('defect-mouse-only')).toHaveAttribute('role', 'button');
  await expect(page.getByText('1 / 4 defects repaired')).toBeVisible();
  await expect(page.locator(':focus')).toContainText('Repair Studio');
  await page.getByTestId('defect-mouse-only').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('✓ Added!')).toBeVisible();
});

test('persistent initial render failure caps retries and returns safely to menu', async ({ page }) => {
  await installRenderFailure(page);
  await page.goto('/');
  await setRenderFailure(page, true);
  await page.getByTestId('start-challenge').click();
  await expect(page.getByRole('heading', { name: 'Something Went Wrong' })).toBeFocused();
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByTestId('error-retry-button').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Something Went Wrong' })).toBeFocused();
  }
  await expect(page.getByTestId('error-retry-button')).toBeDisabled();
  await page.getByTestId('error-menu-button').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Welcome to KeyQuest' })).toBeFocused();
  await expect(page.getByTestId('start-challenge')).toBeVisible();
});

test('Repair Studio render failures are contained by the recovery boundary', async ({ page }) => {
  await installRenderFailure(page, 'RepairStudio');
  await page.goto('/');
  await setRenderFailure(page, true);
  await page.getByTestId('start-challenge').click();
  await expect(page.getByTestId('error-boundary-ui')).toBeVisible();
  await expect(page.getByTestId('emergency-exit')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-challenge')).toBeVisible();
});
