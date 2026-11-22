/**
 * Reduced motion gives the same route and outcome (Requirement 25.4).
 * Also covers 7.7, 12.1, 12.2.
 */
import { expect, test, type Browser, type Page } from './fixtures';
import {
  COURTYARD,
  LANTERN_LIT_MESSAGE,
  ghost,
  holdKey,
  holdKeyIntoWall,
  openCourtyardPreview,
  playArea,
  roomStatus,
  tabToPlayArea,
  walkToLantern,
} from './helpers/clocktower';

// Each test plays the courtyard twice (reduced and normal) in real time.
test.setTimeout(120_000);

interface RunResult {
  status: string;
  wall: { x: number; y: number };
  lantern: string | null;
}

/** The same input sequence: north to the wall, then to the lantern, then Enter. */
async function playCourtyard(page: Page): Promise<RunResult> {
  await tabToPlayArea(page);
  await holdKeyIntoWall(page, 'ArrowUp', { axis: 'y', value: COURTYARD.northWallAnchorY, direction: 'up' }, 500);
  const wall = await ghost(page);
  await page.keyboard.down('ArrowDown');
  await page.waitForFunction(
    () => Number(document.querySelector('[data-testid="play-area"]')?.getAttribute('data-ghost-y')) >= 410,
    undefined,
    { polling: 'raf' }
  );
  await page.keyboard.up('ArrowDown');
  await walkToLantern(page);
  await page.keyboard.press('Enter');
  await expect(roomStatus(page)).toHaveText(LANTERN_LIT_MESSAGE);
  return {
    status: (await roomStatus(page).textContent()) ?? '',
    wall: { x: wall.x, y: wall.y },
    lantern: await playArea(page).getAttribute('data-lantern'),
  };
}

/** The reference run with the Reduced_Motion_Setting off, in its own context. */
async function normalRun(browser: Browser): Promise<RunResult> {
  const context = await browser.newContext({ reducedMotion: 'no-preference' });
  const page = await context.newPage();
  try {
    await openCourtyardPreview(page);
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false');
    return await playCourtyard(page);
  } finally {
    await context.close();
  }
}

/** The camera for a Ghost position with no easing: centered, clamped to the map. */
function expectedCamera(ghostPos: { x: number; y: number }, view: { w: number; h: number }) {
  const clamp = (value: number, size: number, length: number) =>
    size >= length ? (length - size) / 2 : Math.min(Math.max(value, 0), length - size);
  return {
    x: clamp(ghostPos.x - view.w / 2, view.w, COURTYARD.width),
    y: clamp(ghostPos.y + COURTYARD.cameraOffsetY - view.h / 2, view.h, COURTYARD.height),
  };
}

async function expectExactCamera(page: Page) {
  const view = await page.getByTestId('world-scene-holder').evaluate((el) => ({
    w: el.getBoundingClientRect().width,
    h: el.getBoundingClientRect().height,
  }));
  // Sample a few positions while idle and moving: the camera never lags the Ghost.
  for (let i = 0; i < 4; i += 1) {
    const info = await ghost(page);
    const expected = expectedCamera(info, view);
    expect(Math.abs(info.cameraX - expected.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(info.cameraY - expected.y)).toBeLessThanOrEqual(1);
    await page.waitForTimeout(80);
  }
}

test.describe('system reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('gives the same outcome as a normal run and places the camera exactly', async ({ page, browser }) => {
    // The reference run goes first, in its own context that is closed before this page loads.
    const normal = await normalRun(browser);
    await openCourtyardPreview(page);
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
    await tabToPlayArea(page);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(500);
    await expectExactCamera(page);
    await page.keyboard.up('ArrowRight');
    await expectExactCamera(page);

    // Start again from the spawn, then play the same sequence as the normal run.
    await openCourtyardPreview(page);
    const reduced = await playCourtyard(page);
    expect(reduced).toEqual(normal);
    expect(reduced.lantern).toBe('true');
  });
});

test('footer toggle alone gives the same outcome as a normal run', async ({ page, browser }) => {
  const normal = await normalRun(browser);
  await openCourtyardPreview(page);
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false');
  await page.getByTestId('reduced-motion-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');

  await tabToPlayArea(page);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await expectExactCamera(page);
  await page.keyboard.up('ArrowRight');

  // Start again from the spawn with the toggle still on.
  await page.goto('/?preview=courtyard');
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  await expect(playArea(page)).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  const toggled = await playCourtyard(page);
  expect(toggled).toEqual(normal);
});

test('turning reduced motion on while the scene runs keeps the position and state', async ({ page }) => {
  await openCourtyardPreview(page);
  await tabToPlayArea(page);
  await holdKey(page, 'ArrowRight', 400);
  const before = await ghost(page);
  await page.getByTestId('reduced-motion-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  await page.waitForTimeout(300);
  const after = await ghost(page);
  expect({ x: after.x, y: after.y, facing: after.facing }).toEqual({
    x: before.x,
    y: before.y,
    facing: before.facing,
  });
  await expect(playArea(page)).toHaveAttribute('data-lantern', 'false');
});
