/**
 * Main Menu View
 * Landing and onboarding experience for KeyQuest: The Haunted Accessibility Lab
 * Requirements: 2.1, 13.4, 14.2, 14.6
 */

import { useGame } from '../context/GameContext';
import styles from './MainMenuView.module.css';

const CURSE_PREVIEW = [
  {
    code: 'WCAG 2.4.7',
    level: 'AA',
    title: 'Invisible Focus',
    symptom: 'Focus outline stripped with outline: none',
  },
  {
    code: 'WCAG 2.1.1',
    level: 'A',
    title: 'Mouse-Only Activation',
    symptom: 'Clickable <div> ignores Enter & Space keys',
  },
  {
    code: 'WCAG 4.1.2',
    level: 'A',
    title: 'Missing Accessible Name',
    symptom: 'Icon-only cart button announces nothing',
  },
  {
    code: 'WCAG 1.4.3',
    level: 'AA',
    title: 'Insufficient Contrast',
    symptom: 'Faint price text fails 4.5:1 minimum contrast',
  },
];

export function MainMenuView() {
  const { dispatch } = useGame();

  function handleStartChallenge() {
    dispatch({ type: 'START_CHALLENGE' });
  }

  return (
    <div className={styles.container}>
      {/* Hero Banner */}
      <section className={styles.heroCard} aria-labelledby="menu-hero-heading">
        <div className={styles.heroHeader}>
          <div className={styles.emblemWrapper} aria-hidden="true">
            <svg
              viewBox="0 0 88 88"
              width="72"
              height="72"
              className={styles.emblemSvg}
              aria-hidden="true"
              focusable="false"
            >
              <circle
                cx="44"
                cy="44"
                r="40"
                fill="#0f1123"
                stroke="#284275"
                strokeWidth="2"
              />
              <circle
                cx="44"
                cy="44"
                r="34"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* Keyhole arch */}
              <path
                d="M32 58L36 42A12 12 0 1 1 52 42L56 58Z"
                fill="#16213e"
                stroke="#fbbf24"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <circle cx="44" cy="34" r="4.5" fill="#e94560" />
              <path
                d="M44 38.5V51"
                stroke="#fbbf24"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <span className={styles.caseBadge}>
            CASE FILE #A11Y-01 · LEVEL 1: THE MIDNIGHT CHECKOUT
          </span>

          <h2 id="menu-hero-heading" className={styles.heading}>
            Welcome to KeyQuest
          </h2>

          <p className={styles.description}>
            Enter the Midnight Checkout — a haunted apothecary storefront where
            four real accessibility curses trap keyboard, screen reader, and
            low-vision shoppers. Inspect the broken interface, apply code-backed
            DOM and CSS repairs, verify each improvement, and escape before the
            shop closes!
          </p>
        </div>

        {/* Primary CTA - First focusable element in <main> */}
        <div className={styles.ctaGroup}>
          <button
            type="button"
            className={styles.startButton}
            onClick={handleStartChallenge}
            data-testid="start-challenge"
          >
            <span>Start Challenge</span>
            <span className={styles.startArrow} aria-hidden="true">
              →
            </span>
          </button>

          <p className={styles.ctaSubtext}>
            Keyboard ready: Press <kbd>Enter</kbd> or <kbd>Space</kbd> to begin
            · Press <kbd>Escape</kbd> anytime to exit safely
          </p>
        </div>
      </section>

      {/* Mission Briefing & How It Works */}
      <section
        className={styles.briefingGrid}
        aria-label="Mission briefing and controls"
      >
        <div className={styles.briefingCard}>
          <div className={styles.briefingHeader}>
            <span className={styles.briefingIcon} aria-hidden="true">
              🧭
            </span>
            <h3 className={styles.briefingTitle}>1. Your Mission</h3>
          </div>
          <p className={styles.briefingText}>
            Explore the cursed <strong>Midnight Checkout</strong> sandbox and
            locate four accessibility barriers that prevent real users from
            completing a purchase.
          </p>
        </div>

        <div className={styles.briefingCard}>
          <div className={styles.briefingHeader}>
            <span className={styles.briefingIcon} aria-hidden="true">
              ⌨️
            </span>
            <h3 className={styles.briefingTitle}>2. Keyboard Challenge</h3>
          </div>
          <p className={styles.briefingText}>
            Test controls using <kbd>Tab</kbd>, <kbd>Shift</kbd>+<kbd>Tab</kbd>,{' '}
            <kbd>Enter</kbd>, and <kbd>Space</kbd>. Apply real DOM &amp; CSS
            patches in the <strong>Repair Studio</strong> and watch live
            verification pass.
          </p>
        </div>

        <div className={styles.briefingCard}>
          <div className={styles.briefingHeader}>
            <span className={styles.briefingIcon} aria-hidden="true">
              🛟
            </span>
            <h3 className={styles.briefingTitle}>3. Help &amp; Safe Exit</h3>
          </div>
          <p className={styles.briefingText}>
            Stuck on a curse? Use the <strong>3-level Hint System</strong> with
            zero penalty. Press <kbd>Escape</kbd> or click{' '}
            <strong>Exit</strong> at any time to leave the sandbox with your
            progress saved.
          </p>
        </div>
      </section>

      {/* The Four Curses Preview */}
      <section
        className={styles.cursesSection}
        aria-labelledby="curses-preview-heading"
      >
        <div className={styles.cursesHeader}>
          <h3 id="curses-preview-heading" className={styles.cursesHeading}>
            Four Accessibility Curses to Break
          </h3>
          <span className={styles.cursesSubtle}>
            Verified via real browser DOM &amp; computed style checks
          </span>
        </div>

        <ul className={styles.cursesList} role="list">
          {CURSE_PREVIEW.map((item) => (
            <li key={item.code} className={styles.curseItem}>
              <div className={styles.curseMeta}>
                <span className={styles.wcagTag}>{item.code}</span>
                <span className={styles.levelTag}>Level {item.level}</span>
              </div>
              <strong className={styles.curseTitle}>{item.title}</strong>
              <span className={styles.curseSymptom}>{item.symptom}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Accessibility & Containment Disclaimer */}
      <div className={styles.disclaimer}>
        <h3>
          <span aria-hidden="true">⚠️</span> Accessibility Notice &amp; Sandbox
          Containment
        </h3>
        <p>
          This game contains intentional accessibility defects within a clearly
          marked sandbox for educational purposes. The surrounding game shell,
          navigation, hint panel, and repair studio remain fully accessible
          (WCAG 2.1 Level AA). Press <kbd>Escape</kbd> at any time to exit the
          challenge.
        </p>
      </div>
    </div>
  );
}
