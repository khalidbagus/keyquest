/**
 * Main Menu View (v2 Twilight-Plum Apothecary Edition)
 * Split Hero with live Rive companion stage, Costume Locker access,
 * Mission Briefing, and 4 illustrated Curse Potion cards.
 * Keyboard contract preserved: Start Challenge remains the first focusable control in <main>.
 */

import { useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useMascot } from '../context/MascotContext';
import { RiveMascot } from '../components/RiveMascot';
import { CostumeLockerModal } from '../components/CostumeLocker';
import { CURSE_CATALOG } from '../registry/patchRegistry';
import { MASCOT_ROSTER } from '../registry/mascotRegistry';
import {
  CompassQuestIcon,
  CostumeMaskIcon,
  KeyboardKeyIcon,
  LanternIcon,
  ShieldNoticeIcon,
} from '../components/Icons/ApothecaryIcons';
import styles from './MainMenuView.module.css';

const QUICK_PICKS = MASCOT_ROSTER.slice(0, 5);

export function MainMenuView() {
  const { dispatch } = useGame();
  const { companion, companionSignal, setCompanionId } = useMascot();
  const [lockerOpen, setLockerOpen] = useState(false);
  const costumeButtonRef = useRef<HTMLButtonElement>(null);

  function handleStartChallenge() {
    dispatch({ type: 'START_CHALLENGE' });
  }

  return (
    <div className={styles.container}>
      {/* Split Storybook Hero */}
      <section className={styles.heroCard} aria-labelledby="menu-hero-heading">
        <div className={styles.heroCopyColumn}>
          <span className={styles.caseBadge}>
            CASE FILE #A11Y-01 · LEVEL 1: THE MIDNIGHT CHECKOUT
          </span>

          <h2 id="menu-hero-heading" tabIndex={-1} className={styles.heading}>
            Welcome to KeyQuest
          </h2>

          <p className={styles.description}>
            Step inside the <strong>Midnight Checkout</strong> — a haunted
            apothecary storefront where four real accessibility curses trap
            keyboard, screen reader, and low-vision shoppers. Equip{' '}
            <strong>Ghost Vision</strong>, craft real DOM &amp; CSS patches, and
            banish every curse with your animated haunting companion!
          </p>

          {/* Primary CTA — Strictly first focusable element inside <main> */}
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
              Keyboard ready: Press <kbd>Enter</kbd> or <kbd>Space</kbd> to
              begin · Press <kbd>Escape</kbd> anytime to exit safely
            </p>
          </div>
        </div>

        {/* Live Animated Rive Mascot Stage + Costume Switcher */}
        <div className={styles.heroStageColumn}>
          <RiveMascot
            mascot={companion}
            signal={companionSignal}
            initialTrigger="greet"
            variant="hero"
            size={240}
          />

          <div className={styles.companionPlate}>
            <div className={styles.companionIdentity}>
              <span className={styles.companionName}>{companion.name}</span>
              <span className={styles.companionAction}>
                Signature: {companion.signatureAction}
              </span>
            </div>

            <button
              ref={costumeButtonRef}
              type="button"
              className={styles.costumeButton}
              onClick={() => setLockerOpen(true)}
              data-testid="open-costume-locker"
            >
              <CostumeMaskIcon size={16} />
              <span>Costumes (10)</span>
            </button>
          </div>

          <div
            className={styles.quickRoster}
            aria-label="Quick companion switcher"
          >
            {QUICK_PICKS.map((ghost) => {
              const active = ghost.id === companion.id;
              return (
                <button
                  key={ghost.id}
                  type="button"
                  className={`${styles.quickPill} ${active ? styles.quickPillActive : ''}`}
                  onClick={() => setCompanionId(ghost.id)}
                  aria-label={`Select ${ghost.name}`}
                  aria-pressed={active}
                >
                  <img
                    src={ghost.posterUrl}
                    alt=""
                    className={styles.quickPillImg}
                    decoding="async"
                  />
                </button>
              );
            })}
          </div>
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
              <CompassQuestIcon size={20} />
            </span>
            <h3 className={styles.briefingTitle}>1. Hunt With Ghost Vision</h3>
          </div>
          <p className={styles.briefingText}>
            Explore the cursed <strong>Midnight Checkout</strong> using{' '}
            <kbd>Tab</kbd>, or toggle <strong>Screen Reader X-Ray</strong> and{' '}
            <strong>Focus &amp; Contrast</strong> lenses to uncover hidden
            barriers.
          </p>
        </div>

        <div className={styles.briefingCard}>
          <div className={styles.briefingHeader}>
            <span className={styles.briefingIcon} aria-hidden="true">
              <KeyboardKeyIcon size={20} />
            </span>
            <h3 className={styles.briefingTitle}>2. Pick the Right Patch</h3>
          </div>
          <p className={styles.briefingText}>
            Choose from three candidate fixes in the{' '}
            <strong>Repair Studio</strong>. Trap patches reveal why common
            workarounds fail; true fixes mutate the live DOM and verify
            instantly.
          </p>
        </div>

        <div className={styles.briefingCard}>
          <div className={styles.briefingHeader}>
            <span className={styles.briefingIcon} aria-hidden="true">
              <LanternIcon size={20} />
            </span>
            <h3 className={styles.briefingTitle}>3. Lantern Hints &amp; Safe Exit</h3>
          </div>
          <p className={styles.briefingText}>
            Need a clue? The <strong>Plague Doctor Hint Keeper</strong> shines
            3-level progressive hints with zero penalty. Press{' '}
            <kbd>Escape</kbd> anytime to leave safely with progress saved.
          </p>
        </div>
      </section>

      {/* The Four Accessibility Curse Potions */}
      <section
        className={styles.cursesSection}
        aria-labelledby="curses-preview-heading"
      >
        <div className={styles.cursesHeader}>
          <h3 id="curses-preview-heading" className={styles.cursesHeading}>
            Four Accessibility Curses to Banish
          </h3>
          <span className={styles.cursesSubtle}>
            Verified via real browser DOM &amp; computed luminance checks
          </span>
        </div>

        <ul className={styles.cursesList} role="list">
          {CURSE_CATALOG.map((item) => (
            <li key={item.type} className={styles.curseItem}>
              <div className={styles.curseTopRow}>
                <span className={styles.potionThumb} aria-hidden="true">
                  <img
                    src={item.potionArtUrl}
                    alt=""
                    className={styles.potionImg}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <div className={styles.curseMeta}>
                  <span className={styles.wcagTag}>{item.wcagCode}</span>
                  <span className={styles.levelTag}>Level {item.wcagLevel}</span>
                </div>
              </div>
              <strong className={styles.curseTitle}>{item.name}</strong>
              <span className={styles.curseSymptom}>{item.curseAlias}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Accessibility & Containment Disclaimer */}
      <div className={styles.disclaimer}>
        <h3>
          <ShieldNoticeIcon size={18} className={styles.disclaimerIcon} />
          Accessibility Notice &amp; Sandbox Containment
        </h3>
        <p>
          This game contains intentional accessibility defects within a clearly
          marked sandbox for educational purposes. The surrounding game shell,
          navigation, costume locker, hint panel, and repair studio remain fully
          accessible (WCAG 2.1 Level AA). Press <kbd>Escape</kbd> at any time to
          exit the challenge.
        </p>
      </div>

      <CostumeLockerModal
        isOpen={lockerOpen}
        onClose={() => setLockerOpen(false)}
        returnFocusRef={costumeButtonRef}
      />
    </div>
  );
}
