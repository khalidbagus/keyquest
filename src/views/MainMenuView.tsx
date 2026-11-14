/**
 * Main Menu View
 * Entry point for starting the challenge
 * Requirements: 2.1, 14.2, 14.6
 */

import { useGame } from '../context/GameContext';
import styles from './MainMenuView.module.css';

export function MainMenuView() {
  const { dispatch } = useGame();

  function handleStartChallenge() {
    dispatch({ type: 'START_CHALLENGE' });
  }

  return (
    <div className={styles.container}>
      <div>
        <h2 className={styles.heading}>Welcome to KeyQuest</h2>
        <p className={styles.description}>
          Enter the Midnight Checkout — a haunted store where accessibility
          nightmares lurk in every corner. Discover four hidden accessibility
          defects, repair them with real code fixes, and escape before the shop
          closes!
        </p>
      </div>

      <button
        type="button"
        className={styles.startButton}
        onClick={handleStartChallenge}
        data-testid="start-challenge"
      >
        Start Challenge
      </button>

      <div className={styles.disclaimer}>
        <h3>⚠️ Accessibility Notice</h3>
        <p>
          This game contains intentional accessibility defects within a clearly
          marked sandbox for educational purposes. The game shell remains fully
          accessible. Press Escape at any time to exit the challenge.
        </p>
      </div>
    </div>
  );
}
