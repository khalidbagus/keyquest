/**
 * Adventure Room 2: Potion Pantry.
 * The color-only shelf defect before and after the real repair, the recipe
 * with a wrong ingredient and its removal, keyboard-only and phone play,
 * reduced motion, reload mid-brew, and the room completion.
 */
import { test, expect } from './fixtures';
import AxeBuilder from './helpers/axe';
import { brewLanternPotion, enterPantry, repairShelf, seedClearedCheckout } from './helpers/pantry';

async function focused(page: import('./fixtures').Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el?.dataset.testid ?? el?.dataset.ingredient ?? el?.id;
  });
}

test.beforeEach(async ({ page }) => {
  await seedClearedCheckout(page);
});

test('the shelf defect is real: jars have no names before repair and visible names after', { tag: '@axe' }, async ({ page }) => {
  await enterPantry(page);
  const shelf = '[data-testid="defect-color-only"]';
  const before = await new AxeBuilder({ page }).include(shelf).withRules(['button-name']).analyze();
  expect(before.violations.map((v) => v.id)).toContain('button-name');
  await expect(page.locator('[data-ingredient="moonpetal"]')).toHaveAccessibleName('');
  await expect(page.getByTestId('recipe-card')).toContainText('Moonpetal');
  await expect(page.locator(`${shelf} [data-ingredient-label]`).first()).toBeHidden();

  await repairShelf(page);
  await expect(page.locator('[data-ingredient="moonpetal"]')).toHaveAccessibleName('Moonpetal');
  await expect(page.locator(`${shelf} [data-ingredient-label]`).first()).toBeVisible();
  const after = await new AxeBuilder({ page }).include(shelf).withRules(['button-name']).analyze();
  expect(after.violations).toEqual([]);
  // Payoff: focus lands on the first labelled jar.
  expect(await focused(page)).toBe('bog-moss');
  await page.getByTestId('how-repair-works').locator('summary').click();
  await expect(page.getByTestId('how-repair-works')).toContainText('6 of 6 jars show a visible name');
});

test('pressing a jar before the repair finds the curse instead of adding it', async ({ page }) => {
  await enterPantry(page);
  await page.locator('[data-ingredient="moonpetal"]').click();
  await expect(page.getByTestId('room-status')).toContainText('The shelf shows colors only');
  await expect(page.getByTestId('room-progress')).toContainText('0 of 1 curse lifted');
  await expect(page.getByTestId('repair-card-color-only-ingredients')).toBeVisible();
  await expect(page.getByTestId('cauldron')).toContainText('Empty.');
  await page.locator('[data-ingredient="glowcap"]').click();
  await expect(page.getByTestId('room-status')).toContainText('this jar has no name or symbol');
  await expect(page.getByTestId('cauldron')).toContainText('Empty.');
});

test('lenses: grayscale removes color and X-Ray shows the missing names', { tag: '@axe' }, async ({ page }) => {
  await enterPantry(page);
  await page.getByTestId('vision-mode-grayscale').click();
  const filter = await page.locator('[data-testid="defect-color-only"]').evaluate((el) => getComputedStyle(el.parentElement!).filter);
  expect(filter).toContain('grayscale');
  await page.getByTestId('vision-mode-xray').click();
  await expect(page.getByText('✕ name: ""').first()).toBeVisible();
  expect((await new AxeBuilder({ page }).include('[data-testid="ghost-vision-toolbar"]').analyze()).violations).toEqual([]);
});

test('wrong patch explains why; wrong ingredient turns murky and is removed right away', async ({ page }) => {
  await enterPantry(page);
  await page.getByTestId('inspect-color-only-ingredients').click();
  await page.getByTestId('trap-color-trap-brighter').click();
  await expect(page.getByTestId('trap-feedback-color-only-ingredients')).toContainText('Try another patch');
  await page.getByTestId('repair-color-only').click();
  await expect(page.getByTestId('repair-result-color-only-ingredients')).toContainText('Verified on the live page');

  await page.locator('[data-ingredient="moonpetal"]').click();
  await page.locator('[data-ingredient="bog-moss"]').click();
  await expect(page.locator('[data-mood="murky"]')).toHaveCount(1);
  await expect(page.getByTestId('room-status')).toContainText('the recipe needs Ember salt');
  await expect(page.getByTestId('cauldron')).toContainText('(not this step)');
  // Adding more is blocked until the wrong ingredient is removed.
  await page.locator('[data-ingredient="ember-salt"]').click();
  await expect(page.getByTestId('room-status')).toContainText('Remove the ingredient that does not belong');
  await page.getByRole('button', { name: 'Remove Bog moss' }).click();
  await expect(page.getByTestId('room-status')).toHaveText('Bog moss removed from the cauldron.');
  expect(await focused(page)).toBe('remove-ingredient-0');
  await expect(page.locator('[data-mood="brewing"]')).toHaveCount(1);
});

