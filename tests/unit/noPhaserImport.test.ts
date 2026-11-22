/**
 * No Clocktower module outside the lazy chunk may load Phaser.
 * Phaser is mocked to throw on import; every other Clocktower module and the
 * ClocktowerView must still load, with WorldSceneHost mocked.
 * Requirements: 2.6, 24.13
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
  throw new Error('Phaser must not be imported outside src/components/WorldScene/phaser');
});

vi.mock('../../src/components/WorldScene/WorldSceneHost', () => ({
  WorldSceneHost: () => null,
  SCENE_LOAD_TIMEOUT_MS: 10_000,
}));

vi.mock('../../src/components/RiveMascot', () => ({ RiveMascot: () => null }));

describe('Clocktower modules without Phaser', () => {
  it.each([
    '../../src/types/clocktower',
    '../../src/registry/clocktowerRoute',
    '../../src/registry/clocktowerCopy',
    '../../src/registry/devFlags',
    '../../src/engines/worldPhysics',
    '../../src/engines/heldInput',
    '../../src/engines/clocktowerRules',
    '../../src/hooks/useHeldDirections',
    '../../src/hooks/useRoomStatus',
    '../../src/hooks/useReactionToken',
    '../../src/components/Clocktower/PlayArea',
    '../../src/components/Clocktower/TouchControls',
    '../../src/components/Clocktower/RoutePanel',
    '../../src/context/GameContext',
    '../../src/views/ClocktowerView',
    '../../src/GameRouter',
  ])('loads %s', async (path) => {
    await expect(import(/* @vite-ignore */ path)).resolves.toBeDefined();
  });

  it('would fail if Phaser were imported', async () => {
    // The mock factory throws, which proves the guard is armed for this file.
    await expect(import('phaser')).rejects.toThrow();
  });
});
