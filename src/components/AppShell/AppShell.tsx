/**
 * AppShell Component
 * Accessible container with semantic HTML structure and motion preference controls
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 15.1-15.5
 */

import type { ReactNode } from 'react';
import { SkipLinks } from './SkipLinks';
import { Header } from './Header';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { prefersReducedMotion, toggleReducedMotion } =
    usePrefersReducedMotion();

  return (
    <div className={styles.shell}>
      <SkipLinks />
      <Header />
      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerInfo}>
            <p className={styles.footerBrand}>
              KeyQuest: The Haunted Accessibility Lab — An educational game about
              web accessibility.
            </p>
            <p className={styles.footerMeta}>
              App Shell: WCAG 2.1 AA Verified · Keyboard-First · Zero Audio Required
            </p>
          </div>

          <div className={styles.footerControls}>
            <button
              type="button"
              className={styles.motionToggle}
              onClick={toggleReducedMotion}
              aria-pressed={prefersReducedMotion}
              data-testid="reduced-motion-toggle"
            >
              <span className={styles.motionIndicator} aria-hidden="true">
                {prefersReducedMotion ? '⏸' : '✨'}
              </span>
              <span>
                Reduced Motion: {prefersReducedMotion ? 'On' : 'Off'}
              </span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
