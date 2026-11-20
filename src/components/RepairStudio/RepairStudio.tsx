/**
 * Repair Studio Component (v2 Pick-the-Patch Apothecary Workbench)
 * Interactive inspector with 4 illustrated Curse Potions, 3-choice Pick-the-Patch
 * puzzles (firing live mascot reactFailure / celebrate triggers), and live DOM verification.
 * Requirements: 4.4, 5.4, 6.4, 7.4, 8.1-8.6
 */

import { useCallback, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useMascot } from '../../context/MascotContext';
import { applyRepair, type RepairResult } from '../../engines/RepairEngine';
import { verify } from '../../engines/VerificationEngine';
import {
  CURSE_CATALOG,
  type CurseCatalogEntry,
  type PatchOption,
} from '../../registry/patchRegistry';
import { WrenchSparkIcon } from '../Icons/ApothecaryIcons';
import type { DefectType, VerificationResult } from '../../types';
import styles from './RepairStudio.module.css';

function formatVerificationDetails(
  defect: CurseCatalogEntry,
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
  const { companion, triggerCompanion } = useMascot();
  const [announcement, setAnnouncement] = useState('');
  const feedbackRefs = useRef<
    Partial<Record<DefectType, HTMLDivElement | null>>
  >({});

  const [trapFeedback, setTrapFeedback] = useState<
    Partial<Record<DefectType, PatchOption | null>>
  >({});

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

  const handlePatchAttempt = useCallback(
    async (defect: CurseCatalogEntry, patch: PatchOption) => {
      if (!patch.isCorrect) {
        setTrapFeedback((prev) => ({ ...prev, [defect.type]: patch }));
        setAnnouncement(
          `Patch rejected for ${defect.name}: ${patch.failureDiagnosis}`
        );
        triggerCompanion('reactFailure', patch.mascotReaction, 'warning');
        return;
      }

      setTrapFeedback((prev) => ({ ...prev, [defect.type]: null }));

      const element = document.querySelector(
        `[data-testid="${defect.testId}"]`
      ) as HTMLElement | null;

      if (!element) {
        console.error(`Could not find element with testId: ${defect.testId}`);
        return;
      }

      // Apply the real DOM/CSS repair
      const result = applyRepair(defect.type, element);
      setRepairResults((prev) => ({
        ...prev,
        [defect.type]: result,
      }));

      if (result.success) {
        dispatch({ type: 'APPLY_REPAIR', defectType: defect.type });

        // Verify the repair against live DOM & computed styles
        const verificationResult = await verify(defect.type, element);
        setVerificationResults((prev) => ({
          ...prev,
          [defect.type]: verificationResult,
        }));
        dispatch({ type: 'VERIFICATION_RESULT', result: verificationResult });

        if (verificationResult.passed) {
          setAnnouncement(
            `${defect.name} repaired and verified. ${result.message}`
          );
          triggerCompanion(
            'celebrate',
            `${patch.mascotReaction} (${companion.signatureAction}!)`,
            'celebrate'
          );
        } else {
          setAnnouncement(
            `${defect.name} repair applied, but verification is incomplete.`
          );
          triggerCompanion(
            'reactFailure',
            `Hmm — ${defect.name} was patched, but live DOM verification did not pass yet.`,
            'warning'
          );
        }

        requestAnimationFrame(() => {
          const feedbackEl = feedbackRefs.current[defect.type];
          if (feedbackEl?.isConnected) {
            feedbackEl.focus({ preventScroll: true });
          }
        });
      }
    },
    [dispatch, triggerCompanion, companion.signatureAction]
  );

  const handleDiscover = useCallback(
    (defect: CurseCatalogEntry) => {
      dispatch({ type: 'DISCOVER_DEFECT', defectType: defect.type });
      setAnnouncement(
        `Discovered defect: ${defect.name} (${defect.wcagCriterion}). ${defect.description}`
      );
      triggerCompanion(
        'greet',
        `Aha! We uncovered ${defect.name} (${defect.wcagCode}). Pick the right patch to break this curse!`,
        'neutral'
      );
    },
    [dispatch, triggerCompanion]
  );

  function getStatus(defect: CurseCatalogEntry): string {
    const state = progress.defects[defect.type];
    if (state.verified) return 'Verified ✓';
    if (state.repaired) return '⟳ Repaired';
    if (state.discovered) return '⚠ Discovered';
    return '○ Hidden';
  }

  function getStatusClass(defect: CurseCatalogEntry): string {
    const state = progress.defects[defect.type];
    if (state.verified) return styles.statusVerified!;
    if (state.repaired) return styles.statusRepaired!;
    if (state.discovered) return styles.statusDiscovered!;
    return styles.statusUndiscovered!;
  }

  function getCardStateClass(defect: CurseCatalogEntry): string {
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
          <WrenchSparkIcon size={20} className={styles.titleIcon} />
          Repair Studio
        </h3>
        <span className={styles.studioCounter}>
          {verifiedCount} / 4 Verified
        </span>
      </div>

      <p className={styles.studioSubtitle}>
        Discover each curse, compare the broken markup, and pick the accessible
        patch to apply real DOM &amp; CSS repairs.
      </p>

      <div className={styles.cards}>
        {CURSE_CATALOG.map((defect) => {
          const state = progress.defects[defect.type];
          const result = repairResults[defect.type];
          const verification = verificationResults[defect.type];
          const lastTrap = trapFeedback[defect.type];
          const feedbackMessage =
            result?.message ?? defect.defaultEducationalFeedback;

          return (
            <div
              key={defect.type}
              className={`${styles.card} ${getCardStateClass(defect)}`}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardIdentity}>
                  <span
                    className={`${styles.potionBadge} ${
                      state.verified ? styles.potionBadgePurified : ''
                    }`}
                    aria-hidden="true"
                  >
                    <img
                      src={defect.potionArtUrl}
                      alt=""
                      className={styles.potionImg}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <h4 className={styles.cardTitle}>{defect.name}</h4>
                </div>
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

              {/* Broken Code + Pick-the-Patch 3-Choice Workbench */}
              {state.discovered && !state.repaired && (
                <div className={styles.workbench}>
                  <div className={styles.codeBlockBroken}>
                    <span className={styles.codeLabelBroken}>
                      ✕ Broken (Before)
                    </span>
                    <code className={styles.codeSnippet}>
                      {defect.brokenCode}
                    </code>
                  </div>

                  <p className={styles.pickPrompt}>
                    Pick the accessible patch to cast:
                  </p>

                  <div className={styles.patchOptions}>
                    {defect.patches.map((patch) => {
                      const isRejected = lastTrap?.id === patch.id;
                      return (
                        <button
                          key={patch.id}
                          type="button"
                          className={`${styles.patchButton} ${
                            isRejected ? styles.patchButtonRejected : ''
                          }`}
                          onClick={() => void handlePatchAttempt(defect, patch)}
                          data-testid={
                            patch.isCorrect
                              ? defect.repairTestId
                              : `trap-${patch.id}`
                          }
                        >
                          <span className={styles.patchLabel}>
                            {patch.label}
                          </span>
                          <code className={styles.patchCode}>{patch.code}</code>
                        </button>
                      );
                    })}
                  </div>

                  {lastTrap && (
                    <div
                      className={styles.trapAlert}
                      role="status"
                      data-testid={`trap-feedback-${defect.type}`}
                    >
                      <strong className={styles.trapAlertTitle}>
                        ✕ Why this patch still fails WCAG:
                      </strong>
                      <p className={styles.trapAlertText}>
                        {lastTrap.failureDiagnosis}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Before / After Diff shown once repaired */}
              {state.repaired && (
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
                      {state.verified ? '✓' : '!'}
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