test('brewing fills the cauldron, offers Bottle beside it, and clears the room', { tag: '@axe' }, async ({ page }) => {
  await enterPantry(page);
  await repairShelf(page);
  await page.locator('[data-ingredient="moonpetal"]').click();
  await expect(page.locator('[data-mood]')).toHaveAttribute('data-level', '1');
  await expect(page.getByTestId('room-progress')).toContainText('1 of 3 steps');
  await page.locator('[data-ingredient="ember-salt"]').click();
  await page.locator('[data-ingredient="glowcap"]').click();
  await expect(page.locator('[data-mood="brewed"]')).toHaveCount(1);
  await expect(page.getByTestId('lantern-potion')).toBeVisible();
  await expect(page.getByTestId('bottle-potion')).toBeFocused();
  await expect(page.getByTestId('recipe-card').locator('li').filter({ hasText: 'in the cauldron' })).toHaveCount(3);
  expect((await new AxeBuilder({ page }).exclude('[data-testid="challenge-sandbox"]').analyze()).violations).toEqual([]);
  expect((await new AxeBuilder({ page }).include('[data-testid="cauldron"]').analyze()).violations).toEqual([]);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'You brewed the lantern potion' })).toBeFocused();
  await expect(page.getByTestId('next-door')).toContainText('Clocktower Gate');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByTestId('completion-doors').click();
  await expect(page.getByRole('heading', { name: 'Choose a door' })).toBeFocused();
  await expect(page.getByTestId('door-pantry')).toHaveAttribute('data-state', 'cleared');
  // The Clocktower is published (Task 26): the bottled potion opens its door.
  await expect(page.getByTestId('door-clocktower')).toHaveAttribute('data-state', 'available');
  await expect(page.getByTestId('doors-progress')).toHaveText('2 of 3 rooms cleared');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('keyboard only: inspect, repair, brew, and bottle', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('#room-heading')).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('inspect-color-only-ingredients');
  await page.keyboard.press('Enter');
  for (const expected of ['trap-color-trap-brighter', 'trap-color-trap-title', 'repair-color-only']) {
    await page.keyboard.press('Tab');
    expect(await focused(page)).toBe(expected);
  }
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('repair-result-color-only-ingredients')).toContainText('Verified on the live page');
  expect(await focused(page)).toBe('bog-moss');
  // Shelf order: Bog moss, Ember salt, Moonpetal, Nightshade, Glowcap, Ash dust.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space'); // Moonpetal
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter'); // Ember salt
  for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('glowcap');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('bottle-potion')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('level-complete')).toBeVisible();
});

test('phone: recipe and Inspect on the first screen, brewing works by touch, no overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await enterPantry(page);
  for (const id of ['recipe-card', 'inspect-color-only-ingredients']) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box!.y + box!.height, id).toBeLessThanOrEqual(667);
  }
  await page.getByTestId('inspect-color-only-ingredients').click();
  await expect(page.getByTestId('repair-color-only')).toBeInViewport({ ratio: 1 });
  await page.getByTestId('repair-color-only').click();
  await expect(page.locator('[data-ingredient="bog-moss"]')).toBeFocused();
  await brewLanternPotion(page);
  await expect(page.getByTestId('bottle-potion')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('[data-mood="brewed"]')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test('a reload mid-brew keeps the repair and the cauldron', async ({ page }) => {
  await enterPantry(page);
  await repairShelf(page);
  await page.locator('[data-ingredient="moonpetal"]').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('keyquest-progress-v1')!).pantry.cauldron)).toEqual(['moonpetal']);
  await page.reload();
  await expect(page.getByTestId('resume-summary')).toContainText('Potion Pantry, 1 of 1 curse lifted, 1 of 3 recipe steps');
  await page.getByTestId('start-challenge').click();
  await expect(page.locator('[data-ingredient="moonpetal"]')).toHaveAccessibleName('Moonpetal');
  await expect(page.getByTestId('cauldron')).toContainText('Moonpetal');
  await page.locator('[data-ingredient="ember-salt"]').click();
  await expect(page.getByTestId('room-progress')).toContainText('2 of 3 steps');
});

test('hints target the shelf curse one clue at a time', async ({ page }) => {
  await enterPantry(page);
  await page.getByTestId('hint-button').click();
  await expect(page.getByTestId('hint-meta')).toContainText('Hint 1 of 3');
  await expect(page.getByTestId('hint-meta')).toContainText('Color-Only Ingredients');
  await page.getByTestId('hint-button').click();
  await expect(page.getByTestId('hint-text')).toContainText('Grayscale');
  await expect(page.getByTestId('room-progress')).toContainText('0 of 1 curse lifted');
});

test('reset clears only the Pantry', async ({ page }) => {
  await enterPantry(page);
  await repairShelf(page);
  await page.locator('[data-ingredient="moonpetal"]').click();
  await page.getByTestId('reset-button').click();
  await expect(page.getByText('Reset Potion Pantry?')).toBeVisible();
  await page.getByTestId('reset-confirm').click();
  await expect(page.locator('[data-ingredient="moonpetal"]')).toHaveAccessibleName('');
  await expect(page.getByTestId('cauldron')).toContainText('Empty.');
  await page.getByTestId('tools-doors').click();
  await expect(page.getByTestId('door-checkout')).toHaveAttribute('data-state', 'cleared');
  await expect(page.getByTestId('door-pantry')).toHaveAttribute('data-state', 'available');
});

for (const mode of ['system', 'toggle'] as const) {
  test(`reduced motion (${mode}): the cauldron fills and brews instantly with the same text`, async ({ page }) => {
    if (mode === 'system') await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    if (mode === 'toggle') await page.getByTestId('reduced-motion-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
    await page.getByTestId('start-challenge').click();
    await repairShelf(page);
    await brewLanternPotion(page);
    const liquid = page.locator('[data-mood] rect').nth(2);
    expect(await liquid.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration))).toBe(0);
    expect(await page.getByTestId('lantern-potion').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await expect(page.getByTestId('room-status')).toContainText('lantern potion brewed');
  });
}
