/**
 * Adventure Phase 1: Midnight Checkout as a playable room.
 * Keyboard-only first repair, phone layout, payoff use of repaired controls,
 * reduced motion (system and toggle), rapid retries, and the key payoff.
 */
import { test, expect, type Page } from './fixtures';
import AxeBuilder from './helpers/axe';
import { completeRoom, discover, expectCandles, repair, startRoom } from './helpers/room';

async function focusedTestId(page: Page) {
  return page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid ?? document.activeElement?.id);
}

test('keyboard only: find, repair, and use Buy Now to light the lantern', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('#room-heading')).toBeFocused();

  // Objective control, Ghost Vision (one Tab stop), the order's three
  // controls, then Buy Now last, like a real checkout.
  const path: (string | undefined)[] = [];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    path.push(await focusedTestId(page));
  }
  expect(path).toEqual([
    'inspect-invisible-focus',
    'vision-mode-normal',
    'defect-missing-name',
    'quantity',
    'defect-mouse-only',
    'defect-invisible-focus',
  ]);
  // Passing over Add to Cart gives nothing away; only Buy Now's curse is found.
  await expect(page.getByTestId('room-progress')).toContainText('1 of 4 curses found');

  // Focus alone finds the curse and the defect is real: no ring.
  await expect(page.getByTestId('room-status')).toHaveText('Curse found: Buy Now hides keyboard focus.');
  expect(await page.getByTestId('defect-invisible-focus').evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');

  // Forward path: the next Tab after Buy Now reaches the repair.
  await page.keyboard.press('Tab');
  expect(await focusedTestId(page)).toBe('trap-focus-trap-hover');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('trap-feedback-invisible-focus')).toContainText('Try another patch');
  await page.keyboard.press('Tab');
  expect(await focusedTestId(page)).toBe('repair-invisible-focus');
  await page.keyboard.press('Enter');

  // Payoff: focus is on the repaired Buy Now with a visible ring; Enter lights the lantern.
  await expect(page.getByTestId('defect-invisible-focus')).toBeFocused();
  expect(await page.getByTestId('defect-invisible-focus').evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
  await expectCandles(page, 1);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-lit="true"]')).toHaveCount(1);
  await expect(page.getByText('Lantern lit', { exact: true })).toBeVisible();
  await expect(page.getByTestId('room-status')).toHaveText('Lantern lit. The counter glows again.');
  await expect(page.getByTestId('room-objective')).toHaveAttribute('data-stage', 'finish-order');
});

test('hover states keep text contrast (dialog, costume cards, completion)', { tag: '@axe' }, async ({ page }) => {
  // Regression: the global button:hover rule out-ranked component hover rules
  // and painted buttons crimson, dropping muted text below 4.5:1.
  const hoverScan = async (target: string, include: string) => {
    await page.locator(target).hover();
    await page.waitForTimeout(250);
    const result = await new AxeBuilder({ page }).include(include).withRules(['color-contrast']).analyze();
    expect(result.violations, target).toEqual([]);
  };
  await page.goto('/');
  await page.getByTestId('open-costume-locker').click();
  await hoverScan('[data-testid="costume-option-skeleton_ghost"]', '[data-testid="costume-locker-dialog"]');
  await page.keyboard.press('Escape');
  await page.getByTestId('start-challenge').click();
  await page.getByTestId('reset-button').click();
  await hoverScan('[data-testid="reset-cancel"]', '[data-testid="reset-confirm-dialog"]');
  await hoverScan('[data-testid="reset-confirm"]', '[data-testid="reset-confirm-dialog"]');
  await page.getByTestId('reset-cancel').click();
  await hoverScan('[data-testid="vision-mode-xray"]', '[data-testid="ghost-vision-toolbar"]');
  await completeRoom(page);
  await hoverScan('[data-testid="completion-doors"]', '[data-testid="level-complete"]');
  await hoverScan('text=Return to Menu', '[data-testid="level-complete"]');
});

test('Ghost Vision is a single Tab stop operated with arrow keys', async ({ page }) => {
  await startRoom(page);
  await page.getByTestId('vision-mode-normal').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('vision-mode-xray')).toBeFocused();
  await expect(page.getByTestId('vision-mode-xray')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('vision-mode-normal')).toHaveAttribute('tabindex', '-1');
  await page.keyboard.press('End');
  await expect(page.getByTestId('vision-mode-contrast')).toHaveAttribute('aria-checked', 'true');
});

