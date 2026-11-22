/**
 * useReactionToken
 * Invalidates pending mascot reactions. Each new attempt calls `next()` and the
 * unmount advances the token, so a reaction scheduled for an older attempt, or
 * for a view that is gone, checks `isCurrent(n)` and skips itself
 * (Requirements 12.5, 23.5).
 */

import { useCallback, useEffect, useRef } from 'react';

export interface ReactionToken {
  /** Start a new attempt. Returns its token and invalidates every earlier one. */
  next: () => number;
  isCurrent: (token: number) => boolean;
}

export function useReactionToken(): ReactionToken {
  const token = useRef(0);

  const next = useCallback(() => {
    token.current += 1;
    return token.current;
  }, []);

  const isCurrent = useCallback((value: number) => token.current === value, []);

  useEffect(() => {
    const ref = token;
    return () => {
      ref.current += 1;
    };
  }, []);

  return { next, isCurrent };
}
