/**
 * Reset Confirmation Dialog
 * Confirms before resetting challenge progress
 * Requirements: 11.1, 11.2, 11.6
 */

import { useEffect, useRef, useCallback } from 'react';
import styles from './ResetConfirmDialog.module.css';

interface ResetConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ResetConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
}: ResetConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Show/hide dialog based on isOpen prop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement;
      dialog.showModal();
      // Focus cancel button (safe default)
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 0);
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Return focus after dialog closes
  useEffect(() => {
    if (!isOpen && previousActiveElement.current instanceof HTMLElement) {
      // Small delay to ensure dialog is fully closed
      const timeoutId = setTimeout(() => {
        if (previousActiveElement.current instanceof HTMLElement) {
          previousActiveElement.current.focus();
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [isOpen]);

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
