/**
 * One complete Checkout → Pantry playthrough from a fresh start, including
 * the door that opens from verified progress and a reload between rooms.
 */
import { test, expect } from './fixtures';
import { completeRoom, startRoom } from './helpers/room';
import { brewLanternPotion, repairShelf } from './helpers/pantry';

test('fresh start: Checkout earns the key, the Pantry door opens, the potion is brewed', async ({ page }) => {
  await startRoom(page);
  await expect(page.getByRole('heading', { name: 'Midnight Checkout', level: 2 })).toBeFocused();
  await completeRoom(page);

  await expect(page.getByRole('heading', { name: 'You earned the Pantry Key' })).toBeFocused();
  await expect(page.getByTestId('next-door')).toContainText('Your key opens it now');

  // Reload between rooms: the save resumes at the Pantry.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('keyquest-progress-v1') ?? '{}').checkout?.keyTaken)).toBe(true);
  await page.reload();
  await expect(page.getByTestId('start-challenge')).toHaveText(/Resume at the doors/);
  await page.getByTestId('start-challenge').click();
  await expect(page.getByRole('heading', { name: 'Choose a door' })).toBeFocused();
  await expect(page.getByTestId('door-checkout')).toHaveAttribute('data-state', 'cleared');
  await expect(page.getByTestId('door-pantry')).toHaveAttribute('data-state', 'available');
  await page.getByTestId('enter-pantry').click();

  await expect(page.getByRole('heading', { name: 'Potion Pantry', level: 2 })).toBeFocused();
  await expect(page.getByTestId('emergency-exit')).toBeVisible();
  await repairShelf(page);
  await brewLanternPotion(page);
  await page.getByTestId('bottle-potion').click();
  await expect(page.getByRole('heading', { name: 'You brewed the lantern potion' })).toBeFocused();
  await page.getByTestId('completion-doors').click();
  await expect(page.getByTestId('doors-progress')).toHaveText('2 of 3 rooms cleared');

  // Revisiting the Checkout shows it cleared, with its repairs still applied.
  await page.getByTestId('enter-checkout').click();
  await expect(page.getByTestId('room-objective')).toHaveAttribute('data-stage', 'cleared');
  await expect(page.getByTestId('defect-missing-name')).toHaveAccessibleName('View shopping cart');
  await page.getByTestId('back-to-doors').click();
  await expect(page.getByRole('heading', { name: 'Choose a door' })).toBeFocused();
});