test('phone: the repair choices show with the lantern and Buy Now, and the payoff does not jump', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  const enter = await page.getByTestId('start-challenge').boundingBox();
  expect(enter!.y + enter!.height).toBeLessThanOrEqual(667);
  await page.getByTestId('start-challenge').click();
  for (const id of ['room-objective', 'inspect-invisible-focus']) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box!.y + box!.height, id).toBeLessThanOrEqual(667);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  // Touch path: Inspect brings the choices into view right under the counter.
  await page.getByTestId('inspect-invisible-focus').click();
  await expect(page.getByRole('heading', { name: 'Buy Now hides keyboard focus' })).toBeFocused();
  await expect(page.getByTestId('repair-invisible-focus')).toBeInViewport({ ratio: 1 });
  await expect(page.getByTestId('defect-invisible-focus')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('[data-lit]')).toBeInViewport({ ratio: 1 });
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.getByTestId('repair-invisible-focus').click();
  await expect(page.getByTestId('defect-invisible-focus')).toBeFocused();
  const scrollAfter = await page.evaluate(() => window.scrollY);
  expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(80);
  await expect(page.getByTestId('repair-next-action')).toBeInViewport();
});

test('repaired Add to Cart takes the player’s key press; the live check does not add the candle', async ({ page }) => {
  await startRoom(page);
  await repair(page, 'mouse-only-activation');
  await expect(page.getByTestId('order-total')).toContainText('Order: empty');
  const add = page.getByTestId('defect-mouse-only');
  await expect(add).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('order-total')).toContainText('1 × Enchanted Candle');
  await expect(page.getByTestId('room-status')).toHaveText('Candle added to the order.');
});

test('named bag button shows the order', async ({ page }) => {
  await startRoom(page);
  await page.getByTestId('defect-mouse-only').click();
  await repair(page, 'missing-accessible-name');
  const bag = page.getByRole('button', { name: 'View shopping cart' });
  await expect(bag).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('bag-readout')).toHaveText('In the bag: 1 × Enchanted Candle');
  await expect(bag).toHaveAttribute('aria-expanded', 'true');
});

test('rapid presses on the real patch apply and verify once', async ({ page }) => {
  await startRoom(page);
  await discover(page, 'invisible-focus');
  await page.getByTestId('repair-invisible-focus').evaluate((el) => {
    for (let i = 0; i < 5; i++) (el as HTMLButtonElement).click();
  });
  await expectCandles(page, 1);
  await expect(page.getByTestId('repair-result-invisible-focus')).toHaveCount(1);
  const classes = await page.getByTestId('defect-invisible-focus').getAttribute('class');
  expect(classes?.match(/keyquest-focus-repaired/g)?.length).toBe(1);
});

test('finishing the order leaves a key on the counter, then the completion names the next door', { tag: '@axe' }, async ({ page }) => {
  await startRoom(page);
  await repair(page, 'invisible-focus');
  await page.getByTestId('defect-invisible-focus').click();
  await repair(page, 'mouse-only-activation');
  await repair(page, 'missing-accessible-name');
  await repair(page, 'insufficient-contrast');
  await page.getByTestId('defect-invisible-focus').click();
  await expect(page.getByTestId('room-status')).toContainText('Add the candle');
  await page.getByTestId('defect-mouse-only').click();
  await page.getByTestId('defect-invisible-focus').click();
  await expect(page.getByTestId('counter-key')).toBeVisible();
  await expect(page.getByText('Key on the counter')).toBeVisible();
  await expect(page.getByTestId('room-objective')).toHaveAttribute('data-stage', 'take-key');
  await expect(page.getByTestId('level-complete')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).exclude('[data-testid="challenge-sandbox"]').analyze()).violations).toEqual([]);
  await page.getByTestId('take-key').click();
  await expect(page.getByRole('heading', { name: 'You earned the Pantry Key' })).toBeFocused();
  await expect(page.getByTestId('next-door')).toContainText('Potion Pantry');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

for (const mode of ['system', 'toggle'] as const) {
  test(`reduced motion (${mode}): lantern and key appear instantly with the same text`, async ({ page }) => {
    if (mode === 'system') await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    if (mode === 'toggle') await page.getByTestId('reduced-motion-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
    await page.getByTestId('start-challenge').click();
    await repair(page, 'invisible-focus');
    await page.getByTestId('defect-invisible-focus').click();
    const halo = page.locator('[data-lit="true"] > span').first();
    expect(await halo.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(0.01);
    expect(await halo.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await expect(page.getByTestId('room-status')).toHaveText('Lantern lit. The counter glows again.');
    await completeRoom(page);
  });
}
