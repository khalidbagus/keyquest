/**
 * Escape and Emergency Exit around the bell dialog, from a seeded Belfry save.
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 25.9
 */
import { expect, test, type Page } from './fixtures';
import {
  PROGRESS_KEY,
  expectBellDialog,
  openSeededBelfry,
  playArea,
  seedBelfrySave,
  tabToPlayArea,
} from './helpers/clocktower';

test.setTimeout(90_000);

const heading = (page: Page) => page.getByRole('heading', { name: 'Clocktower Gate', level: 2 });
const atMenu = (page: Page) => expect(page.getByTestId('start-challenge')).toBeVisible({ timeout: 10_000 });

async function savedClocktower(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').clocktower, PROGRESS_KEY);
}

test('Escape with the Play_Area focused saves the Belfry Checkpoint and exits', async ({ page }) => {
  await seedBelfrySave(page);
  await openSeededBelfry(page);
  await tabToPlayArea(page);
  await expect(playArea(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await atMenu(page);
  const saved = await savedClocktower(page);
  expect(saved.lastCheckpoint).toBe('belfry');
  expect(saved.bellRings).toEqual([]);
});

test('Escape closes the bell dialog, auto-repeat keeps the view, and a fresh Escape exits', async ({ page }) => {
  await seedBelfrySave(page, { verified: true });
  await openSeededBelfry(page);
  await page.getByTestId('bell-control-moon').focus();
  await page.keyboard.press('Enter');
  await expectBellDialog(page, true);

  // Hold Escape: the first press closes the dialog, the repeats are ignored.
  await page.keyboard.down('Escape');
  await page.keyboard.down('Escape');
  await page.keyboard.down('Escape');
  await page.keyboard.up('Escape');
  await expectBellDialog(page, false);
  await expect(heading(page)).toBeVisible();
  await page.waitForTimeout(300);
  await expect(heading(page)).toBeVisible();
  expect((await savedClocktower(page)).bellRings).toEqual([]);

  // A fresh press with no dialog open exits.
  await page.keyboard.press('Escape');
  await atMenu(page);
});

test('an active native modal gets the first Escape before the bell dialog', async ({ page }) => {
  await seedBelfrySave(page);
  await openSeededBelfry(page);
  await page.getByTestId('bell-control-moon').click();
  await expectBellDialog(page, true);
  // The costume locker is a native modal dialog opened on top of the bell dialog.
  await page.getByTestId('challenge-costume-button').click();
  await expect(page.locator('dialog[open]')).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expectBellDialog(page, true);
  await expect(heading(page)).toBeVisible();

  await page.keyboard.press('Escape');
  await expectBellDialog(page, false);
  await expect(heading(page)).toBeVisible();
});

test('Emergency Exit with the bell dialog open returns to the menu and records no ring', async ({ page }) => {
  await seedBelfrySave(page, { verified: true });
  await openSeededBelfry(page);
  await page.getByTestId('bell-control-moon').click();
  await expectBellDialog(page, true);

  // The exit stays reachable and operable with the dialog open.
  const exit = page.getByTestId('emergency-exit');
  await expect(exit).toBeVisible();
  await expect(exit).not.toHaveAttribute('inert', /.*/);
  await exit.focus();
  await page.keyboard.press('Enter');
  await atMenu(page);
  const saved = await savedClocktower(page);
  expect(saved.bellRings).toEqual([]);
  expect(saved.lastCheckpoint).toBe('belfry');
});
