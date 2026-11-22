/**
 * The motion pass, read through the DEV test hooks `data-ghost-pose` (inner-sprite
 * pose JSON) and `data-anim` (prop cues playing now). Hooks are sampled inside the
 * page on every animation frame, and each input is timed by the page's own event
 * timestamp, so Playwright round trips are not counted as game latency.
 * Requirements: 23.2, 23.3, 23.4, 23.8, 23.10, 23.11
 */
import { expect, test, type Page } from './fixtures';
import {
  ghost,
  openCourtyardPreview,
  openSeededBelfry,
  playArea,
  roomStatus,
  seedBelfrySave,
  tabToPlayArea,
} from './helpers/clocktower';

interface Pose {
  state: string;
  rotation: number;
  x: number;
  y: number;
  scale: number;
  pulsing: boolean;
}

interface Sample {
  t: number;
  pose: Pose | null;
  anim: string;
}

interface InputEvent {
  type: string;
  key: string;
  testId: string;
  t: number;
}

/** Record the hooks every frame and every keydown and click, in page time. */
async function startSampling(page: Page) {
  await page.evaluate(() => {
    const win = window as unknown as {
      __samples: unknown[];
      __events: unknown[];
      __sampling: boolean;
      __t0: number;
    };
    win.__samples = [];
    win.__events = [];
    win.__sampling = true;
    win.__t0 = performance.now();
    const record = (event: Event) => {
      if (!win.__sampling) return;
      const target = event.target as HTMLElement | null;
      win.__events.push({
        type: event.type,
        key: (event as KeyboardEvent).key ?? '',
        testId: target?.closest?.('[data-testid]')?.getAttribute('data-testid') ?? '',
        t: event.timeStamp - win.__t0,
      });
    };
    document.addEventListener('keydown', record, true);
    document.addEventListener('keyup', record, true);
    document.addEventListener('click', record, true);
    const el = document.querySelector('[data-testid="play-area"]')!;
    const tick = () => {
      if (!win.__sampling) return;
      const raw = el.getAttribute('data-ghost-pose');
      win.__samples.push({
        t: performance.now() - win.__t0,
        pose: raw ? JSON.parse(raw) : null,
        anim: el.getAttribute('data-anim') ?? '',
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function stopSampling(page: Page): Promise<{ samples: Sample[]; events: InputEvent[] }> {
  return page.evaluate(() => {
    const win = window as unknown as { __samples: Sample[]; __events: InputEvent[]; __sampling: boolean };
    win.__sampling = false;
    return { samples: win.__samples, events: win.__events };
  });
}

/** The page time of the first matching input event. */
function eventTime(events: InputEvent[], match: Partial<InputEvent>): number {
  const found = events.find(
    (e) =>
      (match.type === undefined || e.type === match.type) &&
      (match.key === undefined || e.key === match.key) &&
      (match.testId === undefined || e.testId === match.testId)
  );
  if (!found) throw new Error(`no input event ${JSON.stringify(match)}`);
  return found.t;
}

/** First and last sample showing a cue, so its on-screen span can be checked. */
function cueSpan(samples: Sample[], entry: string): { first: number; last: number } {
  const showing = samples.filter((s) => s.anim.split(' ').includes(entry));
  expect(showing.length, `samples showing ${entry}`).toBeGreaterThan(0);
  return { first: showing[0]!.t, last: showing[showing.length - 1]!.t };
}

async function setReducedMotion(page: Page, on: boolean) {
  const toggle = page.getByRole('button', { name: /Reduced Motion:/ });
  const label = (await toggle.textContent()) ?? '';
  if (label.includes(on ? 'On' : 'Off')) return;
  await toggle.click();
  await expect(toggle).toContainText(on ? 'On' : 'Off');
}

async function walkToLantern(page: Page) {
  await page.keyboard.down('ArrowRight');
  try {
    await page.waitForFunction(
      () => document.querySelector('[data-testid="route-nearby"]')?.textContent?.includes('Lantern post') === true,
      undefined,
      { polling: 'raf', timeout: 20_000 }
    );
  } finally {
    await page.keyboard.up('ArrowRight');
  }
}

test.describe('ghost motion', () => {
  test('leans within 100 ms of moving, settles within 300 ms of stopping, then hovers at most 6 px', async ({ page }) => {
    await openCourtyardPreview(page);
    await tabToPlayArea(page);
    await expect
      .poll(async () => JSON.parse((await playArea(page).getAttribute('data-ghost-pose')) ?? '{}').state)
      .toBe('hover');

    await startSampling(page);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(600);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(2600);
    const { samples, events } = await stopSampling(page);
    const down = eventTime(events, { type: 'keydown', key: 'ArrowRight' });
    const upAt = eventTime(events, { type: 'keyup', key: 'ArrowRight' });

    // Lean: a visible tilt toward the east within 100 ms of the key press.
    const firstLean = samples.find((s) => s.t >= down && s.pose?.state === 'lean' && s.pose.rotation > 0.02);
    expect(firstLean, 'a lean sample').toBeTruthy();
    expect(firstLean!.t - down).toBeLessThanOrEqual(100);

    // Settle: zero tilt and offset within 300 ms of release, then the hover resumes.
    const rested = samples.find(
      (s) => s.t >= upAt && s.pose && Math.abs(s.pose.rotation) < 0.001 && Math.abs(s.pose.x) < 0.01
    );
    expect(rested, 'a settled sample').toBeTruthy();
    expect(rested!.t - upAt).toBeLessThanOrEqual(300);
    const hover = samples.filter((s) => s.t > upAt + 300 && s.pose?.state === 'hover');
    expect(hover.length).toBeGreaterThan(0);
    for (const s of hover) {
      expect(s.pose!.y).toBeLessThanOrEqual(0.001);
      expect(s.pose!.y).toBeGreaterThanOrEqual(-6.001);
      expect(Math.abs(s.pose!.rotation)).toBeLessThan(0.001);
    }
    // The hover really bobs.
    expect(Math.min(...hover.map((s) => s.pose!.y))).toBeLessThan(-1);
  });

  test('Interact pulses the scale between 1.05 and 1.15 with no tilt, ending within 300 ms', async ({ page }) => {
    await openCourtyardPreview(page);
    await tabToPlayArea(page);
    await walkToLantern(page);
    await page.waitForTimeout(400);

    await startSampling(page);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    const { samples, events } = await stopSampling(page);
    const at = eventTime(events, { type: 'keydown', key: 'Enter' });

    const during = samples.filter((s) => s.t >= at && s.pose?.pulsing);
    expect(during.length).toBeGreaterThan(0);
    expect(during[0]!.t - at).toBeLessThanOrEqual(100);
    const peak = Math.max(...during.map((s) => s.pose!.scale));
    expect(peak).toBeGreaterThanOrEqual(1.05);
    expect(peak).toBeLessThanOrEqual(1.15);
    // Ends within 300 ms of the press, back at scale 1, with no tilt from the pulse.
    const last = during[during.length - 1]!;
    expect(last.t - at).toBeLessThanOrEqual(300);
    const after = samples.find((s) => s.t > last.t);
    expect(after?.pose?.scale).toBe(1);
    for (const s of during) expect(Math.abs(s.pose!.rotation)).toBeLessThan(0.001);
    await expect(roomStatus(page)).toContainText('lantern is lit');
  });
});

test.describe('success animations', () => {
  test('the lantern warms up within 1500 ms while the Ghost keeps moving', async ({ page }) => {
    await openCourtyardPreview(page);
    await tabToPlayArea(page);
    await startSampling(page);
    await page.getByRole('button', { name: 'Light the lantern post' }).click();
    // The state is final at once: the status and the lit lantern hook do not wait.
    await expect(roomStatus(page)).toContainText('lantern is lit');
    await expect(playArea(page)).toHaveAttribute('data-lantern', 'true');
    // Movement during the cue.
    await playArea(page).focus();
    const startX = (await ghost(page)).x;
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowDown');
    await page.waitForTimeout(1600);
    const { samples, events } = await stopSampling(page);
    const at = eventTime(events, { type: 'click', testId: 'route-action-light-lantern' });

    const span = cueSpan(samples, 'lantern:courtyard-lantern');
    expect(span.last - at).toBeLessThanOrEqual(1500);
    expect(samples[samples.length - 1]!.anim).toBe('none');
    const moved = await ghost(page);
    expect(moved.y).toBeGreaterThan(420);
    expect(moved.x).toBe(startX);
  });

  test('a bell swings and a window lights within 1500 ms, and an out-of-order ring animates nothing', async ({ page }) => {
    await seedBelfrySave(page, { verified: true });
    await openSeededBelfry(page);
    await startSampling(page);

    // Out of order first: rejected, no cue.
    await page.getByTestId('bell-control-thorn').click();
    await page.getByTestId('bell-ring').click();
    await expect(roomStatus(page)).toContainText('out of order');
    await page.waitForTimeout(300);

    await page.getByTestId('bell-control-moon').click();
    await page.getByTestId('bell-ring').click();
    await expect(roomStatus(page)).toContainText('1 of 3 bells rung');
    await expect(playArea(page)).toHaveAttribute('data-lit-windows', '1');
    await page.waitForTimeout(1700);
    const { samples, events } = await stopSampling(page);
    const rings = events.filter((e) => e.type === 'click' && e.testId === 'bell-ring');
    expect(rings).toHaveLength(2);
    const at = rings[1]!.t;

    expect(samples.filter((s) => s.t < at).every((s) => s.anim === 'none')).toBe(true);
    expect(cueSpan(samples, 'bell:bell-moon').last - at).toBeLessThanOrEqual(1500);
    expect(cueSpan(samples, 'window:window-0').last - at).toBeLessThanOrEqual(1500);
    expect(samples[samples.length - 1]!.anim).toBe('none');
  });
});

test.describe('reduced motion', () => {
  test('shows final states at once, with no lean, hover, pulse, or cue', async ({ page }) => {
    await openCourtyardPreview(page);
    await setReducedMotion(page, true);
    await tabToPlayArea(page);
    await startSampling(page);
    await walkToLantern(page);
    await page.keyboard.press('Enter');
    await expect(roomStatus(page)).toContainText('lantern is lit');
    await page.waitForTimeout(300);
    const { samples } = await stopSampling(page);

    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) {
      expect(s.pose?.state).toBe('rest');
      expect(Math.abs(s.pose!.rotation)).toBeLessThan(0.001);
      expect(s.pose!.x).toBe(0);
      expect(s.pose!.y).toBe(0);
      expect(s.pose!.scale).toBe(1);
      expect(s.anim).toBe('none');
    }
    await expect(playArea(page)).toHaveAttribute('data-lantern', 'true');
  });

  test('turning reduced motion on mid-animation jumps the cue to its final state', async ({ page }) => {
    await seedBelfrySave(page, { verified: true });
    await openSeededBelfry(page);
    await page.getByTestId('bell-control-moon').click();
    await page.getByTestId('bell-ring').click();
    await expect(playArea(page)).toHaveAttribute('data-anim', /bell:bell-moon/);
    await startSampling(page);
    await setReducedMotion(page, true);
    await page.waitForTimeout(300);
    const { samples, events } = await stopSampling(page);
    const at = eventTime(events, { type: 'click' });
    // The first sample after the toggle that shows no cue, and nothing plays after it.
    const cleared = samples.find((s) => s.t >= at && s.anim === 'none');
    expect(cleared, 'a sample with the cue finished').toBeTruthy();
    expect(cleared!.t - at).toBeLessThanOrEqual(100);
    expect(samples.filter((s) => s.t > cleared!.t).every((s) => s.anim === 'none')).toBe(true);
    await expect(playArea(page)).toHaveAttribute('data-lit-windows', '1');
    expect(samples.at(-1)!.pose?.state).toBe('rest');
  });
});
