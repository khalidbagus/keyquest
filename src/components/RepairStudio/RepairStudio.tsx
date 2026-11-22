/**
 * Repair Studio Component (Adventure Room 1)
 * Shows the repair for the curse the player just found, as short patch
 * actions. The correct patch runs the real RepairEngine and VerificationEngine
 * on the live sandbox element. Exact code, WCAG reference, and evidence sit
 * behind "How this repair works".
 * Requirements: 4.4, 5.4, 6.4, 7.4, 8.1-8.6
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useMascot } from '../../context/MascotContext';
import { applyRepair } from '../../engines/RepairEngine';
import { verify } from '../../engines/VerificationEngine';
import {
  getCurseByType,
  type CurseCatalogEntry,
  type PatchOption,
} from '../../registry/patchRegistry';
import { getRepairNextAction } from '../../registry/roomRegistry';
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
        ? `Computed style check: outline "${details.outlineWidth} ${details.outlineStyle} ${details.outlineColor}". Visible focus indicator confirmed.`
        : `Computed style check: outline "${details.outlineWidth} ${details.outlineStyle}". No visible focus indicator detected.`;
    case 'keyboard':
      return `DOM event check: Enter key ${details.enterKeyWorks ? 'passed' : 'failed'}, Space key ${details.spaceKeyWorks ? 'passed' : 'failed'}.`;
    case 'accessible-name':
      return passed
        ? `Accessibility tree check: computed name "${details.computedName}" (source: ${details.nameSource}).`
        : 'Accessibility tree check: computed name is empty.';
    case 'contrast':
      return `Luminance check: ${details.contrastRatio}:1 measured, at least ${details.requiredRatio}:1 required.`;
    case 'labels':
      return passed
        ? `Label check: ${details.labelled} of ${details.total} jars show a visible name that is also their accessible name.`
        : `Label check: ${details.labelled} of ${details.total} jars labelled. Missing: ${details.failing.join(', ') || 'all'}.`;
    case 'dialog-focus':
      return `Live focus check: ${details.checks
        .map((check) => `${check.label}: ${check.passed ? 'pass' : 'fail'} (focus on ${check.focused})`)
        .join('; ')}.`;
    default:
      return defect.defaultVerificationEvidence;
  }
}

/**
 * The repaired control the player uses next. Contrast has no control, so its
 * result panel takes focus instead. The pantry shelf hands focus to its first jar.
 */
const PAYOFF_FOCUS: Partial<Record<DefectType, (target: HTMLElement) => HTMLElement | null>> = {
  'invisible-focus': (el) => el,
  'mouse-only-activation': (el) => el,
  'missing-accessible-name': (el) => el,
  'color-only-ingredients': (el) => el.querySelector<HTMLElement>('[data-ingredient]'),
  // The verified bell dialog hands focus to the first bell (Requirement 20.10).
  'bell-dialog-focus': (dialog) =>
    dialog
      .closest('[data-testid="challenge-sandbox"]')
      ?.querySelector<HTMLElement>('[data-testid="bell-control-moon"]') ?? null,
};

/** Names of the failed checks, for results that report several (Requirement 20.9). */
function failedCheckNames(verification: VerificationResult | null | undefined): string[] {
  if (!verification || verification.details.type !== 'dialog-focus') return [];
  return verification.details.checks.filter((check) => !check.passed).map((check) => check.label);
}

interface RepairStudioProps {
  /** Curses in this room, in canonical order. */
  roomTypes: readonly DefectType[];
  /** Curse currently shown. Null when nothing has been found yet. */
  activeType: DefectType | null;
  onSelect: (type: DefectType) => void;
  /** Increment to move focus to the active repair's heading. */
  focusRequest?: number;
  /** Called once a repair passes its live check. */
  onVerified?: (type: DefectType) => void;
}

