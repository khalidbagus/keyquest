/**
 * Courtyard played with the keyboard only (Requirement 25.1).
 * Also covers 5.3, 6.1 to 6.6, 6.9, 6.10.
 */
import { expect, test } from './fixtures';
import {
  COURTYARD,
  LANTERN_LIT_MESSAGE,
  expectGhostStill,
  ghost,
  holdKey,
  holdKeyIntoWall,
  holdKeyUntil,
  openCourtyardPreview,
  playArea,
  roomStatus,
  tabToPlayArea,
  walkToLantern,
} from './helpers/clocktower';

// Walking the whole courtyard in real time takes a while at software-rendered frame rates.
test.setTimeout(90_000);

test('plays the courtyard with the keyboard only', async ({ page }) => {
  await openCourtyardPreview(page);

  // The Play_Area is reachable with Tab, has a name and a description, and shows the focus ring.
  await tabToPlayArea(page);
  await expect(playArea(page)).toHaveAttribute('aria-label', 'Clocktower Gate play area');
  await expect(playArea(page)).toHaveAccessibleDescription(/Arrow keys move\. Enter interacts\. Tab leaves/);
  const ring = await playArea(page).evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor, offset: style.outlineOffset };
  });
  expect(ring).toEqual({ style: 'solid', width: '3px', color: 'rgb(125, 211, 252)', offset: '2px' });

  // The Ghost starts at the spawn.
  const start = await ghost(page);
  expect({ x: start.x, y: start.y }).toEqual(COURTYARD.spawn);

  // Arrow keys never scroll the page.
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await holdKeyIntoWall(page, 'ArrowUp', { axis: 'y', value: COURTYARD.northWallAnchorY, direction: 'up' }, 2000);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

  // Holding toward the north wall stops the Ghost flush with it.
  const atWall = await ghost(page);
  expect(atWall.y).toBe(COURTYARD.northWallAnchorY);
  expect(atWall.x).toBe(COURTYARD.spawn.x);
  expect(atWall.facing).toBe('north');

  // Facing follows each key, including against the wall.
  for (const [key, facing] of [
    ['ArrowDown', 'south'],
    ['ArrowLeft', 'west'],
    ['ArrowRight', 'east'],
    ['ArrowUp', 'north'],
  ] as const) {
    await holdKey(page, key, 120);
    expect((await ghost(page)).facing).toBe(facing);
  }

  // Walk back down to the lantern lane and east until the lantern post is nearby.
  await holdKeyUntil(page, 'ArrowDown', { axis: 'y', atLeast: 410 });
  await walkToLantern(page);
  await expect(page.getByTestId('route-nearby')).toContainText('Lantern post (Light the lantern)');
  await expect(roomStatus(page)).toContainText('Lantern post is close');

  // Enter lights the lantern and opens the way.
  await page.keyboard.press('Enter');
  await expect(roomStatus(page)).toHaveText(LANTERN_LIT_MESSAGE);
  await expect(playArea(page)).toHaveAttribute('data-lantern', 'true');

  // Tab leaves the Play_Area and the Ghost stops, even with a key held.
  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await ghost(page)).moving).toBe(true);
  await page.keyboard.press('Tab');
  expect(await playArea(page).evaluate((element) => element === document.activeElement)).toBe(false);
  await expectGhostStill(page);
  await page.keyboard.up('ArrowLeft');
});

test('ignores keys while the Play_Area is not focused', async ({ page }) => {
  await openCourtyardPreview(page);
  const before = await ghost(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Enter');
  const after = await ghost(page);
  expect({ x: after.x, y: after.y, facing: after.facing }).toEqual({ x: before.x, y: before.y, facing: before.facing });
  await expect(page.getByTestId('room-progress')).toContainText('unlit');
});

test('Enter with nothing nearby says nothing is close enough and announces again on a repeat', async ({ page }) => {
  await openCourtyardPreview(page);
  await tabToPlayArea(page);
  await page.keyboard.press('Enter');
  await expect(roomStatus(page)).toContainText('Nothing is close enough');
  await page.keyboard.press('Enter');
  await expect(roomStatus(page)).toContainText('Nothing is close enough');
  await expect(playArea(page)).toHaveAttribute('data-lantern', 'false');
});

test('the closed east exit stops the Ghost and says the lantern must be lit', async ({ page }) => {
  await openCourtyardPreview(page);
  await tabToPlayArea(page);
  // East along the lantern lane until the south part of the east wall stops the Ghost,
  // then north into the gap, then east into the closed exit.
  await holdKeyUntil(page, 'ArrowRight', { axis: 'x', atLeast: 892 });
  await holdKeyUntil(page, 'ArrowUp', { axis: 'y', atMost: 370 });
  await holdKey(page, 'ArrowRight', 600);
  const stopped = await ghost(page);
  // Body right edge flush with the exit zone at x = 912, so the anchor is 892.
  expect(stopped.x).toBe(892);
  await expect(roomStatus(page)).toContainText('lantern must be lit');
});
