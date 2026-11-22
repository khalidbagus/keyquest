/**
 * The Bell_Focus_Curse in the live Belfry sandbox, from a seeded Belfry save.
 * Before the repair, focus stays outside the dialog and falls to the page on close.
 * After it, focus moves to Ring and returns to the bell for Ring, Cancel, and Escape.
 * Requirements: 19.2, 19.3, 20.2, 20.3, 20.9, 20.10, 25.6, 25.7
 */
import { expect, test, type Page } from './fixtures';
import {
  expectBellDialog,
  focusedTestId,
  openSeededBelfry,
  roomStatus,
  seedBelfrySave,
} from './helpers/clocktower';

test.setTimeout(90_000);

/** Open the bell dialog from the Moon bell with the keyboard. */
async function openMoonWithKeyboard(page: Page) {
  await page.getByTestId('bell-control-moon').focus();
  await page.keyboard.press('Enter');
  await expectBellDialog(page, true);
}

/** Tab forward until the given control has focus (at most 5 presses, Requirement 19.5). */
async function tabTo(page: Page, testId: string) {
  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press('Tab');
    if ((await focusedTestId(page)) === testId) return;
  }
  throw new Error(`${testId} was not reached within 5 Tab presses`);
}

test('the bell dialog loses focus before the repair and keeps it after, for Ring, Cancel, and Escape', async ({ page }) => {
  await seedBelfrySave(page);
  await openSeededBelfry(page);

  // Before the repair: opening leaves focus on the opener, outside the dialog.
  await openMoonWithKeyboard(page);
  expect(await focusedTestId(page)).toBe('bell-control-moon');
  await expect(roomStatus(page)).toContainText('Curse found: the bell dialog loses keyboard focus');
  // Ring is reachable with Tab, and closing through it drops focus to the page.
  await tabTo(page, 'bell-ring');
  await page.keyboard.press('Enter');
  await expectBellDialog(page, false);
  expect(await focusedTestId(page)).toBe('body');
  await expect(roomStatus(page)).toContainText('rope is jammed');

  await openMoonWithKeyboard(page);
  await tabTo(page, 'bell-cancel');
  await page.keyboard.press('Enter');
  await expectBellDialog(page, false);
  expect(await focusedTestId(page)).toBe('body');

  await openMoonWithKeyboard(page);
  await page.keyboard.press('Escape');
  await expectBellDialog(page, false);
  expect(await focusedTestId(page)).toBe('body');
  // Escape closed the dialog only; the view stays.
  await expect(page.getByRole('heading', { name: 'Clocktower Gate', level: 2 })).toBeVisible();

  // The correct patch verifies on the live dialog and focus lands on the Moon bell.
  await page.getByTestId('inspect-bell-focus').click();
  await page.getByTestId('repair-bell-focus').click();
  await expect(page.getByTestId('bell-control-moon')).toBeFocused({ timeout: 10_000 });
  await expect(roomStatus(page)).toContainText('Fixed:');
  await expect(page.getByTestId('room-objective')).toHaveAttribute('data-stage', 'ring-bells');

  // After the repair: Ring takes focus on open, and every close returns it to the bell.
  await page.keyboard.press('Enter');
  await expectBellDialog(page, true);
  await expect(page.getByTestId('bell-ring')).toBeFocused();
  await page.keyboard.press('Enter');
  await expectBellDialog(page, false);
  await expect(page.getByTestId('bell-control-moon')).toBeFocused();
  await expect(roomStatus(page)).toHaveText('The Moon bell rings and an apothecary window lights. 1 of 3 bells rung.');

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('bell-ring')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('bell-cancel')).toBeFocused();
  await page.keyboard.press('Enter');
  await expectBellDialog(page, false);
  await expect(page.getByTestId('bell-control-moon')).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('bell-ring')).toBeFocused();
  await page.keyboard.press('Escape');
  await expectBellDialog(page, false);
  await expect(page.getByTestId('bell-control-moon')).toBeFocused();
  await expect(page.getByTestId('route-bell-progress')).toHaveText('Bells: 1 of 3 bells rung');
});

test('a trap patch is explained, and a forced failed check is named until Check again passes', async ({ page }) => {
  await seedBelfrySave(page);
  await openSeededBelfry(page);
  await page.getByTestId('inspect-bell-focus').click();

  // The trap leaves the defect in place and explains why in one sentence.
  await page.getByTestId('trap-bell-trap-tabindex').click();
  await expect(page.getByTestId('trap-feedback-bell-dialog-focus')).toContainText(
    'A tabindex lets the dialog take focus'
  );
  await expect(page.getByTestId('room-objective')).toHaveAttribute('data-stage', 'bells-silent');
  await expect(page.getByTestId('repair-bell-focus')).toBeVisible();

  // A capture focusin listener pushes focus out of the dialog, so the entry check fails.
  await page.evaluate(() => {
    const blur = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-testid="defect-bell-focus"]')) target.blur();
    };
    (window as unknown as { __bellBlur: typeof blur }).__bellBlur = blur;
    document.addEventListener('focusin', blur, true);
  });
  await page.getByTestId('repair-bell-focus').click();
  const failed = page.getByTestId('failed-checks-bell-dialog-focus');
  await expect(failed).toContainText('Focus moves into the dialog', { timeout: 10_000 });
  await expect(page.getByTestId('room-objective')).toHaveAttribute('data-stage', 'bells-silent');
  await expect(page.getByTestId('verify-retry')).toBeVisible();

  // Remove the listener: Check again reruns all four checks and verifies.
  await page.evaluate(() => {
    const holder = window as unknown as { __bellBlur: (event: FocusEvent) => void };
    document.removeEventListener('focusin', holder.__bellBlur, true);
  });
  await page.getByTestId('verify-retry').click();
  await expect(page.getByTestId('bell-control-moon')).toBeFocused({ timeout: 10_000 });
  await expect(page.getByTestId('room-objective')).toHaveAttribute('data-stage', 'ring-bells');
  // Verification rang nothing.
  await expect(page.getByTestId('route-bell-progress')).toHaveText('Bells: 0 of 3 bells rung');
  await expectBellDialog(page, false);
});
