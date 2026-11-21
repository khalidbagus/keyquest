/**
 * Hint Panel Component (compact room hint)
 * Reveals one clue at a time (three per curse) for the first unverified
 * curse in canonical order. Hints never change repair progress.
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import { useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { useMascot } from '../../context/MascotContext';
import {
  DEFECT_LABELS,
  HINT_LEVEL_LABELS,
  HINT_MAX_LEVEL,
  getHint,
  getHintStatusContext,
  selectHintTarget,
} from '../../registry/hintRegistry';
import { LanternIcon } from '../Icons/ApothecaryIcons';
import styles from './HintPanel.module.css';

import type { DefectType } from '../../types';

interface HintPanelProps {
  /** Curses in this room, in the order hints target them. */
  order?: readonly DefectType[];
}

export function HintPanel({ order }: HintPanelProps) {
  const { progress, dispatch } = useGame();
  const { triggerHintKeeper } = useMascot();

  const target = selectHintTarget(progress.defects, order);
  const targetState = target ? progress.defects[target] : null;
  const hintLevel: 1 | 2 | 3 | null =
    targetState && targetState.hintLevel !== 0 ? targetState.hintLevel : null;
  const activeHint = target && hintLevel ? getHint(target, hintLevel) : null;
  const atLastClue = hintLevel === HINT_MAX_LEVEL;

  const handleRequestHint = useCallback(() => {
    const hintTarget = selectHintTarget(progress.defects, order);
    if (hintTarget) {
      dispatch({ type: 'REQUEST_HINT', defectType: hintTarget });
      triggerHintKeeper('requestAttention');
    }
  }, [progress.defects, order, dispatch, triggerHintKeeper]);

  return (
    <section
      className={styles.panel}
      aria-labelledby="hint-panel-title"
      data-testid="hint-panel"
    >
      <div className={styles.headerRow}>
        <h3 id="hint-panel-title" className={styles.title}>
          <LanternIcon size={17} className={styles.lanternIcon} />
          Hint
        </h3>
        {/* Stays mounted so focus is never dropped when the last curse lifts. */}
        <button
          type="button"
          className={styles.hintButton}
          onClick={handleRequestHint}
          disabled={!target}
          data-testid="hint-button"
        >
          {!target
            ? 'No clues needed'
            : !hintLevel
              ? 'Show a clue'
              : atLastClue
                ? 'Show the last clue again'
                : 'Next clue'}
        </button>
      </div>

      {/* Polite live region: one announcement per clue */}
      <div className={styles.display} role="status" data-testid="hint-display">
        {!target && (
          <p className={styles.placeholder}>
            Every curse in this room is lifted. No clues needed.
          </p>
        )}
        {target && !hintLevel && (
          <p className={styles.placeholder}>
            No hint requested yet. Clues are free and appear one at a time.
          </p>
        )}
        {target && activeHint && targetState && hintLevel && (
          <div className={styles.hintContent} data-testid="hint-content">
            <p className={styles.hintMeta} data-testid="hint-meta">
              Hint {hintLevel} of {HINT_MAX_LEVEL} ({HINT_LEVEL_LABELS[hintLevel]})
              {' '}for <strong>{DEFECT_LABELS[target]}</strong>
            </p>
            <p className={styles.hintText} data-testid="hint-text">
              {activeHint.text}
            </p>
            <p className={styles.hintStatus}>{getHintStatusContext(targetState)}</p>
          </div>
        )}
      </div>
    </section>
  );
}
