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
  useRef,
  type ReactNode,
} from 'react';
import type {
  CompletionSummary,
  DefectType,
  GameAction,
  GameContextValue,
  GameState,
  ProgressState,
  RoomId,
} from '../types';
import { StorageAdapter } from '../storage/StorageAdapter';
import { getMeaningfulSavedProgress } from '../storage/progressHelpers';
import {
  createInitialDefectState,
  createInitialProgressState as createInitialProgress,
} from '../storage/progressSchema';
import { INITIAL_CHECKOUT_STATE, canPerformRoomAction } from '../registry/roomRegistry';
import {
  INITIAL_PANTRY_STATE,
  getAddOutcome,
  getCauldronStatus,
} from '../registry/pantryRegistry';
import {
  ROOM_DEFECTS,
  getRoom,
  isAdventureComplete,
  isRoomCleared,
  isRoomUnlocked,
} from '../registry/roomsRegistry';

// Exported for unit tests of hint progression (Property 6)
// eslint-disable-next-line react-refresh/only-export-components
export function createInitialProgressState(): ProgressState {
  return createInitialProgress();
}

const CONCEPTS: Record<RoomId, string[]> = {
  checkout: [
    'WCAG 2.4.7 - Focus Visible',
    'WCAG 2.1.1 - Keyboard',
    'WCAG 4.1.2 - Name, Role, Value',
    'WCAG 1.4.3 - Contrast (Minimum)',
  ],
  pantry: ['WCAG 1.4.1 - Use of Color', 'WCAG 2.5.3 - Label in Name'],
  clocktower: [],
};

const initialGameState: GameState = { phase: 'loading' };

// ============================================
// Reducer
// ============================================

interface ReducerState {
  game: GameState;
  progress: ProgressState;
}

type ReducerAction = GameAction;

function withDefect(
  progress: ProgressState,
  type: DefectType,
  patch: Partial<ProgressState['defects'][DefectType]>,
  now: number
): ProgressState {
  return {
    ...progress,
    lastUpdatedAt: now,
    defects: {
      ...progress.defects,
      [type]: { ...progress.defects[type], ...patch },
    },
  };
}

function resetRoomProgress(progress: ProgressState, room: RoomId, now: number): ProgressState {
  const defects = { ...progress.defects };
  const hintsUsed = { ...progress.hintsUsed };
  for (const type of ROOM_DEFECTS[room]) {
    defects[type] = createInitialDefectState(type);
    hintsUsed[type] = 0;
  }
  return {
    ...progress,
    lastUpdatedAt: now,
    defects,
    hintsUsed,
    checkout: room === 'checkout' ? { ...INITIAL_CHECKOUT_STATE } : progress.checkout,
    pantry: room === 'pantry' ? { ...INITIAL_PANTRY_STATE, cauldron: [] } : progress.pantry,
    isComplete: false,
    completedAt: null,
  };
}

