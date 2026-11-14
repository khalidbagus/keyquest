/**
 * Unit Tests for usePrefersReducedMotion Hook
 * Validates system preference detection, manual override persistence,
 * and document root attribute synchronization.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrefersReducedMotion } from '../../src/hooks/usePrefersReducedMotion';

describe('usePrefersReducedMotion', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.reducedMotion;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('defaults to false when system preference is no-preference and no override exists', () => {
    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current.prefersReducedMotion).toBe(false);
    expect(result.current.isManualOverride).toBe(false);
    expect(document.documentElement.dataset.reducedMotion).toBe('false');
  });

  it('respects system prefers-reduced-motion: reduce preference', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current.prefersReducedMotion).toBe(true);
    expect(document.documentElement.dataset.reducedMotion).toBe('true');
  });

  it('toggles manual preference and persists to localStorage', () => {
    const { result } = renderHook(() => usePrefersReducedMotion());

    act(() => {
      result.current.toggleReducedMotion();
    });

    expect(result.current.prefersReducedMotion).toBe(true);
    expect(result.current.isManualOverride).toBe(true);
    expect(localStorage.getItem('keyquest-reduced-motion-v1')).toBe('true');
    expect(document.documentElement.dataset.reducedMotion).toBe('true');
  });
});
