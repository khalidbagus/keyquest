/**
 * The live bell dialog: the focus defect before repair, all four checks after it,
 * no ring or discovery during verification, element-not-found, and reset.
 * Requirements: 17.4, 19.2, 19.3, 20.2, 20.4, 20.5, 20.6, 20.7, 20.8, 22.1, 24.11, 24.12
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BellTower } from '../../src/components/BellTower/BellTower';
import { applyRepair, resetRepair } from '../../src/engines/RepairEngine';
import { verifyDialogFocus } from '../../src/engines/VerificationEngine';
import type { DialogFocusVerificationDetails } from '../../src/types';

const onOpen = vi.fn();
const onRing = vi.fn();
const exitSpy = vi.fn();

function mount(repaired = false) {
  return render(
    <div data-testid="challenge-sandbox">
      <BellTower repaired={repaired} rungBells={[]} openRequest={null} onOpen={onOpen} onRing={onRing} />
    </div>
  );
}

const dialog = () => screen.getByTestId('defect-bell-focus');
const moon = () => screen.getByTestId('bell-control-moon');

/** Stand-in for the Emergency Exit listener: it ignores handled presses. */
function exitListener(event: KeyboardEvent) {
  if (event.key === 'Escape' && !event.defaultPrevented && !event.repeat) exitSpy();
}

beforeEach(() => {
  // jsdom has no layout timing; run animation frames on a short timer.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0));
  document.addEventListener('keydown', exitListener);
});

afterEach(() => {
  cleanup();
  document.removeEventListener('keydown', exitListener);
  vi.unstubAllGlobals();
  onOpen.mockReset();
  onRing.mockReset();
  exitSpy.mockReset();
});

async function verifyNow() {
  let result: Awaited<ReturnType<typeof verifyDialogFocus>> | null = null;
  await act(async () => {
    result = await verifyDialogFocus(dialog());
  });
  return result!;
}

const checks = (r: Awaited<ReturnType<typeof verifyDialogFocus>>) =>
  (r.details as DialogFocusVerificationDetails).checks;

describe('the bell dialog defect', () => {
  it('leaves focus on the opener when it opens and drops it to the body when it closes', () => {
    mount();
    moon().focus();
    fireEvent.click(moon());
    expect(dialog().getAttribute('data-open')).toBe('true');
    expect(document.activeElement).toBe(moon());
    expect(dialog().contains(document.activeElement)).toBe(false);
    expect(screen.getByRole('dialog', { name: 'Ring the Moon bell?' })).toBeTruthy();

    fireEvent.click(screen.getByTestId('bell-cancel'));
    expect(dialog().getAttribute('data-open')).toBe('false');
    expect(document.activeElement).toBe(document.body);
  });

  it('closes on Escape wherever focus is, before the exit listener sees it', () => {
    mount();
    fireEvent.click(moon());
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(dialog().getAttribute('data-open')).toBe('false');
    expect(exitSpy).not.toHaveBeenCalled();
    // A fresh Escape with the dialog closed reaches the exit.
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(exitSpy).toHaveBeenCalledTimes(1);
  });

  it('records discovery on open and a ring on Ring, but nothing on Cancel', () => {
    mount();
    fireEvent.click(screen.getByTestId('bell-control-key'));
    expect(onOpen).toHaveBeenCalledWith('key');
    fireEvent.click(screen.getByTestId('bell-cancel'));
    expect(onRing).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('bell-control-key'));
    fireEvent.click(screen.getByTestId('bell-ring'));
    expect(onRing).toHaveBeenCalledWith('key');
  });
});

describe('verifyDialogFocus', () => {
  it('fails the entry check and all three return checks before repair', async () => {
    mount();
    const result = await verifyNow();
    expect(result.passed).toBe(false);
    expect(checks(result).map((c) => [c.id, c.passed])).toEqual([
      ['entry', false],
      ['return-ring', false],
      ['return-cancel', false],
      ['return-escape', false],
    ]);
    expect(checks(result)[1]!.focused).toBe('body');
  });

  it('passes all four checks after the repair, with no ring, discovery, or exit', async () => {
    mount();
    applyRepair('bell-dialog-focus', dialog());
    const result = await verifyNow();
    expect(checks(result).map((c) => [c.id, c.passed])).toEqual([
      ['entry', true],
      ['return-ring', true],
      ['return-cancel', true],
      ['return-escape', true],
    ]);
    expect(result.passed).toBe(true);
    expect(checks(result)[0]!.focused).toBe('button "Ring"');
    expect(onRing).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(dialog().getAttribute('data-open')).toBe('false');
    expect(screen.getByTestId('challenge-sandbox').dataset.keyquestVerifying).toBeUndefined();
  });

  it('reapplies the saved repair when the tower mounts repaired', async () => {
    mount(true);
    expect(dialog().dataset.keyquestRepaired).toBe('bell-focus');
    expect((await verifyNow()).passed).toBe(true);
  });

  it('fails all four checks with "element not found" when the first bell is missing', async () => {
    mount();
    moon().remove();
    const result = await verifyNow();
    expect(result.passed).toBe(false);
    expect(checks(result).every((c) => !c.passed && c.focused === 'element not found')).toBe(true);
  });

  it('reports all four checks failed when there is no dialog at all', async () => {
    const result = await verifyDialogFocus(null);
    expect(checks(result)).toHaveLength(4);
    expect(result.passed).toBe(false);
  });

  it('restores the defect on reset', async () => {
    mount();
    applyRepair('bell-dialog-focus', dialog());
    resetRepair('bell-dialog-focus', dialog());
    expect(dialog().dataset.keyquestRepaired).toBeUndefined();
    expect((await verifyNow()).passed).toBe(false);
  });
});
