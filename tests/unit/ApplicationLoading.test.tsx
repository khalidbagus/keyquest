import { StrictMode } from 'react';
import { act, render, screen, cleanup } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import App from '../../src/App';

const moduleLoad = vi.hoisted(() => {
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  return { pending, finish };
});

vi.mock('../../src/GameRouter', async () => {
  await moduleLoad.pending;
  return { default: () => <h2>Ready menu</h2> };
});

it('shows status immediately, preserves saved data, and becomes ready when the module resolves', async () => {
  vi.useFakeTimers();
  const saved = '{"existing":"session awaiting restore"}';
  localStorage.setItem('keyquest-progress-v1', saved);
  let announcements = 0;
  const observer = new MutationObserver(records => {
    announcements += records.filter(record => record.target instanceof HTMLElement && record.target.getAttribute('role') === 'status').length;
  });
  observer.observe(document.body, { childList: true, subtree: true });
  try {
    render(<StrictMode><App /></StrictMode>);
    expect(screen.getByRole('status').textContent).toContain('Loading KeyQuest');
    expect(screen.getByRole('progressbar').hasAttribute('value')).toBe(false);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(announcements).toBe(1);
    expect(localStorage.getItem('keyquest-progress-v1')).toBe(saved);
    await act(async () => { moduleLoad.finish(); await moduleLoad.pending; });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Ready menu' })).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(localStorage.getItem('keyquest-progress-v1')).toBe(saved);
  } finally {
    observer.disconnect();
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
  }
});
