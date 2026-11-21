/**
 * E2E Tests for Progressive Hint System (Task 12)
 * Tests hint button accessibility, hint progression, contextual hints,
 * persistence, challenge switching, and reset behavior
 * Requirements: 10.1 - 10.6
 */

import { test, expect, type Page } from './fixtures';
import AxeBuilder from './helpers/axe';
import { completeRoom, discover, expectCandles, repair, startRoom as startChallenge } from './helpers/room';


async function requestHint(page: Page) {
  await page.getByTestId('hint-button').click();
}

async function getHintMeta(page: Page) {
  return page.getByTestId('hint-meta').innerText();
}

async function getHintText(page: Page) {
  return page.getByTestId('hint-text').innerText();
}


test.describe('Hint Button', () => {
  test('hint button is visible and keyboard accessible during challenge', async ({
    page,
  }) => {
    await startChallenge(page);

    const hintButton = page.getByTestId('hint-button');
    await expect(hintButton).toBeVisible();

    // Keyboard accessible: focusable and activatable with Enter
    await hintButton.focus();
    await expect(hintButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('hint-content')).toBeVisible();
  });

  test('hint display is a polite live region and shows placeholder initially', async ({
    page,
  }) => {
    await startChallenge(page);

    const display = page.getByTestId('hint-display');
    await expect(display).toBeVisible();
    await expect(display).toHaveAttribute('role', 'status');
    await expect(display).toContainText('No hint requested yet');
  });

  test('requesting a hint does not change repair progress', async ({
    page,
  }) => {
    await startChallenge(page);

    await requestHint(page);
    await requestHint(page);
    await requestHint(page);

    // Hints must not mark anything as repaired or discovered
    await expectCandles(page, 0);
    await expect(
      page.getByTestId('repair-invisible-focus')
    ).not.toBeVisible();
  });
});

