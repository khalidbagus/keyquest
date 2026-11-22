/**
 * Clocktower hooks: held-direction clearing, repeated Room_Status text, reaction tokens.
 * Requirements: 3.6, 6.10, 11.1, 11.2, 11.3, 11.6, 12.5, 23.5
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHeldDirections } from '../../src/hooks/useHeldDirections';
import { useReactionToken } from '../../src/hooks/useReactionToken';
import { useRoomStatus } from '../../src/hooks/useRoomStatus';
import type { Direction } from '../../src/types/clocktower';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useHeldDirections', () => {
  function setup(initialBlocked = false) {
    const setHeld = vi.fn<(direction: Direction | null) => void>();
    const hook = renderHook(({ blocked }) => useHeldDirections({ setHeld, inputBlocked: blocked }), {
      initialProps: { blocked: initialBlocked },
    });
    return { setHeld, ...hook };
  }

  it('reports the most recent held direction and stops when released', () => {
    const { setHeld, result } = setup();
    act(() => result.current.press('key:ArrowUp', 'north'));
    act(() => result.current.press('touch:east', 'east'));
    act(() => result.current.release('touch:east'));
    act(() => result.current.release('key:ArrowUp'));
    expect(setHeld.mock.calls.map(([d]) => d)).toEqual(['north', 'east', 'north', null]);
  });

  it('reports only changes', () => {
    const { setHeld, result } = setup();
    act(() => result.current.press('key:ArrowUp', 'north'));
    act(() => result.current.press('key:ArrowUp', 'north'));
    expect(setHeld).toHaveBeenCalledTimes(1);
  });

  it('clears every hold when the window loses focus', () => {
    const { setHeld, result } = setup();
    act(() => result.current.press('key:ArrowLeft', 'west'));
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(setHeld).toHaveBeenLastCalledWith(null);
    expect(result.current.current()).toBeNull();
  });

  it('clears every hold when the page becomes hidden', () => {
    const { setHeld, result } = setup();
    act(() => result.current.press('touch:south', 'south'));
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    visibility.mockRestore();
    expect(setHeld).toHaveBeenLastCalledWith(null);
  });

  it('keeps holds when the page becomes visible again', () => {
    const { setHeld, result } = setup();
    act(() => result.current.press('touch:south', 'south'));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(setHeld).toHaveBeenLastCalledWith('south');
  });

  it('clears keyboard holds only when the Play_Area loses focus', () => {
    const { setHeld, result } = setup();
    act(() => result.current.press('key:ArrowLeft', 'west'));
    act(() => result.current.press('touch:north', 'north'));
    act(() => result.current.releaseKeyboard());
    expect(result.current.current()).toBe('north');
    expect(setHeld).toHaveBeenLastCalledWith('north');
  });

  it('clears holds when input becomes blocked and refuses new presses until unblocked', () => {
    const { setHeld, result, rerender } = setup();
    act(() => result.current.press('key:ArrowLeft', 'west'));
    rerender({ blocked: true });
    expect(setHeld).toHaveBeenLastCalledWith(null);
    expect(result.current.canInteract()).toBe(false);
    act(() => result.current.press('key:ArrowRight', 'east'));
    expect(result.current.current()).toBeNull();
    rerender({ blocked: false });
    expect(result.current.canInteract()).toBe(true);
    act(() => result.current.press('key:ArrowRight', 'east'));
    expect(result.current.current()).toBe('east');
  });

  it('does not restart movement from a key held through blur (repeat keydowns never press)', () => {
    // The Play_Area ignores `repeat` keydowns, so after a clear nothing presses again.
    const { setHeld, result } = setup();
    act(() => result.current.press('key:ArrowLeft', 'west'));
    act(() => result.current.clear());
    const callsAfterClear = setHeld.mock.calls.length;
    expect(result.current.current()).toBeNull();
    expect(setHeld).toHaveBeenCalledTimes(callsAfterClear);
  });

  it('stops the scene on unmount', () => {
    const { setHeld, result, unmount } = setup();
    act(() => result.current.press('key:ArrowUp', 'north'));
    unmount();
    expect(setHeld).toHaveBeenLastCalledWith(null);
  });
});

describe('useRoomStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
  });

  it('sets new text in the same render', () => {
    const { result } = renderHook(() => useRoomStatus());
    act(() => result.current.announce('Lantern lit.'));
    expect(result.current.text).toBe('Lantern lit.');
  });

  it('announces identical text again: clears, then sets on the next animation frame', () => {
    const { result } = renderHook(() => useRoomStatus());
    act(() => result.current.announce('Nothing is close enough.'));
    act(() => result.current.announce('Nothing is close enough.'));
    expect(result.current.text).toBe('');
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(result.current.text).toBe('Nothing is close enough.');
  });

  it('does not set stale text after a different message arrives first', () => {
    const { result } = renderHook(() => useRoomStatus());
    act(() => result.current.announce('A'));
    act(() => result.current.announce('A'));
    act(() => result.current.announce('B'));
    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(result.current.text).toBe('B');
  });
});

describe('useReactionToken', () => {
  it('invalidates an older attempt when a new one starts', () => {
    const { result } = renderHook(() => useReactionToken());
    const first = result.current.next();
    expect(result.current.isCurrent(first)).toBe(true);
    const second = result.current.next();
    expect(result.current.isCurrent(first)).toBe(false);
    expect(result.current.isCurrent(second)).toBe(true);
  });

  it('invalidates a pending reaction on unmount', () => {
    const { result, unmount } = renderHook(() => useReactionToken());
    const { isCurrent } = result.current;
    const token = result.current.next();
    unmount();
    expect(isCurrent(token)).toBe(false);
  });
});
