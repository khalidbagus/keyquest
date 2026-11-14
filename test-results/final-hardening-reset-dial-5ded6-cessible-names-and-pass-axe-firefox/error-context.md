# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: final-hardening.spec.ts >> reset dialog and hint panel have accessible names and pass axe
- Location: tests\e2e\final-hardening.spec.ts:19:1

# Error details

```
Error: frame.evaluate: Page crashed
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | 
  4  | test('startup announces loading before entering the menu', async ({ page }) => {
  5  |   await page.addInitScript(() => {
  6  |     const records: string[] = [];
  7  |     (window as unknown as { loadingRecords: string[] }).loadingRecords = records;
  8  |     new MutationObserver(() => {
  9  |       document.querySelectorAll('[role="status"][aria-live]').forEach(el => {
  10 |         if (/loading/i.test(el.textContent || '')) records.push(el.textContent || '');
  11 |       });
  12 |     }).observe(document, { childList: true, subtree: true });
  13 |   });
  14 |   await page.goto('/');
  15 |   await expect(page.getByTestId('start-challenge')).toBeVisible();
  16 |   expect(await page.evaluate(() => (window as unknown as { loadingRecords: string[] }).loadingRecords)).not.toEqual([]);
  17 | });
  18 | 
  19 | test('reset dialog and hint panel have accessible names and pass axe', async ({ page }) => {
  20 |   await page.goto('/');
  21 |   await page.getByTestId('start-challenge').click();
  22 |   await expect(page.getByRole('region', { name: /challenge sandbox/i })).toBeVisible();
  23 |   await page.getByTestId('hint-button').click();
> 24 |   expect((await new AxeBuilder({ page }).include('[data-testid="hint-panel"]').analyze()).violations).toEqual([]);
     |           ^ Error: frame.evaluate: Page crashed
  25 |   await page.getByTestId('reset-button').click();
  26 |   await expect(page.getByRole('dialog')).toHaveAccessibleName(/\S/);
  27 |   expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  28 | });
  29 | 
  30 | test('repair feedback retains keyboard focus after verification', async ({ page }) => {
  31 |   await page.goto('/');
  32 |   await page.getByTestId('start-challenge').click();
  33 |   const card = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Invisible Focus', exact: true }) }).filter({ has: page.getByRole('button', { name: 'Discover Defect' }) }).last();
  34 |   await card.getByRole('button', { name: 'Discover Defect' }).click();
  35 |   await page.getByTestId('repair-invisible-focus').focus();
  36 |   await page.keyboard.press('Enter');
  37 |   await expect(page.getByText('Live DOM Verification Passed')).toBeVisible();
  38 |   await expect(page.locator(':focus')).toContainText('Live DOM Verification Passed');
  39 | });
  40 | 
```