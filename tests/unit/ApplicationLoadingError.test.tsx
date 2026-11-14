import { StrictMode } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import App from '../../src/App';

vi.mock('../../src/GameRouter', () => { throw new Error('Asset download failed'); });

it('contains a rejected startup import and focuses an accessible retry state', async () => {
  const saved = '{"existing":"session awaiting restore"}';
  localStorage.setItem('keyquest-progress-v1', saved);
  try {
    render(<StrictMode><App /></StrictMode>);
    const heading = await screen.findByRole('heading', { name: 'Unable to load KeyQuest' });
    expect(document.activeElement).toBe(heading);
    expect(screen.getByRole('alert').textContent).toContain('application files could not be loaded');
    expect(screen.getByRole('button', { name: 'Retry loading' })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    expect(localStorage.getItem('keyquest-progress-v1')).toBe(saved);
  } finally { cleanup(); localStorage.clear(); }
});
