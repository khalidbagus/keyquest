/**
 * Emergency Exit Button Component
 * Always-visible escape mechanism during challenges
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import { useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { ExitPortalIcon } from '../Icons/ApothecaryIcons';
import styles from './EmergencyExitButton.module.css';

export function EmergencyExitButton() {
  const { dispatch, saveProgress } = useGame();

  const handleExit = useCallback(() => {
    saveProgress();
    dispatch({ type: 'EMERGENCY_EXIT' });
  }, [dispatch, saveProgress]);

  // Global Escape key listener
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        // A press another handler already used (the bell dialog closing) or an
        // auto-repeat of it never exits (Requirements 22.2, 22.6).
        if (event.defaultPrevented || event.repeat) return;
        // Don't intercept Escape if a modal dialog is open
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
      <ExitPortalIcon size={17} />
      Exit
    </button>
  );
}
