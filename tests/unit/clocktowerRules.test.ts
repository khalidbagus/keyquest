/**
 * World_Action rules for the whole route.
 * Requirements: 2.4, 2.5, 3.3, 3.5, 3.8, 8.9, 13.3, 13.8, 13.10, 14.2, 14.5, 14.6,
 * 15.1, 15.3, 15.4, 15.6, 15.7, 17.1, 24.2, 24.3
 */
import { describe, expect, it } from 'vitest';
import {
  INITIAL_CLOCKTOWER_STATE,
  actionForInteractable,
  bellProgressText,
  createInitialClocktowerState,
  evaluateWorldAction,
  getAvailableActions,
  getClocktowerStage,
  getObjective,
  getTravelOptions,
  hasClocktowerProgress,
  interactablePrompt,
  journalClues,
  resumeSession,
} from '../../src/engines/clocktowerRules';
import { COURTYARD, GRAVEYARD, PASSAGE } from '../../src/registry/clocktowerRoute';
import type {
  AreaId,
  ClocktowerState,
  RulesContext,
  WorldAction,
  WorldSession,
} from '../../src/types/clocktower';

const SESSION: WorldSession = { area: 'courtyard', arrival: { spawn: 'courtyard-west', seq: 1 } };
const PREVIEW: RulesContext = { potionHeld: true, bellCurseVerified: false, previewCourtyardOnly: true };
const CAMPAIGN: RulesContext = { ...PREVIEW, previewCourtyardOnly: false };
const NO_POTION: RulesContext = { ...PREVIEW, potionHeld: false };

function at(area: AreaId, spawn = 'x', seq = 1): WorldSession {
  return { area, arrival: { spawn, seq } };
}

function evaluate(
  action: WorldAction | unknown,
  state: ClocktowerState = createInitialClocktowerState(),
  ctx: RulesContext = PREVIEW,
  session: WorldSession = SESSION
) {
  return evaluateWorldAction(state, session, ctx, action as WorldAction);
}

function state(patch: Partial<ClocktowerState>): ClocktowerState {
  return { ...createInitialClocktowerState(), ...patch };
}

const LIT = state({ checkpoints: ['apothecary-exit', 'courtyard'], lastCheckpoint: 'courtyard', lanternLit: true });
const IN_GRAVEYARD = state({
  checkpoints: ['apothecary-exit', 'courtyard', 'graveyard'],
  lastCheckpoint: 'graveyard',
  lanternLit: true,
});
const ALL_CLUES = { ...IN_GRAVEYARD, cluesFound: ['moon', 'thorn', 'key'] } as ClocktowerState;

describe('light-lantern', () => {
  it('is accepted with the potion and lights the lantern in one message', () => {
    const result = evaluate({ type: 'light-lantern' });
    expect(result.outcome.kind).toBe('changed');
    expect(result.state.lanternLit).toBe(true);
    if (result.outcome.kind !== 'changed') throw new Error('expected changed');
    expect(result.outcome.message).toMatch(/lantern is lit/i);
    expect(result.outcome.message).toMatch(/way toward the Overgrown Graveyard is open/i);
    expect(result.outcome.celebrate).toBe(true);
    expect(result.outcome.effect?.kind).toBe('lantern');
  });

  it('does not mutate its input state', () => {
    const initial = createInitialClocktowerState();
    evaluate({ type: 'light-lantern' }, initial);
    expect(initial).toEqual(INITIAL_CLOCKTOWER_STATE);
  });

  it('is rejected without the potion and names the potion', () => {
    const initial = createInitialClocktowerState();
    const result = evaluate({ type: 'light-lantern' }, initial, NO_POTION);
    expect(result.outcome.kind).toBe('rejected');
    if (result.outcome.kind !== 'rejected') throw new Error('expected rejected');
    expect(result.outcome.reason).toBe('no-potion');
    expect(result.outcome.missing).toEqual(['lantern potion']);
    expect(result.outcome.message).toContain('lantern potion');
    expect(result.state).toBe(initial);
  });

  it('is a repeat when the lantern is already lit', () => {
    const lit = state({ lanternLit: true });
    const result = evaluate({ type: 'light-lantern' }, lit);
    expect(result.outcome).toEqual({ kind: 'repeat', message: 'The lantern is already lit.' });
    expect(result.state).toBe(lit);
    expect(result.session).toBe(SESSION);
  });

  it('repeating a successful action returns a repeat with no celebrate or save', () => {
    const first = evaluate({ type: 'light-lantern' });
    const second = evaluate({ type: 'light-lantern' }, first.state);
    expect(second.outcome.kind).toBe('repeat');
    expect(second.outcome).not.toHaveProperty('celebrate');
    expect(second.outcome).not.toHaveProperty('saveNow');
  });

  it('is rejected outside the courtyard', () => {
    const initial = createInitialClocktowerState();
    const result = evaluate({ type: 'light-lantern' }, initial, CAMPAIGN, at('apothecary-exit'));
    expect(result.outcome).toMatchObject({ kind: 'rejected', reason: 'unreachable' });
    expect(result.state).toBe(initial);
  });
});

