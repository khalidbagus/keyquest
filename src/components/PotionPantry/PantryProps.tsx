/**
 * Pantry props: the cauldron and the bottled lantern potion. Decorative
 * (aria-hidden); the cauldron's contents and state are also given as visible
 * text and a polite status.
 */

import styles from './PantryProps.module.css';

export type CauldronMood = 'empty' | 'brewing' | 'murky' | 'brewed';

export function CauldronProp({ level, mood }: { level: number; mood: CauldronMood }) {
  // level: 0..3 ingredients in the pot
  const fill = Math.max(0, Math.min(3, level)) / 3;
  return (
    <span
      className={`${styles.cauldron} ${styles[mood]}`}
      data-mood={mood}
      data-level={level}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 100" className={styles.cauldronSvg} focusable="false">
        <defs>
          <clipPath id="keyquest-cauldron-bowl">
            <path d="M18 34 H102 C102 70 86 88 60 88 C34 88 18 70 18 34 Z" />
          </clipPath>
        </defs>
        {/* Legs */}
        <rect x="28" y="84" width="8" height="12" rx="3" fill="#4b386e" />
        <rect x="84" y="84" width="8" height="12" rx="3" fill="#4b386e" />
        {/* Bowl */}
        <path d="M18 34 H102 C102 70 86 88 60 88 C34 88 18 70 18 34 Z" fill="#110c1b" />
        {/* Liquid rises from the bottom (scaleY on a full-height rect) */}
        <g clipPath="url(#keyquest-cauldron-bowl)">
          <rect
            x="10"
            y="34"
            width="100"
            height="56"
            className={styles.liquid}
            style={{ transform: `scaleY(${fill})` }}
          />
        </g>
        <path
          d="M18 34 H102 C102 70 86 88 60 88 C34 88 18 70 18 34 Z"
          fill="none"
          stroke="#c8badf"
          strokeWidth="3"
        />
        {/* Rim */}
        <rect x="10" y="26" width="100" height="10" rx="5" fill="#2e2147" stroke="#c8badf" strokeWidth="3" />
      </svg>
      <span className={styles.glow} />
    </span>
  );
}

export function LanternPotion() {
  return (
    <span className={styles.potion} data-testid="lantern-potion" aria-hidden="true">
      <svg viewBox="0 0 40 56" className={styles.potionSvg} focusable="false">
        <rect x="15" y="2" width="10" height="8" rx="2" fill="#c8badf" />
        <rect x="16" y="9" width="8" height="8" fill="#f7f0fc" opacity="0.85" />
        <path d="M14 17 H26 L34 34 C38 44 32 54 20 54 C8 54 2 44 6 34 Z" fill="#fbbf24" stroke="#fde68a" strokeWidth="2" />
        <circle cx="20" cy="40" r="5" fill="#fff7d6" />
      </svg>
    </span>
  );
}
