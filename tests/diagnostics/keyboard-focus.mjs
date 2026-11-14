import { chromium, firefox, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const engine = process.argv[2] || 'webkit';
const browser = await ({ chromium, firefox, webkit })[engine].launch();
const context = await browser.newContext();
const page = await context.newPage();
const events = [];
const record = async name => {
  const state = await page.evaluate(() => ({
    activeElement: document.activeElement?.outerHTML.slice(0, 300),
    hasFocus: document.hasFocus(), visibility: document.visibilityState,
    focusEvents: window.focusEvents,
  }));
  events.push({ name, ...state });
  console.log(JSON.stringify(events.at(-1)));
};
try {
  await page.setContent('<!doctype html><html><head><title>Keyboard control</title></head><body><a id="skip" href="#main">Skip</a><main id="main"><button id="start">Start</button><button id="reset">Reset</button></main></body></html>');
  await record('control-initial');
  for (let i = 1; i <= 3; i++) {
    await page.keyboard.press('Tab');
    await record(`control-tab-${i}`);
  }
  await page.goto('http://localhost:5173/');
  await page.getByTestId('start-challenge').waitFor();
  await page.evaluate(() => {
    window.focusEvents = [];
    document.addEventListener('focusin', event => window.focusEvents.push(event.target.outerHTML.slice(0, 160)));
  });
  await record('app-ready');
  await page.keyboard.press('Tab');
  await record('app-first-tab');
  await page.bringToFront();
  await page.getByRole('link', { name: 'Skip to main content' }).focus();
  await record('app-link-explicit-focus');
  await page.keyboard.press('Tab');
  await record('app-next-tab');
  await page.getByTestId('start-challenge').click();
  await page.getByTestId('reset-button').click();
  await record('reset-open');
  await page.getByTestId('reset-cancel').click();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await record('reset-cancel-settled');
} finally {
  await browser.close();
  const directory = 'node_modules/.tmp/keyquest-browser-investigation';
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/${engine}-keyboard-control.json`, JSON.stringify(events, null, 2));
}
