import { useEffect, useRef } from 'react';
import { useGame } from './context/GameContext';
import {
  MainMenuView,
  ChallengeView,
  CompletionView,
  DoorSelectorView,
  PantryView,
} from './views';

/**
 * Router component that displays the appropriate view based on game state.
 * Saved progress is loaded at startup by GameProvider and offered as
 * Resume on the opening screen, so no dialog blocks the menu.
 * Each room and the door selector move focus to their own heading on entry.
 */
export default function GameRouter() {
  const { state, progress } = useGame();

  const previousPhase = useRef(state.phase);
  useEffect(() => {
    if (state.phase === 'menu' && previousPhase.current !== 'menu') {
      document.getElementById('menu-hero-heading')?.focus();
    }
    previousPhase.current = state.phase;
  }, [state.phase]);

  switch (state.phase) {
    case 'loading':
      return (
        <div role="status" aria-live="polite" aria-busy="true">
          <p>Loading...</p>
        </div>
      );

    case 'challenge':
      return progress.currentRoom === 'pantry' ? (
        <PantryView key="pantry" />
      ) : (
        <ChallengeView key="checkout" />
      );

    case 'doors':
      return <DoorSelectorView />;

    case 'completion':
      return <CompletionView />;

    case 'error':
      return (
        <div role="alert">
          <h2>Something went wrong</h2>
          <p>{state.error.userMessage}</p>
        </div>
      );

    case 'menu':
    default:
      return <MainMenuView />;
  }
}
