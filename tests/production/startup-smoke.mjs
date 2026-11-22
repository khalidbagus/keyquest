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

  // The courtyard preview and the built override are development-only (Requirements 4.2, 4.5).
  const flagContext = await browser.newContext();
  const flagPage = await flagContext.newPage();
  const phaserRequests = [];
  flagPage.on('request', request => { if (/phaser|createWorldScene/i.test(request.url())) phaserRequests.push(request.url()); });
  await flagPage.goto(`${baseURL}?preview=courtyard`);
  await expect(flagPage.getByTestId('start-challenge')).toBeVisible();
  await expect(flagPage.getByTestId('play-area')).toHaveCount(0);
  await expect(flagPage.getByTestId('preview-label')).toHaveCount(0);
  expect(new URL(flagPage.url()).searchParams.get('preview')).toBe('courtyard');

  // The Clocktower is published (Task 26): without any override, a Pantry-cleared save
  // shows the door Open, and the menu and door list still request no Phaser code.
  await flagPage.addInitScript(() => {
    if (sessionStorage.getItem('smoke-seeded')) return;
    const now = Date.now();
    const types = ['invisible-focus', 'mouse-only-activation', 'missing-accessible-name', 'insufficient-contrast', 'color-only-ingredients'];
    const defects = {}; const hintsUsed = {};
    for (const type of types) {
      defects[type] = { type, discovered: true, discoveredAt: now - 1000, repaired: true, repairedAt: now - 900, verified: true, verifiedAt: now - 900, hintLevel: 0 };
      hintsUsed[type] = 0;
    }
    localStorage.setItem('keyquest-progress-v1', JSON.stringify({
      version: 2, sessionId: 'smoke', startedAt: now - 5000, lastUpdatedAt: now - 1000, currentRoom: 'pantry',
      defects, hintsUsed,
      checkout: { lanternLit: true, candleAdded: true, orderPlaced: true, keyTaken: true },
      pantry: { cauldron: ['moonpetal', 'ember-salt', 'glowcap'], brewed: true, potionTaken: true },
      isComplete: false, completedAt: null,
    }));
    sessionStorage.setItem('smoke-seeded', '1');
  });
  await flagPage.goto(baseURL);
  await flagPage.getByTestId('start-challenge').click();
  await expect(flagPage.getByRole('heading', { name: 'Choose a door' })).toBeVisible();
  await expect(flagPage.getByTestId('door-clocktower')).toHaveAttribute('data-state', 'available');
  await expect(flagPage.getByTestId('door-clocktower')).toContainText('Open');
  await expect(flagPage.getByTestId('door-clocktower')).not.toContainText('Coming later');
  expect(phaserRequests).toEqual([]);
  console.log('Production preview flag is ignored; published Clocktower door is Open; no Phaser request from the menu or doors: passed');

  // Entering the published room loads the Phaser chunk only now, and the scene is ready.
  await flagPage.getByTestId('enter-clocktower').click();
  await expect(flagPage.getByRole('heading', { name: 'Clocktower Gate', level: 2 })).toBeFocused();
  await expect(flagPage.getByTestId('play-area')).toHaveAttribute('data-scene-state', 'ready', { timeout: 30000 });
  expect(phaserRequests.length).toBeGreaterThan(0);
  expect((await new AxeBuilder({ page: flagPage }).exclude('[data-testid="challenge-sandbox"]').analyze()).violations).toEqual([]);
  console.log('Production Clocktower entry, scene ready, shell axe: passed');
  await flagContext.close();

  // Production still ignores the preview flag with no save: the door is Locked, not previewed.
  const lockedContext = await browser.newContext();
  const lockedPage = await lockedContext.newPage();
  await lockedPage.goto(`${baseURL}?preview=courtyard&built=clocktower`);
  await expect(lockedPage.getByTestId('start-challenge')).toBeVisible();
  await expect(lockedPage.getByTestId('play-area')).toHaveCount(0);
  console.log('Production ignores ?preview=courtyard with a fresh save: passed');
  await lockedContext.close();
} finally { await browser.close(); }