test.describe('Progressive Hints', () => {
  test('first hint identifies the general problem area (level 1)', async ({
    page,
  }) => {
    await startChallenge(page);

    await requestHint(page);

    const meta = await getHintMeta(page);
    expect(meta).toContain('Hint 1 of 3');
    expect(meta).toContain('Invisible Focus');
    const text = await getHintText(page);
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('hints progress through all three levels deterministically', async ({
    page,
  }) => {
    await startChallenge(page);

    await requestHint(page);
    const level1 = await getHintText(page);
    expect(await getHintMeta(page)).toContain('Hint 1 of 3');

    await requestHint(page);
    const level2 = await getHintText(page);
    expect(await getHintMeta(page)).toContain('Hint 2 of 3');

    await requestHint(page);
    const level3 = await getHintText(page);
    expect(await getHintMeta(page)).toContain('Hint 3 of 3');

    // Each level is a different, more specific hint
    expect(level2).not.toBe(level1);
    expect(level3).not.toBe(level2);
    expect(level3).not.toBe(level1);
  });

  test('repeated requests at level 3 keep returning the level 3 hint', async ({
    page,
  }) => {
    await startChallenge(page);

    for (let i = 0; i < 3; i++) {
      await requestHint(page);
    }
    const level3Text = await getHintText(page);
    expect(await getHintMeta(page)).toContain('Hint 3 of 3');

    await requestHint(page);
    await requestHint(page);

    expect(await getHintMeta(page)).toContain('Hint 3 of 3');
    expect(await getHintText(page)).toBe(level3Text);
  });
});

test.describe('Contextual Hints', () => {
  test('hint adapts to undiscovered vs discovered progress', async ({
    page,
  }) => {
    await startChallenge(page);

    // Undiscovered defect
    await requestHint(page);
    await expect(page.getByTestId('hint-panel')).toContainText(
      'has not been discovered'
    );

    // Discover the same defect via the Repair Studio
    await discover(page, 'invisible-focus');

    // Next hint (level 2 for the same defect) reflects discovery
    await requestHint(page);
    const display = page.getByTestId('hint-display');
    await expect(display).toContainText('You have discovered this defect');
    await expect(await getHintMeta(page)).toContain('Hint 2 of 3');
  });

  test('after repairing a defect, hints move to the next defect', async ({
    page,
  }) => {
    await startChallenge(page);

    // Discover and repair the first defect (auto-verifies)
    await discover(page, 'invisible-focus');
    await page.getByTestId('repair-invisible-focus').click();
    await expectCandles(page, 1);

    // The next hint targets the next unverified defect at level 1
    await requestHint(page);
    const meta = await getHintMeta(page);
    expect(meta).toContain('Hint 1 of 3');
    expect(meta).toContain('Mouse-Only Activation');
  });
});

test.describe('Hint Persistence and Switching', () => {
  test('hint level persists across challenge exit and re-entry', async ({
    page,
  }) => {
    await startChallenge(page);

    await requestHint(page);
    await requestHint(page);
    await expect(await getHintMeta(page)).toContain('Hint 2 of 3');

    // Emergency exit preserves progress
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('start-challenge')).toBeVisible();

    // Re-enter the challenge: hint state survives
    await page.getByTestId('start-challenge').click();
    await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
    expect(await getHintMeta(page)).toContain('Hint 2 of 3');
    expect(await getHintMeta(page)).toContain('Invisible Focus');
  });

  test('hint usage is persisted to localStorage', async ({ page }) => {
    await startChallenge(page);

    await requestHint(page);
    await requestHint(page);

    // Auto-save is debounced (~500ms), so poll for the persisted write
    await page.waitForFunction(() => {
      const stored = localStorage.getItem('keyquest-progress-v1');
      if (!stored) return false;
      const progress = JSON.parse(stored) as {
        hintsUsed?: Record<string, number>;
      };
      return progress.hintsUsed?.['invisible-focus'] === 2;
    });

    const stored = await page.evaluate(() =>
      localStorage.getItem('keyquest-progress-v1')
    );
    const progress = JSON.parse(stored!);
    expect(progress.hintsUsed['invisible-focus']).toBe(2);
    expect(progress.defects['invisible-focus'].hintLevel).toBe(2);
  });
});

test.describe('Hint Reset Behavior', () => {
  test('resetting the challenge clears hint state', async ({ page }) => {
    await startChallenge(page);

    await requestHint(page);
    await requestHint(page);
    await requestHint(page);
    await expect(await getHintMeta(page)).toContain('Hint 3 of 3');

    // Reset via confirmation dialog
    await page.getByTestId('reset-button').click();
    await page.getByTestId('reset-confirm').click();
    await expect(page.getByTestId('reset-confirm-dialog')).not.toBeVisible();

    // Hint display returns to the initial placeholder
    await expect(page.getByTestId('hint-display')).toContainText(
      'No hint requested yet'
    );

    // A fresh hint starts at level 1 again
    await requestHint(page);
    expect(await getHintMeta(page)).toContain('Hint 1 of 3');
  });
});

test.describe('Hint Accessibility', () => {
  test('hint panel passes axe accessibility checks', { tag: '@axe' }, async ({ page }) => {
    await startChallenge(page);

    await requestHint(page);
    await requestHint(page);

    const results = await new AxeBuilder({ page })
      .include('[data-testid="hint-panel"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('app shell still passes axe with hint panel visible', { tag: '@axe' }, async ({
    page,
  }) => {
    await startChallenge(page);

    await requestHint(page);

    // Hint panel lives in the app shell zone (outside the sandbox)
    const results = await new AxeBuilder({ page })
      .exclude('[data-testid="challenge-sandbox"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('game remains completable without opening hints', async ({
    page,
  }) => {
    await startChallenge(page);

    // Never touch the hint button
    await repair(page, 'invisible-focus');
    await repair(page, 'mouse-only-activation');
    await repair(page, 'missing-accessible-name');
    await repair(page, 'insufficient-contrast');

    await completeRoom(page);
  });
});
