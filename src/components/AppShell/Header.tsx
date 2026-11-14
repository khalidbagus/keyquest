/**
 * Header Component
 * Contains navigation and Emergency Exit button
 * Requirements: 13.1, 13.2, 13.6, 14.4
 */

import { useGame } from '../../context/GameContext';
import { EmergencyExitButton } from '../EmergencyExit/EmergencyExitButton';
import styles from './Header.module.css';

export function Header() {
  const { state } = useGame();
  const showEmergencyExit = state.phase === 'challenge';

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.branding}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon} aria-hidden="true">🔑</span>
            KeyQuest
          </h1>
          <span className={styles.subtitle}>The Haunted Accessibility Lab</span>
        </div>
        
        <nav aria-label="Main navigation" className={styles.nav}>
          {showEmergencyExit && <EmergencyExitButton />}
        </nav>
      </div>
    </header>
  );
}
