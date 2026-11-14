// Standalone diagnostic: node tests/diagnostics/axe-isolation.mjs firefox hint default
// Modes compare the integration with direct axe on the SAME loaded page.
import { chromium, firefox, webkit, devices } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import axe from 'axe-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const [engine = 'firefox', scenario = 'hint', mode = 'default', rule] = process.argv.slice(2);
const directory = 'node_modules/.tmp/keyquest-browser-investigation';
await mkdir(directory, { recursive: true });
const device = process.env.KEYQUEST_DIAGNOSTIC_DEVICE === '1';
const name = `${engine}-${scenario}-${mode}${rule ? `-${rule}` : ''}${device ? '-device' : ''}`;
const events = [];
const start = performance.now();
const log = (event, detail) => {
  const entry = { ms: Math.round(performance.now() - start), event, detail };
  events.push(entry);
  console.log(JSON.stringify(entry));
};
let browser;
let context;
let watchdog;
try {
  browser = await ({ chromium, firefox, webkit })[engine].launch();
  log('browser', browser.version());
  for (const currentScenario of scenario.split(',')) {
    log('scenario', currentScenario);
    const profile = devices[{ chromium: 'Desktop Chrome', firefox: 'Desktop Firefox', webkit: 'Desktop Safari' }[engine]];
    context = await browser.newContext(device ? profile : {});
    log('context', { deviceProfile: device, viewport: profile.viewport });
    await context.tracing.start({ screenshots: true, snapshots: true });
    context.on('page', page => {
      page.on('crash', () => log('page-crash', page.url()));
      page.on('pageerror', error => log('pageerror', error.message));
      page.on('console', message => {
        if (message.type() === 'error') log('console-error', message.text());
      });
    });
    const page = await context.newPage();
    if (currentScenario === 'control') {
      await page.setContent('<!doctype html><html lang="en"><head><title>axe control</title></head><body><main><h1>Control</h1><button>Hint</button><p>Simple text</p></main></body></html>');
    } else {
      await page.goto('http://localhost:5173/');
      await page.getByTestId('start-challenge').waitFor();
      if (currentScenario === 'hint' || currentScenario === 'shell') {
        await page.getByTestId('start-challenge').click();
        await page.getByTestId('hint-button').click();
      }
    }
    log('functional-ready', await page.title());
    const scanContext = currentScenario === 'hint' ? { include: [['[data-testid="hint-panel"]']] }
      : currentScenario === 'shell' ? { exclude: [['[data-testid="challenge-sandbox"]']] } : {};
    const options = rule ? { runOnly: { type: 'rule', values: [rule] } } : {};
    let scan;
    if (mode === 'direct' || mode === 'partial') {
      await page.evaluate(axe.source);
      log('injected', axe.version);
      scan = page.evaluate(async ({ scanContext, options, mode }) => {
        if (mode === 'partial') {
          const partial = await window.axe.runPartial(scanContext, options);
          return await window.axe.finishRun([partial], options);
        }
        return await window.axe.run(scanContext, options);
      }, { scanContext, options, mode });
    } else {
      const builder = new AxeBuilder({ page }).options(options);
      if (currentScenario === 'hint') builder.include('[data-testid="hint-panel"]');
      if (currentScenario === 'shell') builder.exclude('[data-testid="challenge-sandbox"]');
      if (mode === 'legacy') builder.setLegacyMode();
      for (const method of ['runPartialRecursive', 'finishRun', 'runLegacy']) {
        const original = builder[method].bind(builder);
        builder[method] = async (...args) => {
          log(`${method}-start`);
          const result = await original(...args);
          log(`${method}-end`);
          return result;
        };
      }
      scan = builder.analyze();
    }
    const result = await Promise.race([
      scan,
      new Promise((_, reject) => { watchdog = setTimeout(() => reject(new Error('Diagnostic scan exceeded 20 seconds')), 20_000); }),
    ]);
    log('result', { violations: result.violations.map(v => v.id), incomplete: result.incomplete.map(v => v.id) });
    clearTimeout(watchdog);
    await context.tracing.stop({ path: `${directory}/${name}-${events.filter(e => e.event === 'result').length}.zip` });
    await context.close();
    context = null;
  }
} catch (error) {
  log('failure', error.stack);
  process.exitCode = 1;
} finally {
  clearTimeout(watchdog);
  if (context) await context.tracing.stop({ path: `${directory}/${name}.zip` }).catch(error => log('trace-error', error.message));
  if (browser) await browser.close();
  await writeFile(`${directory}/${name}.json`, JSON.stringify(events, null, 2));
}
