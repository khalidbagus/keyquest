/**
 * Courtyard preview entry: identical state each time, nothing written to storage,
 * a visible label, discarded on exit (Requirements 4.1, 4.3, 4.4, 4.6, 4.7).
 */
import { expect, test, type Page } from './fixtures';
import {
  LANTERN_LIT_MESSAGE,
  PROGRESS_KEY,
  ghost,
  openCourtyardPreview,
  playArea,
  roomStatus,
  seedSave,
} from './helpers/clocktower';

const storedValue = (page: Page) => page.evaluate((key) => localStorage.getItem(key), PROGRESS_KEY);

async function snapshotOf(page: Page) {
  return {
    ghost: await ghost(page),
    lantern: await playArea(page).getAttribute('data-lantern'),
    area: await playArea(page).getAttribute('data-area'),
    objective: await page.getByTestId('route-objective').textContent(),
    status: await roomStatus(page).textContent(),
  };
}

test('opens the same initial state on every activation', async ({ page }) => {
  await openCourtyardPreview(page);
  const first = await snapshotOf(page);
  expect(first.lantern).toBe('false');
  expect(first.area).toBe('courtyard');
  expect({ x: first.ghost.x, y: first.ghost.y }).toEqual({ x: 120, y: 420 });

  // Change the world, then activate the preview again.
  await page.getByRole('button', { name: 'Light the lantern post' }).click();
  await openCourtyardPreview(page);
  expect(await snapshotOf(page)).toEqual(first);
});

test('opens with the potion held even when no save exists', async ({ page }) => {
  await openCourtyardPreview(page);
  await expect(page.getByRole('button', { name: 'Light the lantern post' })).toBeVisible();
});

test('shows a visible preview label with readable contrast', async ({ page }) => {
  await openCourtyardPreview(page);
  const label = page.getByTestId('preview-label');
  await expect(label).toBeVisible();
  await expect(label).toHaveText(/Courtyard preview\. Progress is not saved\./);
  const colors = await label.evaluate((el) => {
    const style = getComputedStyle(el);
    return { color: style.color, background: style.backgroundColor };
  });
  // Lantern gold on the deep plum background, well above 4.5:1.
  expect(colors).toEqual({ color: 'rgb(251, 191, 36)', background: 'rgb(17, 12, 27)' });
  expect(await label.evaluate((el) => !!el.closest('[data-testid="play-area"]'))).toBe(false);
});

test('writes nothing to storage when none existed, even after play and exit', async ({ page }) => {
  await openCourtyardPreview(page);
  expect(await storedValue(page)).toBeNull();
  await page.getByRole('button', { name: 'Light the lantern post' }).click();
  await expect(roomStatus(page)).toHaveText(LANTERN_LIT_MESSAGE);
  // Longer than the 500 ms autosave debounce.
  await page.waitForTimeout(1200);
  expect(await storedValue(page)).toBeNull();
  await page.getByTestId('emergency-exit').click();
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  await page.waitForTimeout(800);
  expect(await storedValue(page)).toBeNull();
});

test('leaves an existing save byte-identical and restores it on exit', async ({ page }) => {
  await seedSave(page);
  await page.goto('/');
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  const before = await storedValue(page);
  expect(before).not.toBeNull();

  await page.goto('/?preview=courtyard');
  await expect(playArea(page)).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Light the lantern post' }).click();
  await page.waitForTimeout(1200);
  expect(await storedValue(page)).toBe(before);

  // Escape ends the preview without saving.
  await playArea(page).focus();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  await page.waitForTimeout(800);
  expect(await storedValue(page)).toBe(before);
  // The real save is back in the menu.
  await expect(page.getByTestId('start-challenge')).toHaveText(/Resume/);
});

test('removes the parameter, and a reload returns to the menu without the preview', async ({ page }) => {
  await openCourtyardPreview(page);
  expect(new URL(page.url()).searchParams.has('preview')).toBe(false);
  await page.reload();
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  await expect(playArea(page)).toHaveCount(0);
  await expect(page.getByTestId('preview-label')).toHaveCount(0);
});

test('does not offer the door list from the preview', async ({ page }) => {
  await openCourtyardPreview(page);
  await expect(page.getByTestId('tools-doors')).toHaveCount(0);
});
