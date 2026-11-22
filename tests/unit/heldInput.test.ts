/**
 * Held-direction stack: the most recent still-held source wins.
 * Requirements: 6.7, 9.8
 */
import { describe, expect, it } from 'vitest';
import { createHeldInput } from '../../src/engines/heldInput';

describe('heldInput', () => {
  it('starts with no direction', () => {
    expect(createHeldInput().current()).toBeNull();
  });

  it('returns the only held direction', () => {
    const held = createHeldInput();
    held.press('key:ArrowUp', 'north');
    expect(held.current()).toBe('north');
  });

  it('follows the most recent press, then falls back when it is released', () => {
    const held = createHeldInput();
    held.press('key:ArrowUp', 'north');
    held.press('key:ArrowRight', 'east');
    expect(held.current()).toBe('east');
    held.release('key:ArrowRight');
    expect(held.current()).toBe('north');
    held.release('key:ArrowUp');
    expect(held.current()).toBeNull();
  });

  it('releasing the older key leaves the newer direction in place', () => {
    const held = createHeldInput();
    held.press('key:ArrowUp', 'north');
    held.press('key:ArrowRight', 'east');
    held.release('key:ArrowUp');
    expect(held.current()).toBe('east');
  });

  it('mixes keyboard and touch sources in one order', () => {
    const held = createHeldInput();
    held.press('key:ArrowLeft', 'west');
    held.press('touch:down', 'south');
    expect(held.current()).toBe('south');
    held.release('touch:down');
    expect(held.current()).toBe('west');
  });

  it('clear empties the stack', () => {
    const held = createHeldInput();
    held.press('key:ArrowLeft', 'west');
    held.press('touch:down', 'south');
    held.clear();
    expect(held.current()).toBeNull();
    expect(held.entries()).toEqual([]);
  });

  it('pressing the same source again moves it to the top', () => {
    const held = createHeldInput();
    held.press('key:ArrowLeft', 'west');
    held.press('key:ArrowUp', 'north');
    held.press('key:ArrowLeft', 'west');
    expect(held.current()).toBe('west');
    expect(held.entries()).toHaveLength(2);
  });

  it('releasePrefix drops only the matching sources', () => {
    const held = createHeldInput();
    held.press('key:ArrowLeft', 'west');
    held.press('touch:up', 'north');
    held.press('key:ArrowDown', 'south');
    held.releasePrefix('key:');
    expect(held.entries()).toEqual([{ source: 'touch:up', direction: 'north' }]);
    expect(held.current()).toBe('north');
  });

  it('releasing a source that is not held does nothing', () => {
    const held = createHeldInput();
    held.press('key:ArrowLeft', 'west');
    held.release('key:ArrowRight');
    expect(held.current()).toBe('west');
  });
});
