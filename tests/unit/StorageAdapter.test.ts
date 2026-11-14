import { beforeEach, describe, expect, it } from 'vitest';
import { StorageAdapter } from '../../src/storage/StorageAdapter';

describe('persisted progress validation', () => {
  beforeEach(() => localStorage.clear());

  it.each(['{', 'null', '{"version":2}', '{"version":1}'])(
    'rejects malformed, unsupported, or incomplete saved progress: %s',
    (value) => {
      localStorage.setItem('keyquest-progress-v1', value);
      expect(new StorageAdapter().loadProgress()).toBeNull();
    },
  );
});
