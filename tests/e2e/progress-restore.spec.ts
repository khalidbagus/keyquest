/**
 * E2E Tests for Progress Restoration (Task 9.3)
 * Tests restore dialog, restore flow, and start fresh flow
 */

import { test, expect, type Page } from './fixtures';
import AxeBuilder from './helpers/axe';

/**
 * Creates a valid saved progress state with specified repairs
 */
function createSavedProgress(options: {
  discoveredDefects?: string[];
  repairedDefects?: string[];
}) {
  const now = Date.now();
  const defectTypes = [
    'invisible-focus',
    'mouse-only-activation',
    'missing-accessible-name',
    'insufficient-contrast',
  ];

  const defects: Record<string, unknown> = {};
  const hintsUsed: Record<string, number> = {};

  for (const type of defectTypes) {
    const discovered = options.discoveredDefects?.includes(type) ?? false;
    const repaired = options.repairedDefects?.includes(type) ?? false;

    defects[type] = {
      type,
      discovered: discovered || repaired,
      discoveredAt: discovered || repaired ? now - 60000 : null,
      repaired,
      repairedAt: repaired ? now - 30000 : null,
      verified: repaired,
      verifiedAt: repaired ? now - 30000 : null,
      hintLevel: 0,
    };
    hintsUsed[type] = 0;
  }

  return {
    version: 1,
    sessionId: 'test-session-id',
    startedAt: now - 120000,
    lastUpdatedAt: now - 30000,
    defects,
    hintsUsed,
    isComplete: false,
    completedAt: null,
  };
}

async function setSavedProgress(page: Page, progress: unknown) {
  await page.addInitScript((progressData) => {
    localStorage.setItem('keyquest-progress-v1', JSON.stringify(progressData));
  }, progress);
}

