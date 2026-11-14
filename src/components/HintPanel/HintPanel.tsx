/**
 * Hint Panel Component
 * Progressive hint request button and contextual hint display
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import { useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import {
  DEFECT_LABELS,
  HINT_LEVEL_LABELS,
  HINT_MAX_LEVEL,
  getHint,
  getHintStatusContext,
  selectHintTarget,
} from '../../registry/hintRegistry';
import styles from './HintPanel.module.css';

export function HintPanel() {
  const { progress, dispatch } = useGame();

  // Deterministic target: first defect in canonical order not yet verified
  const target = selectHintTarget(progress.defects);
  const targetState = target ? progress.defects[target] : null;
  const hintLevel: 1 | 2 | 3 | null =
    targetState && targetState.hintLevel !== 0 ? targetState.hintLevel : null;
  const activeHint = target && hintLevel ? getHint(target, hintLevel) : null;

  const handleRequestHint = useCallback(() => {
    const hintTarget = selectHintTarget(progress.defects);
    if (hintTarget) {
      dispatch({ type: 'REQUEST_HINT', defectType: hintTarget });
    }
  }, [progress.defects, dispatch]);

  return (
    <section
      className={styles.panel}
      aria-labelledby="hint-panel-title"
      data-testid="hint-panel"
    >
      <div className={styles.headerRow}>
        <div className={styles.titleCluster}>
          <h3 id="hint-panel-title" className={styles.title}>
            <span aria-hidden="true">💡</span> Need a Hint?
          </h3>
          {target && (
            <div className={styles.levelPips} aria-hidden="true">
              {[1, 2, 3].map((lvl) => (
                <span
                  key={lvl}
                  className={
                    hintLevel && lvl <= hintLevel
                      ? styles.pipActive
                      : styles.pipInactive
                  }
                >
                  L{lvl}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className={styles.hintButton}
          onClick={handleRequestHint}
          data-testid="hint-button"
        >
          Get Hint
        </button>
      </div>

      {/* Polite live region: one announcement per hint request */}
      <div className={styles.display} role="status" data-testid="hint-display">
        {!target && (
          <p className={styles.placeholder}>
            All defects repaired — no hints needed. Great work!
          </p>
        )}

        {target && !hintLevel && (
          <p className={styles.placeholder}>
            No hint requested yet. Stuck in the haunted checkout? Hints are
            free and never affect your score.
          </p>
        )}

        {target && activeHint && targetState && hintLevel && (
          <div className={styles.hintContent} data-testid="hint-content">
            <p className={styles.hintMeta} data-testid="hint-meta">
              Hint {hintLevel} of {HINT_MAX_LEVEL} (
              {HINT_LEVEL_LABELS[hintLevel]}) for{' '}
              <strong>{DEFECT_LABELS[target]}</strong>
            </p>
            <p className={styles.hintStatus}>
              {getHintStatusContext(targetState)}
            </p>
            <p className={styles.hintText} data-testid="hint-text">
              {activeHint.text}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
