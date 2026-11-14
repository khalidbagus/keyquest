import { test, expect } from './fixtures';
import AxeBuilder from './helpers/axe';

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
  await page.goto('/');
  await page.getByTestId('start-challenge').click();
  const card = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Invisible Focus', exact: true }) }).filter({ has: page.getByRole('button', { name: 'Discover Defect' }) }).last();
  await card.getByRole('button', { name: 'Discover Defect' }).click();
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
  await expect(page.getByTestId('progress-restore-dialog')).toBeVisible();
  await page.getByTestId('restore-progress').click();
  await expect(page.getByText('1 / 4 discovered')).toBeVisible();
});

test('reset dialog and hint panel have accessible names and pass axe', { tag: '@axe' }, async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-challenge').click();
  await expect(page.getByRole('region', { name: /challenge sandbox/i })).toBeVisible();
  await page.getByTestId('hint-button').click();
  await expect(page.getByTestId('hint-content')).toBeVisible();
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