describe('invalid actions', () => {
  const initial = createInitialClocktowerState();

  it.each([
    ['unknown action type', { type: 'dance' }],
    ['a missing action', undefined],
    ['null', null],
    ['unknown clue id', { type: 'find-clue', clue: 'sun' }],
    ['unknown bell id', { type: 'ring-bell', bell: 'gong' }],
    ['unknown area id', { type: 'enter-area', area: 'moon', spawn: 'courtyard-west' }],
    ['unknown spawn id in a defined area', { type: 'enter-area', area: 'courtyard', spawn: 'nowhere' }],
    ['a spawn from another area', { type: 'enter-area', area: 'graveyard', spawn: 'courtyard-west' }],
    ['a non-string spawn', { type: 'enter-area', area: 'graveyard', spawn: 4 }],
    ['an inherited object key as spawn', { type: 'enter-area', area: 'courtyard', spawn: 'toString' }],
  ])('returns invalid and the same state objects for %s', (_name, action) => {
    const result = evaluate(action, initial, CAMPAIGN);
    expect(result.outcome.kind).toBe('invalid');
    expect(result.state).toBe(initial);
    expect(result.session).toBe(SESSION);
  });

});

describe('ring-bell (task 24.2)', () => {
  const VERIFIED: RulesContext = { ...CAMPAIGN, bellCurseVerified: true };
  const BELFRY_STATE: ClocktowerState = {
    ...ALL_CLUES,
    checkpoints: ['apothecary-exit', 'courtyard', 'graveyard', 'passage', 'belfry'],
    lastCheckpoint: 'belfry',
    gateOpen: true,
    shortcutUnlocked: true,
  };
  const BELFRY = at('belfry', 'belfry-south');
  const ring = (bell: 'moon' | 'key' | 'thorn', from: ClocktowerState, ctx: RulesContext = VERIFIED) =>
    evaluate({ type: 'ring-bell', bell }, from, ctx, BELFRY);

  it('is rejected as jammed while the curse is not verified, and records nothing', () => {
    const result = ring('moon', BELFRY_STATE, CAMPAIGN);
    expect(result.outcome).toMatchObject({ kind: 'rejected', reason: 'jammed' });
    expect(result.outcome.message).toMatch(/rope is jammed/i);
    expect(result.state).toBe(BELFRY_STATE);
  });

  it('is rejected while the gate is closed', () => {
    const result = ring('moon', ALL_CLUES);
    expect(result.outcome).toMatchObject({ kind: 'rejected', reason: 'gate-closed' });
    expect(result.state).toBe(ALL_CLUES);
  });

  it('records the next bell in the sequence, names it, and saves', () => {
    const result = ring('moon', BELFRY_STATE);
    expect(result.state.bellRings).toEqual(['moon']);
    expect(result.state.lightsRestored).toBe(false);
    if (result.outcome.kind !== 'changed') throw new Error('expected changed');
    expect(result.outcome.message).toBe('The Moon bell rings and an apothecary window lights. 1 of 3 bells rung.');
    expect(result.outcome.celebrate).toBe(false);
    expect(result.outcome.saveNow).toBe(true);
    expect(result.outcome.effect).toMatchObject({ kind: 'bell', target: 'bell-moon' });
    expect(BELFRY_STATE.bellRings).toEqual([]);
  });

  it('rejects an out-of-order bell, keeps every earlier ring, and names the next bell', () => {
    const afterMoon = ring('moon', BELFRY_STATE).state;
    const result = ring('thorn', afterMoon);
    expect(result.outcome).toMatchObject({ kind: 'rejected', reason: 'out-of-order', missing: ['Key bell'] });
    expect(result.outcome.message).toBe('The Thorn bell is out of order and does not ring. Ring the Key bell next.');
    expect(result.state).toBe(afterMoon);
    expect(result.state.bellRings).toEqual(['moon']);
  });

  it('treats a bell that already rang as out of order without removing it', () => {
    const afterMoon = ring('moon', BELFRY_STATE).state;
    const result = ring('moon', afterMoon);
    expect(result.outcome).toMatchObject({ kind: 'rejected', reason: 'out-of-order' });
    expect(result.outcome.message).toContain('Ring the Key bell next.');
    expect(result.state).toBe(afterMoon);
  });

  it('leaves the sequence unchanged when the dialog is cancelled (no action is evaluated)', () => {
    // Cancel dispatches nothing, so the state object is the one from the last ring.
    const afterMoon = ring('moon', BELFRY_STATE).state;
    const afterCancel = afterMoon;
    expect(ring('key', afterCancel).state.bellRings).toEqual(['moon', 'key']);
  });

  it('restores the lights on the third correct ring with one celebrate', () => {
    const afterKey = ring('key', ring('moon', BELFRY_STATE).state).state;
    const result = ring('thorn', afterKey);
    expect(result.state.bellRings).toEqual(['moon', 'key', 'thorn']);
    expect(result.state.lightsRestored).toBe(true);
    if (result.outcome.kind !== 'changed') throw new Error('expected changed');
    expect(result.outcome.message).toBe('The Thorn bell rings. 3 of 3 bells rung: the apothecary lights are back.');
    expect(result.outcome.celebrate).toBe(true);
    expect(result.outcome.effect).toMatchObject({ kind: 'lights', target: 'bell-thorn' });
  });

  it('changes nothing after the lights, whatever bell rings', () => {
    const lit = ring('thorn', ring('key', ring('moon', BELFRY_STATE).state).state).state;
    for (const bell of ['moon', 'key', 'thorn'] as const) {
      const result = ring(bell, lit);
      expect(result.outcome).toEqual({
        kind: 'repeat',
        message: 'The apothecary lights are already back. The bells have done their work.',
      });
      expect(result.state).toBe(lit);
    }
    // Even without the curse verified, the lights stay.
    expect(ring('moon', lit, CAMPAIGN).state).toBe(lit);
  });

  it('offers only the next bell in the Route_Panel once the curse is verified', () => {
    expect(getAvailableActions(BELFRY_STATE, BELFRY, CAMPAIGN).map((a) => a.label)).toEqual([]);
    expect(getAvailableActions(BELFRY_STATE, BELFRY, VERIFIED).map((a) => a.action)).toEqual([
      { type: 'ring-bell', bell: 'moon' },
    ]);
    const afterMoon = ring('moon', BELFRY_STATE).state;
    expect(getAvailableActions(afterMoon, BELFRY, VERIFIED).map((a) => a.label)).toEqual(['Ring the Key bell']);
  });

  it('shows the bell progress text from 0 to 3', () => {
    expect(bellProgressText(BELFRY_STATE)).toBe('0 of 3 bells rung');
    const afterMoon = ring('moon', BELFRY_STATE).state;
    expect(bellProgressText(afterMoon)).toBe('1 of 3 bells rung');
    const lit = ring('thorn', ring('key', afterMoon).state).state;
    expect(bellProgressText(lit)).toBe('3 of 3 bells rung');
  });

  it('walks the Belfry stages from silent bells to restored lights', () => {
    expect(getClocktowerStage(BELFRY_STATE, false, false)).toBe('bells-silent');
    expect(getClocktowerStage(BELFRY_STATE, false, true)).toBe('ring-bells');
    const lit = ring('thorn', ring('key', ring('moon', BELFRY_STATE).state).state).state;
    expect(getClocktowerStage(lit, false, true)).toBe('restored');
    expect(getObjective(lit, false, true).instruction).toContain('See the finale');
  });
});

