/**
 * E2E Tests for resuming saved progress from the opening screen.
 * Covers Resume, Start over, older version 1 saves without room actions,
 * restored DOM repairs and room actions, and invalid data.
 */

import { test, expect, type Page } from './fixtures';
import AxeBuilder from './helpers/axe';

const DEFECT_TYPES = [
  'invisible-focus',
  'mouse-only-activation',
  'missing-accessible-name',
  'insufficient-contrast',
];

/** A version 1 save. Omit `checkout` to model a save from before the rooms. */
function createSavedProgress(options: {
  discoveredDefects?: string[];
  repairedDefects?: string[];
  checkout?: { lanternLit: boolean; candleAdded: boolean; orderPlaced: boolean };
}) {
  const now = Date.now();
  const defects: Record<string, unknown> = {};
  const hintsUsed: Record<string, number> = {};

  for (const type of DEFECT_TYPES) {
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
    ...(options.checkout ? { checkout: options.checkout } : {}),
    isComplete: false,
    completedAt: null as number | null,
  };
}

async function setSavedProgress(page: Page, progress: unknown) {
  await page.addInitScript((progressData) => {
    if (!sessionStorage.getItem('keyquest-test-seeded')) {
      localStorage.setItem('keyquest-progress-v1', JSON.stringify(progressData));
      sessionStorage.setItem('keyquest-test-seeded', '1');
    }
  }, progress);
}

