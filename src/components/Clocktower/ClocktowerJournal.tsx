/**
 * ClocktowerJournal
 * Always visible. Lists the found Clues in Route_Data order (Moon, Thorn, Key),
 * whatever order they were found in, or says none are found yet
 * (Requirements 14.3, 14.4, 14.7).
 */

import { BELLS, BELL_SEQUENCE } from '../../registry/clocktowerRoute';
import styles from './RoutePanel.module.css';

export interface ClocktowerJournalProps {
  clues: readonly { id: string; label: string; text: string }[];
}

export function ClocktowerJournal({ clues }: ClocktowerJournalProps) {
  return (
    <section className={styles.panel} aria-labelledby="journal-heading" data-testid="clocktower-journal">
      <h3 id="journal-heading" className={styles.heading}>
        Journal
      </h3>
      <div className={styles.block}>
        <h4 className={styles.term} id="journal-clues-heading">
          Clues found
        </h4>
        {clues.length > 0 ? (
          <ol className={styles.list} aria-labelledby="journal-clues-heading" data-testid="journal-clues">
            {clues.map((clue) => (
              <li key={clue.id} data-clue={clue.id}>
                <strong>{clue.label}:</strong> {clue.text}
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.line} data-testid="journal-empty">
            No clues found yet.
          </p>
        )}
      </div>
      <div className={styles.block}>
        <h4 className={styles.term} id="journal-bells-heading">
          Bell order
        </h4>
        {/* Static and never animated (Requirement 21.1). */}
        <ol className={styles.list} aria-labelledby="journal-bells-heading" data-testid="journal-bell-order">
          {BELL_SEQUENCE.map((id) => (
            <li key={id} data-bell={id}>
              {BELLS.find((bell) => bell.id === id)?.label ?? id}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
