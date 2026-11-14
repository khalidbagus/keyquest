/**
 * Repair Studio Component
 * Interactive inspector and repair console for discovering, fixing,
 * and verifying accessibility defects.
 * Requirements: 4.4, 5.4, 6.4, 7.4, 8.1-8.6
 */

import { useCallback, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { applyRepair, type RepairResult } from '../../engines/RepairEngine';
import { verify } from '../../engines/VerificationEngine';
import type { DefectType, VerificationResult } from '../../types';
import styles from './RepairStudio.module.css';

interface DefectInfo {
  type: DefectType;
  name: string;
  wcagCriterion: string;
  wcagLevel: 'A' | 'AA';
  targetElement: string;
  description: string;
  brokenCode: string;
  repairedCode: string;
  defaultEducationalFeedback: string;
  defaultVerificationEvidence: string;
  testId: string;
  repairTestId: string;
}

const DEFECTS: DefectInfo[] = [
  {
    type: 'mouse-only-activation',
    name: 'Mouse-Only Activation',
    wcagCriterion: 'WCAG 2.1.1 Keyboard',
    wcagLevel: 'A',
    targetElement: '"Add to Cart" control (<div>)',
    description:
      'The "Add to Cart" element can only be clicked with a mouse. Keyboard users can focus it with Tab, but pressing Enter or Space does nothing.',
    brokenCode: '<div tabindex="0" onClick={addToCart}>Add to Cart</div>',
    repairedCode:
      '<div role="button" tabindex="0" onKeyDown={onEnterOrSpace}>Add to Cart</div>',
    defaultEducationalFeedback:
      'Repair applied: Added keyboard event handlers for Enter and Space keys, matching native button behavior, and added role="button" for assistive technologies. This meets WCAG 2.1.1 (Keyboard).',
    defaultVerificationEvidence:
      'DOM Check: role="button" present; synthetic Enter & Space keydown events trigger activation.',
    testId: 'defect-mouse-only',
    repairTestId: 'repair-mouse-only',
  },
  {
    type: 'invisible-focus',
    name: 'Invisible Focus',
    wcagCriterion: 'WCAG 2.4.7 Focus Visible',
    wcagLevel: 'AA',
    targetElement: '"Buy Now" button (<button>)',
    description:
      'The "Buy Now" button has outline: none with no replacement focus indicator. Sighted keyboard users cannot see when focus lands on it.',
    brokenCode: '.buyButton { outline: none; }',
    repairedCode:
      '.keyquest-focus-repaired:focus-visible { outline: 3px solid #005fcc; outline-offset: 2px; }',
    defaultEducationalFeedback:
      'Repair applied: Added a visible focus indicator using the :focus-visible pseudo-class. The 3px solid #005fcc outline provides at least 3:1 contrast against adjacent colors, meeting WCAG 2.4.7 (Focus Visible).',
    defaultVerificationEvidence:
      'Computed Style Check: outlineStyle is "solid", outlineWidth is "3px" (> 0px) when focused.',
    testId: 'defect-invisible-focus',
    repairTestId: 'repair-invisible-focus',
  },
  {
    type: 'missing-accessible-name',
    name: 'Missing Accessible Name',
    wcagCriterion: 'WCAG 4.1.2 Name, Role, Value',
    wcagLevel: 'A',
    targetElement: 'Cart icon button (<button>)',
    description:
      'The shopping cart icon button contains only an emoji/icon with aria-hidden="true" and no accessible label. Screen readers announce it simply as an unlabelled "button".',
    brokenCode: '<button type="button"><span aria-hidden="true">🛒</span></button>',
    repairedCode:
      '<button type="button" aria-label="View shopping cart"><span aria-hidden="true">🛒</span></button>',
    defaultEducationalFeedback:
      'Repair applied: Added aria-label="View shopping cart" to provide a programmatic accessible name. Screen readers now announce its purpose clearly, meeting WCAG 4.1.2 (Name, Role, Value).',
    defaultVerificationEvidence:
      'Accessibility Tree Check: computedName is "View shopping cart" via aria-label.',
    testId: 'defect-missing-name',
    repairTestId: 'repair-missing-name',
  },
  {
    type: 'insufficient-contrast',
    name: 'Insufficient Contrast',
    wcagCriterion: 'WCAG 1.4.3 Contrast (Minimum)',
    wcagLevel: 'AA',
    targetElement: '"$13.99" price text (<p>)',
    description:
      'The product price uses low-contrast gray (#555555 on dark slate #16213e, ~2.09:1 ratio), making it difficult to read for people with low vision.',
    brokenCode: '.productPrice { color: #555555; /* 2.09:1 contrast */ }',
    repairedCode:
      '.productPrice { color: #e0e0e0; /* > 9.5:1 contrast (AA Pass) */ }',
    defaultEducationalFeedback:
      'Repair applied: Changed text color from low-contrast gray to high-contrast #e0e0e0. WCAG 1.4.3 requires at least 4.5:1 for normal text and 3:1 for large text. The new color exceeds both requirements.',
    defaultVerificationEvidence:
      'Computed Luminance Check: foreground rgb(224, 224, 224) passes WCAG AA contrast threshold.',
    testId: 'defect-low-contrast',
    repairTestId: 'repair-low-contrast',
  },
];

function formatVerificationDetails(
  defect: DefectInfo,
  verification: VerificationResult | null
): string {
  if (!verification) {
    return defect.defaultVerificationEvidence;
  }

  const { details, passed } = verification;
  switch (details.type) {
    case 'focus':
      return passed
        ? `Computed Style Check: outline "${details.outlineWidth} ${details.outlineStyle} ${details.outlineColor}" — visible focus indicator confirmed.`
        : `Computed Style Check: outline "${details.outlineWidth} ${details.outlineStyle}" — visible focus indicator not detected.`;
    case 'keyboard':
      return `DOM Event Check: Enter key (${details.enterKeyWorks ? 'Pass' : 'Fail'}), Space key (${details.spaceKeyWorks ? 'Pass' : 'Fail'}) — ${
        passed ? 'keyboard activation confirmed.' : 'keyboard activation incomplete.'
      }`;
    case 'accessible-name':
      return passed
        ? `Accessibility Tree Check: computedName="${details.computedName}" (source: ${details.nameSource}).`
        : 'Accessibility Tree Check: computedName is empty — accessible name not detected.';
    case 'contrast':
      return `Luminance Contrast Check: ${details.contrastRatio}:1 measured (required ≥ ${details.requiredRatio}:1) — ${
        passed ? 'meets WCAG AA.' : 'below WCAG AA threshold.'
      }`;
    default:
      return defect.defaultVerificationEvidence;
  }
}

export function RepairStudio() {
  const { progress, dispatch } = useGame();
  const [announcement, setAnnouncement] = useState('');
  const feedbackRefs = useRef<Partial<Record<DefectType, HTMLDivElement | null>>>(
    {}
  );
  const [repairResults, setRepairResults] = useState<
    Record<DefectType, RepairResult | null>
  >({
    'invisible-focus': null,
    'mouse-only-activation': null,
    'missing-accessible-name': null,
    'insufficient-contrast': null,
  });
  const [verificationResults, setVerificationResults] = useState<
    Record<DefectType, VerificationResult | null>
  >({
    'invisible-focus': null,
    'mouse-only-activation': null,
    'missing-accessible-name': null,
    'insufficient-contrast': null,
  });

  const handleRepair = useCallback(
    async (defect: DefectInfo) => {
      const element = document.querySelector(
        `[data-testid="${defect.testId}"]`
      ) as HTMLElement | null;

      if (!element) {
        console.error(`Could not find element with testId: ${defect.testId}`);
        return;
      }

      // Apply the repair
      const result = applyRepair(defect.type, element);
      setRepairResults((prev) => ({
        ...prev,
        [defect.type]: result,
      }));

      if (result.success) {
        dispatch({ type: 'APPLY_REPAIR', defectType: defect.type });

        // Verify the repair against real DOM/computed styles
        const verificationResult = await verify(defect.type, element);
        setVerificationResults((prev) => ({
          ...prev,
          [defect.type]: verificationResult,
        }));
        dispatch({ type: 'VERIFICATION_RESULT', result: verificationResult });

        setAnnouncement(
          verificationResult.passed
            ? `${defect.name} repaired and verified. ${result.message}`
            : `${defect.name} repair applied, but verification is incomplete.`
        );

        requestAnimationFrame(() => {
          const feedbackEl = feedbackRefs.current[defect.type];
          if (feedbackEl?.isConnected) {
            feedbackEl.focus({ preventScroll: true });
          }
        });
      }
    },
    [dispatch]
  );

  const handleDiscover = useCallback(
    (defect: DefectInfo) => {
      dispatch({ type: 'DISCOVER_DEFECT', defectType: defect.type });
      setAnnouncement(
        `Discovered defect: ${defect.name} (${defect.wcagCriterion}). ${defect.description}`
      );
    },
    [dispatch]
  );

  function getStatus(defect: DefectInfo): string {
    const state = progress.defects[defect.type];
    if (state.verified) return 'Verified ✓';
    if (state.repaired) return '⟳ Repaired';
    if (state.discovered) return '⚠ Discovered';
    return '○ Hidden';
  }

  function getStatusClass(defect: DefectInfo): string {
    const state = progress.defects[defect.type];
    if (state.verified) return styles.statusVerified!;
    if (state.repaired) return styles.statusRepaired!;
    if (state.discovered) return styles.statusDiscovered!;
    return styles.statusUndiscovered!;
  }

  function getCardStateClass(defect: DefectInfo): string {
    const state = progress.defects[defect.type];
    if (state.verified) return styles.cardVerified!;
    if (state.discovered) return styles.cardDiscovered!;
    return '';
  }

  const verifiedCount = Object.values(progress.defects).filter(
    (d) => d.verified
  ).length;

  return (
    <div className={styles.studio}>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="visually-hidden"
      >
        {announcement}
      </div>

      <div className={styles.studioHeader}>
        <h3 className={styles.title}>
          <span aria-hidden="true">🔧</span>
          Repair Studio
        </h3>
        <span className={styles.studioCounter}>
          {verifiedCount} / 4 Verified
        </span>
      </div>

      <p className={styles.studioSubtitle}>
        Inspect each defect below, compare the broken DOM against the accessible
        fix, and apply real code repairs.
      </p>

      <div className={styles.cards}>
        {DEFECTS.map((defect) => {
          const state = progress.defects[defect.type];
          const result = repairResults[defect.type];
          const verification = verificationResults[defect.type];
          const feedbackMessage =
            result?.message ?? defect.defaultEducationalFeedback;

          return (
            <div
              key={defect.type}
              className={`${styles.card} ${getCardStateClass(defect)}`}
            >
              <div className={styles.cardHeader}>
                <h4 className={styles.cardTitle}>{defect.name}</h4>
                <span
                  className={`${styles.statusBadge} ${getStatusClass(defect)}`}
                >
                  {getStatus(defect)}
                </span>
              </div>

              {/* Target & WCAG Metadata Pills */}
              <div className={styles.metaRow}>
                <span className={styles.targetPill}>
                  Target: <code>{defect.targetElement}</code>
                </span>
                <span className={styles.wcagPill}>
                  {defect.wcagCriterion} ({defect.wcagLevel})
                </span>
              </div>

              <p className={styles.cardDescription}>{defect.description}</p>

              {/* Before / After Code Comparison shown once discovered or repaired */}
              {(state.discovered || state.repaired) && (
                <div className={styles.codeDiff}>
                  <div className={styles.codeBlockBroken}>
                    <span className={styles.codeLabelBroken}>
                      ✕ Broken (Before)
                    </span>
                    <code className={styles.codeSnippet}>
                      {defect.brokenCode}
                    </code>
                  </div>
                  <div className={styles.codeBlockFixed}>
                    <span className={styles.codeLabelFixed}>
                      ✓ Accessible Fix (After)
                    </span>
                    <code className={styles.codeSnippet}>
                      {defect.repairedCode}
                    </code>
                  </div>
                </div>
              )}

              {!state.discovered && (
                <button
                  type="button"
                  className={styles.discoverButton}
                  onClick={() => handleDiscover(defect)}
                >
                  Discover Defect
                </button>
              )}

              {state.discovered && !state.repaired && (
                <button
                  type="button"
                  className={styles.repairButton}
                  onClick={() => handleRepair(defect)}
                  data-testid={defect.repairTestId}
                >
                  Apply Repair
                </button>
              )}

              {state.repaired && (
                <div
                  ref={(el) => {
                    feedbackRefs.current[defect.type] = el;
                  }}
                  tabIndex={-1}
                  className={
                    state.verified ? styles.feedback : styles.feedbackUnverified
                  }
                >
                  <div className={styles.verificationBanner}>
                    <span
                      className={styles.verificationIcon}
                      aria-hidden="true"
                    >
                      {state.verified ? '✓' : '⚠️'}
                    </span>
                    <span className={styles.verificationLabel}>
                      {state.verified
                        ? 'Live DOM Verification Passed'
                        : 'Verification Pending / Incomplete'}
                    </span>
                  </div>

                  <p className={styles.verificationEvidence}>
                    {formatVerificationDetails(defect, verification)}
                  </p>

                  <p className={styles.feedbackTitle}>Educational Feedback:</p>
                  <p className={styles.feedbackText}>{feedbackMessage}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
