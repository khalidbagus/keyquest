import { expect, type Locator, type Page } from '../fixtures';

/**
 * Helpers for the Clocktower Gate specs.
 * Playwright gives every test a fresh browser context, so storage starts empty.
 * Specs that need a save seed it explicitly (`seedSave`), and no spec depends on test order.
 */

export const PROGRESS_KEY = 'keyquest-progress-v1';

const CHECKOUT = [
  'invisible-focus',
  'mouse-only-activation',
  'missing-accessible-name',
  'insufficient-contrast',
];

export interface GhostInfo {
  x: number;
  y: number;
  facing: string;
  moving: boolean;
  cameraX: number;
  cameraY: number;
}

/** Courtyard numbers from Route_Data that specs compare against. */
export const COURTYARD = {
  spawn: { x: 120, y: 420 },
  /** Anchor y when the body is flush against the north wall (96 + 24). */
  northWallAnchorY: 120,
  width: 960,
  height: 672,
  cameraOffsetY: -53,
};

export function playArea(page: Page): Locator {
  return page.getByTestId('play-area');
}

export function roomStatus(page: Page): Locator {
  return page.getByTestId('room-status');
}

/** Open `/?preview=courtyard` and wait for the scene, the heading focus, and the first Ghost frame. */
export async function openCourtyardPreview(page: Page) {
  await page.goto('/?preview=courtyard');
  await waitForScene(page);
}

export async function waitForScene(page: Page) {
  await expect(page.getByRole('heading', { name: 'Clocktower Gate', level: 2 })).toBeFocused();
  await expect(playArea(page)).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  await expect(playArea(page)).toHaveAttribute('data-ghost-x', /.+/);
}

/** Seed a version 2 save with the Checkout and Pantry cleared, so the Clocktower door is open. */
export async function seedSave(
  page: Page,
  extra: Record<string, unknown> = {},
  /** Defect states added on top of the cleared Checkout and Pantry curses. */
  extraDefects: Record<string, Record<string, unknown>> = {}
) {
  await page.addInitScript(
    ({ checkout, extra: more, extraDefects: moreDefects }) => {
      if (sessionStorage.getItem('keyquest-test-seeded')) return;
      const now = Date.now();
      const defects: Record<string, unknown> = {};
      const hintsUsed: Record<string, number> = {};
      for (const type of [...checkout, 'color-only-ingredients']) {
        defects[type] = {
          type,
          discovered: true,
          discoveredAt: now - 60000,
          repaired: true,
          repairedAt: now - 50000,
          verified: true,
          verifiedAt: now - 50000,
          hintLevel: 0,
        };
        hintsUsed[type] = 0;
      }
      for (const [type, patch] of Object.entries(moreDefects)) {
        defects[type] = {
          type,
          discovered: false,
          discoveredAt: null,
          repaired: false,
          repairedAt: null,
          verified: false,
          verifiedAt: null,
          hintLevel: 0,
          ...patch,
        };
        hintsUsed[type] = 0;
      }
      localStorage.setItem(
        'keyquest-progress-v1',
        JSON.stringify({
          version: 2,
          sessionId: 'clocktower-test',
          startedAt: now - 120000,
          lastUpdatedAt: now - 30000,
          currentRoom: 'pantry',
          defects,
          hintsUsed,
          checkout: { lanternLit: true, candleAdded: true, orderPlaced: true, keyTaken: true },
          pantry: { cauldron: ['moonpetal', 'ember-salt', 'glowcap'], brewed: true, potionTaken: true },
          isComplete: false,
          completedAt: null,
          ...more,
        })
      );
      sessionStorage.setItem('keyquest-test-seeded', '1');
    },
    { checkout: CHECKOUT, extra, extraDefects }
  );
}

/** A Clocktower_State with the route done up to the Belfry and no bell rung. */
export const BELFRY_STATE = {
  checkpoints: ['apothecary-exit', 'courtyard', 'graveyard', 'passage', 'belfry'],
  lastCheckpoint: 'belfry',
  lanternLit: true,
  cluesFound: ['moon', 'thorn', 'key'],
  gateOpen: true,
  shortcutUnlocked: true,
  bellRings: [] as string[],
  lightsRestored: false,
};

/**
 * Seed a save resumed in the Belfry, so bell specs skip the long walk. The bell
 * curse starts unfound, or already verified with `verified: true`.
 */
export async function seedBelfrySave(
  page: Page,
  options: { verified?: boolean; bellRings?: string[] } = {}
) {
  const now = Date.now();
  const bell = options.verified
    ? { discovered: true, discoveredAt: now - 40000, repaired: true, repairedAt: now - 30000, verified: true, verifiedAt: now - 30000 }
    : {};
  await seedSave(
    page,
    {
      version: 3,
      currentRoom: 'clocktower',
      clocktower: { ...BELFRY_STATE, bellRings: options.bellRings ?? [] },
    },
    { 'bell-dialog-focus': bell }
  );
}

/** Resume a seeded Belfry save from the opening screen with `?built=clocktower`. */
export async function openSeededBelfry(page: Page) {
  await page.goto('/?built=clocktower');
  await page.getByTestId('start-challenge').click();
  await waitForScene(page);
  await expect(playArea(page)).toHaveAttribute('data-area', 'belfry', { timeout: 20_000 });
}

