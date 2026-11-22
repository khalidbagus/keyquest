/**
 * ClocktowerView with WorldSceneHost replaced by a fake handle.
 * Requirements: 1.6, 2.2, 2.10, 2.11, 3.6, 3.7, 8.3, 8.4, 8.7, 9.4, 9.6, 10.9, 10.10,
 * 11.2, 11.3, 12.5, 12.6, 23.5
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameProvider, useGame } from '../../src/context/GameContext';
import { MascotProvider } from '../../src/context/MascotContext';
import { ClocktowerView } from '../../src/views/ClocktowerView';
import type { Direction } from '../../src/types/clocktower';

const host = vi.hoisted(() => ({
  held: [] as Array<Direction | null>,
  pulses: 0,
  /** The Room_Status text in the DOM when each snapshot reached the fake handle. */
  statusAtSnapshot: [] as Array<string | null>,
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
      ref?: React.Ref<{ setHeld(direction: Direction | null): void; pulseInteract(): void }>;
    }) => {
      React.useImperativeHandle(
        props.ref,
        () => ({
          setHeld: (d: Direction | null) => host.held.push(d),
          pulseInteract: () => {
            host.pulses += 1;
          },
        }),
        []
      );
      React.useLayoutEffect(() => {
        host.callbacks = props.callbacks;
        host.onStatus = props.onStatusChange;
        host.snapshots.push(props.snapshot);
        host.statusAtSnapshot.push(document.querySelector('[data-testid="room-status"]')?.textContent ?? null);
      });
      return React.createElement('div', { 'data-testid': 'world-scene-holder' });
    },
  };
});

const celebrate = vi.fn();
vi.mock('../../src/components/RiveMascot', () => ({ RiveMascot: () => null }));

import * as MascotModule from '../../src/context/MascotContext';

function Harness() {
  const { state, dispatch } = useGame();
  const mascot = MascotModule.useMascot();
  useEffect(() => {
    if (mascot.companionSignal?.trigger === 'celebrate') celebrate(mascot.companionSignal.seq);
  }, [mascot.companionSignal]);
  useEffect(() => {
    dispatch({ type: 'ENTER_COURTYARD_PREVIEW' });
  }, [dispatch]);
  return state.phase === 'challenge' ? <ClocktowerView /> : null;
}

function mount() {
  return render(
    <MascotProvider>
      <GameProvider>
        <Harness />
      </GameProvider>
    </MascotProvider>
  );
}

const status = () => screen.getByTestId('room-status').textContent;
const playArea = () => screen.getByTestId('play-area');

async function settle(ms = 60) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

