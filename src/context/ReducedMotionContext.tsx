/**
 * Shared Reduced Motion Context
 * Keeps the footer toggle, OS prefers-reduced-motion media query,
 * html[data-reduced-motion], and all mounted Rive mascots in sync.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

const REDUCED_MOTION_STORAGE_KEY = 'keyquest-reduced-motion-v1';

function getSystemReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getStoredMotionOverride(): boolean | null {
  try {
    const raw = localStorage.getItem(REDUCED_MOTION_STORAGE_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

export interface ReducedMotionControls {
  prefersReducedMotion: boolean;
  isManualOverride: boolean;
  toggleReducedMotion: () => void;
}

const ReducedMotionContext = createContext<ReducedMotionControls | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useReducedMotionState(
  enabled = true
): ReducedMotionControls {
  const [systemPrefersReduced, setSystemPrefersReduced] = useState<boolean>(
    () => (enabled ? getSystemReducedMotion() : false)
  );
  const [manualOverride, setManualOverride] = useState<boolean | null>(() =>
    enabled ? getStoredMotionOverride() : null
  );

  useEffect(() => {
    if (
      !enabled ||
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersReduced(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [enabled]);

  const prefersReducedMotion =
    manualOverride !== null ? manualOverride : systemPrefersReduced;

  useEffect(() => {
    if (enabled && typeof document !== 'undefined') {
      document.documentElement.dataset.reducedMotion = prefersReducedMotion
        ? 'true'
        : 'false';
    }
  }, [enabled, prefersReducedMotion]);

  const toggleReducedMotion = useCallback(() => {
    const nextValue = !prefersReducedMotion;
    setManualOverride(nextValue);
    try {
      localStorage.setItem(REDUCED_MOTION_STORAGE_KEY, String(nextValue));
    } catch {
      // Ignore storage errors when localStorage is unavailable
    }
  }, [prefersReducedMotion]);

  return {
    prefersReducedMotion,
    isManualOverride: manualOverride !== null,
    toggleReducedMotion,
  };
}

export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const value = useReducedMotionState(true);
  return (
    <ReducedMotionContext.Provider value={value}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useReducedMotionContext(): ReducedMotionControls | null {
  return useContext(ReducedMotionContext);
}
