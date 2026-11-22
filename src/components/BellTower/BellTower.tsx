/**
 * BellTower (Challenge Sandbox only)
 * Three bell controls and a non-modal bell dialog with an intentional focus defect
 * (Bell_Focus_Curse, WCAG 2.4.3):
 * - Opening moves no focus, so focus stays on the opener (Requirement 19.2).
 * - Closing re-keys the bell row, so the focused opener leaves the document and
 *   focus falls to the body (Requirement 19.3).
 * The repair (RepairEngine.repairBellDialogFocus) listens for the lifecycle events
 * this component dispatches and moves focus in and back.
 *
 * Never render this outside `[data-testid="challenge-sandbox"]`.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { applyRepair } from '../../engines/RepairEngine';
import { BELLS } from '../../registry/clocktowerRoute';
import type { BellId } from '../../types/clocktower';
import type { GhostVisionMode } from '../MidnightCheckout/MidnightCheckout';
import styles from './BellTower.module.css';

export type BellCloseVia = 'ring' | 'cancel' | 'escape';

export interface BellTowerProps {
  /** The saved curse is repaired: reapply the repair to the live dialog. */
  repaired: boolean;
  /** Bells already rung in order, shown on the controls. */
  rungBells: readonly BellId[];
  /** Open the dialog from outside (a bell Interactable or a Route_Panel action). */
  openRequest: { bell: BellId; seq: number } | null;
  /** The dialog opened for real (not during verification): discovery. */
  onOpen: (bell: BellId) => void;
  /** Ring was confirmed for real (not during verification). */
  onRing: (bell: BellId) => void;
  /** Report the dialog's open state (for input blocking in the view). */
  onOpenChange?: (open: boolean) => void;
  visionMode?: GhostVisionMode;
}

function labelOf(bell: BellId): string {
  return BELLS.find((entry) => entry.id === bell)?.label ?? bell;
}

/** A short description of where keyboard focus is, for the Focus X-Ray lens. */
function describeFocus(): string {
  const active = document.activeElement;
  if (!active || active === document.body) return 'the page body (focus is lost)';
  const text = (active.getAttribute('aria-label') ?? active.textContent ?? '').replace(/\s+/g, ' ').trim();
  return `${active.getAttribute('role') ?? active.tagName.toLowerCase()}${text ? ` “${text.slice(0, 40)}”` : ''}`;
}

export function BellTower({
  repaired,
  rungBells,
  openRequest,
  onOpen,
  onRing,
  onOpenChange,
  visionMode = 'normal',
}: BellTowerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [openBell, setOpenBell] = useState<BellId | null>(null);
  // The defect: every close re-keys the bell row, which replaces the opener.
  const [dialogSession, setDialogSession] = useState(0);
  const pendingClose = useRef<{ bell: BellId; via: BellCloseVia } | null>(null);
  const openBellRef = useRef<BellId | null>(null);
  const [focusReadout, setFocusReadout] = useState('');

  const verifying = useCallback(
    () =>
      rootRef.current?.closest<HTMLElement>('[data-testid="challenge-sandbox"]')?.dataset.keyquestVerifying ===
      'true',
    []
  );

  const openDialog = useCallback(
    (bell: BellId) => {
      openBellRef.current = bell;
      setOpenBell(bell);
      if (!verifying()) onOpen(bell);
    },
    [onOpen, verifying]
  );

  const closeDialog = useCallback(
    (via: BellCloseVia) => {
      const bell = openBellRef.current;
      if (!bell) return;
      openBellRef.current = null;
      pendingClose.current = { bell, via };
      setOpenBell(null);
      setDialogSession((n) => n + 1);
      if (via === 'ring' && !verifying()) onRing(bell);
    },
    [onRing, verifying]
  );

  // Reapply the saved repair to this live dialog (as PantrySession does).
  useLayoutEffect(() => {
    if (repaired && dialogRef.current) applyRepair('bell-dialog-focus', dialogRef.current);
  }, [repaired]);

  // Lifecycle events, after the commit that shows or hides the dialog.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openBell) {
      dialog.dispatchEvent(new CustomEvent('keyquest-bell-open', { bubbles: true, detail: { bell: openBell } }));
      return;
    }
    const closed = pendingClose.current;
    if (closed) {
      pendingClose.current = null;
      dialog.dispatchEvent(new CustomEvent('keyquest-bell-close', { bubbles: true, detail: closed }));
    }
  }, [openBell, dialogSession]);

  useEffect(() => {
    onOpenChange?.(openBell !== null);
  }, [openBell, onOpenChange]);

  // Open from a bell Interactable or a Route_Panel action (Requirement 19.10).
  const handledRequest = useRef(openRequest?.seq ?? 0);
  useEffect(() => {
    if (!openRequest || openRequest.seq === handledRequest.current) return;
    handledRequest.current = openRequest.seq;
    openDialog(openRequest.bell);
  }, [openRequest, openDialog]);

  // Escape closes the dialog wherever focus is, before Emergency Exit sees it.
  // An active native modal handles Escape first (Requirement 22.1).
  useEffect(() => {
    if (!openBell) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('dialog[open]')) return;
      event.preventDefault();
      closeDialog('escape');
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [openBell, closeDialog]);

  // Focus X-Ray: show where focus is now.
  useEffect(() => {
    if (visionMode !== 'xray') return;
    const update = () => setFocusReadout(describeFocus());
    const later = () => requestAnimationFrame(update);
    update();
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', later);
    // A removed element loses focus without a focusout, so poll as well.
    const timer = window.setInterval(update, 300);
    return () => {
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', later);
      window.clearInterval(timer);
    };
  }, [visionMode]);

  const openLabel = openBell ? labelOf(openBell) : '';

  return (
    <div ref={rootRef} className={`keyquest-belltower ${styles.tower}`} data-testid="bell-tower">
      <ul key={dialogSession} className={`keyquest-belltower-row ${styles.row}`}>
        {BELLS.map((bell) => (
          <li key={bell.id}>
            <button
              type="button"
              className={styles.bell}
              data-testid={`bell-control-${bell.id}`}
              data-bell={bell.id}
              data-rung={rungBells.includes(bell.id) ? 'true' : 'false'}
              onClick={() => openDialog(bell.id)}
            >
              <span aria-hidden="true" className={styles.bellGlyph}>
                {rungBells.includes(bell.id) ? '🔔' : '🔕'}
              </span>
              {bell.label}
            </button>
          </li>
        ))}
      </ul>

      <div
        ref={dialogRef}
        role="dialog"
        aria-labelledby="bell-dialog-title"
        hidden={!openBell}
        className={styles.dialog}
        data-testid="defect-bell-focus"
        data-open={openBell ? 'true' : 'false'}
      >
        <h4 id="bell-dialog-title" className={styles.dialogTitle}>
          {openBell ? `Ring the ${openLabel}?` : 'Ring a bell?'}
        </h4>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.ring} data-testid="bell-ring" onClick={() => closeDialog('ring')}>
            Ring
          </button>
          <button type="button" className={styles.cancel} data-testid="bell-cancel" onClick={() => closeDialog('cancel')}>
            Cancel
          </button>
        </div>
      </div>

      {visionMode === 'xray' && (
        <p className={styles.xray} data-testid="bell-focus-xray" aria-hidden="true">
          Keyboard focus: {focusReadout}
        </p>
      )}
    </div>
  );
}
