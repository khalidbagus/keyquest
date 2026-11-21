/**
 * Reset Confirmation Dialog
 * Confirms before clearing progress. Used for the in-room Reset and for
 * Start over on the opening screen.
 * Requirements: 11.1, 11.2, 11.6
 */

import { useEffect, useRef, useCallback, type RefObject } from 'react';
import styles from './ResetConfirmDialog.module.css';

interface ResetConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  /** Prefix for element ids and test ids. Defaults to "reset". */
  idPrefix?: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export function ResetConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  returnFocusRef,
  idPrefix = 'reset',
  title = 'Reset Challenge?',
  description = 'This will clear all your progress including discovered defects and applied repairs. This action cannot be undone.',
  confirmLabel = 'Reset',
}: ResetConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Show/hide dialog based on isOpen prop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      // Focus cancel button (safe default)
      cancelButtonRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
      // Safari/WebKit clicks do not necessarily focus the trigger. Restore
      // explicitly after the modal closes and the background stops being inert.
      returnFocusRef.current?.focus();
    }
  }, [isOpen, returnFocusRef]);

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  // Handle native dialog cancel event (Escape key)
  const handleDialogCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      onCancel();
    },
    [onCancel]
  );

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onCancel={handleDialogCancel}
      aria-labelledby={`${idPrefix}-dialog-title`}
      aria-describedby={`${idPrefix}-dialog-description`}
      data-testid={`${idPrefix}-confirm-dialog`}
    >
      <div className={styles.content}>
        <h2 id={`${idPrefix}-dialog-title`} className={styles.title}>
          {title}
        </h2>

        <p id={`${idPrefix}-dialog-description`} className={styles.description}>
          {description}
        </p>

        <div className={styles.actions}>
          <button
            ref={cancelButtonRef}
            type="button"
            className={styles.cancelButton}
            onClick={handleCancel}
            data-testid={`${idPrefix}-cancel`}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleConfirm}
            data-testid={`${idPrefix}-confirm`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