test.describe('Progress Restoration Dialog', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test by navigating and clearing
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('restore dialog has a name and passes axe', { tag: '@axe' }, async ({ page }) => {
    await setSavedProgress(page, createSavedProgress({ discoveredDefects: ['invisible-focus'] }));
    await page.goto('/');
    await expect(page.getByRole('dialog')).toHaveAccessibleName(/\S/);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test('shows restore dialog when meaningful saved progress exists', async ({
    page,
  }) => {
    const savedProgress = createSavedProgress({
      discoveredDefects: ['invisible-focus', 'mouse-only-activation'],
      repairedDefects: ['invisible-focus'],
    });

    await setSavedProgress(page, savedProgress);
    await page.goto('/');

    // Dialog should be visible
    const dialog = page.getByTestId('progress-restore-dialog');
    await expect(dialog).toBeVisible();

    // Dialog should show progress summary
    await expect(page.getByText('Welcome Back!')).toBeVisible();
    await expect(page.getByText('Defects discovered:')).toBeVisible();
    await expect(page.getByText('Defects repaired:')).toBeVisible();

    // Both buttons should be visible
    await expect(page.getByTestId('restore-progress')).toBeVisible();
    await expect(page.getByTestId('start-fresh')).toBeVisible();
  });

  test('does not show restore dialog when no saved progress exists', async ({
    page,
  }) => {
    await page.goto('/');

    // Dialog should not be visible
    const dialog = page.getByTestId('progress-restore-dialog');
    await expect(dialog).not.toBeVisible();

    // Main menu should be visible
    await expect(page.getByTestId('start-challenge')).toBeVisible();
  });

  test('does not show restore dialog for completed progress', async ({
    page,
  }) => {
    const savedProgress = createSavedProgress({
      repairedDefects: [
        'invisible-focus',
        'mouse-only-activation',
        'missing-accessible-name',
        'insufficient-contrast',
      ],
    });
    savedProgress.isComplete = true;
    savedProgress.completedAt = Date.now() - 10000;

    await setSavedProgress(page, savedProgress);
    await page.goto('/');

    // Dialog should not be visible for completed progress
    const dialog = page.getByTestId('progress-restore-dialog');
    await expect(dialog).not.toBeVisible();
  });

  test('Restore button navigates to challenge with saved state', async ({
    page,
  }) => {
    const savedProgress = createSavedProgress({
      discoveredDefects: ['invisible-focus', 'mouse-only-activation'],
      repairedDefects: ['invisible-focus'],
    });

    await setSavedProgress(page, savedProgress);
    await page.goto('/');

    // Click restore
    await page.getByTestId('restore-progress').click();

    // Should navigate to challenge view
    await expect(page.getByTestId('challenge-sandbox')).toBeVisible();

    // Progress should show the restored state
    await expect(page.getByText('1 / 4 defects repaired')).toBeVisible();
  });

  test('Start Fresh button clears progress and stays on menu', async ({
    page,
  }) => {
    const savedProgress = createSavedProgress({
      discoveredDefects: ['invisible-focus', 'mouse-only-activation'],
      repairedDefects: ['invisible-focus'],
    });

    await setSavedProgress(page, savedProgress);
    await page.goto('/');

    // Click start fresh
    await page.getByTestId('start-fresh').click();

    // Dialog should close
    await expect(
      page.getByTestId('progress-restore-dialog')
    ).not.toBeVisible();

    // Should still be on menu
    await expect(page.getByTestId('start-challenge')).toBeVisible();

    // localStorage should be cleared
    const storedProgress = await page.evaluate(() =>
      localStorage.getItem('keyquest-progress-v1')
    );
    expect(storedProgress).toBeNull();
  });

  test('Escape key dismisses dialog and starts fresh', async ({ page }) => {
    const savedProgress = createSavedProgress({
      discoveredDefects: ['invisible-focus'],
    });

    await setSavedProgress(page, savedProgress);
    await page.goto('/');

    // Dialog should be visible
    await expect(
      page.getByTestId('progress-restore-dialog')
    ).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Dialog should close
    await expect(
      page.getByTestId('progress-restore-dialog')
    ).not.toBeVisible();

    // Should stay on menu
    await expect(page.getByTestId('start-challenge')).toBeVisible();
  });

  test('restore button receives initial focus', async ({ page }) => {
    const savedProgress = createSavedProgress({
      discoveredDefects: ['invisible-focus'],
    });

    await setSavedProgress(page, savedProgress);
    await page.goto('/');

    // Restore button should be focused
    await expect(page.getByTestId('restore-progress')).toBeFocused();
  });

  test('restored repairs are applied to DOM elements', async ({ page }) => {
    const savedProgress = createSavedProgress({
      repairedDefects: ['invisible-focus'],
    });

    await setSavedProgress(page, savedProgress);
    await page.goto('/');

    // Click restore
    await page.getByTestId('restore-progress').click();

    // Wait for challenge to load
    await expect(page.getByTestId('challenge-sandbox')).toBeVisible();

    // Wait a bit for repairs to be applied (they're applied after a timeout)
    await page.waitForTimeout(200);

    // The focus repair should be applied to the element
    const buyButton = page.getByTestId('defect-invisible-focus');
    await buyButton.focus();

    // Check that the repair class/style is applied
    const hasRepairClass = await buyButton.evaluate((el) =>
      el.classList.contains('keyquest-focus-repaired')
    );
    expect(hasRepairClass).toBe(true);

    // Outline should not be 'none' when focused
    const outlineStyle = await buyButton.evaluate(
      (el) => getComputedStyle(el).outlineStyle
    );
    expect(outlineStyle).not.toBe('none');
  });
});

test.describe('Progress Restoration - Invalid Data Handling', () => {
  test('does not show dialog for invalid/corrupted saved data', async ({
    page,
  }) => {
    // Set invalid JSON
    await page.addInitScript(() => {
      localStorage.setItem('keyquest-progress-v1', 'invalid-json');
    });
    await page.goto('/');

    // Dialog should not show
    await expect(
      page.getByTestId('progress-restore-dialog')
    ).not.toBeVisible();

    // Main menu should be visible
    await expect(page.getByTestId('start-challenge')).toBeVisible();
  });

  test('does not show dialog for incomplete progress schema', async ({
    page,
  }) => {
    // Set progress with missing fields
    await page.addInitScript(() => {
      localStorage.setItem(
        'keyquest-progress-v1',
        JSON.stringify({
          version: 1,
          sessionId: 'test',
          // Missing other required fields
        })
      );
    });
    await page.goto('/');

    // Dialog should not show
    await expect(
      page.getByTestId('progress-restore-dialog')
    ).not.toBeVisible();
  });
});