describe('enter-area in the courtyard preview', () => {
  it('rejects the Overgrown Graveyard as unreachable with the later-checkpoint message', () => {
    const initial = createInitialClocktowerState();
    const result = evaluate({ type: 'enter-area', area: 'graveyard', spawn: 'graveyard-west' }, initial);
    expect(result.outcome).toMatchObject({
      kind: 'rejected',
      reason: 'unreachable',
      message: 'The Overgrown Graveyard opens in a later checkpoint.',
    });
    expect(result.state).toBe(initial);
    expect(result.session).toBe(SESSION);
  });

  it('keeps the preview in the courtyard when walking west', () => {
    const result = evaluate({ type: 'enter-area', area: 'apothecary-exit', spawn: 'apothecary-east-side' });
    expect(result.outcome).toMatchObject({
      kind: 'rejected',
      message: 'The courtyard preview stays in the Moonlit Courtyard.',
    });
  });

  it('treats the current Area as a repeat', () => {
    const result = evaluate({ type: 'enter-area', area: 'courtyard', spawn: 'courtyard-west' });
    expect(result.outcome.kind).toBe('repeat');
  });

  it('offers no travel buttons', () => {
    expect(getTravelOptions(LIT, SESSION, PREVIEW)).toEqual([]);
  });
});

