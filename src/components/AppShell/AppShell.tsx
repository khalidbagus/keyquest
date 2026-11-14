/**
 * AppShell Component
 * Accessible container with semantic HTML structure
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
 */

import type { ReactNode } from 'react';
import { SkipLinks } from './SkipLinks';
import { Header } from './Header';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <SkipLinks />
      <Header />
      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p>
          KeyQuest: The Haunted Accessibility Lab — An educational game about
          web accessibility.
        </p>
      </footer>
    </div>
  );
}