test.describe('Resume from the opening screen', () => {
  test('resume state has no blocking dialog and passes axe', { tag: '@axe' }, async ({ page }) => {
    await setSavedProgress(page, createSavedProgress({ discoveredDefects: ['invisible-focus'] }));
    await page.goto('/');
    await expect(page.getByTestId('start-challenge')).toHaveText(/Resume Midnight Checkout/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test('summarises the save and offers Start over', async ({ page }) => {
    await setSavedProgress(page, createSavedProgress({
      discoveredDefects: ['invisible-focus', 'mouse-only-activation'],
      repairedDefects: ['invisible-focus'],
    }));
    await page.goto('/');
    await expect(page.getByTestId('resume-summary')).toContainText('1 of 4 candles lit, 2 of 4 curses found');
    await expect(page.getByTestId('start-challenge')).toHaveAttribute('aria-describedby', 'resume-summary');
    await expect(page.getByTestId('start-fresh')).toBeVisible();
  });

  test('shows Enter when there is no save; a finished version 1 save resumes in the Pantry', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('start-challenge')).toHaveText(/Enter Midnight Checkout/);
    await expect(page.getByTestId('start-fresh')).toHaveCount(0);

    // A save from before the rooms existed that finished the Checkout.
    const done = createSavedProgress({ repairedDefects: DEFECT_TYPES });
    done.isComplete = true;
    done.completedAt = Date.now() - 10000;
    await page.evaluate((p) => localStorage.setItem('keyquest-progress-v1', JSON.stringify(p)), done);
    await page.reload();
    await expect(page.getByTestId('start-challenge')).toHaveText(/Resume Potion Pantry/);
    await page.getByTestId('start-challenge').click();
    await expect(page.getByRole('heading', { name: 'Potion Pantry', level: 2 })).toBeFocused();
  });

  test('Resume enters the room with saved repairs re-applied to the DOM', async ({ page }) => {
    await setSavedProgress(page, createSavedProgress({ repairedDefects: ['invisible-focus'] }));
    await page.goto('/');
    await page.getByTestId('start-challenge').click();
    await expect(page.getByTestId('room-progress')).toContainText('1 of 4 candles lit');
    await expect(page.getByTestId('room-objective')).toHaveAttribute('data-stage', 'light-lantern');
    const buy = page.getByTestId('defect-invisible-focus');
    await buy.focus();
    expect(await buy.evaluate((el) => el.classList.contains('keyquest-focus-repaired'))).toBe(true);
    expect(await buy.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
  });

  test('migrates an older save without room actions and keeps its repairs', async ({ page }) => {
    // No `checkout` key: a save written before the adventure rooms existed.
    await setSavedProgress(page, createSavedProgress({
      discoveredDefects: ['mouse-only-activation'],
      repairedDefects: ['invisible-focus', 'missing-accessible-name'],
    }));
    await page.goto('/');
    await page.getByTestId('start-challenge').click();
    await expect(page.getByTestId('room-progress')).toContainText('2 of 4 candles lit');
    await expect(page.getByTestId('room-progress')).toContainText('3 of 4 curses found');
    await expect(page.locator('[data-lit="false"]')).toHaveCount(1);
    await expect(page.getByTestId('defect-missing-name')).toHaveAccessibleName('View shopping cart');
    await page.getByTestId('defect-invisible-focus').click();
    await expect(page.locator('[data-lit="true"]')).toHaveCount(1);
    await expect.poll(async () => page.evaluate(() =>
      JSON.parse(localStorage.getItem('keyquest-progress-v1') ?? '{}').checkout?.lanternLit
    )).toBe(true);
  });

  test('room actions survive a reload', async ({ page }) => {
    await setSavedProgress(page, createSavedProgress({
      repairedDefects: DEFECT_TYPES,
      checkout: { lanternLit: true, candleAdded: true, orderPlaced: false },
    }));
    await page.goto('/');
    await page.getByTestId('start-challenge').click();
    await expect(page.getByTestId('room-objective')).toHaveAttribute('data-stage', 'place-order');
    await page.getByTestId('defect-invisible-focus').click();
    await expect(page.getByTestId('counter-key')).toBeVisible();
    await page.waitForTimeout(700);
    await page.reload();
    await page.getByTestId('start-challenge').click();
    await expect(page.getByTestId('counter-key')).toBeVisible();
    await expect(page.getByTestId('take-key')).toBeVisible();
  });

  test('Start over asks first; Cancel keeps the save', async ({ page }) => {
    await setSavedProgress(page, createSavedProgress({ repairedDefects: ['invisible-focus'] }));
    await page.goto('/');
    await page.getByTestId('start-fresh').click();
    const dialog = page.getByTestId('start-over-confirm-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName('Start over?');
    await expect(page.getByTestId('start-over-cancel')).toBeFocused();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId('start-fresh')).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('keyquest-progress-v1'))).not.toBeNull();
    await expect(page.getByTestId('start-challenge')).toHaveText(/Resume Midnight Checkout/);
  });

  test('Start over clears the save and enters a fresh room once confirmed', async ({ page }) => {
    await setSavedProgress(page, createSavedProgress({ repairedDefects: ['invisible-focus'] }));
    await page.goto('/');
    await page.getByTestId('start-fresh').click();
    await page.getByTestId('start-over-confirm').click();
    await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
    await expect(page.getByTestId('room-progress')).toContainText('0 of 4 candles lit');
    await page.getByTestId('defect-invisible-focus').focus();
    expect(await page.getByTestId('defect-invisible-focus').evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
  });

  test('Resume is the first control in main', async ({ page }) => {
    await setSavedProgress(page, createSavedProgress({ discoveredDefects: ['invisible-focus'] }));
    await page.goto('/');
    await expect(page.getByTestId('start-challenge')).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('start-challenge')).toBeFocused();
  });
});

test.describe('Saved progress - invalid data handling', () => {
  test('ignores invalid JSON', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('keyquest-progress-v1', 'invalid-json');
    });
    await page.goto('/');
    await expect(page.getByTestId('start-challenge')).toHaveText(/Enter Midnight Checkout/);
  });

  test('ignores an incomplete progress schema', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('keyquest-progress-v1', JSON.stringify({ version: 1, sessionId: 'test' }));
    });
    await page.goto('/');
    await expect(page.getByTestId('start-challenge')).toHaveText(/Enter Midnight Checkout/);
  });
});
