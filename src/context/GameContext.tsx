/**
 * Game State Context Provider
 * Manages global game state via React Context + useReducer
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  GameState,
  GameAction,
  ProgressState,
  GameContextValue,
  DefectType,
  DefectState,
} from '../types';
import { StorageAdapter } from '../storage/StorageAdapter';

// ============================================
// Initial State Helpers
// ============================================

function createInitialDefectState(type: DefectType): DefectState {
  return {
    type,
    discovered: false,
    discoveredAt: null,
    repaired: false,
    repairedAt: null,
    verified: false,
    verifiedAt: null,
    hintLevel: 0,
  };
}

// Exported for unit tests of hint progression (Property 6)
// eslint-disable-next-line react-refresh/only-export-components
export function createInitialProgressState(): ProgressState {
  return {
    version: 1,
    sessionId: crypto.randomUUID(),
    startedAt: Date.now(),
    lastUpdatedAt: Date.now(),
    defects: {
      'invisible-focus': createInitialDefectState('invisible-focus'),
      'mouse-only-activation': createInitialDefectState('mouse-only-activation'),
      'missing-accessible-name': createInitialDefectState('missing-accessible-name'),
      'insufficient-contrast': createInitialDefectState('insufficient-contrast'),
    },
    hintsUsed: {
      'invisible-focus': 0,
      'mouse-only-activation': 0,
      'missing-accessible-name': 0,
      'insufficient-contrast': 0,
    },
    isComplete: false,
    completedAt: null,
  };
}

const initialGameState: GameState = { phase: 'menu' };

// ============================================
// Reducer
// ============================================

interface ReducerState {
  game: GameState;
  progress: ProgressState;
}

type ReducerAction = GameAction;

// Exported for unit tests of hint progression (Property 6)
// eslint-disable-next-line react-refresh/only-export-components
export function gameReducer(
  state: ReducerState,
  action: ReducerAction
): ReducerState {
  const now = Date.now();

  switch (action.type) {
    case 'START_LOADING':
      return {
        ...state,
        game: { phase: 'loading' },
      };

    case 'LOADING_COMPLETE':
      return {
        ...state,
        game: { phase: 'menu' },
      };

    case 'LOADING_ERROR':
      return {
        ...state,
        game: { phase: 'error', error: action.error },
      };

    case 'START_CHALLENGE':
      return {
        ...state,
        game: { phase: 'challenge' },
        progress: {
          ...state.progress,
          startedAt: state.progress.startedAt || now,
          lastUpdatedAt: now,
        },
      };

    case 'DISCOVER_DEFECT': {
      const defect = state.progress.defects[action.defectType];
      if (defect.discovered) return state;

      return {
        ...state,
        progress: {
          ...state.progress,
          lastUpdatedAt: now,
          defects: {
            ...state.progress.defects,
            [action.defectType]: {
              ...defect,
              discovered: true,
              discoveredAt: now,
            },
          },
        },
      };
    }

    case 'APPLY_REPAIR': {
      const defect = state.progress.defects[action.defectType];
      if (defect.repaired) return state;

      return {
        ...state,
        progress: {
          ...state.progress,
          lastUpdatedAt: now,
          defects: {
            ...state.progress.defects,
            [action.defectType]: {
              ...defect,
              repaired: true,
              repairedAt: now,
            },
          },
        },
      };
    }

    case 'VERIFICATION_RESULT': {
      const { result } = action;
      const defect = state.progress.defects[result.defectType];

      return {
        ...state,
        progress: {
          ...state.progress,
          lastUpdatedAt: now,
          defects: {
            ...state.progress.defects,
            [result.defectType]: {
              ...defect,
              verified: result.passed,
              verifiedAt: result.passed ? now : defect.verifiedAt,
            },
          },
        },
      };
    }

    case 'REQUEST_HINT': {
      const defect = state.progress.defects[action.defectType];
      const currentHintLevel = defect.hintLevel;
      const newHintLevel = Math.min(currentHintLevel + 1, 3) as 0 | 1 | 2 | 3;

      return {
        ...state,
        progress: {
          ...state.progress,
          lastUpdatedAt: now,
          defects: {
            ...state.progress.defects,
            [action.defectType]: {
              ...defect,
              hintLevel: newHintLevel,
            },
          },
          hintsUsed: {
            ...state.progress.hintsUsed,
            [action.defectType]: state.progress.hintsUsed[action.defectType] + 1,
          },
        },
      };
    }

    case 'EMERGENCY_EXIT':
      return {
        ...state,
        game: { phase: 'menu' },
        progress: {
          ...state.progress,
          lastUpdatedAt: now,
        },
      };

    case 'COMPLETE_LEVEL': {
      const defectsRepaired = Object.values(state.progress.defects)
        .filter((d) => d.verified)
        .map((d) => d.type);

      const summary = {
        totalTime: now - state.progress.startedAt,
        defectsRepaired,
        hintsUsed: state.progress.hintsUsed,
        conceptsLearned: [
          'WCAG 2.4.7 - Focus Visible',
          'WCAG 2.1.1 - Keyboard',
          'WCAG 4.1.2 - Name, Role, Value',
          'WCAG 1.4.3 - Contrast (Minimum)',
        ],
      };

      return {
        ...state,
        game: { phase: 'completion', summary },
        progress: {
          ...state.progress,
          isComplete: true,
          completedAt: now,
          lastUpdatedAt: now,
        },
      };
    }

    case 'RESET_CHALLENGE':
      return {
        game: { phase: 'menu' },
        progress: createInitialProgressState(),
      };

    case 'RESTORE_PROGRESS':
      return {
        ...state,
        game: { phase: 'challenge' },
        progress: {
          ...action.progress,
          lastUpdatedAt: now,
        },
      };

    default:
      return state;
  }
}

// ============================================
// Context
// ============================================

const GameContext = createContext<GameContextValue | null>(null);

// Singleton storage adapter to avoid recreation on every render
const storageAdapter = new StorageAdapter();

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, {
    game: initialGameState,
    progress: createInitialProgressState(),
  });

  const saveProgress = useCallback(() => {
    if (storageAdapter.isAvailable()) {
      storageAdapter.saveProgress({
        ...state.progress,
        lastUpdatedAt: Date.now(),
      });
    }
  }, [state.progress]);

  const resetProgress = useCallback(() => {
    storageAdapter.clearProgress();
    dispatch({ type: 'RESET_CHALLENGE' });
  }, []);

  // Auto-save on progress changes (debounced via effect cleanup)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveProgress();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state.progress, saveProgress]);

  const value: GameContextValue = {
    state: state.game,
    dispatch,
    progress: state.progress,
    saveProgress,
    resetProgress,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export { GameContext };
