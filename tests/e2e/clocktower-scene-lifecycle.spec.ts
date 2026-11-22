/**
 * Scene lifecycle: one canvas per entry, none after leaving, and no Phaser request
 * from the menu or the Door_Selector (Requirements 2.7, 2.8, 2.9, 25.5).
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from './fixtures';
import {
  ghost,
  openClocktower,
  playArea,
  seedSave,
  tabToPlayArea,
  waitForScene,
} from './helpers/clocktower';

const PHASER_REQUEST = /phaser|createWorldScene/i;

test('enters, leaves, and enters again with one canvas at a time', async ({ page }) => {
  await seedSave(page);
  const phaserRequests: string[] = [];
  page.on('request', (request) => {
    if (PHASER_REQUEST.test(request.url())) phaserRequests.push(request.url());
  });

  await page.goto('/?built=clocktower');
  // The menu and the Door_Selector do not request the Phaser chunk.
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  await page.getByTestId('start-challenge').click();
  await expect(page.getByRole('heading', { name: 'Choose a door' })).toBeFocused();
  await expect(page.getByTestId('door-clocktower')).toHaveAttribute('data-state', 'available');
  await page.waitForTimeout(500);
  expect(phaserRequests).toEqual([]);

  // First entry: exactly one canvas in the Play_Area.
  await page.getByTestId('enter-clocktower').click();
  await waitForScene(page);
  await expect(page.locator('[data-testid="play-area"] canvas')).toHaveCount(1);
  expect(phaserRequests.length).toBeGreaterThan(0);

  // Leave: no World_Scene canvas anywhere in the document.
  await page.getByTestId('emergency-exit').click();
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  await expect(page.locator('[data-testid="world-scene-holder"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="play-area"]')).toHaveCount(0);

  // Enter again: still exactly one.
  await page.getByTestId('start-challenge').click();
  await waitForScene(page);
  await expect(page.locator('[data-testid="play-area"] canvas')).toHaveCount(1);
  await expect(page.locator('[data-testid="world-scene-holder"] canvas')).toHaveCount(1);

  // Back to the doors and out again, then the count is zero once more.
  await page.getByTestId('tools-doors').click();
  await expect(page.getByRole('heading', { name: 'Choose a door' })).toBeFocused();
  await expect(page.locator('[data-testid="world-scene-holder"]')).toHaveCount(0);
  await page.getByTestId('enter-clocktower').click();
  await waitForScene(page);
  await expect(page.locator('[data-testid="play-area"] canvas')).toHaveCount(1);
});

// Regression (cp3-prepublish trace of clocktower-route.spec.ts:43): leaving the Courtyard
// before its slow images arrived left the canvas blank until those superseded images
// finished, even though every Graveyard image had already loaded.
//
// Delivery is deterministic in this test only: every adventure PNG is served from
// public/adventure with route.fulfill, so a slow dev server cannot delay the Graveyard's
// own images. The two Courtyard-only images are held until after the spawn assertion.
const ADVENTURE_DIR = path.join(process.cwd(), 'public', 'adventure');
const HELD_IMAGES = new Set(['props/lantern-post.png', 'props/stone-well.png']);

test('the next Area draws as soon as its own images load, not after a superseded Area', async ({ page }) => {
  test.setTimeout(90_000);
  const heldRequested = new Set<string>();
  const heldServed = new Set<string>();
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/adventure\/.+\.png(\?.*)?$/, async (route) => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname.replace(/^.*?\/adventure\//, ''));
    const file = path.join(ADVENTURE_DIR, rel);
    if (!file.startsWith(ADVENTURE_DIR + path.sep)) {
      await route.abort().catch(() => undefined);
      return;
    }
    const body = await readFile(file);
    if (HELD_IMAGES.has(rel)) {
      heldRequested.add(rel);
      await held;
      heldServed.add(rel);
    }
    await route.fulfill({ status: 200, contentType: 'image/png', body }).catch(() => undefined);
  });

  try {
    await seedSave(page);
    await openClocktower(page);

    await tabToPlayArea(page);
    await page.keyboard.down('ArrowRight');
    try {
      await expect(playArea(page)).toHaveAttribute('data-area', 'courtyard', { timeout: 20_000 });
    } finally {
      await page.keyboard.up('ArrowRight');
    }
    await page.getByRole('button', { name: 'Light the lantern post' }).click();
    await page.getByRole('button', { name: 'Go to the Overgrown Graveyard' }).click();
    await expect(playArea(page)).toHaveAttribute('data-area', 'graveyard');

    // The scene reports the Graveyard spawn while the held images are still pending.
    await expect
      .poll(async () => {
        const g = await ghost(page);
        return { x: g.x, y: g.y };
      }, { timeout: 15_000 })
      .toEqual({ x: 100, y: 360 });
    // The hold was exercised: both images were requested and neither was served yet.
    expect([...heldRequested].sort()).toEqual([...HELD_IMAGES].sort());
    expect([...heldServed]).toEqual([]);
  } finally {
    release();
  }
});

test('the canvas is hidden from assistive technology and cannot take focus', async ({ page }) => {
  await seedSave(page);
  await page.goto('/?built=clocktower');
  await page.getByTestId('start-challenge').click();
  await page.getByTestId('enter-clocktower').click();
  await waitForScene(page);
  const holder = page.getByTestId('world-scene-holder');
  await expect(holder).toHaveAttribute('aria-hidden', 'true');
  await expect(holder.locator('canvas')).toHaveAttribute('tabindex', '-1');
  // The Play_Area is named, and no role-based query finds the canvas inside it.
  await expect(page.getByRole('application', { name: 'Clocktower Gate play area' })).toBeVisible();
  await expect(page.getByRole('application').locator('canvas')).toHaveCount(1);
  expect(await page.getByRole('application').getByRole('img').count()).toBe(0);
});
