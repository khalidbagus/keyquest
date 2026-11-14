/**
 * Progress Restore Dialog
 * Shows when saved progress is found on app load
 * Requirements: 12.2, 12.3, 12.4, 12.5
 */

import { useEffect, useRef, useCallback } from 'react';
import type { ProgressState } from '../../types';
import styles from './ProgressRestoreDialog.module.css';

interface ProgressRestoreDialogProps {
  savedProgress: ProgressState;
  onRestore: () => void;
  onStartFresh: () => void;
}

export function ProgressRestoreDialog({
  savedProgress,
  onRestore,
  onStartFresh,
}: ProgressRestoreDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);

  // Calculate progress summary
  const repairedCount = Object.values(savedProgress.defects).filter(
    (d) => d.repaired
  ).length;
  const discoveredCount = Object.values(savedProgress.defects).filter(
    (d) => d.discovered
  ).length;

  // Format last played time
  const formatLastPlayed = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  // Show dialog and focus restore button on mount
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      // Focus the restore button after dialog opens
      setTimeout(() => {
        restoreButtonRef.current?.focus();
      }, 0);
    }
  }, []);

  const handleRestore = useCallback(() => {
    dialogRef.current?.close();
    onRestore();
  }, [onRestore]);

  const handleStartFresh = useCallback(() => {
    dialogRef.current?.close();
    onStartFresh();
  }, [onStartFresh]);

  // Handle Escape key - defaults to Start Fresh (safe option)
  const handleCancel = useCallback(() => {
    handleStartFresh();
  }, [handleStartFresh]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onCancel={handleCancel}
      aria-labelledby="restore-dialog-title"
      aria-describedby="restore-dialog-description"
      data-testid="progress-restore-dialog"
    >
      <div className={styles.content}>
        <h2 id="restore-dialog-title" className={styles.title}>
          Welcome Back!
        </h2>

        <p id="restore-dialog-description" className={styles.description}>
          You have saved progress from a previous session.
        </p>

        <div className={styles.progressSummary}>
          <p className={styles.summaryText}>
            <strong>Last played:</strong>{' '}
            {formatLastPlayed(savedProgress.lastUpdatedAt)}
          </p>
          <p className={styles.summaryText}>
            <strong>Defects discovered:</strong> {discoveredCount} / 4
          </p>
          <p className={styles.summaryText}>
            <strong>Defects repaired:</strong> {repairedCount} / 4
          </p>
        </div>

        <div className={styles.actions}>
          <button
            ref={restoreButtonRef}
            type="button"
            className={styles.primaryButton}
            onClick={handleRestore}
            data-testid="restore-progress"
          >
            Restore Progress
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleStartFresh}
            data-testid="start-fresh"
          >
            Start Fresh
          </button>
        </div>
      </div>
    </dialog>
  );
}
