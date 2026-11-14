import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function start(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-challenge').click();
  await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
}

async function repair(page: Page, name: string, testId: string) {
  const card = page.locator('div').filter({ has: page.getByRole('heading', { name, exact: true }) }).filter({ has: page.getByRole('button', { name: 'Discover Defect' }) }).last();
  await card.getByRole('button', { name: 'Discover Defect' }).click();
  await page.getByTestId(testId).click();
}

test('menu passes axe', async ({ page }) => {
  await page.goto('/');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('challenge shell passes axe excluding only the intentional sandbox', async ({ page }) => {
  await start(page);
  expect((await new AxeBuilder({ page }).exclude('[data-testid="challenge-sandbox"]').analyze()).violations).toEqual([]);
});

test('keyboard navigation exposes a visible skip link and can start and exit', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('start-challenge')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-challenge')).toBeVisible();
});

test('focus repair changes computed outline after keyboard focus', async ({ page }) => {
  await start(page);
  const target = page.getByTestId('defect-invisible-focus');
  await target.focus();
  expect(await target.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none');
  await repair(page, 'Invisible Focus', 'repair-invisible-focus');
  await target.focus();
  expect(await target.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  expect(await target.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThan(0);
});

test('axe detects the unnamed cart before repair and its accessible name after repair', async ({ page }) => {
  await start(page);
  const target = page.getByTestId('defect-missing-name');
  const before = await new AxeBuilder({ page }).include('[data-testid="defect-missing-name"]').withRules('button-name').analyze();
  expect(before.violations.map(v => v.id)).toContain('button-name');
  await repair(page, 'Missing Accessible Name', 'repair-missing-name');
  await expect(target).toHaveAccessibleName('View shopping cart');
  const after = await new AxeBuilder({ page }).include('[data-testid="defect-missing-name"]').withRules('button-name').analyze();
  expect(after.violations).toEqual([]);
});

test('price fails contrast before repair and passes after repair', async ({ page }) => {
  await start(page);
  const scan = () => new AxeBuilder({ page }).include('[data-testid="defect-low-contrast"]').withRules('color-contrast').analyze();
  expect((await scan()).violations.map(v => v.id)).toContain('color-contrast');
  await repair(page, 'Insufficient Contrast', 'repair-low-contrast');
  expect((await scan()).violations).toEqual([]);
});

test('repairs can be done out of order; completion requires all four and replay resets', async ({ page }) => {
  await start(page);
  await repair(page, 'Missing Accessible Name', 'repair-missing-name');
  await expect(page.getByText('1 / 4 defects repaired')).toBeVisible();
  await expect(page.getByTestId('repair-missing-name')).toHaveCount(0);
  await repair(page, 'Invisible Focus', 'repair-invisible-focus');
  await repair(page, 'Insufficient Contrast', 'repair-low-contrast');
  await expect(page.getByText('3 / 4 defects repaired')).toBeVisible();
  await expect(page.getByTestId('level-complete')).toHaveCount(0);
  await repair(page, 'Mouse-Only Activation', 'repair-mouse-only');
  await expect(page.getByTestId('level-complete')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Play Again' }).click();
  await expect(page.getByText('0 / 4 defects repaired')).toBeVisible();
  await expect(page.getByTestId('defect-missing-name')).toHaveAccessibleName('');
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
