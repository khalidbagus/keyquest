/**
 * ClocktowerView on the full route (development built override), with
 * WorldSceneHost replaced by a fake handle.
 * Requirements: 10.2, 10.4, 13.3, 13.4, 13.8, 13.10, 13.11, 14.3, 14.4, 14.7, 15.4,
 * 15.5, 15.6, 17.2, 17.7
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameProvider, createInitialProgressState, useGame } from '../../src/context/GameContext';
import { MascotProvider } from '../../src/context/MascotContext';
import { ClocktowerView } from '../../src/views/ClocktowerView';
import { DEFAULT_COMPANION_ID, HINT_KEEPER_ID } from '../../src/registry/mascotRegistry';
import type { ClocktowerState, DefectType, ProgressState } from '../../src/types';
import type { WorldSnapshot } from '../../src/types/clocktower';

vi.mock('../../src/registry/devFlags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/registry/devFlags')>()),
  DEV_FLAGS: { preview: null, built: new Set(['clocktower']) },
}));

const host = vi.hoisted(() => ({
  callbacks: null as null | {
    onNearbyChange(id: string | null): void;
    onExitContact(id: string, open: boolean): void;
    onExitEntered(id: string): void;
    onLandmarksInView(ids: readonly string[]): void;
  },
  onStatus: null as null | ((status: { state: string; resource: string | null; renderer: null }) => void),
  snapshots: [] as unknown[],
}));

vi.mock('../../src/components/WorldScene/WorldSceneHost', async () => {
  const React = await import('react');
  return {
    WorldSceneHost: (props: {
      snapshot: unknown;
      callbacks: NonNullable<typeof host.callbacks>;
      onStatusChange: NonNullable<typeof host.onStatus>;
      ref?: React.Ref<{ setHeld(): void; pulseInteract(): void }>;
    }) => {
      React.useImperativeHandle(
        props.ref,
        () => ({ setHeld: () => undefined, pulseInteract: () => undefined }),
        []
      );
      React.useLayoutEffect(() => {
        host.callbacks = props.callbacks;
        host.onStatus = props.onStatusChange;
        host.snapshots.push(props.snapshot);
      });
      return React.createElement('div', { 'data-testid': 'world-scene-holder' });
    },
  };
});

// Record every distinct signal each medallion receives, so tests can count performances.
const signals = vi.hoisted(() => new Set<string>());
vi.mock('../../src/components/RiveMascot', () => ({
  RiveMascot: (props: { mascot: { id: string }; signal: { trigger: string; seq: number } | null }) => {
    if (props.signal) signals.add(`${props.mascot.id}|${props.signal.trigger}|${props.signal.seq}`);
    return null;
  },
}));

function countSignals(mascotId: string, trigger: string): number {
  return [...signals].filter((key) => key.startsWith(`${mascotId}|${trigger}|`)).length;
}

const KEY = 'keyquest-progress-v1';
const CHECKOUT: DefectType[] = [
  'invisible-focus',
  'mouse-only-activation',
  'missing-accessible-name',
  'insufficient-contrast',
];

type BellCurse = 'unfound' | 'discovered' | 'verified';

function save(clocktower: ClocktowerState, bell: BellCurse = 'unfound') {
  const base = createInitialProgressState();
  const defects = { ...base.defects };
  for (const type of [...CHECKOUT, 'color-only-ingredients'] as DefectType[]) {
    defects[type] = { ...defects[type], discovered: true, repaired: true, verified: true, verifiedAt: 1 };
  }
  if (bell !== 'unfound') {
    const done = bell === 'verified';
    defects['bell-dialog-focus'] = {
      ...defects['bell-dialog-focus'],
      discovered: true,
      repaired: done,
      verified: done,
      verifiedAt: done ? 1 : null,
    };
  }
  const progress: ProgressState = {
    ...base,
    defects,
    currentRoom: 'clocktower',
    checkout: { lanternLit: true, candleAdded: true, orderPlaced: true, keyTaken: true },
    pantry: { cauldron: ['moonpetal', 'ember-salt', 'glowcap'], brewed: true, potionTaken: true },
    clocktower,
  };
  window.localStorage.setItem(KEY, JSON.stringify(progress));
}

const START: ClocktowerState = {
  checkpoints: [],
  lastCheckpoint: null,
  lanternLit: false,
  cluesFound: [],
  gateOpen: false,
  shortcutUnlocked: false,
  bellRings: [],
  lightsRestored: false,
};
const IN_GRAVEYARD: ClocktowerState = {
  ...START,
  checkpoints: ['apothecary-exit', 'courtyard', 'graveyard'],
  lastCheckpoint: 'graveyard',
  lanternLit: true,
};
const IN_BELFRY: ClocktowerState = {
  ...IN_GRAVEYARD,
  checkpoints: ['apothecary-exit', 'courtyard', 'graveyard', 'passage', 'belfry'],
  lastCheckpoint: 'belfry',
  cluesFound: ['moon', 'thorn', 'key'],
  gateOpen: true,
  shortcutUnlocked: true,
};

function Harness() {
  const { state, dispatch } = useGame();
  useEffect(() => {
    dispatch({ type: 'START_CHALLENGE' });
  }, [dispatch]);
  return state.phase === 'challenge' ? <ClocktowerView /> : null;
}

function mount(clocktower: ClocktowerState, bell: BellCurse = 'unfound') {
  save(clocktower, bell);
  render(
    <MascotProvider>
      <GameProvider>
        <Harness />
      </GameProvider>
    </MascotProvider>
  );
  // The scene is ready, so "In view" follows the camera.
  act(() => host.onStatus!({ state: 'ready', resource: null, renderer: null }));
}

const status = () => screen.getByTestId('room-status').textContent;
const area = () => screen.getByTestId('route-area').textContent;
const lastSnapshot = () => host.snapshots[host.snapshots.length - 1] as WorldSnapshot;

beforeEach(() => {
  signals.clear();
  Element.prototype.scrollIntoView = function scrollIntoView() {};
  host.snapshots.length = 0;
  host.callbacks = null;
  host.onStatus = null;
  window.localStorage.clear();
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('ClocktowerView on the route', () => {
  it('starts a new save at the Apothecary Exit with the controls text and no travel', () => {
    mount(START);
    expect(area()).toBe('Area: Apothecary Exit');
    expect(lastSnapshot()).toMatchObject({ area: 'apothecary-exit', arrival: { spawn: 'apothecary-start' } });
    const controls = screen.getByTestId('route-controls').textContent!;
    expect(controls).toMatch(/arrow keys move/i);
    expect(controls).toMatch(/Enter or Space interacts/);
    expect(controls).toMatch(/Move and Interact buttons/);
    expect(controls).toMatch(/route panel/i);
    expect(screen.queryByTestId('route-travel')).toBeNull();
    expect(screen.getByTestId('journal-empty').textContent).toBe('No clues found yet.');
    expect(screen.getByTestId('room-objective').getAttribute('data-stage')).toBe('leave-apothecary');
  });

  it('resumes at the last Checkpoint spawn with the lantern and Clues restored', () => {
    mount({ ...IN_GRAVEYARD, cluesFound: ['moon', 'key'] });
    expect(lastSnapshot()).toMatchObject({
      area: 'graveyard',
      arrival: { spawn: 'graveyard-west' },
      lanternLit: true,
      cluesFound: ['moon', 'key'],
    });
    expect(area()).toBe('Area: Overgrown Graveyard');
    expect(screen.queryByTestId('route-controls')).toBeNull();
  });

  it('lists found Clues in route order whatever order they were found in', () => {
    mount(IN_GRAVEYARD);
    fireEvent.click(screen.getByTestId('route-action-find-clue-key'));
    expect(status()).toBe('Key clue found: “The Key bell answers the Moon.” 1 of 3 clues found.');
    fireEvent.click(screen.getByTestId('route-action-find-clue-moon'));
    const items = within(screen.getByTestId('journal-clues')).getAllByRole('listitem');
    expect(items.map((item) => item.getAttribute('data-clue'))).toEqual(['moon', 'key']);
    expect(items[0]!.textContent).toBe('Moon: The Moon bell wakes the tower first.');
  });

  it('offers travel buttons for entered Areas and moves there', () => {
    mount(IN_GRAVEYARD);
    const travel = within(screen.getByTestId('route-travel')).getAllByRole('button');
    expect(travel.map((button) => button.textContent)).toEqual([
      'Travel to the Apothecary Exit',
      'Travel to the Moonlit Courtyard',
    ]);
    fireEvent.click(screen.getByTestId('route-travel-courtyard'));
    expect(area()).toBe('Area: Moonlit Courtyard');
    expect(status()).toBe('You are in the Moonlit Courtyard.');
    expect(lastSnapshot()).toMatchObject({ area: 'courtyard', arrival: { spawn: 'courtyard-west' } });
  });

  it('completes the route to the Belfry with the HTML controls alone', () => {
    mount(IN_GRAVEYARD);
    for (const clue of ['moon', 'thorn', 'key']) fireEvent.click(screen.getByTestId(`route-action-find-clue-${clue}`));
    expect(status()).toContain('3 of 3 clues found');
    fireEvent.click(screen.getByTestId('route-action-enter-area-passage'));
    expect(area()).toBe('Area: Clockworks Passage');
    expect(screen.queryByTestId('route-shortcut-courtyard')).toBeNull();
    fireEvent.click(screen.getByTestId('route-action-open-gate'));
    expect(status()).toBe(
      'Clockworks gate: the gate is open. The return shortcut to the Moonlit Courtyard is unlocked.'
    );
    expect(screen.getByTestId('route-shortcut-courtyard').textContent).toBe(
      'Take the shortcut to the Moonlit Courtyard'
    );
    expect(screen.getByTestId('route-shortcut-passage').textContent).toBe(
      'Take the shortcut to the Clockworks Passage, Belfry side'
    );
    fireEvent.click(screen.getByTestId('route-action-enter-area-belfry'));
    expect(area()).toBe('Area: Belfry');
    expect(screen.getByTestId('room-objective').getAttribute('data-stage')).toBe('bells-silent');
    // The shortcut returns to the courtyard spawn.
    fireEvent.click(screen.getByTestId('route-shortcut-courtyard'));
    expect(lastSnapshot()).toMatchObject({ area: 'courtyard', arrival: { spawn: 'courtyard-west' } });
  });

  it('names the missing Clues when the Ghost walks into the closed graveyard exit or the gate', () => {
    mount({ ...IN_GRAVEYARD, cluesFound: ['thorn'] });
    act(() => host.callbacks!.onExitContact('graveyard-east', false));
    expect(status()).toBe('The way east is closed. Find the missing clues first: Moon and Key.');
  });

  it('enters the next Area when the scene reports an open exit', () => {
    mount({ ...START, checkpoints: ['apothecary-exit', 'courtyard'], lastCheckpoint: 'courtyard', lanternLit: true });
    act(() => host.callbacks!.onExitEntered('courtyard-east'));
    expect(area()).toBe('Area: Overgrown Graveyard');
    expect(status()).toBe('You reach the Overgrown Graveyard. Checkpoint saved.');
  });

  it('shows the done prompt for a completed Interactable', () => {
    mount({ ...START, checkpoints: ['apothecary-exit', 'courtyard'], lastCheckpoint: 'courtyard', lanternLit: true });
    act(() => host.callbacks!.onNearbyChange('courtyard-lantern'));
    expect(screen.getByTestId('route-nearby').textContent).toBe('Nearby: Lantern post (The lantern is lit)');
    expect(status()).toBe('Lantern post is close. The lantern is lit.');
  });

  it('keeps the camera In view list and lists every Landmark in the Area', () => {
    mount({ ...START, checkpoints: ['apothecary-exit', 'courtyard'], lastCheckpoint: 'courtyard' });
    act(() => host.callbacks!.onLandmarksInView(['stone-well']));
    expect(screen.getByTestId('route-landmarks').textContent).toBe('In view:Stone well');
    expect(screen.getByTestId('route-area-landmarks').textContent).toBe('Landmarks in this area:Yew treeStone well');
    act(() => host.onStatus!({ state: 'failed', resource: 'Phaser module', renderer: null }));
    expect(screen.getByTestId('route-landmarks').textContent).toBe('In view:Yew treeStone well');
  });

  it('shows the Belfry section, the bell progress, and the static bell order once the gate is open', () => {
    mount(IN_BELFRY);
    expect(screen.getByTestId('belfry-section')).toBeTruthy();
    expect(screen.getByTestId('route-bell-progress').textContent).toBe('Bells: 0 of 3 bells rung');
    const order = within(screen.getByTestId('journal-bell-order')).getAllByRole('listitem');
    expect(order.map((item) => item.textContent)).toEqual(['Moon bell', 'Key bell', 'Thorn bell']);
    expect(screen.getByTestId('room-objective').getAttribute('data-stage')).toBe('bells-silent');
  });

  it('hides the Belfry section until the gate is open', () => {
    mount(IN_GRAVEYARD);
    expect(screen.queryByTestId('belfry-section')).toBeNull();
    expect(screen.queryByTestId('route-bell-progress')).toBeNull();
    // The bell order is static and always listed.
    expect(within(screen.getByTestId('journal-bell-order')).getAllByRole('listitem')).toHaveLength(3);
  });

  it('opens the named bell dialog from a bell Interactable and records the discovery once', () => {
    mount(IN_BELFRY);
    act(() => host.callbacks!.onNearbyChange('bell-key'));
    const play = screen.getByTestId('play-area');
    fireEvent.keyDown(play, { key: 'Enter' });
    const dialog = screen.getByTestId('defect-bell-focus');
    expect(dialog.getAttribute('data-open')).toBe('true');
    expect(within(dialog).getByRole('heading').textContent).toBe('Ring the Key bell?');
    expect(status()).toMatch(/^Curse found: the bell dialog loses keyboard focus/);
    expect(lastSnapshot().inputBlocked).toBe(true);
    fireEvent.click(screen.getByTestId('bell-cancel'));
    expect(dialog.getAttribute('data-open')).toBe('false');
    expect(lastSnapshot().inputBlocked).toBe(false);
    // A second open announces nothing new.
    act(() => host.callbacks!.onNearbyChange('bell-moon'));
    expect(status()).toBe('Moon bell is close. Ring the bell.');
    fireEvent.keyDown(play, { key: 'Enter' });
    expect(within(dialog).getByRole('heading').textContent).toBe('Ring the Moon bell?');
    expect(status()).toBe('Moon bell is close. Ring the bell.');
  });

  it('says the rope is jammed while the curse is not verified, and records no ring', () => {
    mount(IN_BELFRY, 'discovered');
    fireEvent.click(screen.getByTestId('bell-control-moon'));
    fireEvent.click(screen.getByTestId('bell-ring'));
    expect(status()).toBe(
      "The Moon bell rope is jammed. Repair the bell dialog's focus in the Repair Studio, then ring again."
    );
    expect(screen.getByTestId('route-bell-progress').textContent).toBe('Bells: 0 of 3 bells rung');
    expect(lastSnapshot().bellRings).toEqual([]);
  });

  it('Inspect discovers the curse and moves focus to its repair', () => {
    mount(IN_BELFRY);
    fireEvent.click(screen.getByTestId('inspect-bell-focus'));
    expect(status()).toMatch(/^Curse found: the bell dialog loses keyboard focus/);
    // The Repair Studio heading of the bell repair card takes focus.
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement?.textContent).toMatch(/bell dialog loses keyboard focus/i);
    expect(screen.getByTestId('repair-bell-focus')).toBeTruthy();
  });

  it('rings the sequence with one out-of-order retry, lights the windows, and celebrates once', async () => {
    mount(IN_BELFRY, 'verified');
    expect(screen.getByTestId('room-objective').getAttribute('data-stage')).toBe('ring-bells');
    // The Route_Panel bell action opens the same dialog instead of ringing at once.
    fireEvent.click(screen.getByTestId('route-action-ring-bell-moon'));
    expect(within(screen.getByTestId('defect-bell-focus')).getByRole('heading').textContent).toBe(
      'Ring the Moon bell?'
    );
    expect(lastSnapshot().bellRings).toEqual([]);
    fireEvent.click(screen.getByTestId('bell-ring'));
    expect(status()).toBe('The Moon bell rings and an apothecary window lights. 1 of 3 bells rung.');
    expect(screen.getByTestId('route-bell-progress').textContent).toBe('Bells: 1 of 3 bells rung');
    expect(lastSnapshot().bellRings).toEqual(['moon']);

    fireEvent.click(screen.getByTestId('bell-control-thorn'));
    fireEvent.click(screen.getByTestId('bell-ring'));
    expect(status()).toBe('The Thorn bell is out of order and does not ring. Ring the Key bell next.');
    expect(lastSnapshot().bellRings).toEqual(['moon']);

    for (const bell of ['key', 'thorn']) {
      fireEvent.click(screen.getByTestId(`bell-control-${bell}`));
      fireEvent.click(screen.getByTestId('bell-ring'));
    }
    expect(status()).toBe('The Thorn bell rings. 3 of 3 bells rung: the apothecary lights are back.');
    expect(lastSnapshot()).toMatchObject({ bellRings: ['moon', 'key', 'thorn'], lightsRestored: true });
    expect(screen.getByTestId('room-objective').getAttribute('data-stage')).toBe('restored');
    expect(screen.getByTestId('see-finale').textContent).toBe('See the finale');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(countSignals(DEFAULT_COMPANION_ID, 'celebrate')).toBe(1);

    // A ring after the lights changes nothing and celebrates nothing.
    fireEvent.click(screen.getByTestId('bell-control-moon'));
    fireEvent.click(screen.getByTestId('bell-ring'));
    expect(status()).toBe('The apothecary lights are already back. The bells have done their work.');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(countSignals(DEFAULT_COMPANION_ID, 'celebrate')).toBe(1);
  });

  it('resumes saved rings with the progress text and sends no celebrate', async () => {
    mount({ ...IN_BELFRY, bellRings: ['moon', 'key'] }, 'verified');
    expect(screen.getByTestId('route-bell-progress').textContent).toBe('Bells: 2 of 3 bells rung');
    expect(lastSnapshot().bellRings).toEqual(['moon', 'key']);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(countSignals(DEFAULT_COMPANION_ID, 'celebrate')).toBe(0);
  });

  it('sends the hint keeper one requestAttention per hint', () => {
    mount(IN_BELFRY, 'discovered');
    const hint = screen.getByTestId('hint-button');
    fireEvent.click(hint);
    expect(countSignals(HINT_KEEPER_ID, 'requestAttention')).toBe(1);
    fireEvent.click(hint);
    expect(countSignals(HINT_KEEPER_ID, 'requestAttention')).toBe(2);
  });

  it('resets to the Apothecary Exit and says the room was reset', () => {
    mount({ ...IN_GRAVEYARD, cluesFound: ['moon'] });
    fireEvent.click(screen.getByTestId('reset-button'));
    fireEvent.click(screen.getByTestId('reset-confirm'));
    expect(status()).toBe(
      'The Clocktower room was reset. You are back at the Apothecary Exit with the lantern unlit and no clues found.'
    );
    expect(area()).toBe('Area: Apothecary Exit');
    expect(screen.getByTestId('journal-empty')).toBeTruthy();
    expect(lastSnapshot()).toMatchObject({ area: 'apothecary-exit', arrival: { spawn: 'apothecary-start' } });
  });
});
