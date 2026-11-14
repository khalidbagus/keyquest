/**
 * Emergency Exit Button Component
 * Always-visible escape mechanism during challenges
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import { useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import styles from './EmergencyExitButton.module.css';

export function EmergencyExitButton() {
  const { dispatch, saveProgress } = useGame();

  const handleExit = useCallback(() => {
    // Save progress before exiting
    saveProgress();
    dispatch({ type: 'EMERGENCY_EXIT' });
  }, [dispatch, saveProgress]);

  // Global Escape key listener
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        // Don't intercept Escape if a modal dialog is open
        // Native dialogs handle Escape themselves
        const openDialog = document.querySelector('dialog[open]');
        if (openDialog) {
          return;
        }

        event.preventDefault();
        handleExit();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleExit]);

  return (
    <button
      type="button"
      className={styles.button}
      onClick={handleExit}
      data-testid="emergency-exit"
      aria-label="Exit challenge and return to menu (Escape key)"
    >
      <span aria-hidden="true">🚪</span>
      Exit
    </button>
  );
}
