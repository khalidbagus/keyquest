/**
 * Save schema version 3 in the browser: migration from a seeded version 2 save,
 * a Clocktower reset that keeps the other rooms, cancel, and Start over.
 * Requirements: 16.1, 16.2, 17.3, 17.5, 17.7, 17.8
 */
import { expect, test, type Page } from './fixtures';
import { PROGRESS_KEY, openClocktower, playArea, roomStatus, seedSave } from './helpers/clocktower';

// Each test loads up to three Areas.
test.setTimeout(60_000);

async function stored(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), PROGRESS_KEY);
}

/** Courtyard, lantern, graveyard, and the Moon Clue through the Route_Panel. */
async function makeProgress(page: Page) {
  await page.getByRole('button', { name: 'Go to the Moonlit Courtyard' }).click();
  await page.getByRole('button', { name: 'Light the lantern post' }).click();
  await page.getByRole('button', { name: 'Go to the Overgrown Graveyard' }).click();
  await page.getByRole('button', { name: 'Read the Moon plaque' }).click();
  await expect(roomStatus(page)).toContainText('1 of 3 clues found');
  // The autosave runs 500 ms after a change.
  await expect.poll(async () => (await stored(page))?.clocktower?.cluesFound).toEqual(['moon']);
}

test('migrates a seeded version 2 save to version 3 and keeps the Checkout and Pantry', async ({ page }) => {
  await seedSave(page);
  await page.goto('/?built=clocktower');
  const before = await stored(page);
  expect(before.version).toBe(2);
  expect(before.clocktower).toBeUndefined();

  await page.getByTestId('start-challenge').click();
  await page.getByTestId('enter-clocktower').click();
  await expect(playArea(page)).toHaveAttribute('data-area', 'apothecary-exit');
  await expect.poll(async () => (await stored(page))?.version).toBe(3);
  const after = await stored(page);
  expect(after.checkout).toEqual(before.checkout);
  expect(after.pantry).toEqual(before.pantry);
  expect(after.defects['color-only-ingredients']).toEqual(before.defects['color-only-ingredients']);
  expect(after.defects['bell-dialog-focus']).toMatchObject({ discovered: false, repaired: false, verified: false });
  expect(after.clocktower).toMatchObject({ lanternLit: false, cluesFound: [], gateOpen: false });
});

test('a confirmed Clocktower reset clears only the route; a cancelled one changes nothing', async ({ page }) => {
  await seedSave(page);
  await openClocktower(page);
  await makeProgress(page);
  const before = await stored(page);

  // Cancel leaves everything, including the Ghost's Area.
  await page.getByTestId('reset-button').click();
  await page.getByRole('button', { name: /cancel/i }).click();
  await expect(playArea(page)).toHaveAttribute('data-area', 'graveyard');
  await page.waitForTimeout(700);
  expect(await stored(page)).toEqual(before);

  // Confirm clears the route and saves at once.
  await page.getByTestId('reset-button').click();
  await page.getByTestId('reset-confirm').click();
  await expect(roomStatus(page)).toHaveText(
    'The Clocktower room was reset. You are back at the Apothecary Exit with the lantern unlit and no clues found.'
  );
  await expect(playArea(page)).toHaveAttribute('data-area', 'apothecary-exit');
  const after = await stored(page);
  expect(after.clocktower).toEqual({
    checkpoints: [],
    lastCheckpoint: null,
    lanternLit: false,
    cluesFound: [],
    gateOpen: false,
    shortcutUnlocked: false,
    bellRings: [],
    lightsRestored: false,
  });
  expect(after.checkout).toEqual(before.checkout);
  expect(after.pantry).toEqual(before.pantry);
  expect(after.pantry.potionTaken).toBe(true);
});

test('Start over clears every room, including the route', async ({ page }) => {
  await seedSave(page);
  await openClocktower(page);
  await makeProgress(page);
  await page.getByTestId('emergency-exit').click();
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  // Cancelling Start over keeps the save.
  const kept = await stored(page);
  await page.getByTestId('start-fresh').click();
  await page.getByTestId('start-over-cancel').click();
  expect(await stored(page)).toEqual(kept);
  await page.getByTestId('start-fresh').click();
  await page.getByTestId('start-over-confirm').click();
  await expect.poll(async () => {
    const saved = await stored(page);
    return saved === null || (saved.clocktower?.lanternLit === false && saved.pantry?.potionTaken === false);
  }).toBe(true);
});
