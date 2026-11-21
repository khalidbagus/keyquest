import { expect, type Page } from '../fixtures';

const CHECKOUT = [
  'invisible-focus',
  'mouse-only-activation',
  'missing-accessible-name',
  'insufficient-contrast',
];

/** Seed a version 2 save with the Checkout cleared and the Pantry untouched. */
export async function seedClearedCheckout(page: Page, extra: Record<string, unknown> = {}) {
  await page.addInitScript(
    ({ checkout, extra: more }) => {
      if (sessionStorage.getItem('keyquest-test-seeded')) return;
      const now = Date.now();
      const defects: Record<string, unknown> = {};
      const hintsUsed: Record<string, number> = {};
      for (const type of [...checkout, 'color-only-ingredients']) {
        const done = checkout.includes(type);
        defects[type] = {
          type,
          discovered: done,
          discoveredAt: done ? now - 60000 : null,
          repaired: done,
          repairedAt: done ? now - 50000 : null,
          verified: done,
          verifiedAt: done ? now - 50000 : null,
          hintLevel: 0,
        };
        hintsUsed[type] = 0;
      }
      localStorage.setItem(
        'keyquest-progress-v1',
        JSON.stringify({
          version: 2,
          sessionId: 'pantry-test',
          startedAt: now - 120000,
          lastUpdatedAt: now - 30000,
          currentRoom: 'pantry',
          defects,
          hintsUsed,
          checkout: { lanternLit: true, candleAdded: true, orderPlaced: true, keyTaken: true },
          pantry: { cauldron: [], brewed: false, potionTaken: false },
          isComplete: false,
          completedAt: null,
          ...more,
        })
      );
      sessionStorage.setItem('keyquest-test-seeded', '1');
    },
    { checkout: CHECKOUT, extra }
  );
}

export async function enterPantry(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('start-challenge')).toHaveText(/Resume Potion Pantry/);
  await page.getByTestId('start-challenge').click();
  await expect(page.getByRole('heading', { name: 'Potion Pantry', level: 2 })).toBeFocused();
}

export async function repairShelf(page: Page) {
  await page.getByTestId('inspect-color-only-ingredients').click();
  await page.getByTestId('repair-color-only').click();
  await expect(page.getByTestId('repair-result-color-only-ingredients')).toContainText(
    'Verified on the live page'
  );
}

export async function brewLanternPotion(page: Page) {
  for (const id of ['moonpetal', 'ember-salt', 'glowcap']) {
    await page.locator(`[data-ingredient="${id}"]`).click();
  }
  await expect(page.locator('[data-mood="brewed"]')).toHaveCount(1);
}
