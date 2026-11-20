/**
 * Header Component
 * Contains KeyQuest apothecary branding, lab zone status indicator, and Emergency Exit button
 * Requirements: 13.1, 13.2, 13.6, 14.4
 */

import { useGame } from '../../context/GameContext';
import { EmergencyExitButton } from '../EmergencyExit/EmergencyExitButton';
import { KeyCrestIcon } from '../Icons/ApothecaryIcons';
import styles from './Header.module.css';

export function Header() {
  const { state, progress } = useGame();
  const showEmergencyExit = state.phase === 'challenge';

  const verifiedCount = Object.values(progress.defects).filter(
    (d) => d.verified
  ).length;
  const remaining = 4 - verifiedCount;

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.branding}>
          <div className={styles.crest} aria-hidden="true">
            <KeyCrestIcon size={34} className={styles.crestSvg} />
          </div>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>KeyQuest</h1>
            <span className={styles.subtitle}>
              The Haunted Accessibility Lab
            </span>
          </div>
        </div>

        <div className={styles.rightCluster}>
          <div className={styles.zoneBadge} aria-hidden="true">
            <span
              className={
                showEmergencyExit ? styles.zoneDotActive : styles.zoneDotReady
              }
            />
            <span className={styles.zoneText}>
              {showEmergencyExit
                ? `Lab Active · ${remaining} ${
                    remaining === 1 ? 'Curse' : 'Curses'
                  } Remaining`
                : 'Shell WCAG 2.1 AA'}
            </span>
          </div>

          {showEmergencyExit && (
            <nav aria-label="Primary" className={styles.nav}>
              <EmergencyExitButton />
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
