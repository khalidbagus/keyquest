/**
 * Error Boundary Component
 * Catches JavaScript errors in the Challenge Sandbox and provides recovery options.
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 *
 * Note: React Error Boundaries only catch errors during rendering, in lifecycle
 * methods, and in constructors of components within their subtree. They do NOT
 * catch errors in event handlers, asynchronous code, or errors thrown outside
 * the component tree.
 */

import { Component, createRef, type ErrorInfo, type ReactNode } from 'react';
import type { ProgressState } from '../../types';
import styles from './ErrorBoundary.module.css';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Current progress state to preserve on error */
  progress: ProgressState;
  /** Save progress callback before displaying error UI */
  saveProgress: () => void;
  /** Reset sandbox to initial state (clears repairs, preserves progress structure) */
  onResetSandbox: () => void;
  /** Return to main menu (preserves progress) */
  onReturnToMenu: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  /** Snapshot of progress at the time of error */
  progressSnapshot: ProgressState | null;
  /** Counter to track retry attempts and prevent infinite loops */
  retryCount: number;
  /** Key to force remount on retry */
  retryKey: number;
}

const MAX_RETRIES = 3;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private recoveryHeadingRef = createRef<HTMLHeadingElement>();

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      progressSnapshot: null,
      retryCount: 0,
      retryKey: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Preserve progress state before displaying error
    this.props.saveProgress();

    // Update state with error details and progress snapshot
    this.setState({
      errorInfo,
      progressSnapshot: { ...this.props.progress },
    });

    // Log error for debugging (in production, this could go to an error service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidMount(): void {
    // Focus the recovery heading if error occurred during initial mount
    if (this.state.hasError) {
      this.recoveryHeadingRef.current?.focus();
    }
  }

  componentDidUpdate(_prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState): void {
    // Focus the recovery heading when error UI is first shown after mount
    if (this.state.hasError && !prevState.hasError) {
      this.recoveryHeadingRef.current?.focus();
    }
  }

  handleRetry = (): void => {
    const { retryCount, retryKey } = this.state;

    if (retryCount >= MAX_RETRIES) {
      // Too many retries - don't attempt again
      return;
    }

    // Reset error state and increment retry counter
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1,
      retryKey: retryKey + 1,
    });
  };

  handleResetSandbox = (): void => {
    // Reset error state and retry counter
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      progressSnapshot: null,
      retryCount: 0,
      retryKey: this.state.retryKey + 1,
    });

    // Call parent's reset handler
    this.props.onResetSandbox();
  };

  handleReturnToMenu = (): void => {
    // Clear error state (component will unmount anyway)
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });

    // Progress is already saved; navigate to menu
    this.props.onReturnToMenu();
  };

  render(): ReactNode {
    const { hasError, error, retryCount, retryKey } = this.state;
    const { children } = this.props;

    if (hasError) {
      const canRetry = retryCount < MAX_RETRIES;
      const retriesRemaining = MAX_RETRIES - retryCount;

      return (
        <div
          className={styles.errorContainer}
          role="alert"
          aria-live="assertive"
          data-testid="error-boundary-ui"
        >
          <div className={styles.errorCard}>
            <h3
              ref={this.recoveryHeadingRef}
              tabIndex={-1}
              className={styles.errorTitle}
            >
              <span aria-hidden="true">⚠️</span>
              Something Went Wrong
            </h3>

            <p className={styles.errorMessage}>
              The challenge sandbox encountered an unexpected error. Your progress
              has been saved automatically.
            </p>

            {error && (
              <details className={styles.errorDetails}>
                <summary className={styles.detailsSummary}>
                  Technical Details
                </summary>
                <pre className={styles.errorStack}>
                  <code>{error.message}</code>
                </pre>
              </details>
            )}

            <div className={styles.recoveryOptions}>
              <h4 className={styles.recoveryHeading}>Recovery Options</h4>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  className={styles.retryButton}
                  onClick={this.handleRetry}
                  disabled={!canRetry}
                  data-testid="error-retry-button"
                  aria-describedby={canRetry ? undefined : 'retry-limit-message'}
                >
                  Retry
                  {canRetry && (
                    <span className={styles.retryCount}>
                      ({retriesRemaining} {retriesRemaining === 1 ? 'attempt' : 'attempts'} left)
                    </span>
                  )}
                </button>

                {!canRetry && (
                  <p id="retry-limit-message" className={styles.retryLimitMessage}>
                    Maximum retry attempts reached. Please reset the sandbox or
                    return to the menu.
                  </p>
                )}

                <button
                  type="button"
                  className={styles.resetButton}
                  onClick={this.handleResetSandbox}
                  data-testid="error-reset-button"
                >
                  Reset Sandbox
                </button>

                <button
                  type="button"
                  className={styles.menuButton}
                  onClick={this.handleReturnToMenu}
                  data-testid="error-menu-button"
                >
                  Return to Menu
                </button>
              </div>
            </div>

            <p className={styles.progressNote}>
              <span aria-hidden="true">💾</span>
              Your discovered and verified defects have been preserved.
            </p>
          </div>
        </div>
      );
    }

    // Use key to force remount on retry
    return <div key={retryKey}>{children}</div>;
  }
}

export default ErrorBoundary;
