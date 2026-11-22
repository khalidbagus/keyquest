/**
 * The full route through the development built override, from a seeded Pantry save:
 * Apothecary Exit, Moonlit Courtyard, Overgrown Graveyard, Clockworks Passage, Belfry.
 * Requirements: 13.3, 13.4, 13.8, 13.11, 14.4, 15.2, 15.3, 17.1, 17.2, 25.8
 */
import { expect, test, type Page } from './fixtures';
import {
  PROGRESS_KEY,
  ghost,
  holdKeyUntil,
  openClocktower,
  openSeededBelfry,
  playArea,
  roomStatus,
  seedBelfrySave,
  seedSave,
  tabToPlayArea,
  waitForScene,
} from './helpers/clocktower';

// Walking in real time takes a while at software-rendered frame rates.
test.setTimeout(150_000);

async function expectArea(page: Page, area: string, name: string) {
  await expect(playArea(page)).toHaveAttribute('data-area', area, { timeout: 20_000 });
  await expect(page.getByTestId('route-area')).toHaveText(`Area: ${name}`);
}

async function expectGhostAt(page: Page, x: number, y: number) {
  await expect.poll(async () => {
    const g = await ghost(page);
    return { x: g.x, y: g.y };
  }, { timeout: 20_000 }).toEqual({ x, y });
}

/** Resume from the opening screen after a reload. */
async function reloadAndResume(page: Page) {
  await page.reload();
  await page.getByTestId('start-challenge').click();
  await waitForScene(page);
}

