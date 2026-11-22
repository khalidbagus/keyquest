/**
 * Emergency Exit and Escape: a handled or repeated Escape does not exit; a fresh,
 * unhandled Escape does. Requirements: 22.2, 22.5, 22.6
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const game = vi.hoisted(() => ({ dispatch: vi.fn(), saveProgress: vi.fn() }));

vi.mock('../../src/context/GameContext', () => ({
  useGame: () => ({ dispatch: game.dispatch, saveProgress: game.saveProgress }),
}));

import { EmergencyExitButton } from '../../src/components/EmergencyExit/EmergencyExitButton';

afterEach(() => {
  cleanup();
  game.dispatch.mockReset();
  game.saveProgress.mockReset();
  document.body.innerHTML = '';
});

const exits = () => game.dispatch.mock.calls.filter(([action]) => action?.type === 'EMERGENCY_EXIT').length;

describe('Emergency Exit Escape handling', () => {
  it('does not exit on an Escape that another handler already handled', () => {
    render(<EmergencyExitButton />);
    // A capture-phase handler (the bell dialog) consumes the press first.
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') event.preventDefault();
    };
    document.addEventListener('keydown', handler, true);
    try {
      fireEvent.keyDown(document.body, { key: 'Escape' });
    } finally {
      document.removeEventListener('keydown', handler, true);
    }
    expect(exits()).toBe(0);
    expect(game.saveProgress).not.toHaveBeenCalled();
  });

  it('does not exit on an auto-repeated Escape', () => {
    render(<EmergencyExitButton />);
    fireEvent.keyDown(document.body, { key: 'Escape', repeat: true });
    expect(exits()).toBe(0);
  });

  it('exits on a fresh, unhandled Escape and saves first', () => {
    render(<EmergencyExitButton />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(game.saveProgress).toHaveBeenCalledTimes(1);
    expect(exits()).toBe(1);
  });

  it('still leaves Escape to an open native modal dialog', () => {
    render(<EmergencyExitButton />);
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.appendChild(dialog);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(exits()).toBe(0);
  });
});
