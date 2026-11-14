/**
 * KeyQuest: The Haunted Accessibility Lab
 * Main Application Component
 */

import { useState, useCallback, useMemo } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { checkSavedProgress, clearSavedProgress } from './storage/progressHelpers';
import { AppShell } from './components/AppShell';
import { ProgressRestoreDialog } from './components/ProgressRestoreDialog';
import { MainMenuView, ChallengeView, CompletionView } from './views';
import type { ProgressState } from './types';
import './App.css';

/**
 * Check if saved progress has meaningful progress worth restoring
 */
function getMeaningfulSavedProgress(): ProgressState | null {
  const progress = checkSavedProgress();
  if (!progress) return null;
  
  // Only show restore dialog if there's meaningful progress (at least one defect discovered)
  const hasProgress = Object.values(progress.defects).some(
    (d) => d.discovered || d.repaired
  );
  
  if (hasProgress && !progress.isComplete) {
    return progress;
  }
  return null;
}

/**
 * Router component that displays the appropriate view based on game state
 */
function GameRouter() {
  const { state, dispatch } = useGame();
  
  // Check for meaningful saved progress on initial render (not in effect)
  const initialSavedProgress = useMemo(() => getMeaningfulSavedProgress(), []);
  
  const [savedProgress, setSavedProgress] = useState<ProgressState | null>(
    initialSavedProgress
  );
  const [showRestoreDialog, setShowRestoreDialog] = useState(
    initialSavedProgress !== null
  );

  const handleRestore = useCallback(() => {
    if (savedProgress) {
      dispatch({ type: 'RESTORE_PROGRESS', progress: savedProgress });
    }
    setShowRestoreDialog(false);
    setSavedProgress(null);
  }, [savedProgress, dispatch]);

  const handleStartFresh = useCallback(() => {
    clearSavedProgress();
    setShowRestoreDialog(false);
    setSavedProgress(null);
  }, []);

  // Render restore dialog when needed
  const restoreDialog =
    showRestoreDialog && savedProgress ? (
      <ProgressRestoreDialog
        savedProgress={savedProgress}
        onRestore={handleRestore}
        onStartFresh={handleStartFresh}
      />
    ) : null;

  switch (state.phase) {
    case 'loading':
      return (
        <>
          {restoreDialog}
          <div role="status" aria-live="polite" aria-busy="true">
            <p>Loading...</p>
          </div>
        </>
      );

    case 'menu':
      return (
        <>
          {restoreDialog}
          <MainMenuView />
        </>
      );

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
      return (
        <>
          {restoreDialog}
          <MainMenuView />
        </>
      );
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
