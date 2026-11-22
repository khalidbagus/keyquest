/**
 * Courtyard played with the touch controls only, at 375 x 667 with touch emulation
 * (Requirement 25.2). Also covers 9.1, 9.2, 9.3, 9.7, 9.9.
 */
import { expect, test } from './fixtures';
import {
  LANTERN_LIT_MESSAGE,
  ghost,
  openCourtyardPreview,
  playArea,
  roomStatus,
  touchEvent,
  waitForNearbyLantern,
} from './helpers/clocktower';

test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });

const BUTTONS = ['touch-up', 'touch-down', 'touch-left', 'touch-right', 'touch-interact'] as const;

test('plays the courtyard with the touch controls only', async ({ page }) => {
  await openCourtyardPreview(page);

  // Every button is at least 44 x 44 and no two overlap.
  const boxes = [];
  for (const id of BUTTONS) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box, id).not.toBeNull();
    expect(box!.width, `${id} width`).toBeGreaterThanOrEqual(44);
    expect(box!.height, `${id} height`).toBeGreaterThanOrEqual(44);
    boxes.push({ id, ...box! });
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      const overlap = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
    }
  }

  // Each button has a unique, text accessible name.
  const names = [];
  for (const id of BUTTONS) names.push(await page.getByTestId(id).evaluate((el) => el.textContent?.trim()));
  expect(names).toEqual(['▲Move up', '▼Move down', '◀Move left', '▶Move right', '✦Interact']);

  // No horizontal overflow, and the objective is on screen.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await expect(page.getByTestId('room-objective')).toBeVisible();

  // After the Play_Area is scrolled into view, it and the controls fit in the viewport together.
  await playArea(page).evaluate((element) => element.scrollIntoView({ block: 'start' }));
  const area = (await playArea(page).boundingBox())!;
  const controls = (await page.getByTestId('touch-controls').boundingBox())!;
  expect(area.y).toBeGreaterThanOrEqual(0);
  expect(controls.y + controls.height).toBeLessThanOrEqual(667);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  // The touch group blocks scroll, selection, and the context menu on itself only.
  const group = await page.getByTestId('touch-controls').evaluate((el) => {
    const style = getComputedStyle(el);
    return { touchAction: style.touchAction, userSelect: style.userSelect };
  });
  expect(group).toEqual({ touchAction: 'none', userSelect: 'none' });
  expect(await playArea(page).evaluate((el) => getComputedStyle(el).touchAction)).not.toBe('none');

  // A pointer hold moves the Ghost, and releasing stops it. Touch works without Play_Area focus.
  const start = await ghost(page);
  const right = page.getByTestId('touch-right');
  await touchEvent(right, 'pointerdown');
  await expect.poll(async () => (await ghost(page)).x, { timeout: 5000 }).toBeGreaterThan(start.x + 40);
  await waitForNearbyLantern(page);
  await touchEvent(right, 'pointerup');
  await expect.poll(async () => (await ghost(page)).moving).toBe(false);
  expect((await ghost(page)).facing).toBe('east');

  // Interact at the lantern post lights it.
  await expect(page.getByTestId('route-nearby')).toContainText('Lantern post');
  await page.getByTestId('touch-interact').tap();
  await expect(roomStatus(page)).toHaveText(LANTERN_LIT_MESSAGE);
});

test('a pointer that leaves or is cancelled stops the Ghost', async ({ page }) => {
  await openCourtyardPreview(page);
  const right = page.getByTestId('touch-right');
  for (const end of ['pointerout', 'pointercancel'] as const) {
    const before = await ghost(page);
    await touchEvent(right, 'pointerdown');
    await expect.poll(async () => (await ghost(page)).x).toBeGreaterThan(before.x + 10);
    await touchEvent(right, end);
    await expect.poll(async () => (await ghost(page)).moving).toBe(false);
  }
});

test('Interact with nothing nearby says nothing is close enough', async ({ page }) => {
  await openCourtyardPreview(page);
  await page.getByTestId('touch-interact').tap();
  await expect(roomStatus(page)).toContainText('Nothing is close enough');
});
