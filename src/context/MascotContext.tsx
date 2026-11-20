/**
 * Mascot Context
 * Manages the active player companion (Costume Locker selection),
 * Plague Doctor Hint Keeper reactions, and live speech-bubble announcements.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  DEFAULT_COMPANION_ID,
  HINT_KEEPER_ID,
  getMascotById,
  isMascotId,
  type MascotDefinition,
  type MascotId,
  type MascotTriggerName,
} from '../registry/mascotRegistry';

export const MASCOT_STORAGE_KEY = 'keyquest-mascot-v1';

export interface MascotSignal {
  trigger: MascotTriggerName;
  seq: number;
}

export interface MascotContextValue {
  companion: MascotDefinition;
  hintKeeper: MascotDefinition;
  setCompanionId: (id: MascotId) => void;
  companionSignal: MascotSignal | null;
  hintKeeperSignal: MascotSignal | null;
  speechLine: string;
  speechTone: 'neutral' | 'celebrate' | 'warning' | 'hint';
  triggerCompanion: (
    trigger: MascotTriggerName,
    speechLine?: string,
    tone?: 'neutral' | 'celebrate' | 'warning' | 'hint'
  ) => void;
  triggerHintKeeper: (
    trigger: MascotTriggerName,
    speechLine?: string
  ) => void;
}

function loadSavedCompanionId(): MascotId {
  try {
    const raw = localStorage.getItem(MASCOT_STORAGE_KEY);
    if (raw && isMascotId(raw)) {
      return raw;
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_COMPANION_ID;
}

const MascotContext = createContext<MascotContextValue | null>(null);

export function MascotProvider({ children }: { children: ReactNode }) {
  const [companionId, setCompanionIdState] = useState<MascotId>(
    loadSavedCompanionId
  );
  const [companionSignal, setCompanionSignal] = useState<MascotSignal | null>(
    null
  );
  const [hintKeeperSignal, setHintKeeperSignal] = useState<MascotSignal | null>(
    null
  );

  const companion = useMemo(() => getMascotById(companionId), [companionId]);
  const hintKeeper = useMemo(() => getMascotById(HINT_KEEPER_ID), []);

  const [speechLine, setSpeechLine] = useState<string>(companion.greetingLine);
  const [speechTone, setSpeechTone] = useState<
    'neutral' | 'celebrate' | 'warning' | 'hint'
  >('neutral');

  const setCompanionId = useCallback((id: MascotId) => {
    setCompanionIdState(id);
    const next = getMascotById(id);
    setSpeechLine(next.greetingLine);
    setSpeechTone('neutral');
    setCompanionSignal((prev) => ({
      trigger: 'greet',
      seq: (prev?.seq ?? 0) + 1,
    }));
    try {
      localStorage.setItem(MASCOT_STORAGE_KEY, id);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const triggerCompanion = useCallback(
    (
      trigger: MascotTriggerName,
      nextSpeech?: string,
      tone: 'neutral' | 'celebrate' | 'warning' | 'hint' = 'neutral'
    ) => {
      setCompanionSignal((prev) => ({
        trigger,
        seq: (prev?.seq ?? 0) + 1,
      }));
      if (nextSpeech) {
        setSpeechLine(nextSpeech);
        setSpeechTone(tone);
      }
    },
    []
  );

  const triggerHintKeeper = useCallback(
    (trigger: MascotTriggerName, nextSpeech?: string) => {
      setHintKeeperSignal((prev) => ({
        trigger,
        seq: (prev?.seq ?? 0) + 1,
      }));
      if (nextSpeech) {
        setSpeechLine(nextSpeech);
        setSpeechTone('hint');
      }
    },
    []
  );

  const value = useMemo<MascotContextValue>(
    () => ({
      companion,
      hintKeeper,
      setCompanionId,
      companionSignal,
      hintKeeperSignal,
      speechLine,
      speechTone,
      triggerCompanion,
      triggerHintKeeper,
    }),
    [
      companion,
      hintKeeper,
      setCompanionId,
      companionSignal,
      hintKeeperSignal,
      speechLine,
      speechTone,
      triggerCompanion,
      triggerHintKeeper,
    ]
  );

  return (
    <MascotContext.Provider value={value}>{children}</MascotContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMascot(): MascotContextValue {
  const ctx = useContext(MascotContext);
  if (!ctx) {
    throw new Error('useMascot must be used within a MascotProvider');
  }
  return ctx;
}
