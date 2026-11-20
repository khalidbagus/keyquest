/**
 * Challenge Sandbox Component
 * Isolated container with intentional accessibility defects and Ghost Vision Gadget Toolbar.
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  MidnightCheckout,
  type GhostVisionMode,
} from '../MidnightCheckout/MidnightCheckout';
import {
  ContrastScanIcon,
  GhostVisionEyeIcon,
  ScreenReaderWaveIcon,
  ShieldNoticeIcon,
} from '../Icons/ApothecaryIcons';
import styles from './ChallengeSandbox.module.css';

interface ChallengeSandboxProps {
  onDefectInteraction?: (defectType: string) => void;
}

const VISION_MODES: readonly {
  id: GhostVisionMode;
  label: string;
  hint: string;
}[] = [
  {
    id: 'normal',
    label: 'Normal',
    hint: 'Explore with Tab, Enter, Space, and mouse to experience real accessibility barriers.',
  },
  {
    id: 'xray',
    label: 'Screen Reader X-Ray',
    hint: 'Exposes what assistive technology actually hears for each control in the Accessibility Tree.',
  },
  {
    id: 'contrast',
    label: 'Focus & Contrast',
    hint: 'Reveals live luminance contrast ratios and highlights suppressed focus rings.',
  },
];

export function ChallengeSandbox({
  onDefectInteraction,
}: ChallengeSandboxProps) {
  const announcerRef = useRef<HTMLDivElement>(null);
  const { progress } = useGame();
  const [visionMode, setVisionMode] = useState<GhostVisionMode>('normal');

  const verifiedCount = Object.values(progress.defects).filter(
    (d) => d.verified
  ).length;
  const remainingCurses = 4 - verifiedCount;
  const allRepaired = remainingCurses === 0;

  // Announce sandbox entry to screen readers
  useEffect(() => {
    if (announcerRef.current) {
      announcerRef.current.textContent =
        'You are entering the Challenge Sandbox. This area contains intentional accessibility defects for educational purposes. Press Escape at any time to exit.';
    }

    const timeoutId = setTimeout(() => {
      if (announcerRef.current) {
        announcerRef.current.textContent = '';
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, []);

  const activeVision =
    VISION_MODES.find((mode) => mode.id === visionMode) ?? VISION_MODES[0]!;

  return (
    <div className={styles.wrapper}>
      {/* Ghost Vision Gadget Toolbar (Lives in the accessible app shell above the sandbox!) */}
      <div
        className={styles.gadgetBar}
        role="region"
        aria-label="Ghost Vision inspection gadgets"
        data-testid="ghost-vision-toolbar"
      >
        <div className={styles.gadgetHeader}>
          <span className={styles.gadgetLabel}>
            <GhostVisionEyeIcon size={17} className={styles.gadgetIcon} />
            Ghost Vision
          </span>

          <div
            className={styles.modeGroup}
            role="radiogroup"
            aria-label="Ghost Vision inspection mode"
          >
            {VISION_MODES.map((mode) => {
              const checked = visionMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  className={`${styles.modeButton} ${checked ? styles.modeButtonActive : ''}`}
                  onClick={() => setVisionMode(mode.id)}
                  data-testid={`vision-mode-${mode.id}`}
                >
                  {mode.id === 'xray' && <ScreenReaderWaveIcon size={14} />}
                  {mode.id === 'contrast' && <ContrastScanIcon size={14} />}
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className={styles.gadgetHint}>{activeVision.hint}</p>
      </div>

      {/* Isolated Challenge Sandbox */}
      <div
        className={`${styles.sandbox} ${allRepaired ? styles.sandboxRestored : ''}`}
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

        {/* Sandbox Containment Header */}
        <div className={styles.containmentBar} aria-hidden="true">
          <span className={styles.containmentTag}>
            ISOLATED CHALLENGE SANDBOX
          </span>
          <span
            className={
              allRepaired ? styles.curseBadgeCleared : styles.curseBadgeActive
            }
          >
            {allRepaired
              ? '✓ All 4 Curses Lifted'
              : `${remainingCurses} Accessibility ${
                  remainingCurses === 1 ? 'Curse' : 'Curses'
                } Active`}
          </span>
        </div>

        {/* Visible disclaimer */}
        <div className={styles.disclaimer}>
          <ShieldNoticeIcon size={16} className={styles.disclaimerIcon} />
          <span>
            This area contains intentional accessibility defects for educational
            purposes.
          </span>
        </div>

        {/* The defective checkout UI */}
        <MidnightCheckout
          onDefectInteraction={onDefectInteraction}
          visionMode={visionMode}
        />
      </div>
    </div>
  );
}