test('plays from the Apothecary Exit through the gate into the Belfry and resumes at each Checkpoint', async ({ page }) => {
  await seedSave(page);
  await openClocktower(page);

  // A new route starts at the Apothecary Exit, with every way to play shown at once.
  await expectArea(page, 'apothecary-exit', 'Apothecary Exit');
  await expect(page.getByTestId('route-controls')).toContainText('arrow keys move the Ghost');
  await expect(page.getByTestId('route-controls')).toContainText('Move and Interact buttons');
  await expect(page.getByTestId('route-controls')).toContainText('route panel');
  await expectGhostAt(page, 120, 264);

  // Walk east through the open exit with the keyboard.
  await tabToPlayArea(page);
  await page.keyboard.down('ArrowRight');
  try {
    await expectArea(page, 'courtyard', 'Moonlit Courtyard');
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  await expect(roomStatus(page)).toHaveText('You reach the Moonlit Courtyard. Checkpoint saved.');

  // The lantern and the next Area through the Route_Panel.
  await page.getByRole('button', { name: 'Light the lantern post' }).click();
  await expect(roomStatus(page)).toContainText('lantern is lit');
  await page.getByRole('button', { name: 'Go to the Overgrown Graveyard' }).click();
  await expectArea(page, 'graveyard', 'Overgrown Graveyard');
  await expectGhostAt(page, 100, 360);
  await expect(page.getByTestId('journal-empty')).toHaveText('No clues found yet.');

  // Two Clues, out of route order.
  await page.getByRole('button', { name: 'Read the Thorn plaque' }).click();
  await expect(roomStatus(page)).toContainText('1 of 3 clues found');
  await page.getByRole('button', { name: 'Read the Moon plaque' }).click();
  await expect(roomStatus(page)).toContainText('2 of 3 clues found');
  const journal = page.getByTestId('journal-clues').getByRole('listitem');
  await expect(journal).toHaveText([
    'Moon: The Moon bell wakes the tower first.',
    'Thorn: The Thorn bell rings last, when the others are done.',
  ]);

  // Reload after a Clue, once the autosave (500 ms after a change) has written it:
  // the Ghost is at the last Checkpoint spawn and nothing is lost.
  await expect
    .poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').clocktower?.cluesFound, PROGRESS_KEY))
    .toEqual(['moon', 'thorn']);
  await reloadAndResume(page);
  await expectArea(page, 'graveyard', 'Overgrown Graveyard');
  await expectGhostAt(page, 100, 360);
  await expect(playArea(page)).toHaveAttribute('data-lantern', 'true');
  await expect(page.getByTestId('room-progress')).toContainText('Clues: 2 of 3');
  await expect(journal).toHaveText([
    'Moon: The Moon bell wakes the tower first.',
    'Thorn: The Thorn bell rings last, when the others are done.',
  ]);

  // The third Clue opens the way east.
  await page.getByRole('button', { name: 'Read the Key plaque' }).click();
  await expect(roomStatus(page)).toContainText('3 of 3 clues found');
  await page.getByRole('button', { name: 'Go to the Clockworks Passage' }).click();
  await expectArea(page, 'passage', 'Clockworks Passage');
  await expectGhostAt(page, 100, 400);
  await expect(playArea(page)).toHaveAttribute('data-gate', 'false');

  // Walk into the closed gate: it stops the Ghost below it.
  await tabToPlayArea(page);
  await holdKeyUntil(page, 'ArrowRight', { axis: 'x', atLeast: 470 });
  await page.keyboard.down('ArrowUp');
  try {
    await expect.poll(async () => (await ghost(page)).y, { timeout: 20_000 }).toBe(288);
    await page.waitForTimeout(500);
    expect((await ghost(page)).y).toBe(288);
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await expect(roomStatus(page)).toContainText('The clockworks gate is closed');

  // Enter at the gate opens it and unlocks the shortcut.
  await expect(page.getByTestId('route-nearby')).toContainText('Clockworks gate (Open the gate)');
  await page.keyboard.press('Enter');
  await expect(roomStatus(page)).toHaveText(
    'Clockworks gate: the gate is open. The return shortcut to the Moonlit Courtyard is unlocked.'
  );
  await expect(playArea(page)).toHaveAttribute('data-gate', 'true');
  await expect(page.getByTestId('route-nearby')).toContainText('Clockworks gate (The gate is open)');
  await expect(page.getByTestId('route-shortcut-courtyard')).toBeVisible();
  await expect(page.getByTestId('route-shortcut-passage')).toBeVisible();

  // The open gate has no collision: walk north through it into the Belfry.
  await page.keyboard.down('ArrowUp');
  try {
    await expectArea(page, 'belfry', 'Belfry');
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await expect(roomStatus(page)).toHaveText('You reach the Belfry. Checkpoint saved.');
  await expect(page.getByTestId('room-objective')).toHaveAttribute('data-stage', 'bells-silent');

  // Reload: the Belfry is the last Checkpoint, and the gate and shortcut stay open.
  await reloadAndResume(page);
  await expectArea(page, 'belfry', 'Belfry');
  await expectGhostAt(page, 960, 712);
  await expect(playArea(page)).toHaveAttribute('data-gate', 'true');
  await expect(page.getByTestId('room-progress')).toContainText('Clues: 3 of 3');

  // The shortcut returns to the courtyard spawn, and travel reaches every entered Area.
  await page.getByTestId('route-shortcut-courtyard').click();
  await expectArea(page, 'courtyard', 'Moonlit Courtyard');
  await expectGhostAt(page, 120, 420);
  await expect(page.getByTestId('route-travel').getByRole('button')).toHaveText([
    'Travel to the Apothecary Exit',
    'Travel to the Overgrown Graveyard',
    'Travel to the Clockworks Passage',
    'Travel to the Belfry',
    'Take the shortcut to the Moonlit Courtyard',
    'Take the shortcut to the Clockworks Passage, Belfry side',
  ]);
  await page.getByTestId('route-shortcut-passage').click();
  await expectArea(page, 'passage', 'Clockworks Passage');
  await expectGhostAt(page, 480, 180);
});

// Task 25.3: from a seeded Belfry save with the bell curse verified, so the walk is skipped.
test('rings Moon, Key, Thorn with one out-of-order retry, lights each window, and stays cleared after a reload', async ({ page }) => {
  await seedBelfrySave(page, { verified: true });
  await openSeededBelfry(page);
  const windows = () => expect(playArea(page));
  await windows().toHaveAttribute('data-lit-windows', '0');
  await expect(page.getByTestId('route-bell-progress')).toHaveText('Bells: 0 of 3 bells rung');
  await expect(page.getByTestId('journal-bell-order').getByRole('listitem')).toHaveText([
    'Moon bell',
    'Key bell',
    'Thorn bell',
  ]);

  // The Route_Panel action opens the bell dialog; Ring confirms it.
  await page.getByTestId('route-action-ring-bell-moon').click();
  await expect(page.getByTestId('defect-bell-focus')).toHaveAttribute('data-open', 'true');
  await expect(page.getByRole('heading', { name: 'Ring the Moon bell?' })).toBeVisible();
  await page.getByTestId('bell-ring').click();
  await expect(roomStatus(page)).toHaveText('The Moon bell rings and an apothecary window lights. 1 of 3 bells rung.');
  await windows().toHaveAttribute('data-lit-windows', '1');

  // Out of order: nothing is lost and no window lights.
  await page.getByTestId('bell-control-thorn').click();
  await page.getByTestId('bell-ring').click();
  await expect(roomStatus(page)).toHaveText('The Thorn bell is out of order and does not ring. Ring the Key bell next.');
  await expect(page.getByTestId('route-bell-progress')).toHaveText('Bells: 1 of 3 bells rung');
  await windows().toHaveAttribute('data-lit-windows', '1');

  await page.getByTestId('bell-control-key').click();
  await page.getByTestId('bell-ring').click();
  await expect(roomStatus(page)).toHaveText('The Key bell rings and an apothecary window lights. 2 of 3 bells rung.');
  await windows().toHaveAttribute('data-lit-windows', '2');

  await page.getByTestId('bell-control-thorn').click();
  await page.getByTestId('bell-ring').click();
  await expect(roomStatus(page)).toHaveText('The Thorn bell rings. 3 of 3 bells rung: the apothecary lights are back.');
  await windows().toHaveAttribute('data-lit-windows', '3');
  await expect(page.getByTestId('route-bell-progress')).toHaveText('Bells: 3 of 3 bells rung');
  await expect(page.getByTestId('room-objective')).toHaveAttribute('data-stage', 'restored');
  await expect(page.getByTestId('see-finale')).toBeVisible();

  // Rings save at once; reload resumes at the Door_Selector with the room cleared.
  await expect
    .poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').clocktower?.lightsRestored, PROGRESS_KEY))
    .toBe(true);
  await page.reload();
  await page.getByTestId('start-challenge').click();
  await expect(page.getByRole('heading', { name: 'Choose a door' })).toBeFocused();
  await expect(page.getByTestId('door-clocktower')).toContainText('Cleared');

  // Revisit shows the lights restored and all three windows lit.
  await page.getByTestId('enter-clocktower').click();
  await waitForScene(page);
  await expect(page.getByTestId('route-objective')).toHaveText('Objective: The apothecary lights are back');
  await expect(page.getByTestId('route-bell-progress')).toHaveText('Bells: 3 of 3 bells rung');
  await windows().toHaveAttribute('data-lit-windows', '3');

  await page.getByTestId('see-finale').click();
  await expect(page.getByTestId('level-complete')).toBeVisible();
});

test('a closed exit names the unmet condition and keeps the Ghost in the Area', async ({ page }) => {
  await seedSave(page);
  await openClocktower(page);
  await page.getByRole('button', { name: 'Go to the Moonlit Courtyard' }).click();
  await expectArea(page, 'courtyard', 'Moonlit Courtyard');
  // The lantern is unlit: the east exit is solid.
  await tabToPlayArea(page);
  await holdKeyUntil(page, 'ArrowRight', { axis: 'x', atLeast: 860 });
  await holdKeyUntil(page, 'ArrowUp', { axis: 'y', atMost: 370 });
  await page.keyboard.down('ArrowRight');
  try {
    await expect.poll(async () => (await ghost(page)).x, { timeout: 20_000 }).toBe(892);
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  await expect(roomStatus(page)).toHaveText('The way east is closed. The lantern must be lit before the way opens.');
  await expect(playArea(page)).toHaveAttribute('data-area', 'courtyard');
  // Walking back west always works.
  await expect(page.getByTestId('route-travel').getByRole('button')).toHaveText(['Travel to the Apothecary Exit']);
});
