/**
 * Axe scans of the Clocktower view (Requirement 25.10, courtyard part).
 * The Challenge_Sandbox is excluded from shell scans; the Belfry sandbox has its own scan.
 */
import { expect, test, type Page } from './fixtures';
import AxeBuilder from './helpers/axe';
import {
  LANTERN_LIT_MESSAGE,
  openClocktower,
  openCourtyardPreview,
  openSeededBelfry,
  playArea,
  roomStatus,
  seedBelfrySave,
  seedSave,
} from './helpers/clocktower';

async function scan(page: Page) {
  return new AxeBuilder({ page }).exclude('[data-testid="challenge-sandbox"]').analyze();
}

test('the courtyard has no axe violations before and after the lantern is lit', async ({ page }) => {
  await openCourtyardPreview(page);
  expect((await scan(page)).violations).toEqual([]);

  await page.getByRole('button', { name: 'Light the lantern post' }).click();
  await expect(roomStatus(page)).toHaveText(LANTERN_LIT_MESSAGE);
  expect((await scan(page)).violations).toEqual([]);
});

test('the courtyard has no axe violations while the map is unavailable', async ({ page }) => {
  await page.route('**/phaser*', (route) => route.abort());
  await page.route('**/WorldScene/phaser/**', (route) => route.abort());
  // The lazy chunk's name in a build.
  await page.route('**/assets/createWorldScene-*.js', (route) => route.abort());
  await page.goto('/?preview=courtyard');
  await expect(playArea(page)).toHaveAttribute('data-scene-state', 'failed', { timeout: 20_000 });
  expect((await scan(page)).violations).toEqual([]);
});

test('the courtyard has no axe violations at a phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openCourtyardPreview(page);
  expect((await scan(page)).violations).toEqual([]);
});

// Checkpoint 2: the route Areas through the development built override (task 19.4).
test('the Apothecary Exit, Graveyard, and Passage have no axe violations', async ({ page }) => {
  // Four scans and three Area loads.
  test.setTimeout(90_000);
  await seedSave(page);
  await openClocktower(page);
  await expect(playArea(page)).toHaveAttribute('data-area', 'apothecary-exit');
  expect((await scan(page)).violations).toEqual([]);

  await page.getByRole('button', { name: 'Go to the Moonlit Courtyard' }).click();
  await page.getByRole('button', { name: 'Light the lantern post' }).click();
  await page.getByRole('button', { name: 'Go to the Overgrown Graveyard' }).click();
  await expect(playArea(page)).toHaveAttribute('data-area', 'graveyard');
  await page.getByRole('button', { name: 'Read the Moon plaque' }).click();
  expect((await scan(page)).violations).toEqual([]);

  await page.getByRole('button', { name: 'Read the Thorn plaque' }).click();
  await page.getByRole('button', { name: 'Read the Key plaque' }).click();
  await page.getByRole('button', { name: 'Go to the Clockworks Passage' }).click();
  await expect(playArea(page)).toHaveAttribute('data-area', 'passage');
  expect((await scan(page)).violations).toEqual([]);

  await page.getByRole('button', { name: 'Open the clockworks gate' }).click();
  await expect(page.getByTestId('route-shortcut-courtyard')).toBeVisible();
  expect((await scan(page)).violations).toEqual([]);
});

// Checkpoint 3 (task 25.4): the Belfry with the bell controls shown.
test('the Belfry shell has no axe violations with the bell controls shown and the dialog open', async ({ page }) => {
  await seedBelfrySave(page);
  await openSeededBelfry(page);
  await expect(page.getByTestId('belfry-section')).toBeVisible();
  expect((await scan(page)).violations).toEqual([]);

  await page.getByTestId('bell-control-moon').click();
  await expect(page.getByTestId('defect-bell-focus')).toHaveAttribute('data-open', 'true');
  expect((await scan(page)).violations).toEqual([]);
});

test('the Belfry shell has no axe violations at a phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await seedBelfrySave(page);
  await openSeededBelfry(page);
  expect((await scan(page)).violations).toEqual([]);
});

test('the Belfry sandbox shows the bell focus defect before the repair and clears it after', async ({ page }) => {
  test.setTimeout(60_000);
  await seedBelfrySave(page);
  await openSeededBelfry(page);
  const sandboxScan = () => new AxeBuilder({ page }).include('[data-testid="challenge-sandbox"]').analyze();
  // axe has no rule for focus entry and return, so a live focus probe shows the defect.
  const probe = async () => {
    await page.getByTestId('bell-control-moon').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('defect-bell-focus')).toHaveAttribute('data-open', 'true');
    const entered = await page.evaluate(
      () => document.querySelector('[data-testid="defect-bell-focus"]')?.contains(document.activeElement) === true
    );
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('defect-bell-focus')).toHaveAttribute('data-open', 'false');
    const returned = await page.evaluate(
      () => document.activeElement?.getAttribute('data-testid') === 'bell-control-moon'
    );
    return { entered, returned };
  };

  expect(await probe()).toEqual({ entered: false, returned: false });
  expect((await sandboxScan()).violations.map((v) => v.id)).toEqual([]);

  await page.getByTestId('inspect-bell-focus').click();
  await page.getByTestId('repair-bell-focus').click();
  await expect(page.getByTestId('bell-control-moon')).toBeFocused({ timeout: 10_000 });
  expect(await probe()).toEqual({ entered: true, returned: true });
  expect((await sandboxScan()).violations).toEqual([]);
});

test('the Graveyard has no axe violations at a phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await seedSave(page);
  await openClocktower(page);
  await page.getByRole('button', { name: 'Go to the Moonlit Courtyard' }).click();
  await page.getByRole('button', { name: 'Light the lantern post' }).click();
  await page.getByRole('button', { name: 'Go to the Overgrown Graveyard' }).click();
  await expect(playArea(page)).toHaveAttribute('data-area', 'graveyard');
  expect((await scan(page)).violations).toEqual([]);
});
