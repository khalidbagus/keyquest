/**
 * usePrefersReducedMotion Hook
 * Respects system prefers-reduced-motion preference and provides a manual
 * override persisted to localStorage.
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { useState, useEffect, useCallback } from 'react';

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

export function usePrefersReducedMotion(): ReducedMotionControls {
  const [systemPrefersReduced, setSystemPrefersReduced] = useState<boolean>(
    getSystemReducedMotion
  );
  const [manualOverride, setManualOverride] = useState<boolean | null>(
    getStoredMotionOverride
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersReduced(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const prefersReducedMotion =
    manualOverride !== null ? manualOverride : systemPrefersReduced;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.reducedMotion = prefersReducedMotion
        ? 'true'
        : 'false';
    }
  }, [prefersReducedMotion]);

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
