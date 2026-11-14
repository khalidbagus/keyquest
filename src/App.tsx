/**
 * KeyQuest: The Haunted Accessibility Lab
 * Main Application Component
 */

import { GameProvider, useGame } from './context/GameContext';
import { AppShell } from './components/AppShell';
import { MainMenuView, ChallengeView, CompletionView } from './views';
import './App.css';

/**
 * Router component that displays the appropriate view based on game state
 */
function GameRouter() {
  const { state } = useGame();

  switch (state.phase) {
    case 'loading':
      return (
        <div role="status" aria-live="polite" aria-busy="true">
          <p>Loading...</p>
        </div>
      );

    case 'menu':
      return <MainMenuView />;

    case 'challenge':
      return <ChallengeView />;

    case 'completion':
      return <CompletionView />;

    case 'error':
      return (
        <div role="alert">
          <h2>Something went wrong</h2>
          <p>{state.error.userMessage}</p>
        </div>
      );

    default:
      return <MainMenuView />;
  }
}

/**
 * Main App Component
 */
function App() {
  return (
    <GameProvider>
      <AppShell>
        <GameRouter />
      </AppShell>
    </GameProvider>
  );
}

export default App;