beforeEach(() => {
  host.held.length = 0;
  host.pulses = 0;
  host.statusAtSnapshot.length = 0;
  host.snapshots.length = 0;
  host.callbacks = null;
  host.onStatus = null;
  celebrate.mockReset();
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

describe('ClocktowerView', () => {
  it('moves focus to the room heading on mount and labels the preview', () => {
    mount();
    expect(document.activeElement).toBe(document.getElementById('room-heading'));
    expect(screen.getByTestId('preview-label').textContent).toContain('Progress is not saved');
  });

  it('shows loading text, then failure text, and keeps the Route_Panel operable', async () => {
    mount();
    expect(screen.getByTestId('scene-status').textContent).toContain('Loading the map');
    // Operable while loading.
    expect(screen.getByTestId('route-action-light-lantern')).toBeTruthy();
    act(() => host.onStatus!({ state: 'failed', resource: 'Phaser module', renderer: null }));
    expect(screen.getByTestId('scene-status').textContent).toContain('Phaser module');
    expect(status()).toContain('visual map is unavailable');
    expect(playArea().getAttribute('data-scene-state')).toBe('failed');
    fireEvent.click(screen.getByTestId('route-action-light-lantern'));
    expect(status()).toMatch(/lantern is lit/i);
  });

  it('lights the lantern from the Route_Panel while the scene is loading', () => {
    mount();
    fireEvent.click(screen.getByTestId('route-action-light-lantern'));
    expect(status()).toMatch(/lantern is lit and the way toward the Overgrown Graveyard is open/i);
    expect(screen.getByTestId('room-progress').textContent).toContain('lit');
    expect(screen.queryByTestId('route-action-light-lantern')).toBeNull();
  });

  it('moves focus to the Route_Panel heading after the only action is used, via the panel', async () => {
    mount();
    const button = screen.getByTestId('route-action-light-lantern');
    button.focus();
    fireEvent.click(button);
    await settle();
    expect(document.activeElement).toBe(document.getElementById('route-heading'));
  });

  it('says nothing is close enough on Enter when nothing is nearby, and re-announces it', async () => {
    mount();
    fireEvent.keyDown(playArea(), { key: 'Enter' });
    expect(status()).toContain('Nothing is close enough');
    fireEvent.keyDown(playArea(), { key: 'Enter' });
    expect(status()).toBe('');
    await settle();
    expect(status()).toContain('Nothing is close enough');
  });

  it('announces the nearby Interactable and dispatches once per non-repeat Enter', () => {
    mount();
    act(() => host.callbacks!.onNearbyChange('courtyard-lantern'));
    expect(status()).toContain('Lantern post is close');
    expect(screen.getByTestId('route-nearby').textContent).toBe('Nearby: nothing');
    act(() => host.onStatus!({ state: 'ready', resource: null, renderer: null }));
    expect(screen.getByTestId('route-nearby').textContent).toContain('Lantern post');

    fireEvent.keyDown(playArea(), { key: 'Enter', repeat: true });
    expect(status()).toContain('Lantern post is close');
    fireEvent.keyDown(playArea(), { key: 'Enter' });
    expect(status()).toMatch(/lantern is lit/i);
    fireEvent.keyDown(playArea(), { key: 'Enter' });
    expect(status()).toBe('The lantern is already lit.');
  });

  it('prevents default page scroll for Arrow keys and ignores repeats', () => {
    mount();
    const down = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    playArea().dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    fireEvent.keyDown(playArea(), { key: 'ArrowDown', repeat: true });
    expect(host.held).toEqual(['south']);
    fireEvent.keyUp(playArea(), { key: 'ArrowDown' });
    expect(host.held).toEqual(['south', null]);
  });

  it('leaves Tab and Escape alone', () => {
    mount();
    for (const key of ['Tab', 'Escape']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      playArea().dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(host.held).toEqual([]);
  });

  it('clears keyboard holds when the Play_Area loses focus', () => {
    mount();
    fireEvent.keyDown(playArea(), { key: 'ArrowLeft' });
    fireEvent.blur(playArea());
    expect(host.held).toEqual(['west', null]);
  });

  it('clears holds when a dialog opens and ignores input until it closes', () => {
    mount();
    fireEvent.keyDown(playArea(), { key: 'ArrowRight' });
    fireEvent.click(screen.getByTestId('reset-button'));
    expect(host.held.at(-1)).toBeNull();
    const before = host.held.length;
    fireEvent.keyDown(playArea(), { key: 'ArrowUp' });
    fireEvent.keyDown(playArea(), { key: 'Enter' });
    expect(host.held.length).toBe(before);
    expect((host.snapshots.at(-1) as { inputBlocked: boolean }).inputBlocked).toBe(true);
  });

  it('handles touch pointer holds and releases', () => {
    mount();
    const right = screen.getByTestId('touch-right');
    fireEvent.pointerDown(right, { isPrimary: true, pointerId: 1, pointerType: 'touch', button: 0 });
    expect(host.held.at(-1)).toBe('east');
    fireEvent.pointerUp(right, { isPrimary: true, pointerId: 1, pointerType: 'touch' });
    expect(host.held.at(-1)).toBeNull();
    fireEvent.pointerDown(right, { isPrimary: true, pointerId: 1, pointerType: 'touch', button: 0 });
    fireEvent.pointerLeave(right, { pointerId: 1 });
    expect(host.held.at(-1)).toBeNull();
    fireEvent.pointerDown(right, { isPrimary: true, pointerId: 1, pointerType: 'touch', button: 0 });
    fireEvent.pointerCancel(right, { pointerId: 1 });
    expect(host.held.at(-1)).toBeNull();
  });

  it('lets a focused direction button hold with Enter and stop on keyup or blur', () => {
    mount();
    const up = screen.getByTestId('touch-up');
    fireEvent.keyDown(up, { key: 'Enter' });
    expect(host.held.at(-1)).toBe('north');
    fireEvent.keyUp(up, { key: 'Enter' });
    expect(host.held.at(-1)).toBeNull();
    fireEvent.keyDown(up, { key: ' ' });
    fireEvent.blur(up);
    expect(host.held.at(-1)).toBeNull();
  });

  it('Interact dispatches once per key press and once per click', () => {
    mount();
    const interact = screen.getByTestId('touch-interact');
    fireEvent.keyDown(interact, { key: 'Enter' });
    fireEvent.keyDown(interact, { key: 'Enter', repeat: true });
    expect(status()).toContain('Nothing is close enough');
    act(() => host.callbacks!.onNearbyChange('courtyard-lantern'));
    fireEvent.click(interact);
    expect(status()).toMatch(/lantern is lit/i);
  });

  it('announces the exit messages once per contact and entry', () => {
    mount();
    act(() => host.callbacks!.onExitContact('courtyard-east', false));
    expect(status()).toContain('lantern must be lit');
    fireEvent.click(screen.getByTestId('route-action-light-lantern'));
    act(() => host.callbacks!.onExitEntered('courtyard-east'));
    expect(status()).toBe('The Overgrown Graveyard opens in a later checkpoint.');
  });

  it('sends celebrate once when the lantern is lit and never for a repeat', async () => {
    mount();
    act(() => host.callbacks!.onNearbyChange('courtyard-lantern'));
    fireEvent.keyDown(playArea(), { key: 'Enter' });
    await settle();
    expect(celebrate).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(playArea(), { key: 'Enter' });
    await settle();
    expect(celebrate).toHaveBeenCalledTimes(1);
  });

  it('sends no celebrate after the view unmounts', async () => {
    const view = mount();
    fireEvent.click(screen.getByTestId('route-action-light-lantern'));
    view.unmount();
    await settle();
    expect(celebrate).not.toHaveBeenCalled();
  });

  it('passes the same snapshot change to the scene in the commit that lights the lantern', () => {
    mount();
    fireEvent.click(screen.getByTestId('route-action-light-lantern'));
    expect((host.snapshots.at(-1) as { lanternLit: boolean }).lanternLit).toBe(true);
  });
});

// Task 28.3: motion never delays state.
type Snap = { lanternLit: boolean; reducedMotion: boolean; effect: { id: number; kind: string; target: string } | null };
const snaps = () => host.snapshots as Snap[];

describe('ClocktowerView motion pass', () => {
  it('updates Room_Status before the effect reaches the scene, in the same commit as the new state', () => {
    mount();
    fireEvent.click(screen.getByTestId('route-action-light-lantern'));
    const first = snaps().findIndex((snapshot) => snapshot.effect !== null);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(snaps()[first]!.effect).toMatchObject({ kind: 'lantern', target: 'courtyard-lantern' });
    expect(snaps()[first]!.lanternLit).toBe(true);
    expect(host.statusAtSnapshot[first]).toMatch(/lantern is lit/i);
  });

  it('sends no effect for a rejection or a repeat', () => {
    mount();
    // Rejected: the east exit is closed in the preview.
    act(() => host.callbacks!.onExitEntered('courtyard-east'));
    expect(snaps().every((snapshot) => snapshot.effect === null)).toBe(true);
    fireEvent.click(screen.getByTestId('route-action-light-lantern'));
    const lit = snaps().at(-1)!.effect;
    expect(lit).not.toBeNull();
    // Repeat: the same effect stays, with the same id, so the scene plays nothing new.
    act(() => host.callbacks!.onNearbyChange('courtyard-lantern'));
    fireEvent.keyDown(playArea(), { key: 'Enter' });
    expect(status()).toBe('The lantern is already lit.');
    expect(snaps().at(-1)!.effect).toEqual(lit);
  });

  it('gives a repeated success after a reset a new effect id', () => {
    mount();
    fireEvent.click(screen.getByTestId('route-action-light-lantern'));
    const first = snaps().at(-1)!.effect!.id;
    fireEvent.click(screen.getByTestId('reset-button'));
    fireEvent.click(screen.getByTestId('reset-confirm'));
    fireEvent.click(screen.getByTestId('route-action-light-lantern'));
    expect(snaps().at(-1)!.effect!.id).toBeGreaterThan(first);
  });

  it('sends no stale celebrate when a new attempt starts before the reaction', async () => {
    mount();
    fireEvent.click(screen.getByTestId('route-action-light-lantern'));
    // A new attempt in the same frame supersedes the lantern's pending reaction.
    act(() => host.callbacks!.onExitEntered('courtyard-east'));
    await settle();
    expect(celebrate).not.toHaveBeenCalled();
  });

  it('pulses the Ghost once per Interact with something nearby, and not otherwise', () => {
    mount();
    fireEvent.keyDown(playArea(), { key: 'Enter' });
    expect(host.pulses).toBe(0);
    act(() => host.callbacks!.onNearbyChange('courtyard-lantern'));
    fireEvent.keyDown(playArea(), { key: 'Enter' });
    expect(host.pulses).toBe(1);
    fireEvent.keyDown(playArea(), { key: 'Enter' });
    expect(host.pulses).toBe(2);
    expect(status()).toBe('The lantern is already lit.');
  });

  it('produces the same Room_Status text with reduced motion on and off', () => {
    const run = () => {
      mount();
      fireEvent.click(screen.getByTestId('route-action-light-lantern'));
      const text = status();
      const reduced = snaps().at(-1)!.reducedMotion;
      cleanup();
      host.snapshots.length = 0;
      return { text, reduced };
    };
    const off = run();
    // The system setting turns reduced motion on (ReducedMotionContext reads matchMedia).
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      const on = run();
      expect(on.reduced).toBe(true);
      expect(off.reduced).toBe(false);
      expect(on.text).toBe(off.text);
    } finally {
      window.matchMedia = original;
      delete document.documentElement.dataset.reducedMotion;
    }
  });
});
