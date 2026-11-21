/**
 * Door Selector (Adventure hub)
 * A compact list of the apothecary's rooms with cleared, open, locked, and
 * coming-later states. State is given in words and icons, never color alone.
 * Door unlocks are derived from verified progress (roomsRegistry).
 */

import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import {
  DOOR_REQUIREMENT,
  ROOMS,
  getDoorState,
  isRoomCleared,
  type DoorState,
} from '../registry/roomsRegistry';
import type { RoomId } from '../types';
import styles from './DoorSelectorView.module.css';

const STATE_LABEL: Record<DoorState, string> = {
  cleared: 'Cleared',
  available: 'Open',
  locked: 'Locked',
  'coming-soon': 'Coming later',
};

const STATE_ICON: Record<DoorState, string> = {
  cleared: '✓',
  available: '→',
  locked: '🔒︎',
  'coming-soon': '…',
};

function DoorArt({ state }: { state: DoorState }) {
  const open = state === 'available' || state === 'cleared';
  return (
    <svg viewBox="0 0 48 64" className={styles.doorArt} aria-hidden="true" focusable="false">
      <path d="M4 62 V24 C4 12 13 4 24 4 C35 4 44 12 44 24 V62 Z" fill="#110c1b" stroke="#c8badf" strokeWidth="3" />
      {open ? (
        <path d="M10 62 V25 C10 16 16 10 24 10 L24 62 Z" fill="#fbbf24" opacity="0.85" />
      ) : (
        <path d="M10 62 V25 C10 16 16 10 24 10 C32 10 38 16 38 25 V62 Z" fill="#2e2147" />
      )}
      <circle cx={open ? 20 : 32} cy="38" r="2.5" fill="#c8badf" />
    </svg>
  );
}

export function DoorSelectorView() {
  const { progress, dispatch } = useGame();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const cleared = ROOMS.filter((room) => isRoomCleared(progress, room.id)).length;

  function enter(roomId: RoomId) {
    dispatch({ type: 'ENTER_ROOM', roomId });
  }

  return (
    <div className={styles.container}>
      <h2 ref={headingRef} tabIndex={-1} className={styles.heading} id="doors-heading">
        Choose a door
      </h2>
      <p className={styles.progress} data-testid="doors-progress">
        {cleared} of {ROOMS.length} rooms cleared
      </p>

      <ul className={styles.doorList} aria-labelledby="doors-heading">
        {ROOMS.map((room) => {
          const state = getDoorState(progress, room.id);
          return (
            <li
              key={room.id}
              className={`${styles.door} ${styles[state]}`}
              data-testid={`door-${room.id}`}
              data-state={state}
            >
              <DoorArt state={state} />
              <div className={styles.doorBody}>
                <p className={styles.roomNumber}>Room {room.number}</p>
                <h3 className={styles.roomName}>{room.name}</h3>
                <p className={styles.goal}>{room.goal}</p>
                {(state === 'locked' || state === 'coming-soon') && (
                  <p className={styles.requirement}>{DOOR_REQUIREMENT[room.id]}</p>
                )}
                {state === 'cleared' && (
                  <p className={styles.requirement}>You earned the {room.reward}.</p>
                )}
              </div>
              <div className={styles.doorActions}>
                <span className={styles.chip}>
                  <span aria-hidden="true">{STATE_ICON[state]}</span> {STATE_LABEL[state]}
                </span>
                {state === 'available' && (
                  <button
                    type="button"
                    className={styles.enterButton}
                    onClick={() => enter(room.id)}
                    data-testid={`enter-${room.id}`}
                  >
                    Enter<span className="visually-hidden"> {room.name}</span>
                  </button>
                )}
                {state === 'cleared' && (
                  <button
                    type="button"
                    className={styles.revisitButton}
                    onClick={() => enter(room.id)}
                    data-testid={`enter-${room.id}`}
                  >
                    Revisit<span className="visually-hidden"> {room.name}</span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className={styles.menuButton}
        onClick={() => dispatch({ type: 'EMERGENCY_EXIT' })}
        data-testid="doors-to-menu"
      >
        Back to the menu
      </button>
    </div>
  );
}
