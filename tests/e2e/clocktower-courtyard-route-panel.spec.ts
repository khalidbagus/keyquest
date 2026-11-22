/**
 * Courtyard completed from the Route_Panel only (Requirements 25.3 and 25.11).
 */
import { expect, test } from './fixtures';
import { LANTERN_LIT_MESSAGE, openCourtyardPreview, playArea, roomStatus } from './helpers/clocktower';

test('lights the lantern with Route_Panel buttons only', async ({ page }) => {
  await openCourtyardPreview(page);
  const button = page.getByRole('button', { name: 'Light the lantern post' });
  await expect(button).toBeVisible();
  // No key input to the Play_Area and no pointer input on the canvas.
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(roomStatus(page)).toHaveText(LANTERN_LIT_MESSAGE);
  await expect(playArea(page)).toHaveAttribute('data-lantern', 'true');
  await expect(button).toHaveCount(0);
  // The button is gone, so focus moves to the Route_Panel heading.
  await expect(page.getByRole('heading', { name: 'Route panel' })).toBeFocused();
  // Pressing the same action again would be a repeat; the button no longer exists.
  await expect(page.getByTestId('route-area')).toContainText('Moonlit Courtyard');
  await expect(page.getByTestId('route-landmarks')).toContainText('Yew tree');
});

test('the route panel lists the area and landmarks as text', async ({ page }) => {
  await openCourtyardPreview(page);
  await expect(page.getByTestId('route-area')).toHaveText('Area: Moonlit Courtyard');
  await expect(page.getByTestId('route-nearby')).toHaveText('Nearby: nothing');
  await expect(page.getByTestId('route-objective')).toContainText('Light the courtyard lantern');
});

test('when the Phaser module is blocked, the failure is named and the route finishes in the Route_Panel', async ({
  page,
}) => {
  await page.route('**/phaser*', (route) => route.abort());
  await page.route('**/WorldScene/phaser/**', (route) => route.abort());
  // The lazy chunk's name in a build.
  await page.route('**/assets/createWorldScene-*.js', (route) => route.abort());
  await page.goto('/?preview=courtyard');
  await expect(page.getByRole('heading', { name: 'Clocktower Gate', level: 2 })).toBeFocused();
  await expect(playArea(page)).toHaveAttribute('data-scene-state', 'failed', { timeout: 20_000 });
  await expect(page.getByTestId('scene-status')).toContainText('The map could not load');
  await expect(page.getByTestId('scene-status')).toContainText('Phaser module');
  await expect(roomStatus(page)).toContainText('visual map is unavailable');
  // Every landmark is listed while the scene is not running.
  await expect(page.getByTestId('route-landmarks')).toContainText('Yew tree');
  await expect(page.getByTestId('route-landmarks')).toContainText('Stone well');
  await page.getByRole('button', { name: 'Light the lantern post' }).click();
  await expect(roomStatus(page)).toHaveText(LANTERN_LIT_MESSAGE);
  // The Emergency Exit still works.
  await page.getByTestId('emergency-exit').click();
  await expect(page.getByTestId('start-challenge')).toBeVisible();
});

test('the Route_Panel button works while the map is still loading', async ({ page }) => {
  // Hold the scene module until the click, so the map is genuinely loading.
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/WorldScene/phaser/createWorldScene*', async (route) => {
    await held;
    await route.continue();
  });
  await page.goto('/?preview=courtyard');
  await expect(page.getByTestId('scene-status')).toContainText('Loading the map');
  await page.getByRole('button', { name: 'Light the lantern post' }).click();
  await expect(roomStatus(page)).toHaveText(LANTERN_LIT_MESSAGE);
  release();
  await expect(playArea(page)).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  // The scene starts from the state that was already lit.
  await expect(playArea(page)).toHaveAttribute('data-lantern', 'true');
  await expect(page.getByTestId('scene-status')).toHaveText('');
});
