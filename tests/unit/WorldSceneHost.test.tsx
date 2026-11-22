/**
 * WorldSceneHost lifecycle with a fake dynamic module (no Phaser).
 * Requirements: 2.8, 2.9, 2.11
 */
import { act, cleanup, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  WorldSceneCallbacks,
  WorldSceneHandle,
  WorldSnapshot,
} from '../../src/types/clocktower';

type Create = (
  parent: HTMLElement,
  initial: WorldSnapshot,
  callbacks: WorldSceneCallbacks
) => Promise<WorldSceneHandle>;

const hoisted = vi.hoisted(() => ({
  createWorldScene: vi.fn(),
  importFails: false,
}));

vi.mock('../../src/components/WorldScene/phaser/createWorldScene', () => {
  if (hoisted.importFails) throw new Error('chunk failed');
  return { createWorldScene: hoisted.createWorldScene };
});

import {
  SCENE_LOAD_TIMEOUT_MS,
  WorldSceneHost,
  type WorldSceneStatus,
} from '../../src/components/WorldScene/WorldSceneHost';

const SNAPSHOT: WorldSnapshot = {
  area: 'courtyard',
  arrival: { spawn: 'courtyard-west', seq: 1 },
  lanternLit: false,
  cluesFound: [],
  gateOpen: false,
  bellRings: [],
  lightsRestored: false,
  inputBlocked: false,
  reducedMotion: false,
  effect: null,
  previewCourtyardOnly: true,
};

const CALLBACKS = {
  onNearbyChange: vi.fn(),
  onLandmarksInView: vi.fn(),
  onExitContact: vi.fn(),
  onExitEntered: vi.fn(),
};

