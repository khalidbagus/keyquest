/**
 * RoutePanel
 * The HTML route: current Area, Landmarks, the Nearby_Interactable, one native
 * button per available Area_Action, and travel buttons. Everything the canvas
 * shows is also here as text, so the whole route can be played without the
 * canvas (Requirements 10.1 to 10.11, 13.4, 13.10, 15.4).
 */

import { useRef } from 'react';
import type { AvailableAction, TravelOption } from '../../engines/clocktowerRules';
import type { WorldAction, WorldOutcome } from '../../types/clocktower';
import styles from './RoutePanel.module.css';

export interface RoutePanelProps {
  areaName: string;
  objectiveLabel: string;
  /** How to play, shown in the Apothecary Exit only. */
  controlsText: string | null;
  /** Landmark names the camera shows, in Route_Data order (all of them without the canvas). */
  landmarksInView: readonly string[];
  /** Every Landmark name in the current Area, in Route_Data order. */
  areaLandmarks: readonly string[];
  /** The Nearby_Interactable and its prompt, or null when nothing is close. */
  nearby: { name: string; prompt: string } | null;
  actions: readonly AvailableAction[];
  travel: readonly TravelOption[];
  /** Dispatch the action and return the outcome the reducer applies. */
  onAction: (action: WorldAction) => WorldOutcome;
  /** "N of 3 bells rung" once the gate is open, else null (Requirement 21.8). */
  bellProgress?: string | null;
}

function actionTestId(action: WorldAction): string {
  switch (action.type) {
    case 'find-clue':
      return `route-action-find-clue-${action.clue}`;
    case 'enter-area':
      return `route-action-enter-area-${action.area}`;
    case 'ring-bell':
      return `route-action-ring-bell-${action.bell}`;
    default:
      return `route-action-${action.type}`;
  }
}

export function RoutePanel({
  areaName,
  objectiveLabel,
  controlsText,
  landmarksInView,
  areaLandmarks,
  nearby,
  actions,
  travel,
  onAction,
  bellProgress = null,
}: RoutePanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  function activate(action: WorldAction) {
    const outcome = onAction(action);
    // A rejection keeps focus on the button. After a success, move focus on only
    // when the activated button is gone: to the first remaining action, else the heading.
    if (outcome.kind !== 'changed') return;
    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const active = document.activeElement;
      if (active && active !== document.body && panel.contains(active)) return;
      const next = panel.querySelector<HTMLElement>('[data-route-action]');
      (next ?? headingRef.current)?.focus();
    });
  }

  return (
    <section
      ref={panelRef}
      className={styles.panel}
      aria-labelledby="route-heading"
      data-testid="route-panel"
    >
      <h3 id="route-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
        Route panel
      </h3>

      <p className={styles.line} data-testid="route-objective">
        <span className={styles.term}>Objective:</span> {objectiveLabel}
      </p>
      <p className={styles.line} data-testid="route-area">
        <span className={styles.term}>Area:</span> {areaName}
      </p>

      {controlsText && (
        <p className={styles.line} data-testid="route-controls">
          {controlsText}
        </p>
      )}

      <div className={styles.block} data-testid="route-landmarks">
        <p className={styles.term} id="route-landmarks-label">
          In view:
        </p>
        {landmarksInView.length > 0 ? (
          <ul className={styles.list} aria-labelledby="route-landmarks-label">
            {landmarksInView.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.line}>No landmarks in view.</p>
        )}
      </div>

      <div className={styles.block} data-testid="route-area-landmarks">
        <p className={styles.term} id="route-area-landmarks-label">
          Landmarks in this area:
        </p>
        {areaLandmarks.length > 0 ? (
          <ul className={styles.list} aria-labelledby="route-area-landmarks-label">
            {areaLandmarks.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.line}>No landmarks in this area.</p>
        )}
      </div>

      <p className={styles.line} data-testid="route-nearby">
        <span className={styles.term}>Nearby:</span>{' '}
        {nearby ? `${nearby.name} (${nearby.prompt})` : 'nothing'}
      </p>

      {bellProgress && (
        <p className={styles.line} data-testid="route-bell-progress">
          <span className={styles.term}>Bells:</span> {bellProgress}
        </p>
      )}

      {actions.length > 0 && (
        <ul className={styles.actions} aria-label="Available actions">
          {actions.map((entry) => (
            <li key={entry.label}>
              <button
                type="button"
                className={styles.actionButton}
                data-route-action=""
                data-testid={actionTestId(entry.action)}
                onClick={() => activate(entry.action)}
              >
                {entry.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {travel.length > 0 && (
        <div className={styles.block}>
          <p className={styles.term} id="route-travel-label">
            Travel:
          </p>
          <ul className={styles.actions} aria-labelledby="route-travel-label" data-testid="route-travel">
            {travel.map((entry) => (
              <li key={entry.label}>
                <button
                  type="button"
                  className={styles.actionButton}
                  data-route-action=""
                  data-testid={`route-${entry.kind}-${entry.action.area}`}
                  onClick={() => activate(entry.action)}
                >
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
