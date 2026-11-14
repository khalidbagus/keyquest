import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import type { ProgressState } from '../../src/types';

describe('actual error boundary recovery', () => {
  it('shows and focuses recovery after a child render error', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const save = vi.fn();
    function Broken(): never { throw new Error('test render failure'); }
    try {
      render(<ErrorBoundary progress={{} as ProgressState} saveProgress={save} onResetSandbox={() => {}} onReturnToMenu={() => {}}><Broken /></ErrorBoundary>);
      expect(save).toHaveBeenCalled();
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Something Went Wrong' }));
    } finally { log.mockRestore(); }
  });

  it('limits retries for a persistent render error', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Broken(): never { throw new Error('test render failure'); }
    try {
      render(<ErrorBoundary progress={{} as ProgressState} saveProgress={() => {}} onResetSandbox={() => {}} onReturnToMenu={() => {}}><Broken /></ErrorBoundary>);
      for (let i = 0; i < 3; i++) fireEvent.click(screen.getByTestId('error-retry-button'));
      expect((screen.getByTestId('error-retry-button') as HTMLButtonElement).disabled).toBe(true);
    } finally { log.mockRestore(); }
  });
});
