import { expect, type Page } from '../fixtures';
import type { DefectType } from '../../../src/types';

export const REPAIR_TEST_IDS: Record<DefectType, string> = {
  'invisible-focus': 'repair-invisible-focus',
  'mouse-only-activation': 'repair-mouse-only',
  'missing-accessible-name': 'repair-missing-name',
  'insufficient-contrast': 'repair-low-contrast',
};

/** Open the opening screen and enter (or resume) the Midnight Checkout. */
export async function startRoom(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-challenge').click();
  await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
}

/**
 * Find a curse through the room journal's direct Inspect control and show its
 * repair. If focus or a click already found it, select it in the studio.
 */
export async function discover(page: Page, type: DefectType) {
  const card = page.getByTestId(`repair-card-${type}`);
  if (await card.isVisible()) return;
  const journal = page.getByTestId('room-journal');
  if (!(await journal.evaluate((el) => (el as HTMLDetailsElement).open))) {
    await journal.locator('summary').click();
  }
  const inspect = page.getByTestId(`journal-inspect-${type}`);
  if (await inspect.count()) {
    await inspect.click();
  } else {
    await page.getByTestId(`select-repair-${type}`).click();
  }
  await expect(card).toBeVisible();
}

/** Find a curse, pick the real patch, and wait for the live check. */
export async function repair(page: Page, type: DefectType) {
  await discover(page, type);
  await page.getByTestId(REPAIR_TEST_IDS[type]).click();
  await expect(page.getByTestId(`repair-result-${type}`)).toContainText(
    'Verified on the live page'
  );
}

export async function expectCandles(page: Page, lit: number) {
  await expect(page.getByTestId('room-progress')).toContainText(`${lit} of 4 candles lit`);
}

/** Lift every curse, use the repaired controls, place the order, take the key. */
export async function completeRoom(page: Page) {
  for (const type of Object.keys(REPAIR_TEST_IDS) as DefectType[]) {
    const card = page.getByTestId(`journal-inspect-${type}`);
    const journal = page.getByTestId('room-journal');
    if (!(await journal.evaluate((el) => (el as HTMLDetailsElement).open))) {
      await journal.locator('summary').click();
    }
    if (await card.count()) await repair(page, type);
  }
  const buy = page.getByTestId('defect-invisible-focus');
  if ((await page.locator('[data-lit="true"]').count()) === 0) await buy.click();
  await page.getByTestId('defect-mouse-only').click();
  await buy.click();
  await page.getByTestId('take-key').click();
  await expect(page.getByTestId('level-complete')).toBeVisible();
}
