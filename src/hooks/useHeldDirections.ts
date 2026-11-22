/**
 * useHeldDirections
 * Merges keyboard and touch direction holds through the pure heldInput stack
 * and reports the winning direction to the scene.
 *
 * Holds are cleared when the window loses focus, the page becomes hidden,
 * input becomes blocked by a dialog, and on unmount. After a clear, a key that
 * is still physically down only sends `repeat` keydowns, which the Play_Area
 * ignores, so movement does not restart (Requirements 6.10, 11.1 to 11.7).
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createHeldInput } from '../engines/heldInput';
import type { Direction } from '../types/clocktower';

export interface UseHeldDirectionsOptions {
  /** Receives the direction to move, or null to stop. Called only when it changes. */
  setHeld: (direction: Direction | null) => void;
  /** True while any dialog is open. Input is refused and holds are cleared. */
  inputBlocked: boolean;
}

export interface HeldDirections {
  press: (source: string, direction: Direction) => void;
  release: (source: string) => void;
  /** Release keyboard holds only. Used when the Play_Area loses focus. */
  releaseKeyboard: () => void;
  clear: () => void;
  /** False while input is blocked; callers check this before dispatching an interaction. */
  canInteract: () => boolean;
  current: () => Direction | null;
}

export function useHeldDirections({ setHeld, inputBlocked }: UseHeldDirectionsOptions): HeldDirections {
  const [stack] = useState(() => createHeldInput());
  const emitted = useRef<Direction | null>(null);
  const setHeldRef = useRef(setHeld);
  const blockedRef = useRef(inputBlocked);

  useLayoutEffect(() => {
    setHeldRef.current = setHeld;
    blockedRef.current = inputBlocked;
  }, [setHeld, inputBlocked]);

  const sync = useCallback(() => {
    const next = stack.current();
    if (next === emitted.current) return;
    emitted.current = next;
    setHeldRef.current(next);
  }, [stack]);

  const press = useCallback(
    (source: string, direction: Direction) => {
      if (blockedRef.current) return;
      stack.press(source, direction);
      sync();
    },
    [stack, sync]
  );

  const release = useCallback(
    (source: string) => {
      stack.release(source);
      sync();
    },
    [stack, sync]
  );

  const releaseKeyboard = useCallback(() => {
    stack.releasePrefix('key:');
    sync();
  }, [stack, sync]);

  const clear = useCallback(() => {
    stack.clear();
    sync();
  }, [stack, sync]);

  const canInteract = useCallback(() => !blockedRef.current, []);
  const current = useCallback(() => stack.current(), [stack]);

  // A dialog opening clears every hold at once.
  useEffect(() => {
    if (inputBlocked) clear();
  }, [inputBlocked, clear]);

  // Window blur and a hidden page clear every hold; unmount clears and stops the scene.
  useEffect(() => {
    const onBlur = () => clear();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') clear();
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      clear();
    };
  }, [clear]);

  return useMemo(
    () => ({ press, release, releaseKeyboard, clear, canInteract, current }),
    [press, release, releaseKeyboard, clear, canInteract, current]
  );
}