describe('enter-area on the route', () => {
  const start = createInitialClocktowerState();
  const apothecary = at('apothecary-exit', 'apothecary-start');

  it('walks east into the courtyard and records both Areas as Checkpoints with a save', () => {
    const result = evaluate({ type: 'enter-area', area: 'courtyard', spawn: 'courtyard-west' }, start, CAMPAIGN, apothecary);
    expect(result.outcome).toMatchObject({ kind: 'changed', saveNow: true });
    expect(result.state.checkpoints).toEqual(['apothecary-exit', 'courtyard']);
    expect(result.state.lastCheckpoint).toBe('courtyard');
    expect(result.session).toEqual({ area: 'courtyard', arrival: { spawn: 'courtyard-west', seq: 2 } });
    if (result.outcome.kind !== 'changed') throw new Error('expected changed');
    expect(result.outcome.message).toBe('You reach the Moonlit Courtyard. Checkpoint saved.');
  });

  it('rejects the graveyard through the closed courtyard exit and names the lantern', () => {
    const before = state({ checkpoints: ['apothecary-exit', 'courtyard'], lastCheckpoint: 'courtyard' });
    const result = evaluate({ type: 'enter-area', area: 'graveyard', spawn: 'graveyard-west' }, before, CAMPAIGN);
    expect(result.outcome).toMatchObject({
      kind: 'rejected',
      reason: 'lantern-unlit',
      message: 'The way east is closed. The lantern must be lit before the way opens.',
    });
    expect(result.state).toBe(before);
    expect(result.session).toBe(SESSION);
  });

  it('rejects the passage until three Clues are found and names the missing ones', () => {
    const some = { ...IN_GRAVEYARD, cluesFound: ['thorn'] } as ClocktowerState;
    const result = evaluate(
      { type: 'enter-area', area: 'passage', spawn: 'passage-west' },
      some,
      CAMPAIGN,
      at('graveyard', 'graveyard-west')
    );
    expect(result.outcome).toMatchObject({ kind: 'rejected', reason: 'clues-missing', missing: ['Moon', 'Key'] });
    if (result.outcome.kind !== 'rejected') throw new Error('expected rejected');
    expect(result.outcome.message).toBe('The way east is closed. Find the missing clues first: Moon and Key.');
  });

  it('rejects the belfry while the gate is closed', () => {
    const inPassage = { ...ALL_CLUES, checkpoints: [...ALL_CLUES.checkpoints, 'passage'] } as ClocktowerState;
    const result = evaluate(
      { type: 'enter-area', area: 'belfry', spawn: 'belfry-south' },
      inPassage,
      CAMPAIGN,
      at('passage', 'passage-west')
    );
    expect(result.outcome).toMatchObject({ kind: 'rejected', reason: 'gate-closed' });
  });

  it('does not move the last Checkpoint when entering a known Area', () => {
    const result = evaluate(
      { type: 'enter-area', area: 'courtyard', spawn: 'courtyard-east-side' },
      IN_GRAVEYARD,
      CAMPAIGN,
      at('graveyard', 'graveyard-west')
    );
    expect(result.outcome).toMatchObject({ kind: 'changed', saveNow: false });
    expect(result.state).toBe(IN_GRAVEYARD);
    expect(result.session.area).toBe('courtyard');
  });

  it('travels to any entered Area at its entry spawn and rejects one never entered', () => {
    const travel = evaluate(
      { type: 'enter-area', area: 'apothecary-exit', spawn: 'apothecary-start' },
      IN_GRAVEYARD,
      CAMPAIGN,
      at('graveyard', 'graveyard-west')
    );
    expect(travel.outcome.kind).toBe('changed');
    expect(travel.session).toMatchObject({ area: 'apothecary-exit', arrival: { spawn: 'apothecary-start' } });

    const unknown = evaluate(
      { type: 'enter-area', area: 'passage', spawn: 'passage-west' },
      LIT,
      CAMPAIGN,
      SESSION
    );
    expect(unknown.outcome).toMatchObject({ kind: 'rejected', reason: 'unreachable' });
  });

  it('offers travel buttons for entered Areas only, in route order', () => {
    const options = getTravelOptions(IN_GRAVEYARD, at('graveyard'), CAMPAIGN);
    expect(options.map((option) => option.label)).toEqual([
      'Travel to the Apothecary Exit',
      'Travel to the Moonlit Courtyard',
    ]);
    expect(options.every((option) => option.kind === 'travel')).toBe(true);
  });
});