function fakeHandle(): WorldSceneHandle & { destroyed: number } {
  const handle = {
    destroyed: 0,
    update: vi.fn(),
    setHeld: vi.fn(),
    pulseInteract: vi.fn(),
    destroy() {
      handle.destroyed += 1;
    },
  };
  return handle;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  hoisted.createWorldScene.mockReset();
  for (const fn of Object.values(CALLBACKS)) fn.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('WorldSceneHost', () => {
  it('creates one handle under a StrictMode double mount', async () => {
    const created: Array<WorldSceneHandle & { destroyed: number }> = [];
    (hoisted.createWorldScene as unknown as { mockImplementation: (f: Create) => void }).mockImplementation(
      async (parent) => {
        const handle = fakeHandle();
        created.push(handle);
        parent.appendChild(document.createElement('canvas'));
        return handle;
      }
    );
    const statuses: WorldSceneStatus[] = [];
    render(
      <StrictMode>
        <WorldSceneHost snapshot={SNAPSHOT} callbacks={CALLBACKS} onStatusChange={(s) => statuses.push(s)} />
      </StrictMode>
    );
    await flush();
    expect(created).toHaveLength(1);
    expect(created[0]!.destroyed).toBe(0);
    expect(statuses.at(-1)?.state).toBe('ready');
    const holder = document.querySelector('[data-testid="world-scene-holder"]')!;
    expect(holder.getAttribute('aria-hidden')).toBe('true');
    expect(holder.querySelectorAll('canvas')).toHaveLength(1);
    expect(holder.querySelector('canvas')!.getAttribute('tabindex')).toBe('-1');
  });

  it('destroys the handle on unmount, clears the holder, and silences callbacks', async () => {
    let captured: WorldSceneCallbacks | null = null;
    const handle = fakeHandle();
    hoisted.createWorldScene.mockImplementation(async (parent: HTMLElement, _s: WorldSnapshot, cb: WorldSceneCallbacks) => {
      captured = cb;
      parent.appendChild(document.createElement('canvas'));
      return handle;
    });
    const view = render(
      <WorldSceneHost snapshot={SNAPSHOT} callbacks={CALLBACKS} onStatusChange={() => undefined} />
    );
    await flush();
    const holder = document.querySelector('[data-testid="world-scene-holder"]')!;
    expect(holder.querySelectorAll('canvas')).toHaveLength(1);
    view.unmount();
    expect(handle.destroyed).toBe(1);
    expect(holder.childElementCount).toBe(0);
    captured!.onNearbyChange('courtyard-lantern');
    captured!.onExitEntered('courtyard-east');
    expect(CALLBACKS.onNearbyChange).not.toHaveBeenCalled();
    expect(CALLBACKS.onExitEntered).not.toHaveBeenCalled();
  });

  it('forwards callbacks while mounted', async () => {
    let captured: WorldSceneCallbacks | null = null;
    hoisted.createWorldScene.mockImplementation(async (_p: HTMLElement, _s: WorldSnapshot, cb: WorldSceneCallbacks) => {
      captured = cb;
      return fakeHandle();
    });
    render(<WorldSceneHost snapshot={SNAPSHOT} callbacks={CALLBACKS} onStatusChange={() => undefined} />);
    await flush();
    captured!.onNearbyChange('courtyard-lantern');
    expect(CALLBACKS.onNearbyChange).toHaveBeenCalledWith('courtyard-lantern');
  });

  it('passes each new snapshot to the handle in the same commit', async () => {
    const handle = fakeHandle();
    hoisted.createWorldScene.mockImplementation(async () => handle);
    const view = render(
      <WorldSceneHost snapshot={SNAPSHOT} callbacks={CALLBACKS} onStatusChange={() => undefined} />
    );
    await flush();
    const lit = { ...SNAPSHOT, lanternLit: true };
    view.rerender(<WorldSceneHost snapshot={lit} callbacks={CALLBACKS} onStatusChange={() => undefined} />);
    expect(handle.update).toHaveBeenLastCalledWith(lit);
  });

  it('fails after 10 seconds and destroys a game that arrives later', async () => {
    vi.useFakeTimers();
    let release: (handle: WorldSceneHandle) => void = () => undefined;
    hoisted.createWorldScene.mockImplementation(
      () => new Promise<WorldSceneHandle>((resolve) => (release = resolve))
    );
    const statuses: WorldSceneStatus[] = [];
    render(<WorldSceneHost snapshot={SNAPSHOT} callbacks={CALLBACKS} onStatusChange={(s) => statuses.push(s)} />);
    await flush();
    expect(statuses.at(-1)?.state).toBe('loading');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SCENE_LOAD_TIMEOUT_MS + 1);
    });
    expect(statuses.at(-1)?.state).toBe('failed');
    const late = fakeHandle();
    await act(async () => {
      release(late);
      await Promise.resolve();
    });
    expect(late.destroyed).toBe(1);
    expect(statuses.at(-1)?.state).toBe('failed');
  });

  it('reports the failed file when the scene rejects with a resource', async () => {
    hoisted.createWorldScene.mockImplementation(async () => {
      throw Object.assign(new Error('missing'), { resource: 'props/lantern-post.png' });
    });
    const statuses: WorldSceneStatus[] = [];
    render(<WorldSceneHost snapshot={SNAPSHOT} callbacks={CALLBACKS} onStatusChange={(s) => statuses.push(s)} />);
    await flush();
    expect(statuses.at(-1)).toMatchObject({ state: 'failed', resource: 'props/lantern-post.png' });
  });

  // Regression: a texture that fails during a later Area change, or an exception in
  // the scene's update loop, arrives through onLoadError after the scene is ready.
  // It must still fail the scene so the view shows the Route_Panel fallback.
  it('fails the scene when a load error arrives after it is ready', async () => {
    let captured: WorldSceneCallbacks | null = null;
    const handle = fakeHandle();
    hoisted.createWorldScene.mockImplementation(async (parent: HTMLElement, _s: WorldSnapshot, cb: WorldSceneCallbacks) => {
      captured = cb;
      parent.appendChild(document.createElement('canvas'));
      return handle;
    });
    const statuses: WorldSceneStatus[] = [];
    render(<WorldSceneHost snapshot={SNAPSHOT} callbacks={CALLBACKS} onStatusChange={(s) => statuses.push(s)} />);
    await flush();
    expect(statuses.at(-1)?.state).toBe('ready');

    act(() => captured!.onLoadError('props/gate-closed.png'));
    expect(statuses.at(-1)).toMatchObject({ state: 'failed', resource: 'props/gate-closed.png' });
    expect(handle.destroyed).toBe(1);
    expect(document.querySelector('[data-testid="world-scene-holder"]')!.childElementCount).toBe(0);

    // A second error is not reported twice, and callbacks stay silent.
    const count = statuses.length;
    act(() => captured!.onLoadError('scene update'));
    expect(statuses).toHaveLength(count);
  });

  it('does not fail a ready scene when the 10 second timer would have fired', async () => {
    vi.useFakeTimers();
    hoisted.createWorldScene.mockImplementation(async () => fakeHandle());
    const statuses: WorldSceneStatus[] = [];
    render(<WorldSceneHost snapshot={SNAPSHOT} callbacks={CALLBACKS} onStatusChange={(s) => statuses.push(s)} />);
    await flush();
    expect(statuses.at(-1)?.state).toBe('ready');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SCENE_LOAD_TIMEOUT_MS + 1);
    });
    expect(statuses.at(-1)?.state).toBe('ready');
  });

  it('reports "Phaser module" when the scene rejects without a resource', async () => {
    hoisted.createWorldScene.mockImplementation(async () => {
      throw new Error('boom');
    });
    const statuses: WorldSceneStatus[] = [];
    render(<WorldSceneHost snapshot={SNAPSHOT} callbacks={CALLBACKS} onStatusChange={(s) => statuses.push(s)} />);
    await flush();
    expect(statuses.at(-1)).toMatchObject({ state: 'failed', resource: 'Phaser module' });
  });
});
