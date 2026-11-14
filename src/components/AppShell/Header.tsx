/**
 * Header Component
 * Contains branding, lab zone status indicator, and Emergency Exit button
 * Requirements: 13.1, 13.2, 13.6, 14.4
 */

import { useGame } from '../../context/GameContext';
import { EmergencyExitButton } from '../EmergencyExit/EmergencyExitButton';
import styles from './Header.module.css';

export function Header() {
  const { state, progress } = useGame();
  const showEmergencyExit = state.phase === 'challenge';

  const verifiedCount = Object.values(progress.defects).filter(
    (d) => d.verified
  ).length;

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.branding}>
          <div className={styles.crest} aria-hidden="true">
            <svg
              viewBox="0 0 36 36"
              width="32"
              height="32"
              className={styles.crestSvg}
              aria-hidden="true"
              focusable="false"
            >
              <rect
                x="2"
                y="2"
                width="32"
                height="32"
                rx="8"
                fill="#12192e"
                stroke="#fbbf24"
                strokeWidth="1.75"
              />
              <circle
                cx="14"
                cy="18"
                r="5.5"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2.2"
              />
              <circle cx="14" cy="18" r="2" fill="#e94560" />
              <path
                d="M19.5 18H29M25 18V22M28 18V23"
                stroke="#fbbf24"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
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
                ? `Lab Active · ${4 - verifiedCount} ${
                    4 - verifiedCount === 1 ? 'Curse' : 'Curses'
                  } Remaining`
                : 'Shell WCAG 2.1 AA'}
            </span>
          </div>

          <nav aria-label="Primary" className={styles.nav}>
            {showEmergencyExit && <EmergencyExitButton />}
          </nav>
        </div>
      </div>
    </header>
  );
}
