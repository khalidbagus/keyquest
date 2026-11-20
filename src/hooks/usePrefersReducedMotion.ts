/**
 * usePrefersReducedMotion Hook
 * Uses the shared ReducedMotionProvider when mounted inside App,
 * and falls back to standalone state for isolated component/hook unit tests.
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import {
  useReducedMotionContext,
  useReducedMotionState,
  type ReducedMotionControls,
} from '../context/ReducedMotionContext';

export type { ReducedMotionControls };

export function usePrefersReducedMotion(): ReducedMotionControls {
  const shared = useReducedMotionContext();
  // Only activate standalone listeners & dataset writes when outside ReducedMotionProvider
  const standalone = useReducedMotionState(shared === null);
  return shared ?? standalone;
}
