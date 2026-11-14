import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('startup announces loading before entering the menu', async ({ page }) => {
  await page.addInitScript(() => {
    const records: string[] = [];
    (window as unknown as { loadingRecords: string[] }).loadingRecords = records;
    new MutationObserver(() => {
      document.querySelectorAll('[role="status"][aria-live]').forEach(el => {
        if (/loading/i.test(el.textContent || '')) records.push(el.textContent || '');
      });
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { loadingRecords: string[] }).loadingRecords)).not.toEqual([]);
});

test('reset dialog and hint panel have accessible names and pass axe', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-challenge').click();
  await expect(page.getByRole('region', { name: /challenge sandbox/i })).toBeVisible();
  await page.getByTestId('hint-button').click();
  expect((await new AxeBuilder({ page }).include('[data-testid="hint-panel"]').analyze()).violations).toEqual([]);
  await page.getByTestId('reset-button').click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName(/\S/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('repair feedback retains keyboard focus after verification', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-challenge').click();
  const card = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Invisible Focus', exact: true }) }).filter({ has: page.getByRole('button', { name: 'Discover Defect' }) }).last();
  await card.getByRole('button', { name: 'Discover Defect' }).click();
  await page.getByTestId('repair-invisible-focus').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Live DOM Verification Passed')).toBeVisible();
  await expect(page.locator(':focus')).toContainText('Live DOM Verification Passed');
});

test('failed focus verification reports incomplete repair and awards no progress', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-challenge').click();
  await page.addStyleTag({ content: '[data-testid="defect-invisible-focus"]:focus { outline: none !important; box-shadow: none !important; }' });
  const card = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Invisible Focus', exact: true }) }).filter({ has: page.getByRole('button', { name: 'Discover Defect' }) }).last();
  await card.getByRole('button', { name: 'Discover Defect' }).click();
  await page.getByTestId('repair-invisible-focus').click();
  await expect(page.getByText('Verification Pending / Incomplete')).toBeVisible();
  await expect(page.getByText('0 / 4 defects repaired')).toBeVisible();
  await expect(page.getByText('Live DOM Verification Passed')).toHaveCount(0);
});
