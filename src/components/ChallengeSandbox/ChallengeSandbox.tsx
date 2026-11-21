/**
 * Challenge Sandbox Component
 * Isolated container with intentional accessibility defects and the compact
 * Ghost Vision gadget row (accessible app shell, above the sandbox boundary).
 * Each room supplies its own lenses and renders its scene as children.
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useGame } from '../../context/GameContext';
import type { GhostVisionMode } from '../MidnightCheckout/MidnightCheckout';
import {
  ContrastScanIcon,
  GhostVisionEyeIcon,
  ScreenReaderWaveIcon,
  ShieldNoticeIcon,
} from '../Icons/ApothecaryIcons';
import type { DefectType } from '../../types';
import { CHECKOUT_VISION_MODES, type VisionModeDefinition } from './visionModes';
import styles from './ChallengeSandbox.module.css';

interface ChallengeSandboxProps {
  /** Curses in this room, for the containment badge. */
  curseTypes: readonly DefectType[];
  visionModes?: readonly VisionModeDefinition[];
  children: (visionMode: GhostVisionMode) => ReactNode;
}

export function ChallengeSandbox({
  curseTypes,
  visionModes = CHECKOUT_VISION_MODES,
  children,
}: ChallengeSandboxProps) {
  const announcerRef = useRef<HTMLDivElement>(null);
  const modeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { progress } = useGame();
  const [visionMode, setVisionMode] = useState<GhostVisionMode>('normal');

  const verifiedCount = curseTypes.filter((t) => progress.defects[t].verified).length;
  const remainingCurses = curseTypes.length - verifiedCount;
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

  // Radio group keyboard pattern: one Tab stop, arrow keys move and select.
  function handleModeKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const last = visionModes.length - 1;
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = last;
    setVisionMode(visionModes[next]!.id);
    modeRefs.current[next]?.focus();
  }

  const activeVision =
    visionModes.find((mode) => mode.id === visionMode) ?? visionModes[0]!;

  return (
    <div className={styles.wrapper}>
      {/* Ghost Vision gadget row (accessible app shell, above the sandbox) */}
      <div
        className={styles.gadgetBar}
        role="region"
        aria-label="Ghost Vision inspection gadgets"
        data-testid="ghost-vision-toolbar"
      >
        <span className={styles.gadgetLabel} id="ghost-vision-label">
          <GhostVisionEyeIcon size={17} className={styles.gadgetIcon} />
          Ghost Vision
        </span>

        <div
          className={styles.modeGroup}
          role="radiogroup"
          aria-labelledby="ghost-vision-label"
          aria-describedby="ghost-vision-hint"
        >
          {visionModes.map((mode, index) => {
            const checked = visionMode === mode.id;
            return (
              <button
                key={mode.id}
                ref={(el) => {
                  modeRefs.current[index] = el;
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                className={`${styles.modeButton} ${checked ? styles.modeButtonActive : ''}`}
                onClick={() => setVisionMode(mode.id)}
                onKeyDown={(event) => handleModeKeyDown(event, index)}
                data-testid={`vision-mode-${mode.id}`}
              >
                {mode.id === 'xray' && <ScreenReaderWaveIcon size={14} />}
                {(mode.id === 'contrast' || mode.id === 'grayscale') && (
                  <ContrastScanIcon size={14} />
                )}
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
        <p
          className={`${styles.gadgetHint} ${visionMode === 'normal' ? styles.gadgetHintNormal : ''}`}
          id="ghost-vision-hint"
        >
          {activeVision.hint}
        </p>
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

        {/* Sandbox containment header and visible disclaimer */}
        <div className={styles.containmentBar}>
          <span className={styles.disclaimer}>
            <ShieldNoticeIcon size={16} className={styles.disclaimerIcon} />
            <span>
              This area contains intentional accessibility defects for
              educational purposes.
            </span>
          </span>
          <span
            className={
              allRepaired ? styles.curseBadgeCleared : styles.curseBadgeActive
            }
            aria-hidden="true"
          >
            {allRepaired
              ? `✓ ${curseTypes.length === 1 ? 'Curse' : `All ${curseTypes.length} curses`} lifted`
              : `${remainingCurses} ${remainingCurses === 1 ? 'curse' : 'curses'} active`}
          </span>
        </div>

        {children(visionMode)}
      </div>
    </div>
  );
}