// Exported for unit tests of hint progression (Property 6)
// eslint-disable-next-line react-refresh/only-export-components
export function gameReducer(
  state: ReducerState,
  action: ReducerAction
): ReducerState {
  const now = Date.now();

  switch (action.type) {
    case 'START_LOADING':
      return { ...state, game: { phase: 'loading' } };

    case 'LOADING_COMPLETE':
      return { ...state, game: { phase: 'menu' } };

    case 'LOADING_ERROR':
      return { ...state, game: { phase: 'error', error: action.error } };

    case 'START_CHALLENGE': {
      // Resume into the current room; a cleared room opens the door selector.
      const progress = {
        ...state.progress,
        startedAt: state.progress.startedAt || now,
        lastUpdatedAt: now,
      };
      const cleared = isRoomCleared(progress, progress.currentRoom);
      return { ...state, game: { phase: cleared ? 'doors' : 'challenge' }, progress };
    }

    case 'ENTER_ROOM': {
      const room = getRoom(action.roomId);
      if (!room.built || !isRoomUnlocked(state.progress, action.roomId)) return state;
      return {
        ...state,
        game: { phase: 'challenge' },
        progress: { ...state.progress, currentRoom: action.roomId, lastUpdatedAt: now },
      };
    }

    case 'OPEN_DOORS':
      return { ...state, game: { phase: 'doors' } };

    case 'DISCOVER_DEFECT': {
      const defect = state.progress.defects[action.defectType];
      if (defect.discovered) return state;
      return {
        ...state,
        progress: withDefect(
          state.progress,
          action.defectType,
          { discovered: true, discoveredAt: now },
          now
        ),
      };
    }

    case 'APPLY_REPAIR': {
      const defect = state.progress.defects[action.defectType];
      if (defect.repaired) return state;
      return {
        ...state,
        progress: withDefect(
          state.progress,
          action.defectType,
          { repaired: true, repairedAt: now },
          now
        ),
      };
    }

    case 'VERIFICATION_RESULT': {
      const { result } = action;
      const defect = state.progress.defects[result.defectType];
      return {
        ...state,
        progress: withDefect(
          state.progress,
          result.defectType,
          {
            verified: result.passed,
            verifiedAt: result.passed ? now : defect.verifiedAt,
          },
          now
        ),
      };
    }

    case 'REQUEST_HINT': {
      const defect = state.progress.defects[action.defectType];
      const newHintLevel = Math.min(defect.hintLevel + 1, 3) as 0 | 1 | 2 | 3;
      const progress = withDefect(
        state.progress,
        action.defectType,
        { hintLevel: newHintLevel },
        now
      );
      return {
        ...state,
        progress: {
          ...progress,
          hintsUsed: {
            ...progress.hintsUsed,
            [action.defectType]: state.progress.hintsUsed[action.defectType] + 1,
          },
        },
      };
    }

    case 'EMERGENCY_EXIT':
      return {
        ...state,
        game: { phase: 'menu' },
        progress: { ...state.progress, lastUpdatedAt: now },
      };

    case 'COMPLETE_LEVEL':
    case 'COMPLETE_ROOM': {
      const roomId = action.type === 'COMPLETE_ROOM' ? action.roomId : 'checkout';
      const defectsRepaired = ROOM_DEFECTS[roomId].filter(
        (t) => state.progress.defects[t].verified
      );
      const summary: CompletionSummary = {
        roomId,
        totalTime: now - state.progress.startedAt,
        defectsRepaired,
        hintsUsed: state.progress.hintsUsed,
        conceptsLearned: CONCEPTS[roomId],
      };
      const complete = isAdventureComplete(state.progress);
      return {
        ...state,
        game: { phase: 'completion', summary },
        progress: {
          ...state.progress,
          isComplete: complete,
          completedAt: complete ? (state.progress.completedAt ?? now) : null,
          lastUpdatedAt: now,
        },
      };
    }

    case 'RESET_CHALLENGE':
      return { game: { phase: 'menu' }, progress: createInitialProgressState() };

    case 'RESET_ROOM':
      return {
        ...state,
        progress: resetRoomProgress(state.progress, action.roomId, now),
      };

    case 'RESTORE_PROGRESS':
      return {
        ...state,
        game: { phase: 'challenge' },
        progress: { ...action.progress, lastUpdatedAt: now },
      };

    case 'HYDRATE_PROGRESS':
      // Load a saved session into memory without entering the room or saving.
      return { ...state, progress: action.progress };

    case 'ROOM_ACTION': {
      if (!canPerformRoomAction(state.progress, action.action)) return state;
      const key =
        action.action === 'light-lantern'
          ? 'lanternLit'
          : action.action === 'add-candle'
            ? 'candleAdded'
            : action.action === 'place-order'
              ? 'orderPlaced'
              : 'keyTaken';
      return {
        ...state,
        progress: {
          ...state.progress,
          lastUpdatedAt: now,
          checkout: { ...state.progress.checkout, [key]: true },
        },
      };
    }

    case 'PANTRY_ACTION': {
      const pantry = state.progress.pantry;
      if (action.action === 'add') {
        const outcome = getAddOutcome(state.progress, action.ingredient);
        if (outcome.kind !== 'added') return state;
        return {
          ...state,
          progress: {
            ...state.progress,
            lastUpdatedAt: now,
            pantry: {
              ...pantry,
              cauldron: [...pantry.cauldron, action.ingredient],
              brewed: outcome.brewed,
            },
          },
        };
      }
      if (action.action === 'remove') {
        if (pantry.brewed) return state;
        if (action.index < 0 || action.index >= pantry.cauldron.length) return state;
        const cauldron = pantry.cauldron.filter((_, i) => i !== action.index);
        return {
          ...state,
          progress: {
            ...state.progress,
            lastUpdatedAt: now,
            pantry: { ...pantry, cauldron, brewed: getCauldronStatus(cauldron).complete },
          },
        };
      }
      // bottle
      if (!pantry.brewed || pantry.potionTaken) return state;
      return {
        ...state,
        progress: {
          ...state.progress,
          lastUpdatedAt: now,
          pantry: { ...pantry, potionTaken: true },
        },
      };
    }

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
  // A valid save is loaded (and migrated) at startup so the opening screen
  // can offer Resume. Nothing is written until the player enters a room.
  const [state, dispatch] = useReducer(gameReducer, undefined, () => ({
    game: initialGameState,
    progress: getMeaningfulSavedProgress() ?? createInitialProgressState(),
  }));

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

  // A confirmed reset is saved at once, so closing the tab right after
  // cannot bring the old progress back.
  const saveAfterNextChange = useRef(false);
  const resetRoom = useCallback((roomId: RoomId) => {
    saveAfterNextChange.current = true;
    dispatch({ type: 'RESET_ROOM', roomId });
  }, []);

  useEffect(() => {
    if (!saveAfterNextChange.current) return;
    saveAfterNextChange.current = false;
    saveProgress();
  }, [saveProgress]);

  // Auto-save on progress changes (debounced via effect cleanup)
  useEffect(() => {
    // Do not overwrite an existing session during loading or on the menu.
    // Menu exits save explicitly.
    const phase = state.game.phase;
    if (phase !== 'challenge' && phase !== 'completion' && phase !== 'doors') return;
    const timeoutId = setTimeout(() => {
      saveProgress();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state.progress, state.game.phase, saveProgress]);

  const value: GameContextValue = {
    state: state.game,
    dispatch,
    progress: state.progress,
    saveProgress,
    resetProgress,
    resetRoom,
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
