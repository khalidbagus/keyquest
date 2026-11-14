import { test, expect, type Locator, type Page, type TestInfo } from './fixtures';

// Capture rendered pixels as well as CSS. The companion Python diagnostic
// measures the ring and its neighbours without assuming a solid background.
async function inspectFocus(page: Page, target: Locator, name: string, info: TestInfo) {
  await target.scrollIntoViewIfNeeded();
  await target.focus();
  await expect(target).toBeFocused();
  expect(await target.evaluate(el => el.matches(':focus-visible'))).toBe(true);
  const geometry = await target.boundingBox();
  expect(geometry).not.toBeNull();
  const box = geometry!;
  const viewport = page.viewportSize()!;
  const clip = {
    x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8),
    width: Math.min(viewport.width, box.x + box.width + 8) - Math.max(0, box.x - 8),
    height: Math.min(viewport.height, box.y + box.height + 8) - Math.max(0, box.y - 8),
  };
  await target.evaluate(el => (el as HTMLElement).blur());
  const before = info.outputPath(`${name}-before.png`);
  await page.screenshot({ path: before, clip });
  await target.focus();
  const metrics = await target.evaluate(el => {
    const style = getComputedStyle(el);
    const ancestors = [];
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      const css = getComputedStyle(parent);
      ancestors.push({ tag: parent.tagName, background: css.backgroundColor, image: css.backgroundImage, overflow: css.overflow });
    }
    const rect = el.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const surface = ancestors.find(parent => /^rgb\(/.test(parent.background));
    return {
      outlineColor: style.outlineColor, outlineWidth: parseFloat(style.outlineWidth),
      outlineStyle: style.outlineStyle, outlineOffset: parseFloat(style.outlineOffset),
      background: style.backgroundColor, boxShadow: style.boxShadow, ancestors,
      centerUnobscured: hit !== null && (el === hit || el.contains(hit)),
      surroundingSurface: surface?.background,
    };
  });
  expect(metrics.outlineStyle).toBe('solid');
  expect(metrics.outlineWidth).toBeGreaterThan(0);
  expect(metrics.centerUnobscured).toBe(true);
  const after = info.outputPath(`${name}-after.png`);
  await page.screenshot({ path: after, clip });
  await info.attach(`${name}-focus-metrics`, {
    body: JSON.stringify({ name, box, clip, before, after, ...metrics }, null, 2), contentType: 'application/json',
  });
  if (metrics.surroundingSurface) {
    const luminance = (color: string) => {
      const values = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
        const s = value / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
    };
    const pair = [luminance(metrics.outlineColor), luminance(metrics.surroundingSurface)].sort((a, b) => a - b);
    // A CSS baseline check; screenshots additionally assess shadows and pixels
    // on either side of the ring. This alone is not a full 1.4.11 audit.
    expect((pair[1]! + 0.05) / (pair[0]! + 0.05)).toBeGreaterThanOrEqual(3);
  }
}

async function start(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-challenge').click();
  await expect(page.getByTestId('challenge-sandbox')).toBeVisible();
  await page.mouse.move(0, 0);
  await page.keyboard.press('Tab');
}

test.use({ reducedMotion: 'reduce' });

test('menu and navigation focus indicators remain visible', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  await page.keyboard.press('Tab');
  await inspectFocus(page, page.getByRole('link', { name: 'Skip to main content' }), 'skip-link', info);
  await inspectFocus(page, page.getByTestId('start-challenge'), 'menu-start', info);
  await inspectFocus(page, page.getByTestId('reduced-motion-toggle'), 'motion-toggle', info);
});

test('challenge repair and hint controls have visible keyboard focus', async ({ page }, info) => {
  await start(page);
  await inspectFocus(page, page.getByTestId('emergency-exit'), 'emergency-exit', info);
  await inspectFocus(page, page.getByTestId('reset-button'), 'challenge-reset', info);
  await page.getByTestId('hint-button').click();
  await page.keyboard.press('Tab');
  await inspectFocus(page, page.getByTestId('hint-button'), 'hint', info);
  const card = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Invisible Focus', exact: true }) }).filter({ has: page.getByRole('button', { name: 'Discover Defect' }) }).last();
  await inspectFocus(page, card.getByRole('button', { name: 'Discover Defect' }), 'discover', info);
  await page.keyboard.press('Enter');
  await inspectFocus(page, page.getByTestId('repair-invisible-focus'), 'repair', info);
  // The intentionally broken focus defect stays broken until a repair is applied.
  const broken = page.getByTestId('defect-invisible-focus');
  await broken.focus();
  expect(await broken.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none');
  await page.getByTestId('repair-invisible-focus').click();
  await expect(page.getByText('Live DOM Verification Passed')).toBeVisible();
  await page.keyboard.press('Tab');
  await inspectFocus(page, broken, 'repaired-sandbox-focus', info);
});

test('reset and restore dialog actions have visible keyboard focus', async ({ page }, info) => {
  await start(page);
  await page.getByTestId('reset-button').click();
  await page.keyboard.press('Tab');
  await inspectFocus(page, page.getByRole('button', { name: 'Cancel' }), 'reset-cancel', info);
  await inspectFocus(page, page.getByTestId('reset-confirm'), 'reset-confirm', info);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Discover Defect' }).first().click();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByTestId('progress-restore-dialog')).toBeVisible();
  await page.keyboard.press('Tab');
  await inspectFocus(page, page.getByTestId('restore-progress'), 'restore', info);
  await inspectFocus(page, page.getByTestId('start-fresh'), 'start-fresh', info);
});

test('error recovery controls and details have visible keyboard focus', async ({ page }, info) => {
  await page.route('**/src/components/MidnightCheckout/MidnightCheckout.tsx*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    const pattern = /function MidnightCheckout\([\s\S]*?\)\s*\{/;
    expect(source).toMatch(pattern);
    await route.fulfill({ response, body: source.replace(pattern, '$& throw new Error("Focus assessment render failure");') });
  });
  await page.goto('/');
  await page.getByTestId('start-challenge').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('error-boundary-ui')).toBeVisible();
  await inspectFocus(page, page.getByRole('heading', { name: 'Something Went Wrong' }), 'recovery-heading', info);
  await inspectFocus(page, page.getByText('Technical Details', { exact: true }), 'recovery-details', info);
  await inspectFocus(page, page.getByTestId('error-retry-button'), 'recovery-retry', info);
  await inspectFocus(page, page.getByTestId('error-reset-button'), 'recovery-reset', info);
  await inspectFocus(page, page.getByTestId('error-menu-button'), 'recovery-menu', info);
});
