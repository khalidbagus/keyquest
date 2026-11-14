# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility-and-flow.spec.ts >> menu passes axe
- Location: tests\e2e\accessibility-and-flow.spec.ts:16:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: frame.evaluate: Test timeout of 30000ms exceeded.
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import AxeBuilder from '@axe-core/playwright';
  3   | 
  4   | async function start(page: Page) {
  5   |   await page.goto('/');
  6   |   await page.getByTestId('start-challenge').click();
  7   |   await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
  8   | }
  9   | 
  10  | async function repair(page: Page, name: string, testId: string) {
  11  |   const card = page.locator('div').filter({ has: page.getByRole('heading', { name, exact: true }) }).filter({ has: page.getByRole('button', { name: 'Discover Defect' }) }).last();
  12  |   await card.getByRole('button', { name: 'Discover Defect' }).click();
  13  |   await page.getByTestId(testId).click();
  14  | }
  15  | 
  16  | test('menu passes axe', async ({ page }) => {
  17  |   await page.goto('/');
> 18  |   expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      |           ^ Error: frame.evaluate: Test timeout of 30000ms exceeded.
  19  | });
  20  | 
  21  | test('challenge shell passes axe excluding only the intentional sandbox', async ({ page }) => {
  22  |   await start(page);
  23  |   expect((await new AxeBuilder({ page }).exclude('[data-testid="challenge-sandbox"]').analyze()).violations).toEqual([]);
  24  | });
  25  | 
  26  | test('keyboard navigation exposes a visible skip link and can start and exit', async ({ page }) => {
  27  |   await page.goto('/');
  28  |   await page.keyboard.press('Tab');
  29  |   const skip = page.getByRole('link', { name: 'Skip to main content' });
  30  |   await expect(skip).toBeFocused();
  31  |   await expect(skip).toBeVisible();
  32  |   await page.keyboard.press('Tab');
  33  |   await expect(page.getByTestId('start-challenge')).toBeFocused();
  34  |   await page.keyboard.press('Enter');
  35  |   await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
  36  |   await page.keyboard.press('Escape');
  37  |   await expect(page.getByTestId('start-challenge')).toBeVisible();
  38  | });
  39  | 
  40  | test('focus repair changes computed outline after keyboard focus', async ({ page }) => {
  41  |   await start(page);
  42  |   const target = page.getByTestId('defect-invisible-focus');
  43  |   await target.focus();
  44  |   expect(await target.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none');
  45  |   await repair(page, 'Invisible Focus', 'repair-invisible-focus');
  46  |   await target.focus();
  47  |   expect(await target.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  48  |   expect(await target.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThan(0);
  49  | });
  50  | 
  51  | test('axe detects the unnamed cart before repair and its accessible name after repair', async ({ page }) => {
  52  |   await start(page);
  53  |   const target = page.getByTestId('defect-missing-name');
  54  |   const before = await new AxeBuilder({ page }).include('[data-testid="defect-missing-name"]').withRules('button-name').analyze();
  55  |   expect(before.violations.map(v => v.id)).toContain('button-name');
  56  |   await repair(page, 'Missing Accessible Name', 'repair-missing-name');
  57  |   await expect(target).toHaveAccessibleName('View shopping cart');
  58  |   const after = await new AxeBuilder({ page }).include('[data-testid="defect-missing-name"]').withRules('button-name').analyze();
  59  |   expect(after.violations).toEqual([]);
  60  | });
  61  | 
  62  | test('price fails contrast before repair and passes after repair', async ({ page }) => {
  63  |   await start(page);
  64  |   const scan = () => new AxeBuilder({ page }).include('[data-testid="defect-low-contrast"]').withRules('color-contrast').analyze();
  65  |   expect((await scan()).violations.map(v => v.id)).toContain('color-contrast');
  66  |   await repair(page, 'Insufficient Contrast', 'repair-low-contrast');
  67  |   expect((await scan()).violations).toEqual([]);
  68  | });
  69  | 
  70  | test('repairs can be done out of order; completion requires all four and replay resets', async ({ page }) => {
  71  |   await start(page);
  72  |   await repair(page, 'Missing Accessible Name', 'repair-missing-name');
  73  |   await expect(page.getByText('1 / 4 defects repaired')).toBeVisible();
  74  |   await expect(page.getByTestId('repair-missing-name')).toHaveCount(0);
  75  |   await repair(page, 'Invisible Focus', 'repair-invisible-focus');
  76  |   await repair(page, 'Insufficient Contrast', 'repair-low-contrast');
  77  |   await expect(page.getByText('3 / 4 defects repaired')).toBeVisible();
  78  |   await expect(page.getByTestId('level-complete')).toHaveCount(0);
  79  |   await repair(page, 'Mouse-Only Activation', 'repair-mouse-only');
  80  |   await expect(page.getByTestId('level-complete')).toBeVisible();
  81  |   expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  82  |   await page.getByRole('button', { name: 'Play Again' }).click();
  83  |   await expect(page.getByText('0 / 4 defects repaired')).toBeVisible();
  84  |   await expect(page.getByTestId('defect-missing-name')).toHaveAccessibleName('');
  85  | });
  86  | 
  87  | test('reduced motion toggle updates aria-pressed, html dataset, and localStorage', async ({ page }) => {
  88  |   await page.goto('/');
  89  |   const toggle = page.getByTestId('reduced-motion-toggle');
  90  |   await expect(toggle).toBeVisible();
  91  |   await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  92  |   await toggle.click();
  93  |   await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  94  |   const attr = await page.evaluate(() => document.documentElement.dataset.reducedMotion);
  95  |   expect(attr).toBe('true');
  96  | });
  97  | 
  98  | test('responsive viewports (mobile 375x667, tablet 768x1024, short 1024x600) render without horizontal overflow', async ({ page }) => {
  99  |   for (const viewport of [
  100 |     { width: 375, height: 667 },
  101 |     { width: 768, height: 1024 },
  102 |     { width: 1024, height: 600 },
  103 |   ]) {
  104 |     await page.setViewportSize(viewport);
  105 |     await start(page);
  106 |     const hasOverflow = await page.evaluate(
  107 |       () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  108 |     );
  109 |     expect(hasOverflow).toBe(false);
  110 |     const exitBox = await page.getByTestId('emergency-exit').boundingBox();
  111 |     expect(exitBox?.height).toBeGreaterThanOrEqual(44);
  112 |   }
  113 | });
  114 | 
```