/**
 * useRoomStatus
 * Text for one polite, atomic live region. `announce` sets the text in the same
 * render as the state change. When the new text equals the current text, it
 * clears the region and sets the text again on the next animation frame, so a
 * repeated message is announced again (Requirements 3.6, 10.7).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface RoomStatus {
  text: string;
  announce: (next: string) => void;
}

export function useRoomStatus(): RoomStatus {
  const [text, setText] = useState('');
  const current = useRef('');
  const frame = useRef<number | null>(null);

  const cancelFrame = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
  }, []);

  const announce = useCallback(
    (next: string) => {
      cancelFrame();
      if (next !== '' && next === current.current) {
        current.current = '';
        setText('');
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          current.current = next;
          setText(next);
        });
        return;
      }
      current.current = next;
      setText(next);
    },
    [cancelFrame]
  );

  useEffect(() => cancelFrame, [cancelFrame]);

  return { text, announce };
}
