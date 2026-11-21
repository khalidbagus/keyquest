/**
 * Playwright E2E Tests for KeyQuest v2 Option A Overhaul
 * Verifies Rive mascot loading, Costume Locker accessibility & persistence,
 * Ghost Vision Gadgets, and Pick-the-Patch trap + repair flow.
 */

import { test, expect } from './fixtures';
import AxeBuilder from './helpers/axe';

test.describe('KeyQuest v2 — Rive Mascots, Costume Locker, Ghost Vision & Pick-the-Patch', () => {
  test('loads Pumpkin Ghost via Rive runtime and allows switching costumes accessibly', { tag: '@axe' }, async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('start-challenge')).toBeVisible();

    const pumpkin = page.getByTestId('rive-mascot-pumpkin_ghost');
    await expect(pumpkin).toBeVisible();
    await expect(pumpkin).toHaveAttribute('data-rive-ready', 'true', { timeout: 15000 });

    // Open Costume Locker and verify zero axe violations while open
    await page.getByTestId('open-costume-locker').click();
    const locker = page.getByTestId('costume-locker-dialog');
    await expect(locker).toBeVisible();
    expect((await new AxeBuilder({ page }).include('[data-testid="costume-locker-dialog"]').analyze()).violations).toEqual([]);

    // Switch to Midnight Black Cat Ghost and confirm persistence
    await page.getByTestId('costume-option-midnight_black_cat_ghost').click();
    await expect(locker).not.toBeVisible();
    const cat = page.getByTestId('rive-mascot-midnight_black_cat_ghost');
    await expect(cat).toBeVisible();
    await expect(cat).toHaveAttribute('data-rive-ready', 'true', { timeout: 15000 });

    const saved = await page.evaluate(() => localStorage.getItem('keyquest-mascot-v1'));
    expect(saved).toBe('midnight_black_cat_ghost');
  });

  test('Ghost Vision Gadgets toggle X-Ray & Contrast callouts cleanly and pass axe', { tag: '@axe' }, async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('start-challenge').click();
    await expect(page.getByTestId('ghost-vision-toolbar')).toBeVisible();

    // Screen Reader X-Ray mode
    await page.getByTestId('vision-mode-xray').click();
    await expect(page.getByTestId('vision-mode-xray')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('name: "" (unnamed)')).toBeVisible();

    // Focus & Contrast mode
    await page.getByTestId('vision-mode-contrast').click();
    await expect(page.getByTestId('vision-mode-contrast')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('~2.0:1 Fails AA')).toBeVisible();

    expect((await new AxeBuilder({ page }).include('[data-testid="ghost-vision-toolbar"]').analyze()).violations).toEqual([]);
  });

  test('Pick-the-Patch rejects trap patches with WCAG diagnosis and succeeds on real fix', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('start-challenge').click();

    await page.getByTestId('inspect-invisible-focus').click();
    await expect(page.getByRole('heading', { name: 'Buy Now hides keyboard focus' })).toBeFocused();

    // Try a trap patch first: shows diagnosis, does NOT award progress
    await page.getByTestId('trap-focus-trap-hover').click();
    await expect(page.getByTestId('trap-feedback-invisible-focus')).toBeVisible();
    await expect(page.getByTestId('room-progress')).toContainText('0 of 4 candles lit');
    // Every patch stays available for a retry.
    await expect(page.getByTestId('repair-invisible-focus')).toBeEnabled();

    // Now pick the real WCAG fix: repairs and verifies live DOM
    await page.getByTestId('repair-invisible-focus').click();
    await expect(page.getByText('Verified on the live page')).toBeVisible();
    await expect(page.getByTestId('room-progress')).toContainText('1 of 4 candles lit');
    // Payoff: focus lands on the repaired control with a real ring, and it lights the lantern.
    const buy = page.getByTestId('defect-invisible-focus');
    await expect(buy).toBeFocused();
    expect(await buy.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-lit="true"]')).toHaveCount(1);
    await expect(page.getByTestId('room-status')).toHaveText('Lantern lit. The counter glows again.');
  });
});
