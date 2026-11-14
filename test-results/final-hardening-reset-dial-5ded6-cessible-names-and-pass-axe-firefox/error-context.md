# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: final-hardening.spec.ts >> reset dialog and hint panel have accessible names and pass axe
- Location: tests\e2e\final-hardening.spec.ts:22:1

# Error details

```
Error: frame.evaluate: Page crashed
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | 
  4  | // Requirement 1 (Application Loading): loading indicator and announcement not yet implemented.
  5  | // The app currently initializes directly to the menu. This test documents the expected
  6  | // behavior per Requirement 1.1-1.5 and will pass once the loading feature is added.
  7  | test.skip('startup announces loading before entering the menu', async ({ page }) => {
  8  |   await page.addInitScript(() => {
  9  |     const records: string[] = [];
  10 |     (window as unknown as { loadingRecords: string[] }).loadingRecords = records;
  11 |     new MutationObserver(() => {
  12 |       document.querySelectorAll('[role="status"][aria-live]').forEach(el => {
  13 |         if (/loading/i.test(el.textContent || '')) records.push(el.textContent || '');
  14 |       });
  15 |     }).observe(document, { childList: true, subtree: true });
  16 |   });
  17 |   await page.goto('/');
  18 |   await expect(page.getByTestId('start-challenge')).toBeVisible();
  19 |   expect(await page.evaluate(() => (window as unknown as { loadingRecords: string[] }).loadingRecords)).not.toEqual([]);
  20 | });
  21 | 
  22 | test('reset dialog and hint panel have accessible names and pass axe', async ({ page }) => {
  23 |   await page.goto('/');
  24 |   await page.getByTestId('start-challenge').click();
  25 |   await expect(page.getByRole('region', { name: /challenge sandbox/i })).toBeVisible();
  26 |   await page.getByTestId('hint-button').click();
> 27 |   expect((await new AxeBuilder({ page }).include('[data-testid="hint-panel"]').analyze()).violations).toEqual([]);
     |           ^ Error: frame.evaluate: Page crashed
  28 |   await page.getByTestId('reset-button').click();
  29 |   await expect(page.getByRole('dialog')).toHaveAccessibleName(/\S/);
  30 |   expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  31 | });
  32 | 
  33 | test('repair feedback retains keyboard focus after verification', async ({ page }) => {
  34 |   await page.goto('/');
  35 |   await page.getByTestId('start-challenge').click();
  36 |   const card = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Invisible Focus', exact: true }) }).filter({ has: page.getByRole('button', { name: 'Discover Defect' }) }).last();
  37 |   await card.getByRole('button', { name: 'Discover Defect' }).click();
  38 |   await page.getByTestId('repair-invisible-focus').focus();
  39 |   await page.keyboard.press('Enter');
  40 |   await expect(page.getByText('Live DOM Verification Passed')).toBeVisible();
  41 |   await expect(page.locator(':focus')).toContainText('Live DOM Verification Passed');
  42 | });
  43 | 
  44 | test('failed focus verification reports incomplete repair and awards no progress', async ({ page }) => {
  45 |   await page.goto('/');
  46 |   await page.getByTestId('start-challenge').click();
  47 |   await page.addStyleTag({ content: '[data-testid="defect-invisible-focus"]:focus { outline: none !important; box-shadow: none !important; }' });
  48 |   const card = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Invisible Focus', exact: true }) }).filter({ has: page.getByRole('button', { name: 'Discover Defect' }) }).last();
  49 |   await card.getByRole('button', { name: 'Discover Defect' }).click();
  50 |   await page.getByTestId('repair-invisible-focus').click();
  51 |   await expect(page.getByText('Verification Pending / Incomplete')).toBeVisible();
  52 |   await expect(page.getByText('0 / 4 defects repaired')).toBeVisible();
  53 |   await expect(page.getByText('Live DOM Verification Passed')).toHaveCount(0);
  54 | });
  55 | 
```