import { test, expect } from './fixtures';
import AxeBuilder from './helpers/axe';
import { completeRoom, discover, expectCandles, repair, startRoom as start } from './helpers/room';

test('menu passes axe', { tag: '@axe' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('menu journal passes axe when open', { tag: '@axe' }, async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('menu-journal').locator('summary').click();
  await expect(page.getByText('The curses, room by room')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('challenge shell passes axe excluding only the intentional sandbox', { tag: '@axe' }, async ({ page }) => {
  await start(page);
  expect((await new AxeBuilder({ page }).exclude('[data-testid="challenge-sandbox"]').analyze()).violations).toEqual([]);
});

test('keyboard navigation exposes a visible skip link and can start and exit', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('start-challenge')).toBeFocused();
  await expect(page.getByTestId('start-challenge')).toHaveText(/Enter Midnight Checkout/);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Midnight Checkout', level: 2 })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-challenge')).toBeVisible();
});

test('focus repair changes computed outline after keyboard focus', async ({ page }) => {
  await start(page);
  const target = page.getByTestId('defect-invisible-focus');
  await target.focus();
  expect(await target.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none');
  await repair(page, 'invisible-focus');
  await target.focus();
  expect(await target.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  expect(await target.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThan(0);
});

test('axe detects the unnamed cart before repair and its accessible name after repair', { tag: '@axe' }, async ({ page }) => {
  await start(page);
  const target = page.getByTestId('defect-missing-name');
  const before = await new AxeBuilder({ page }).include('[data-testid="defect-missing-name"]').withRules('button-name').analyze();
  expect(before.violations.map(v => v.id)).toContain('button-name');
  await repair(page, 'missing-accessible-name');
  await expect(target).toHaveAccessibleName('View shopping cart');
  const after = await new AxeBuilder({ page }).include('[data-testid="defect-missing-name"]').withRules('button-name').analyze();
  expect(after.violations).toEqual([]);
});

test('price fails contrast before repair and passes after repair', { tag: '@axe' }, async ({ page }) => {
  await start(page);
  const scan = () => new AxeBuilder({ page }).include('[data-testid="defect-low-contrast"]').withRules('color-contrast').analyze();
  expect((await scan()).violations.map(v => v.id)).toContain('color-contrast');
  await repair(page, 'insufficient-contrast');
  expect((await scan()).violations).toEqual([]);
});

test('repairs can be done out of order; the key requires all four and Start over resets', { tag: '@axe' }, async ({ page }) => {
  await start(page);
  await repair(page, 'missing-accessible-name');
  await expectCandles(page, 1);
  await expect(page.getByTestId('repair-missing-name')).toHaveCount(0);
  await repair(page, 'invisible-focus');
  await repair(page, 'insufficient-contrast');
  await expectCandles(page, 3);
  // Buy Now lights the lantern, but the order stays jammed until all four are lifted.
  await page.getByTestId('defect-invisible-focus').click();
  await page.getByTestId('defect-invisible-focus').click();
  await expect(page.getByTestId('room-status')).toContainText('1 curse left');
  await expect(page.getByTestId('take-key')).toHaveCount(0);
  await completeRoom(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Return to Menu' }).click();
  await page.getByTestId('start-fresh').click();
  await page.getByTestId('start-over-confirm').click();
  await expectCandles(page, 0);
  await expect(page.getByTestId('defect-missing-name')).toHaveAccessibleName('');
});

test('direct discovery: Tab focus on Buy Now finds the curse without switching an active repair', async ({ page }) => {
  await start(page);
  await discover(page, 'insufficient-contrast');
  await page.getByTestId('defect-invisible-focus').focus();
  await expect(page.getByTestId('room-status')).toHaveText('Curse found: Buy Now hides keyboard focus.');
  await expect(page.getByTestId('repair-card-insufficient-contrast')).toBeVisible();
  await expect(page.getByTestId('select-repair-invisible-focus')).toBeVisible();
});

test('reduced motion toggle updates aria-pressed, html dataset, and localStorage', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByTestId('reduced-motion-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const attr = await page.evaluate(() => document.documentElement.dataset.reducedMotion);
  expect(attr).toBe('true');
});

test('responsive viewports (mobile 375x667, tablet 768x1024, short 1024x600) render without horizontal overflow', async ({ page }) => {
  for (const viewport of [
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1024, height: 600 },
  ]) {
    await page.setViewportSize(viewport);
    await start(page);
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
    const exitBox = await page.getByTestId('emergency-exit').boundingBox();
    expect(exitBox?.height).toBeGreaterThanOrEqual(44);
  }
});