export function RepairStudio({
  roomTypes,
  activeType,
  onSelect,
  focusRequest = 0,
  onVerified,
}: RepairStudioProps) {
  const { progress, dispatch } = useGame();
  const { companion, triggerCompanion } = useMascot();
  const [announcement, setAnnouncement] = useState('');
  const [checking, setChecking] = useState<DefectType | null>(null);
  const checkingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const handledFocusRequest = useRef(focusRequest);
  const failedChecksRef = useRef<Partial<Record<DefectType, number>>>({});

  const [trapFeedback, setTrapFeedback] = useState<
    Partial<Record<DefectType, PatchOption | null>>
  >({});
  const [triedPatches, setTriedPatches] = useState<
    Partial<Record<DefectType, string[]>>
  >({});
  const [failedChecks, setFailedChecks] = useState<
    Partial<Record<DefectType, number>>
  >({});
  const [verificationResults, setVerificationResults] = useState<
    Partial<Record<DefectType, VerificationResult>>
  >({});

  useEffect(() => {
    if (focusRequest === handledFocusRequest.current) return;
    handledFocusRequest.current = focusRequest;
    // Bring the whole repair card into view (not just its heading) so on a
    // phone the patch choices show together with the counter just above.
    headingRef.current?.focus({ preventScroll: true });
    cardRef.current?.scrollIntoView({ block: 'nearest' });
  }, [focusRequest]);

  const runRepairAndCheck = useCallback(
    async (defect: CurseCatalogEntry, patch: PatchOption | null) => {
      // Ignore repeat presses while a live check is running.
      if (checkingRef.current) return;

      const element = document.querySelector<HTMLElement>(
        `[data-testid="${defect.testId}"]`
      );
      if (!element) {
        console.error(`Could not find element with testId: ${defect.testId}`);
        return;
      }

      checkingRef.current = true;
      setChecking(defect.type);
      setTrapFeedback((prev) => ({ ...prev, [defect.type]: null }));

      try {
        const result = applyRepair(defect.type, element);
        if (!result.success) return;
        dispatch({ type: 'APPLY_REPAIR', defectType: defect.type });

        const verification = await verify(defect.type, element);
        setVerificationResults((prev) => ({
          ...prev,
          [defect.type]: verification,
        }));
        dispatch({ type: 'VERIFICATION_RESULT', result: verification });

        if (verification.passed) {
          // The room status announces the fix next to the objective, so the
          // studio stays quiet here to avoid a double announcement.
          if (onVerified) {
            setAnnouncement('');
            onVerified(defect.type);
          } else {
            setAnnouncement(`Verified: ${defect.fixedSummary} ${defect.nextAction}`);
          }
          triggerCompanion(
            'celebrate',
            patch
              ? `${patch.mascotReaction} (${companion.signatureAction}!)`
              : `That did it! ${companion.signatureAction}!`,
            'celebrate'
          );
        } else {
          // Count failed checks so a repeat failure reads (and announces) as new.
          const attempts = (failedChecksRef.current[defect.type] ?? 0) + 1;
          failedChecksRef.current[defect.type] = attempts;
          setFailedChecks((prev) => ({ ...prev, [defect.type]: attempts }));
          const failedNames = failedCheckNames(verification);
          setAnnouncement(
            `Check ${attempts} did not pass for ${defect.roomTitle}.${
              failedNames.length > 0 ? ` Failed: ${failedNames.join(', ')}.` : ''
            } Use Check again.`
          );
          triggerCompanion(
            'reactFailure',
            'The patch went on, but the live check did not pass yet. Try Check again.',
            'warning'
          );
        }

        requestAnimationFrame(() => {
          const payoff = verification.passed ? PAYOFF_FOCUS[defect.type]?.(element) : null;
          if (payoff) {
            // Payoff: land on the repaired control so the player can use it.
            if (payoff.isConnected) payoff.focus();
          } else if (verification.passed) {
            resultRef.current?.focus({ preventScroll: true });
          } else {
            retryRef.current?.focus({ preventScroll: true });
          }
        });
      } finally {
        checkingRef.current = false;
        setChecking(null);
      }
    },
    [dispatch, triggerCompanion, companion.signatureAction, onVerified]
  );

  const handlePatchAttempt = useCallback(
    (defect: CurseCatalogEntry, patch: PatchOption) => {
      if (checkingRef.current) return;
      if (!patch.isCorrect) {
        setTrapFeedback((prev) => ({ ...prev, [defect.type]: patch }));
        setTriedPatches((prev) => ({
          ...prev,
          [defect.type]: [...new Set([...(prev[defect.type] ?? []), patch.id])],
        }));
        setAnnouncement(
          `That patch did not work. ${patch.failureDiagnosis} Try another patch.`
        );
        triggerCompanion('reactFailure', patch.mascotReaction, 'warning');
        return;
      }
      void runRepairAndCheck(defect, patch);
    },
    [runRepairAndCheck, triggerCompanion]
  );

  const verifiedCount = roomTypes.filter((t) => progress.defects[t].verified).length;

  const otherFound = roomTypes.filter(
    (type) =>
      type !== activeType &&
      progress.defects[type].discovered &&
      !progress.defects[type].verified
  );

  const defect = activeType ? getCurseByType(activeType) : null;
  const state = activeType ? progress.defects[activeType] : null;
  const verification = activeType ? verificationResults[activeType] ?? null : null;
  const lastTrap = activeType ? trapFeedback[activeType] ?? null : null;
  const tried = activeType ? triedPatches[activeType] ?? [] : [];
  const isChecking = checking !== null && checking === activeType;

  return (
    <section
      className={styles.studio}
      aria-labelledby="repair-studio-title"
      data-testid="repair-studio"
    >
      <div aria-live="polite" aria-atomic="true" className="visually-hidden">
        {announcement}
      </div>

      <div className={styles.studioHeader}>
        <h3 id="repair-studio-title" className={styles.title}>
          <WrenchSparkIcon size={20} className={styles.titleIcon} />
          Repair Studio
        </h3>
        <span className={styles.studioCounter}>{verifiedCount} of {roomTypes.length} fixed</span>
      </div>

      {!defect || !state || !state.discovered ? (
        <p className={styles.emptyState} data-testid="repair-empty">
          Inspect a control in the shop to find its curse. Its repair appears here.
        </p>
      ) : (
        <div
          ref={cardRef}
          className={`${styles.card} ${state.verified ? styles.cardVerified : styles.cardDiscovered}`}
          data-testid={`repair-card-${defect.type}`}
        >
          <div className={styles.cardHeader}>
            <span
              className={`${styles.potionBadge} ${state.verified ? styles.potionBadgePurified : ''}`}
              aria-hidden="true"
            >
              <img
                src={defect.potionArtUrl}
                alt=""
                className={styles.potionImg}
                decoding="async"
              />
            </span>
            <h4 ref={headingRef} tabIndex={-1} className={styles.cardTitle}>
              {defect.roomTitle}
            </h4>
          </div>

          {!state.repaired && (
            <>
              <p className={styles.cardDescription}>{defect.symptom}</p>
              <p className={styles.pickPrompt} id={`pick-${defect.type}`}>
                Choose a patch:
              </p>
              <div
                className={styles.patchOptions}
                role="group"
                aria-labelledby={`pick-${defect.type}`}
              >
                {defect.patches.map((patch) => {
                  const wasTried = tried.includes(patch.id);
                  return (
                    <button
                      key={patch.id}
                      type="button"
                      className={`${styles.patchButton} ${wasTried ? styles.patchButtonRejected : ''}`}
                      onClick={() => handlePatchAttempt(defect, patch)}
                      aria-disabled={isChecking || undefined}
                      data-testid={
                        patch.isCorrect ? defect.repairTestId : `trap-${patch.id}`
                      }
                    >
                      <span className={styles.patchLabel}>{patch.label}</span>
                      {wasTried && (
                        <span className={styles.patchTried}>Tried, didn’t work</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {isChecking && (
                <p className={styles.checking}>Checking the live page…</p>
              )}

              {lastTrap && (
                <div
                  className={styles.trapAlert}
                  data-testid={`trap-feedback-${defect.type}`}
                >
                  <strong className={styles.trapAlertTitle}>Not quite.</strong>{' '}
                  <span className={styles.trapAlertText}>
                    {lastTrap.failureDiagnosis} Try another patch.
                  </span>
                </div>
              )}
            </>
          )}

          {state.repaired && (
            <div
              ref={resultRef}
              tabIndex={-1}
              className={state.verified ? styles.feedback : styles.feedbackUnverified}
              data-testid={`repair-result-${defect.type}`}
            >
              <p className={styles.verificationLabel}>
                <span className={styles.verificationIcon} aria-hidden="true">
                  {state.verified ? '✓' : '!'}
                </span>
                {state.verified
                  ? 'Verified on the live page'
                  : 'The live check did not pass yet'}
              </p>
              <p className={styles.resultText}>
                {state.verified
                  ? defect.fixedSummary
                  : `The patch is on, but the check could not confirm the fix. Failed checks: ${failedChecks[defect.type] ?? 1}.`}
              </p>
              {!state.verified && failedCheckNames(verification).length > 0 && (
                <ul className={styles.resultText} data-testid={`failed-checks-${defect.type}`}>
                  {failedCheckNames(verification).map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              )}
              {state.verified ? (
                <p className={styles.nextAction} data-testid="repair-next-action">
                  {getRepairNextAction(defect.type, progress, defect.nextAction)}
                </p>
              ) : (
                <button
                  ref={retryRef}
                  type="button"
                  className={styles.retryButton}
                  onClick={() => void runRepairAndCheck(defect, null)}
                  aria-disabled={isChecking || undefined}
                  data-testid="verify-retry"
                >
                  {isChecking ? 'Checking…' : 'Check again'}
                </button>
              )}
            </div>
          )}

          <details className={styles.howItWorks} data-testid="how-repair-works">
            <summary className={styles.howSummary}>How this repair works</summary>
            <div className={styles.howBody}>
              <p className={styles.wcagLine}>
                {defect.wcagCriterion} (Level {defect.wcagLevel}) · Target:{' '}
                <code>{defect.targetElement}</code>
              </p>
              <p className={styles.howText}>{defect.description}</p>
              <div className={styles.codeBlockBroken}>
                <span className={styles.codeLabelBroken}>Before</span>
                <code className={styles.codeSnippet}>{defect.brokenCode}</code>
              </div>
              <div className={styles.codeBlockFixed}>
                <span className={styles.codeLabelFixed}>After</span>
                <code className={styles.codeSnippet}>{defect.repairedCode}</code>
              </div>
              {lastTrap && (
                <div className={styles.codeBlockBroken}>
                  <span className={styles.codeLabelBroken}>Last patch tried</span>
                  <code className={styles.codeSnippet}>{lastTrap.code}</code>
                </div>
              )}
              {state.repaired && (
                <p className={styles.verificationEvidence}>
                  {formatVerificationDetails(defect, verification)}
                </p>
              )}
              {state.verified && (
                <p className={styles.howText}>{defect.defaultEducationalFeedback}</p>
              )}
            </div>
          </details>
        </div>
      )}

      {otherFound.length > 0 && (
        <div className={styles.otherFound}>
          <p className={styles.otherFoundLabel} id="other-found-label">
            Also found:
          </p>
          <ul className={styles.otherFoundList} aria-labelledby="other-found-label">
            {otherFound.map((type) => (
              <li key={type}>
                <button
                  type="button"
                  className={styles.switchButton}
                  onClick={() => onSelect(type)}
                  data-testid={`select-repair-${type}`}
                >
                  {getCurseByType(type).roomTitle}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
