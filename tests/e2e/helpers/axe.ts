import AxeBuilder from '@axe-core/playwright';
import { test } from '../fixtures';

// Preserve the default integration and every rule. Retain scan evidence,
// including incomplete results, instead of treating zero violations as proof
// that every accessibility requirement has been evaluated.
export default class RecordedAxeBuilder extends AxeBuilder {
  override async analyze() {
    const started = performance.now();
    const result = await super.analyze();
    await test.info().attach('axe-results', {
      body: JSON.stringify({
        url: result.url, engine: result.testEngine, elapsedMs: performance.now() - started,
        violations: result.violations, incomplete: result.incomplete,
        passedRules: result.passes.map(rule => rule.id),
      }, null, 2),
      contentType: 'application/json',
    });
    return result;
  }
}
