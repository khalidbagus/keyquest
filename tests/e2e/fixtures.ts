import { test as base } from '@playwright/test';
export { expect, type Page, type Locator, type TestInfo } from '@playwright/test';

export const test = base.extend<{ browserDiagnostics: void }>({
  browserDiagnostics: [async ({ page }, use, info) => {
    const events: { type: string; message: string; url: string }[] = [];
    page.on('pageerror', error => events.push({ type: 'pageerror', message: error.stack || error.message, url: page.url() }));
    page.on('console', message => {
      if (message.type() === 'error') events.push({ type: 'console-error', message: message.text(), url: page.url() });
    });
    page.on('crash', () => events.push({ type: 'crash', message: 'Browser page crashed', url: page.url() }));
    await use();
    if (info.status !== info.expectedStatus) {
      const focus = await page.evaluate(() => ({
        activeElement: document.activeElement?.outerHTML,
        documentHasFocus: document.hasFocus(), visibility: document.visibilityState,
        dialogs: [...document.querySelectorAll('dialog')].map(dialog => ({ id: dialog.id, open: dialog.open })),
      })).catch(error => ({ unavailable: String(error) }));
      await info.attach('failure-focus-state', { body: JSON.stringify(focus, null, 2), contentType: 'application/json' });
    }
    if (events.length) {
      // Expected render-failure tests also record their intentional exceptions.
      await info.attach('browser-diagnostics', { body: JSON.stringify(events, null, 2), contentType: 'application/json' });
    }
  }, { auto: true }],
});
