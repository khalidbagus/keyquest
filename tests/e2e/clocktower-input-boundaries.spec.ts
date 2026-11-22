/**
 * Input boundaries: the Ghost stops when input leaves the game (Requirements 11.1 to 11.8).
 */
import { expect, test, type Page } from './fixtures';
import {
  PROGRESS_KEY,
  expectGhostStill,
  ghost,
  openCourtyardPreview,
  openClocktower,
  playArea,
  seedSave,
  tabToPlayArea,
} from './helpers/clocktower';

/** Start walking east from the spawn and wait until the Ghost is moving. */
async function startWalking(page: Page) {
  await openCourtyardPreview(page);
  await tabToPlayArea(page);
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await ghost(page)).moving).toBe(true);
}

test('Play_Area blur stops the Ghost and a key held through the blur does not restart it', async ({ page }) => {
  await startWalking(page);
  await playArea(page).evaluate((element) => (element as HTMLElement).blur());
  await expectGhostStill(page);
  // Focus returns while the key is still down: only auto-repeat keydowns arrive, so it stays stopped.
  await playArea(page).focus();
  await page.keyboard.down('ArrowRight');
  await expectGhostStill(page, 500);
  await page.keyboard.up('ArrowRight');
  // A fresh press moves it again.
  const before = await ghost(page);
  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await ghost(page)).x).toBeLessThan(before.x - 10);
  await page.keyboard.up('ArrowLeft');
});

test('window blur stops the Ghost', async ({ page }) => {
  await startWalking(page);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expectGhostStill(page);
  await page.keyboard.up('ArrowRight');
});

test('a hidden page stops the Ghost', async ({ page }) => {
  await startWalking(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expectGhostStill(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });
  await page.keyboard.up('ArrowRight');
});

test('an open modal dialog stops the Ghost and blocks input until it closes', async ({ page }) => {
  await startWalking(page);
  await page.getByTestId('reset-button').click();
  await expect(page.getByRole('dialog', { name: /Reset Clocktower Gate/ })).toBeVisible();
  await expectGhostStill(page);
  await page.keyboard.up('ArrowRight');
  // Cancel closes the dialog; the Ghost stays where it was.
  const stopped = await ghost(page);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.waitForTimeout(300);
  const after = await ghost(page);
  expect({ x: after.x, y: after.y }).toEqual({ x: stopped.x, y: stopped.y });
});

test('Escape in the Play_Area saves progress and returns to the menu', async ({ page }) => {
  await seedSave(page);
  await openClocktower(page);
  const savedBefore = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').lastUpdatedAt, PROGRESS_KEY);
  await tabToPlayArea(page);
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await ghost(page)).moving).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  await page.keyboard.up('ArrowRight');
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), PROGRESS_KEY);
  expect(saved.lastUpdatedAt).toBeGreaterThan(savedBefore);
  expect(saved.currentRoom).toBe('clocktower');
});

for (const viewport of [
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
  { width: 1024, height: 600 },
]) {
  test(`Emergency Exit is visible and within 5 Shift+Tab presses at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openCourtyardPreview(page);
    const exit = page.getByTestId('emergency-exit');
    await expect(exit).toBeInViewport();
    const box = (await exit.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    await tabToPlayArea(page);
    let presses = 0;
    while (presses < 5) {
      presses += 1;
      await page.keyboard.press('Shift+Tab');
      if (await exit.evaluate((element) => element === document.activeElement)) break;
    }
    await expect(exit).toBeFocused();
    expect(presses).toBeLessThanOrEqual(5);
    // The Play_Area never captured Tab or Shift+Tab.
    expect(await playArea(page).evaluate((element) => element === document.activeElement)).toBe(false);
  });
}

test('Emergency Exit still returns to the menu when storage throws', async ({ page }) => {
  await seedSave(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openClocktower(page);
  // Now every write throws, as when storage is full or blocked.
  await page.evaluate(() => {
    Storage.prototype.setItem = function setItem() {
      throw new DOMException('Storage is unavailable', 'QuotaExceededError');
    };
  });
  await tabToPlayArea(page);
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await ghost(page)).moving).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  await page.keyboard.up('ArrowRight');
  expect(errors).toEqual([]);
});

test('Escape on the room heading, before the Play_Area is used, also exits', async ({ page }) => {
  await openCourtyardPreview(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  await expect(page.getByTestId('play-area')).toHaveCount(0);
});
