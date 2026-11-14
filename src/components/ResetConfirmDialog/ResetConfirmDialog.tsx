/**
 * Reset Confirmation Dialog
 * Confirms before resetting challenge progress
 * Requirements: 11.1, 11.2, 11.6
 */

import { useEffect, useRef, useCallback, type RefObject } from 'react';
import styles from './ResetConfirmDialog.module.css';

interface ResetConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}

export function ResetConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  returnFocusRef,
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
      aria-labelledby="reset-dialog-title"
      aria-describedby="reset-dialog-description"
      data-testid="reset-confirm-dialog"
    >
      <div className={styles.content}>
        <h2 id="reset-dialog-title" className={styles.title}>
          Reset Challenge?
        </h2>

        <p id="reset-dialog-description" className={styles.description}>
          This will clear all your progress including discovered defects and
          applied repairs. This action cannot be undone.
        </p>

        <div className={styles.actions}>
          <button
            ref={cancelButtonRef}
            type="button"
            className={styles.cancelButton}
            onClick={handleCancel}
            data-testid="reset-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleConfirm}
            data-testid="reset-confirm"
          >
            Reset
          </button>
        </div>
      </div>
    </dialog>
  );
}