describe('find-clue', () => {
  const graveyard = at('graveyard', 'graveyard-west');

  it('records each Clue in route order and reports the name, text, and count', () => {
    const key = evaluate({ type: 'find-clue', clue: 'key' }, IN_GRAVEYARD, CAMPAIGN, graveyard);
    expect(key.state.cluesFound).toEqual(['key']);
    if (key.outcome.kind !== 'changed') throw new Error('expected changed');
    expect(key.outcome.message).toBe('Key clue found: “The Key bell answers the Moon.” 1 of 3 clues found.');

    const moon = evaluate({ type: 'find-clue', clue: 'moon' }, key.state, CAMPAIGN, graveyard);
    expect(moon.state.cluesFound).toEqual(['moon', 'key']);
    if (moon.outcome.kind !== 'changed') throw new Error('expected changed');
    expect(moon.outcome.message).toContain('2 of 3 clues found');
  });

  it.each([
    [['moon', 'thorn', 'key']],
    [['key', 'thorn', 'moon']],
    [['thorn', 'moon', 'key']],
  ] as const)('finds all three in the order %j and stores them as Moon, Thorn, Key', (order) => {
    let current = IN_GRAVEYARD;
    for (const clue of order) {
      current = evaluate({ type: 'find-clue', clue }, current, CAMPAIGN, graveyard).state;
    }
    expect(current.cluesFound).toEqual(['moon', 'thorn', 'key']);
    expect(journalClues(current).map((clue) => clue.label)).toEqual(['Moon', 'Thorn', 'Key']);
  });

  it('repeats the name and text for a found Clue and leaves the state unchanged', () => {
    const found = { ...IN_GRAVEYARD, cluesFound: ['moon'] } as ClocktowerState;
    const result = evaluate({ type: 'find-clue', clue: 'moon' }, found, CAMPAIGN, graveyard);
    expect(result.outcome).toEqual({
      kind: 'repeat',
      message: 'Moon clue: “The Moon bell wakes the tower first.” You already found this clue.',
    });
    expect(result.state).toBe(found);
  });

  it('is rejected outside the graveyard', () => {
    const result = evaluate({ type: 'find-clue', clue: 'moon' }, LIT, CAMPAIGN, SESSION);
    expect(result.outcome).toMatchObject({ kind: 'rejected', reason: 'unreachable' });
  });
});

