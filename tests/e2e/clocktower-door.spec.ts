/**
 * The Clocktower door, published (Task 26), with and without the development built override.
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.9, 18.1, 18.2, 18.4, 18.5
 */
import { expect, test } from './fixtures';
import { seedSave, waitForScene } from './helpers/clocktower';

test('without the override and with the potion, the published door is Open and enters the room', async ({ page }) => {
  await seedSave(page);
  await page.goto('/');
  await page.getByTestId('start-challenge').click();
  await expect(page.getByRole('heading', { name: 'Choose a door' })).toBeFocused();
  const door = page.getByTestId('door-clocktower');
  await expect(door).toHaveAttribute('data-state', 'available');
  await expect(door).toContainText('Open');
  await expect(door).not.toContainText('Coming later');
  await page.getByTestId('enter-clocktower').click();
  await waitForScene(page);
  await expect(page.getByRole('heading', { name: 'Clocktower Gate', level: 2 })).toBeFocused();
});

test('without the override and without the potion, the published door reads Locked and names the potion', async ({ page }) => {
  await seedSave(page, { pantry: { cauldron: [], brewed: false, potionTaken: false } });
  await page.goto('/');
  await page.getByTestId('start-challenge').click();
  await page.getByTestId('tools-doors').click();
  await expect(page.getByRole('heading', { name: 'Choose a door' })).toBeFocused();
  const door = page.getByTestId('door-clocktower');
  await expect(door).toHaveAttribute('data-state', 'locked');
  await expect(door).toContainText('Locked');
  await expect(door).toContainText('Needs the lantern potion from the Potion Pantry.');
  await expect(page.getByTestId('enter-clocktower')).toHaveCount(0);
});

test('with the override and no potion the door reads Locked and names the potion', async ({ page }) => {
  // The Pantry is open but the potion is not bottled yet.
  await seedSave(page, { pantry: { cauldron: [], brewed: false, potionTaken: false } });
  await page.goto('/?built=clocktower');
  await page.getByTestId('start-challenge').click();
  await page.getByTestId('tools-doors').click();
  await expect(page.getByRole('heading', { name: 'Choose a door' })).toBeFocused();
  const door = page.getByTestId('door-clocktower');
  await expect(door).toHaveAttribute('data-state', 'locked');
  await expect(door).toContainText('Locked');
  await expect(door).toContainText('Needs the lantern potion from the Potion Pantry.');
  await expect(door).not.toContainText('later update');
  await expect(page.getByTestId('enter-clocktower')).toHaveCount(0);
});

test('with the override and the potion the door is Open, and entering focuses the room heading', async ({ page }) => {
  await seedSave(page);
  await page.goto('/?built=clocktower');
  await page.getByTestId('start-challenge').click();
  const door = page.getByTestId('door-clocktower');
  await expect(door).toHaveAttribute('data-state', 'available');
  await expect(door).toContainText('Open');
  await expect(page.locator('main')).not.toContainText('later update');
  await page.getByTestId('enter-clocktower').click();
  await waitForScene(page);
  await expect(page.getByRole('heading', { name: 'Clocktower Gate', level: 2 })).toBeFocused();
});
