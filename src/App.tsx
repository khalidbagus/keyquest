/** Application shell around the real application-module loading boundary. */
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { ReducedMotionProvider } from './context/ReducedMotionContext';
import { GameProvider, useGame } from './context/GameContext';
import { MascotProvider } from './context/MascotContext';
import { DEV_FLAGS } from './registry/devFlags';
import { AppShell } from './components/AppShell';
import './App.css';

function ApplicationLoader() {
  const { state, dispatch } = useGame();
  const [Router, setRouter] = useState<ComponentType | null>(null);
  const errorHeading = useRef<HTMLHeadingElement>(null);
  const loadingAnnouncement = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let cancelled = false;
    // Populate an already-mounted live region once, including under StrictMode.
    if (loadingAnnouncement.current && !loadingAnnouncement.current.textContent) {
      loadingAnnouncement.current.textContent = 'Loading KeyQuest application files.';
    }
    // This module contains the views, challenge, repair and verification code.
    // No timer or synthetic initialization work holds the loading state open.
    async function loadApplication() {
      try {
        // Keep await inside try: Vite also awaits the chunk's CSS preload.
        const module = await import('./GameRouter');
        if (cancelled) return;
        setRouter(() => module.default);
        dispatch({ type: 'LOADING_COMPLETE' });
        // Development and test builds only: DEV_FLAGS is empty in production.
        if (DEV_FLAGS.preview === 'courtyard') {
          dispatch({ type: 'ENTER_COURTYARD_PREVIEW' });
          // Drop the parameter so a reload loads normal progress and the menu.
          const url = new URL(window.location.href);
          url.searchParams.delete('preview');
          window.history.replaceState(window.history.state, '', url);
        }
      } catch (error: unknown) {
        if (cancelled) return;
        dispatch({
          type: 'LOADING_ERROR',
          error: {
            code: 'APPLICATION_MODULE_LOAD_FAILED',
            message: error instanceof Error ? error.message : String(error),
            userMessage:
              'The application files could not be loaded. Check your connection and retry.',
            recoverable: true,
            timestamp: Date.now(),
          },
        });
      }
    }
    void loadApplication();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useLayoutEffect(() => {
    if (state.phase === 'error') errorHeading.current?.focus();
  }, [state.phase]);

  if (state.phase === 'error') {
    return (
      <div role="alert" data-testid="loading-error">
        <h2 ref={errorHeading} tabIndex={-1}>
          Unable to load KeyQuest
        </h2>
        <p>{state.error.userMessage}</p>
        {/* A fresh document also retries module failures cached by the browser. */}
        <button type="button" onClick={() => window.location.reload()}>
          Retry loading
        </button>
      </div>
    );
  }

  if (!Router) {
    return (
      <div data-testid="application-loading">
        <h2>Loading KeyQuest</h2>
        <p>Loading application files…</p>
        <progress aria-label="Application files loading" />
        <p
          ref={loadingAnnouncement}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="visually-hidden"
        />
      </div>
    );
  }

  return <Router />;
}

export default function App() {
  return (
    <ReducedMotionProvider>
      <GameProvider>
        <MascotProvider>
          <AppShell>
            <ApplicationLoader />
          </AppShell>
        </MascotProvider>
      </GameProvider>
    </ReducedMotionProvider>
  );
}
