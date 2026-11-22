/**
 * WorldSceneHost
 * Mounts the lazy Phaser chunk and guards its lifecycle. This file never imports
 * Phaser: `createWorldScene` is loaded with a dynamic import, so Phaser stays in a
 * separate chunk that no other view requests (Requirements 2.7 to 2.11).
 *
 * - A generation counter and a module-level `activeHandle` keep at most one game
 *   alive, including across React StrictMode's double mount and remounts.
 * - Cleanup swaps the callbacks for no-ops, destroys the game, and clears the
 *   canvas holder at once, so no callback can reach React afterwards.
 * - A 10 second timer fails the scene if it is not ready, and destroys a game
 *   that arrives after that.
 */

import { useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react';
import type {
  Direction,
  WorldSceneCallbacks,
  WorldSceneHandle,
  WorldSceneState,
  WorldSnapshot,
} from '../../types/clocktower';
import styles from './WorldSceneHost.module.css';

export const SCENE_LOAD_TIMEOUT_MS = 10_000;

/** The live game, if any. At most one exists at a time. */
let activeHandle: WorldSceneHandle | null = null;
let generationCounter = 0;

export interface WorldSceneHostApi {
  /** Tell the scene which direction is held, or null to stop. Buffered until ready. */
  setHeld(direction: Direction | null): void;
  /** Play the interact pulse on the Ghost. Ignored until the scene is ready. */
  pulseInteract(): void;
}

export interface WorldSceneStatus {
  state: WorldSceneState;
  /** The file key or "Phaser module" when `state` is "failed". */
  resource: string | null;
  renderer: 'webgl' | 'canvas' | null;
}

interface WorldSceneHostProps {
  snapshot: WorldSnapshot;
  callbacks: Omit<WorldSceneCallbacks, 'onReady' | 'onLoadError' | 'onDebug'>;
  onStatusChange: (status: WorldSceneStatus) => void;
  ref?: Ref<WorldSceneHostApi>;
}

function destroyQuietly(handle: WorldSceneHandle | null) {
  try {
    handle?.destroy();
  } catch {
    // Phaser may already be torn down; nothing else can be done.
  }
}

export function WorldSceneHost({ snapshot, callbacks, onStatusChange, ref }: WorldSceneHostProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<WorldSceneHandle | null>(null);
  const heldRef = useRef<Direction | null>(null);
  const snapshotRef = useRef(snapshot);
  const callbacksRef = useRef(callbacks);
  const statusRef = useRef(onStatusChange);

  useImperativeHandle(
    ref,
    () => ({
      setHeld(direction) {
        heldRef.current = direction;
        handleRef.current?.setHeld(direction);
      },
      pulseInteract() {
        handleRef.current?.pulseInteract();
      },
    }),
    []
  );

  // Hand every snapshot to the scene in the same commit as the state change.
  useLayoutEffect(() => {
    snapshotRef.current = snapshot;
    callbacksRef.current = callbacks;
    statusRef.current = onStatusChange;
    handleRef.current?.update(snapshot);
  }, [snapshot, callbacks, onStatusChange]);

  useLayoutEffect(() => {
    const parent = holderRef.current;
    if (!parent) return;

    generationCounter += 1;
    const generation = generationCounter;
    let cancelled = false;
    let finished = false; // ready or failed
    let failed = false;
    let handle: WorldSceneHandle | null = null;
    let renderer: 'webgl' | 'canvas' | null = null;

    const report = (status: WorldSceneStatus) => {
      if (!cancelled) statusRef.current(status);
    };

    // Also runs after the scene is ready: a texture that fails during an Area change,
    // or an exception in the scene's update loop, reports through onLoadError and
    // must still switch the view to the Route_Panel fallback.
    const fail = (resource: string) => {
      if (cancelled || failed) return;
      failed = true;
      finished = true;
      destroyQuietly(handle);
      if (activeHandle === handle) activeHandle = null;
      handle = null;
      handleRef.current = null;
      parent.replaceChildren();
      report({ state: 'failed', resource, renderer: null });
    };

    // Every callback checks `cancelled` first, so nothing reaches React after unmount.
    const proxy: WorldSceneCallbacks = {
      onReady: (info) => {
        renderer = info.renderer;
        if (import.meta.env.DEV && parent.parentElement) {
          parent.parentElement.dataset.renderer = info.renderer;
        }
      },
      onLoadError: (resource) => fail(resource),
      onNearbyChange: (id) => {
        if (!cancelled) callbacksRef.current.onNearbyChange(id);
      },
      onLandmarksInView: (ids) => {
        if (!cancelled) callbacksRef.current.onLandmarksInView(ids);
      },
      onExitContact: (exitId, open) => {
        if (!cancelled) callbacksRef.current.onExitContact(exitId, open);
      },
      onExitEntered: (exitId) => {
        if (!cancelled) callbacksRef.current.onExitEntered(exitId);
      },
      // Test hooks are written straight to the Play_Area element, not through React
      // state, so a moving Ghost does not re-render the view every frame. DEV only.
      onDebug: import.meta.env.DEV
        ? (info) => {
            const target = parent.parentElement;
            if (cancelled || !target) return;
            const round = (value: number) => String(Math.round(value * 100) / 100);
            target.dataset.ghostX = round(info.x);
            target.dataset.ghostY = round(info.y);
            target.dataset.ghostFacing = info.facing;
            target.dataset.ghostMoving = String(info.moving);
            target.dataset.cameraX = round(info.cameraX);
            target.dataset.cameraY = round(info.cameraY);
            if (info.litWindows === undefined) delete target.dataset.litWindows;
            else target.dataset.litWindows = String(info.litWindows);
            if (info.pose !== undefined) target.dataset.ghostPose = info.pose;
            if (info.anim !== undefined) target.dataset.anim = info.anim;
          }
        : undefined,
    };

    report({ state: 'loading', resource: null, renderer: null });

    // The 10 second limit applies to the initial load only.
    const timer = setTimeout(() => {
      if (!finished) fail('scene load (timed out after 10 seconds)');
    }, SCENE_LOAD_TIMEOUT_MS);

    async function start() {
      try {
        const module = await import('./phaser/createWorldScene');
        if (cancelled || finished) return;
        // A newer mount owns the scene now; do not create a second game.
        if (generation !== generationCounter) return;
        destroyQuietly(activeHandle);
        activeHandle = null;

        const created = await module.createWorldScene(parent!, snapshotRef.current, proxy);
        if (cancelled || finished || generation !== generationCounter) {
          // The game arrived late: destroy it and leave the document clean.
          destroyQuietly(created);
          return;
        }
        handle = created;
        activeHandle = created;
        handleRef.current = created;
        const canvas = parent!.querySelector('canvas');
        canvas?.setAttribute('tabindex', '-1');
        canvas?.setAttribute('aria-hidden', 'true');
        finished = true;
        clearTimeout(timer);
        created.update(snapshotRef.current);
        created.setHeld(heldRef.current);
        report({ state: 'ready', resource: null, renderer });
      } catch (error: unknown) {
        if (cancelled || finished) return;
        const resource =
          error instanceof Error && 'resource' in error && typeof error.resource === 'string'
            ? error.resource
            : 'Phaser module';
        fail(resource);
      }
    }
    void start();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      destroyQuietly(handle);
      if (activeHandle === handle) activeHandle = null;
      handle = null;
      handleRef.current = null;
      parent.replaceChildren();
    };
  }, []);

  return (
    <div
      ref={holderRef}
      className={styles.holder}
      aria-hidden="true"
      data-testid="world-scene-holder"
    />
  );
}