describe('open-gate', () => {
  const passage = at('passage', 'passage-west');

  it.each([
    [[], ['Moon', 'Thorn', 'Key'], 'The gate stays shut. Still missing: the Moon, Thorn, and Key clues.'],
    [['moon'], ['Thorn', 'Key'], 'The gate stays shut. Still missing: the Thorn and Key clues.'],
    [['moon', 'key'], ['Thorn'], 'The gate stays shut. Still missing: the Thorn clue.'],
  ] as const)('is rejected with clues %j and names %j', (found, missing, message) => {
    const before = { ...IN_GRAVEYARD, cluesFound: [...found] } as ClocktowerState;
    const result = evaluate({ type: 'open-gate' }, before, CAMPAIGN, passage);
    expect(result.outcome).toEqual({ kind: 'rejected', reason: 'clues-missing', missing, message });
    expect(result.state).toBe(before);
  });

  it('opens the gate and unlocks the shortcut in the same update', () => {
    const result = evaluate({ type: 'open-gate' }, ALL_CLUES, CAMPAIGN, passage);
    expect(result.state.gateOpen).toBe(true);
    expect(result.state.shortcutUnlocked).toBe(true);
    expect(result.outcome).toMatchObject({
      kind: 'changed',
      message: 'Clockworks gate: the gate is open. The return shortcut to the Moonlit Courtyard is unlocked.',
    });
  });

  it('is a repeat once open', () => {
    const open = { ...ALL_CLUES, gateOpen: true, shortcutUnlocked: true };
    const result = evaluate({ type: 'open-gate' }, open, CAMPAIGN, passage);
    expect(result.outcome).toEqual({ kind: 'repeat', message: 'The gate is already open.' });
    expect(result.state).toBe(open);
  });

  it('offers the two shortcut buttons only while unlocked, and they work from anywhere', () => {
    const open = {
      ...ALL_CLUES,
      checkpoints: ['apothecary-exit', 'courtyard', 'graveyard', 'passage'],
      gateOpen: true,
      shortcutUnlocked: true,
    } as ClocktowerState;
    expect(getTravelOptions(ALL_CLUES, passage, CAMPAIGN).some((o) => o.kind === 'shortcut')).toBe(false);
    const shortcuts = getTravelOptions(open, passage, CAMPAIGN).filter((o) => o.kind === 'shortcut');
    expect(shortcuts.map((o) => [o.action.area, o.action.spawn])).toEqual([
      ['courtyard', 'courtyard-west'],
      ['passage', 'passage-belfry-side'],
    ]);
    // From the west side of the passage to the Belfry side of the gate.
    const jump = evaluate(shortcuts[1]!.action, open, CAMPAIGN, passage);
    expect(jump.outcome.kind).toBe('changed');
    expect(jump.session.arrival.spawn).toBe('passage-belfry-side');
    // The same target is rejected before the shortcut is unlocked.
    const locked = evaluate(shortcuts[0]!.action, { ...open, shortcutUnlocked: false }, CAMPAIGN, at('belfry'));
    expect(locked.outcome.kind).toBe('changed'); // the courtyard is still a travel target
    // From the courtyard, the Belfry side of the gate is reachable only by the shortcut.
    const lockedPassage = evaluate(shortcuts[1]!.action, { ...open, shortcutUnlocked: false }, CAMPAIGN, SESSION);
    expect(lockedPassage.outcome).toMatchObject({ kind: 'rejected', reason: 'unreachable' });
  });
});

