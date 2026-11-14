// Run after npm run build and npm run preview -- --host 127.0.0.1 --port 4173.
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const browser = await chromium.launch();
const baseURL = 'http://127.0.0.1:4173/';
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.startupTimes = {};
    new MutationObserver(() => {
      if (document.getElementById('root')?.childElementCount && !window.startupTimes.firstRender) window.startupTimes.firstRender = performance.now();
      if (document.querySelector('[data-testid="application-loading"]') && !window.startupTimes.loading) window.startupTimes.loading = performance.now();
      if (document.querySelector('[data-testid="start-challenge"]') && !window.startupTimes.ready) window.startupTimes.ready = performance.now();
    }).observe(document, { childList: true, subtree: true });
  });
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('**/assets/GameRouter-*.js', async route => { await held; await route.continue(); });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  try {
    await expect(page.getByTestId('application-loading')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  } finally { release(); }
  await expect(page.getByTestId('start-challenge')).toBeVisible();
  const timing = await page.evaluate(() => {
    const assets = performance.getEntriesByType('resource').filter(e => /GameRouter-.*\.(js|css)$/.test(e.name));
    return {
      loadingAfterRenderMs: window.startupTimes.loading - window.startupTimes.firstRender,
      readyAfterAssetsMs: window.startupTimes.ready - Math.max(...assets.map(e => e.responseEnd)),
    };
  });
  expect(timing.loadingAfterRenderMs).toBeLessThan(100);
  expect(timing.readyAfterAssetsMs).toBeGreaterThanOrEqual(0);
  expect(timing.readyAfterAssetsMs).toBeLessThan(500);
  console.log('Production loading, axe, ready:', JSON.stringify(timing));
  await context.close();

  for (const extension of ['js', 'css']) {
    const failureContext = await browser.newContext();
    const failurePage = await failureContext.newPage();
    let failing = true;
    // Vite can request JS once as modulepreload and again as an import.
    // Fail the actual resource until the connection is restored for retry.
    await failurePage.route(`**/assets/GameRouter-*.${extension}`, route => failing ? route.abort('failed') : route.continue());
    await failurePage.goto(baseURL);
    await expect(failurePage.getByTestId('loading-error')).toBeVisible();
    await expect(failurePage.getByRole('heading', { name: 'Unable to load KeyQuest' })).toBeFocused();
    expect((await new AxeBuilder({ page: failurePage }).analyze()).violations).toEqual([]);
    failing = false;
    await failurePage.getByRole('button', { name: 'Retry loading' }).focus();
    await failurePage.keyboard.press('Enter');
    await expect(failurePage.getByTestId('start-challenge')).toBeVisible();
    await expect(failurePage.getByTestId('application-loading')).toHaveCount(0);
    console.log(`Production ${extension} failure, axe, keyboard retry: passed`);
    await failureContext.close();
  }
} finally { await browser.close(); }
