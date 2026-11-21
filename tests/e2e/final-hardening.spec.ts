import { test, expect } from './fixtures';
import AxeBuilder from './helpers/axe';
import { discover, expectCandles, startRoom } from './helpers/room';

// Hold the real module response so the loading state is deterministic.
test('startup announces loading before entering the menu', { tag: '@axe' }, async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/src/GameRouter.tsx*', async route => {
    await held;
    await route.continue();
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const loading = page.getByTestId('application-loading');
  try {
    await expect(loading).toBeVisible();
    await expect(loading.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    await expect(loading.getByRole('status')).toHaveText('Loading KeyQuest application files.');
    await expect(page.getByRole('progressbar', { name: 'Application files loading' })).not.toHaveAttribute('value');
    await expect(page.getByTestId('start-challenge')).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveCount(1);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByTestId('reduced-motion-toggle').focus();
  } finally { release(); }
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  await expect(loading).toHaveCount(0);
  await expect(page.getByTestId('reduced-motion-toggle')).toBeFocused();
});

test('module load failure offers keyboard retry without losing saved progress', { tag: '@axe' }, async ({ page }) => {
  // Save real progress, then make the module unavailable for the whole attempt.
  await startRoom(page);
  await discover(page, 'invisible-focus');
  await page.keyboard.press('Escape');
  const saved = await page.evaluate(() => localStorage.getItem('keyquest-progress-v1'));
  let unavailable = true;
  let failedRequests = 0;
  await page.route('**/src/GameRouter.tsx*', route => {
    if (!unavailable) return route.continue();
    failedRequests += 1;
    return route.abort('failed');
  });
  await page.reload();
  await expect.poll(() => failedRequests).toBeGreaterThan(0);
  await expect(page.getByTestId('loading-error')).toContainText('application files could not be loaded');
  await expect(page.getByRole('heading', { name: 'Unable to load KeyQuest' })).toBeFocused();
  await expect(page.getByTestId('application-loading')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('keyquest-progress-v1'))).toBe(saved);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry loading' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('start-challenge')).toHaveText(/Resume Midnight Checkout/);
  await page.getByTestId('start-challenge').click();
  await expect(page.getByTestId('room-progress')).toContainText('1 of 4 curses found');
});

test('reset dialog and hint panel have accessible names and pass axe', { tag: '@axe' }, async ({ page }) => {
  await startRoom(page);
  await expect(page.getByRole('region', { name: /challenge sandbox/i })).toBeVisible();
  await page.getByTestId('hint-button').click();
  await expect(page.getByTestId('hint-content')).toBeVisible();
  expect((await new AxeBuilder({ page }).include('[data-testid="hint-panel"]').analyze()).violations).toEqual([]);
  await page.getByTestId('reset-button').click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName(/\S/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('verified focus repair moves keyboard focus to the repaired control', async ({ page }) => {
  await startRoom(page);
  await discover(page, 'invisible-focus');
  await page.getByTestId('repair-invisible-focus').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Verified on the live page')).toBeVisible();
  const buy = page.getByTestId('defect-invisible-focus');
  await expect(buy).toBeFocused();
  expect(await buy.evaluate(el => el.matches(':focus-visible'))).toBe(true);
  expect(await buy.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  await expect(page.getByTestId('room-status')).toContainText('Press Buy Now to light the lantern.');
});

test('failed focus verification awards no progress and recovers with Check again', async ({ page }) => {
  await startRoom(page);
  await page.addStyleTag({ content: '[data-testid="defect-invisible-focus"]:focus { outline: none !important; box-shadow: none !important; }' });
  await discover(page, 'invisible-focus');
  await page.getByTestId('repair-invisible-focus').click();
  await expect(page.getByText('The live check did not pass yet')).toBeVisible();
  await expectCandles(page, 0);
  await expect(page.getByText('Verified on the live page')).toHaveCount(0);
  const retry = page.getByTestId('verify-retry');
  await expect(retry).toBeFocused();
  // A second failure is reported as a new attempt, not silently repeated.
  await retry.click();
  await expect(page.getByTestId('repair-result-invisible-focus')).toContainText('Failed checks: 2');
  await page.evaluate(() => document.querySelectorAll('style').forEach(s => {
    if (s.textContent?.includes('outline: none !important')) s.remove();
  }));
  await retry.click();
  await expect(page.getByText('Verified on the live page')).toBeVisible();
  await expectCandles(page, 1);
});
