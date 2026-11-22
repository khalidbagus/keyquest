/**
 * TouchControls
 * Five native buttons: four directions and Interact. They move the Ghost and
 * interact whether or not the Play_Area has focus (Requirements 9.1 to 9.10).
 *
 * - A direction button holds while the pointer is down on it, or while Enter or
 *   Space is held with the button focused. Release, cancel, leave, lost capture,
 *   and blur all stop it.
 * - Interact runs once per press: from Enter or Space on keydown (which cancels the
 *   click), or from the click that a pointer or assistive technology sends.
 */

import type { KeyboardEvent, PointerEvent } from 'react';
import type { Direction } from '../../types/clocktower';
import type { HeldDirections } from '../../hooks/useHeldDirections';
import styles from './TouchControls.module.css';

interface TouchControlsProps {
  held: HeldDirections;
  onInteract: () => void;
}

interface DirectionButton {
  direction: Direction;
  name: string;
  glyph: string;
  testId: string;
  className: string;
}

const DIRECTION_BUTTONS: readonly DirectionButton[] = [
  { direction: 'north', name: 'Move up', glyph: '▲', testId: 'touch-up', className: styles.up! },
  { direction: 'west', name: 'Move left', glyph: '◀', testId: 'touch-left', className: styles.left! },
  { direction: 'east', name: 'Move right', glyph: '▶', testId: 'touch-right', className: styles.right! },
  { direction: 'south', name: 'Move down', glyph: '▼', testId: 'touch-down', className: styles.down! },
];

function isActivationKey(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' ';
}

export function TouchControls({ held, onInteract }: TouchControlsProps) {
  function interact() {
    if (held.canInteract()) onInteract();
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>, source: string, direction: Direction) {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    // Touch pointers capture implicitly; release it so leaving the button ends the hold.
    const target = event.currentTarget;
    if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
    held.press(source, direction);
  }

  return (
    <div
      className={styles.controls}
      role="group"
      aria-label="Touch controls"
      data-testid="touch-controls"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className={styles.dpad}>
        {DIRECTION_BUTTONS.map(({ direction, name, glyph, testId, className }) => {
          const source = `touch:${direction}`;
          return (
            <button
              key={direction}
              type="button"
              className={`${styles.button} ${className}`}
              data-testid={testId}
              onPointerDown={(event) => pointerDown(event, source, direction)}
              onPointerUp={() => held.release(source)}
              onPointerCancel={() => held.release(source)}
              onPointerLeave={() => held.release(source)}
              onLostPointerCapture={() => held.release(source)}
              onKeyDown={(event) => {
                if (!isActivationKey(event)) return;
                event.preventDefault();
                if (!event.repeat) held.press(source, direction);
              }}
              onKeyUp={(event) => {
                if (isActivationKey(event)) held.release(source);
              }}
              onBlur={() => held.release(source)}
            >
              <span aria-hidden="true">{glyph}</span>
              <span className="visually-hidden">{name}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={`${styles.button} ${styles.interact}`}
        data-testid="touch-interact"
        onKeyDown={(event) => {
          if (!isActivationKey(event)) return;
          // Handling the key here keeps the browser from also sending a click.
          event.preventDefault();
          if (!event.repeat) interact();
        }}
        onClick={interact}
      >
        <span aria-hidden="true">✦</span>
        <span className="visually-hidden">Interact</span>
      </button>
    </div>
  );
}