/** The test id of the element that holds focus, or its tag name. */
export async function focusedTestId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return 'body';
    return active.getAttribute('data-testid') ?? active.tagName.toLowerCase();
  });
}

/** Wait until the bell dialog reports the given open state. */
export async function expectBellDialog(page: Page, open: boolean) {
  await expect(page.getByTestId('defect-bell-focus')).toHaveAttribute('data-open', open ? 'true' : 'false');
}

/** Enter the Clocktower from the Door_Selector in a build with `?built=clocktower`. */
export async function openClocktower(page: Page) {
  await page.goto('/?built=clocktower');
  await page.getByTestId('start-challenge').click();
  await expect(page.getByRole('heading', { name: 'Choose a door' })).toBeFocused();
  await page.getByTestId('enter-clocktower').click();
  await waitForScene(page);
}

/** Read the DEV test hooks the scene writes on the Play_Area. */
export async function ghost(page: Page): Promise<GhostInfo> {
  return playArea(page).evaluate((element) => ({
    x: Number(element.getAttribute('data-ghost-x')),
    y: Number(element.getAttribute('data-ghost-y')),
    facing: element.getAttribute('data-ghost-facing') ?? '',
    moving: element.getAttribute('data-ghost-moving') === 'true',
    cameraX: Number(element.getAttribute('data-camera-x')),
    cameraY: Number(element.getAttribute('data-camera-y')),
  }));
}

/** Focus the Play_Area with Tab from the room heading. */
export async function tabToPlayArea(page: Page) {
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    if (await playArea(page).evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error('The Play_Area did not receive focus within 12 Tab presses');
}

/** Hold a key for a fixed time. */
export async function holdKey(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

/** Hold a key until the Ghost satisfies a condition, then release it. */
export async function holdKeyUntil(
  page: Page,
  key: string,
  condition: { axis: 'x' | 'y'; atLeast?: number; atMost?: number },
  timeout = 15_000
) {
  await page.keyboard.down(key);
  try {
    await page.waitForFunction(
      ({ axis, atLeast, atMost }) => {
        const element = document.querySelector('[data-testid="play-area"]');
        const value = Number(element?.getAttribute(axis === 'x' ? 'data-ghost-x' : 'data-ghost-y'));
        if (atLeast !== undefined && value < atLeast) return false;
        if (atMost !== undefined && value > atMost) return false;
        return true;
      },
      condition,
      { polling: 'raf', timeout }
    );
  } finally {
    await page.keyboard.up(key);
  }
}

/**
 * Hold a key toward a wall until the Ghost is flush with it, then keep holding for
 * `extraMs` more. Waiting for the position instead of a fixed time keeps the test
 * independent of the browser's frame rate.
 */
export async function holdKeyIntoWall(
  page: Page,
  key: string,
  wall: { axis: 'x' | 'y'; value: number; direction: 'up' | 'down' },
  extraMs = 2000
) {
  await page.keyboard.down(key);
  try {
    await page.waitForFunction(
      ({ axis, value, direction }) => {
        const element = document.querySelector('[data-testid="play-area"]');
        const current = Number(element?.getAttribute(axis === 'x' ? 'data-ghost-x' : 'data-ghost-y'));
        return direction === 'up' ? current <= value : current >= value;
      },
      wall,
      { polling: 'raf', timeout: 30_000 }
    );
    await page.waitForTimeout(extraMs);
  } finally {
    await page.keyboard.up(key);
  }
}

/** Walk from the spawn to the lantern post's interaction zone with the keyboard. */
export async function walkToLantern(page: Page) {
  await page.keyboard.down('ArrowRight');
  try {
    await waitForNearbyLantern(page);
  } finally {
    await page.keyboard.up('ArrowRight');
  }
}

/**
 * Wait for the Route_Panel to name the lantern post as nearby. Polls every animation
 * frame, because the zone is only 0.9 s wide at walking speed and a slower poll
 * would let the Ghost walk through it.
 */
export async function waitForNearbyLantern(page: Page, timeout = 20_000) {
  await page.waitForFunction(
    () => document.querySelector('[data-testid="route-nearby"]')?.textContent?.includes('Lantern post') === true,
    undefined,
    { polling: 'raf', timeout }
  );
}

/** Assert the Ghost has not moved for the given time. */
export async function expectGhostStill(page: Page, ms = 1000) {
  await expect.poll(async () => (await ghost(page)).moving, { timeout: 2000 }).toBe(false);
  const before = await ghost(page);
  await page.waitForTimeout(ms);
  const after = await ghost(page);
  expect({ x: after.x, y: after.y }).toEqual({ x: before.x, y: before.y });
}

/** Fire a touch pointer event on a button, as a finger would. */
export async function touchEvent(
  button: Locator,
  // React derives onPointerLeave from pointerout, so a finger sliding off a button is `pointerout`.
  type: 'pointerdown' | 'pointerup' | 'pointercancel' | 'pointerout'
) {
  await button.dispatchEvent(type, {
    pointerType: 'touch',
    pointerId: 7,
    isPrimary: true,
    button: 0,
    bubbles: true,
  });
}

export const LANTERN_LIT_MESSAGE = /lantern is lit and the way toward the Overgrown Graveyard is open/i;
