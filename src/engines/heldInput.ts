/**
 * Held-direction input as a pure stack.
 * Keyboard keys and touch buttons share one stack, so the most recent press
 * that is still held decides the direction. There are no diagonals.
 */

import type { Direction } from '../types/clocktower';

export interface HeldEntry {
  source: string;
  direction: Direction;
}

export interface HeldInput {
  /** Press a source. Pressing a source that is already held moves it to the top. */
  press(source: string, direction: Direction): void;
  release(source: string): void;
  /** Release every source whose name starts with `prefix`. */
  releasePrefix(prefix: string): void;
  clear(): void;
  /** The direction of the most recent still-held source, or null. */
  current(): Direction | null;
  /** The held entries, oldest first. */
  entries(): readonly HeldEntry[];
}

export function createHeldInput(): HeldInput {
  let stack: HeldEntry[] = [];
  return {
    press(source, direction) {
      stack = stack.filter((entry) => entry.source !== source);
      stack.push({ source, direction });
    },
    release(source) {
      stack = stack.filter((entry) => entry.source !== source);
    },
    releasePrefix(prefix) {
      stack = stack.filter((entry) => !entry.source.startsWith(prefix));
    },
    clear() {
      stack = [];
    },
    current() {
      return stack.length === 0 ? null : stack[stack.length - 1]!.direction;
    },
    entries() {
      return stack.slice();
    },
  };
}