describe('objective, prompts, and available actions', () => {
  it('gives identical objectives and actions for identical states', () => {
    const a = createInitialClocktowerState();
    const b = createInitialClocktowerState();
    expect(getObjective(a)).toEqual(getObjective(b));
    expect(getAvailableActions(a, SESSION, PREVIEW)).toEqual(getAvailableActions(b, SESSION, PREVIEW));
  });

  it('offers the lantern action while the lantern is unlit and the potion is held', () => {
    const actions = getAvailableActions(createInitialClocktowerState(), SESSION, PREVIEW);
    expect(actions).toEqual([
      { action: { type: 'light-lantern' }, label: 'Light the lantern post', interactable: 'courtyard-lantern' },
    ]);
  });

  it('offers no action in the preview without the potion or after the lantern is lit', () => {
    expect(getAvailableActions(createInitialClocktowerState(), SESSION, NO_POTION)).toEqual([]);
    expect(getAvailableActions(state({ lanternLit: true }), SESSION, PREVIEW)).toEqual([]);
  });

  it('offers the move into the next Area once its exit opens', () => {
    const labels = getAvailableActions(LIT, SESSION, CAMPAIGN).map((a) => a.label);
    expect(labels).toEqual(['Go to the Overgrown Graveyard']);
    const graveyardLabels = getAvailableActions(IN_GRAVEYARD, at('graveyard'), CAMPAIGN).map((a) => a.label);
    expect(graveyardLabels).toEqual(['Read the Moon plaque', 'Read the Thorn plaque', 'Read the Key plaque']);
    const allLabels = getAvailableActions(ALL_CLUES, at('graveyard'), CAMPAIGN).map((a) => a.label);
    expect(allLabels).toEqual(['Go to the Clockworks Passage']);
  });

  it('walks the stages from the apothecary to the belfry', () => {
    expect(getClocktowerStage(createInitialClocktowerState())).toBe('leave-apothecary');
    expect(getClocktowerStage(state({ checkpoints: ['apothecary-exit', 'courtyard'] }))).toBe('light-lantern');
    expect(getClocktowerStage(LIT)).toBe('find-clues');
    expect(getClocktowerStage(ALL_CLUES)).toBe('open-gate');
    expect(getClocktowerStage({ ...ALL_CLUES, gateOpen: true, shortcutUnlocked: true })).toBe('reach-belfry');
    expect(
      getClocktowerStage({
        ...ALL_CLUES,
        checkpoints: ['apothecary-exit', 'courtyard', 'graveyard', 'passage', 'belfry'],
        gateOpen: true,
        shortcutUnlocked: true,
      })
    ).toBe('bells-silent');
    // The preview keeps its own two stages.
    expect(getClocktowerStage(createInitialClocktowerState(), true)).toBe('light-lantern');
    expect(getClocktowerStage(state({ lanternLit: true }), true)).toBe('lantern-lit');
  });

  it('changes the Nearby prompt once the action is done', () => {
    const lantern = COURTYARD.interactables[0]!;
    expect(interactablePrompt(lantern, createInitialClocktowerState())).toBe('Light the lantern');
    expect(interactablePrompt(lantern, LIT)).toBe('The lantern is lit');
    const moon = GRAVEYARD.interactables.find((item) => item.id === 'clue-moon')!;
    expect(interactablePrompt(moon, IN_GRAVEYARD)).toBe('Read the plaque');
    expect(interactablePrompt(moon, ALL_CLUES)).toBe('Clue found. Read it again');
    const gate = PASSAGE.interactables[0]!;
    expect(interactablePrompt(gate, ALL_CLUES)).toBe('Open the gate');
    expect(interactablePrompt(gate, { ...ALL_CLUES, gateOpen: true })).toBe('The gate is open');
  });

  it('maps Interactables to actions', () => {
    expect(actionForInteractable('courtyard-lantern')).toEqual({ type: 'light-lantern' });
    expect(actionForInteractable('clue-thorn')).toEqual({ type: 'find-clue', clue: 'thorn' });
    expect(actionForInteractable('passage-gate')).toEqual({ type: 'open-gate' });
    expect(actionForInteractable('bell-moon')).toBeNull();
  });

  it('resumes at the last Checkpoint, or the Apothecary Exit', () => {
    expect(resumeSession(createInitialClocktowerState(), 4)).toEqual({
      area: 'apothecary-exit',
      arrival: { spawn: 'apothecary-start', seq: 4 },
    });
    expect(resumeSession(IN_GRAVEYARD, 5)).toEqual({
      area: 'graveyard',
      arrival: { spawn: 'graveyard-west', seq: 5 },
    });
  });

  it('counts meaningful Clocktower progress', () => {
    expect(hasClocktowerProgress(createInitialClocktowerState())).toBe(false);
    expect(hasClocktowerProgress(state({ checkpoints: ['apothecary-exit'] }))).toBe(true);
    expect(hasClocktowerProgress(state({ lanternLit: true }))).toBe(true);
    expect(hasClocktowerProgress(state({ cluesFound: ['moon'] }))).toBe(true);
  });
});
