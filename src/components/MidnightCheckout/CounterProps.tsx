/**
 * Counter props for the Midnight Checkout room: the counter lantern and the
 * Pantry Key. Purely decorative (aria-hidden); every state they show is also
 * given as visible text and a polite status in the app shell.
 */

import styles from './CounterProps.module.css';

export function CounterLantern({ lit }: { lit: boolean }) {
  return (
    <span
      className={`${styles.lantern} ${lit ? styles.lanternLit : ''}`}
      data-lit={lit ? 'true' : 'false'}
      aria-hidden="true"
    >
      <span className={styles.halo} />
      <svg viewBox="0 0 64 80" className={styles.lanternSvg} focusable="false">
        {/* Hanging ring and cap */}
        <circle cx="32" cy="7" r="4.5" fill="none" stroke="#c8badf" strokeWidth="2.5" />
        <path d="M20 18 L32 11 L44 18 Z" fill="#4b386e" stroke="#c8badf" strokeWidth="2" strokeLinejoin="round" />
        <rect x="17" y="18" width="30" height="5" rx="2" fill="#684f96" />
        {/* Glass: dark pane and lit pane crossfade */}
        <rect x="20" y="23" width="24" height="38" rx="5" fill="#1b132b" />
        <rect x="20" y="23" width="24" height="38" rx="5" className={styles.glassLit} fill="#fbbf24" />
        {/* Flame */}
        <path
          className={styles.flame}
          d="M32 31 C36 37 38 41 38 45 C38 49.5 35.3 52.5 32 52.5 C28.7 52.5 26 49.5 26 45 C26 41 28 37 32 31 Z"
          fill="#fff7d6"
        />
        {/* Wick when dark */}
        <rect x="31" y="47" width="2" height="6" rx="1" fill="#684f96" className={styles.wick} />
        {/* Frame bars */}
        <rect x="20" y="23" width="24" height="38" rx="5" fill="none" stroke="#c8badf" strokeWidth="2.5" />
        <path d="M32 23 V61" stroke="#c8badf" strokeWidth="1.5" opacity="0.55" />
        {/* Base */}
        <rect x="15" y="61" width="34" height="7" rx="3" fill="#684f96" stroke="#c8badf" strokeWidth="2" />
      </svg>
    </span>
  );
}

export function PantryKey() {
  return (
    <span className={styles.key} data-testid="counter-key" aria-hidden="true">
      <svg viewBox="0 0 72 32" className={styles.keySvg} focusable="false">
        <circle cx="15" cy="16" r="10" fill="none" stroke="#fbbf24" strokeWidth="4" />
        <circle cx="15" cy="16" r="3.5" fill="#c93050" />
        <path
          d="M25 16 H66 M56 16 V25 M64 16 V23"
          stroke="#fbbf24"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
