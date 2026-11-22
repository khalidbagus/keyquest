/**
 * Development flags: pure parsing and the production constant shape.
 * Requirements: 4.2, 4.5
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readDevFlags } from '../../src/registry/devFlags';

describe('readDevFlags', () => {
  it('parses the courtyard preview flag', () => {
    expect(readDevFlags('?preview=courtyard').preview).toBe('courtyard');
  });

  it('parses the clocktower built flag', () => {
    expect([...readDevFlags('?built=clocktower').built]).toEqual(['clocktower']);
  });

  it('parses both flags together, with or without the leading question mark', () => {
    for (const search of ['?preview=courtyard&built=clocktower', 'built=clocktower&preview=courtyard']) {
      const flags = readDevFlags(search);
      expect(flags.preview).toBe('courtyard');
      expect(flags.built.has('clocktower')).toBe(true);
    }
  });

  it('ignores unknown flag values and unknown rooms', () => {
    const flags = readDevFlags('?preview=graveyard&built=pantry&built=nowhere&other=1');
    expect(flags.preview).toBeNull();
    expect(flags.built.size).toBe(0);
  });

  it('accepts a flag repeated with other values and does not duplicate rooms', () => {
    const flags = readDevFlags('?preview=nope&preview=courtyard&built=clocktower&built=clocktower');
    expect(flags.preview).toBe('courtyard');
    expect([...flags.built]).toEqual(['clocktower']);
  });

  it('returns no flags for an empty query', () => {
    for (const search of ['', '?']) {
      const flags = readDevFlags(search);
      expect(flags.preview).toBeNull();
      expect(flags.built.size).toBe(0);
    }
  });
});

describe('DEV_FLAGS in a production build', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    window.history.replaceState(null, '', '/');
  });

  it('is empty even when the address carries both flags', async () => {
    vi.stubEnv('DEV', false);
    window.history.replaceState(null, '', '/?preview=courtyard&built=clocktower');
    vi.resetModules();
    const { DEV_FLAGS } = await import('../../src/registry/devFlags');
    expect(DEV_FLAGS.preview).toBeNull();
    expect(DEV_FLAGS.built.size).toBe(0);
  });

  it('reads the address in a development build', async () => {
    vi.stubEnv('DEV', true);
    window.history.replaceState(null, '', '/?preview=courtyard&built=clocktower');
    vi.resetModules();
    const { DEV_FLAGS } = await import('../../src/registry/devFlags');
    expect(DEV_FLAGS.preview).toBe('courtyard');
    expect(DEV_FLAGS.built.has('clocktower')).toBe(true);
  });
});
