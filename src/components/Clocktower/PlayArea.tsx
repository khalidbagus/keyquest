/**
 * PlayArea
 * A focusable application region around the Phaser canvas. It owns keyboard input
 * for the Ghost: Arrow keys hold a direction, Enter and Space interact once per
 * press. Tab, Shift+Tab, and Escape are never touched, so focus can always leave
 * and Escape reaches the Emergency Exit (Requirements 6.1 to 6.10, 8.4).
 *
 * The focus ring sits on this outer element and the canvas clipping on the inner
 * holder, so nothing clips the ring (Requirement 6.9).
 */

import type { KeyboardEvent, ReactNode } from 'react';
import { PLAY_AREA_LABEL } from '../../registry/clocktowerCopy';
import type { Direction, WorldSceneState } from '../../types/clocktower';
import type { HeldDirections } from '../../hooks/useHeldDirections';
import styles from './PlayArea.module.css';

export const PLAY_AREA_INSTRUCTIONS_ID = 'play-area-instructions';

const ARROW_DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'north',
  ArrowDown: 'south',
  ArrowLeft: 'west',
  ArrowRight: 'east',
};

interface PlayAreaProps {
  held: HeldDirections;
  /** Called once per Enter or Space press; auto-repeat is ignored. */
  onInteract: () => void;
  sceneState: WorldSceneState;
  /** Test hooks, rendered in development builds only. */
  debug?: { area: string; lantern: boolean; gate?: boolean };
  children: ReactNode;
}

export function PlayArea({ held, onInteract, sceneState, debug, children }: PlayAreaProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Browser shortcuts such as Alt+Left stay untouched.
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const direction = ARROW_DIRECTIONS[event.key];
    if (direction) {
      // Always stop the page from scrolling while the Play_Area has focus.
      event.preventDefault();
      if (!event.repeat) held.press(`key:${event.key}`, direction);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat && held.canInteract()) onInteract();
    }
  }

  function handleKeyUp(event: KeyboardEvent<HTMLDivElement>) {
    if (ARROW_DIRECTIONS[event.key]) held.release(`key:${event.key}`);
  }

  return (
    // role="application" lets screen readers pass Arrow keys through. The Route_Panel
    // is the screen reader path, so the canvas inside stays hidden from the tree.
    <div
      className={styles.playArea}
      role="application"
      tabIndex={0}
      aria-label={PLAY_AREA_LABEL}
      aria-describedby={PLAY_AREA_INSTRUCTIONS_ID}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={() => held.releaseKeyboard()}
      data-testid="play-area"
      data-scene-state={sceneState}
      data-area={debug?.area}
      data-lantern={debug ? String(debug.lantern) : undefined}
      data-gate={debug?.gate === undefined ? undefined : String(debug.gate)}
    >
      {children}
    </div>
  );
}
