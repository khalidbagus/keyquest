/**
 * Challenge Sandbox Component
 * Isolated container with intentional accessibility defects
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

import { useEffect, useRef } from 'react';
import { MidnightCheckout } from '../MidnightCheckout/MidnightCheckout';
import styles from './ChallengeSandbox.module.css';

interface ChallengeSandboxProps {
  onDefectInteraction?: (defectType: string) => void;
}

export function ChallengeSandbox({ onDefectInteraction }: ChallengeSandboxProps) {
  const announcerRef = useRef<HTMLDivElement>(null);

  // Announce sandbox entry to screen readers
  useEffect(() => {
    if (announcerRef.current) {
      announcerRef.current.textContent =
        'You are entering the Challenge Sandbox. This area contains intentional accessibility defects for educational purposes. Press Escape at any time to exit.';
    }

    // Clear announcement after it's read
    const timeoutId = setTimeout(() => {
      if (announcerRef.current) {
        announcerRef.current.textContent = '';
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div
      className={styles.sandbox}
      role="region"
      aria-label="Challenge sandbox with intentional accessibility defects"
      data-testid="challenge-sandbox"
    >
      {/* Screen reader announcement region */}
      <div
        ref={announcerRef}
        aria-live="polite"
        aria-atomic="true"
        className="visually-hidden"
      />

      {/* Visible disclaimer */}
      <div className={styles.disclaimer}>
        <span aria-hidden="true">⚠️</span>
        This area contains intentional accessibility defects for educational
        purposes.
      </div>

      {/* The defective checkout UI */}
      <MidnightCheckout onDefectInteraction={onDefectInteraction} />
    </div>
  );
}
