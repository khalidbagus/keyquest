/**
 * World physics examples: sweep collision, exit solidity, camera, zones.
 * Requirements: 7.1, 7.3, 7.5, 7.6, 7.7, 8.5, 8.10
 */
import { describe, expect, it } from 'vitest';
import { COURTYARD, COURTYARD_BOUNDS, GHOST_SPEED } from '../../src/registry/clocktowerRoute';
import { INITIAL_CLOCKTOWER_STATE } from '../../src/engines/clocktowerRules';
import {
  bodyRect,
  cameraScroll,
  landmarksInView,
  moveBody,
  nearbyInteractable,
  rectsOverlap,
  solidEntries,
  solidsFor,
  stepDistance,
  touchingRects,
} from '../../src/engines/worldPhysics';
import type { Rect } from '../../src/types/clocktower';

const BIG: Rect = { x: 0, y: 0, w: 1000, h: 1000 };

describe('moveBody', () => {
  it('moves at the Route_Data speed on a clear path', () => {
    const result = moveBody({ x: 100, y: 100 }, 'east', 50, [], BIG);
    expect(result.anchor.x).toBeCloseTo(100 + (GHOST_SPEED * 50) / 1000, 9);
    expect(result.anchor.y).toBe(100);
    expect(result.blocked).toBe(false);
  });

  it('does not move without a direction', () => {
    const result = moveBody({ x: 100, y: 100 }, null, 50, [], BIG);
    expect(result).toEqual({ anchor: { x: 100, y: 100 }, blocked: false, contacts: [] });
  });

  it('stops flush against a wall thinner than one step (no tunneling)', () => {
    // A 4 px wall; one 50 ms step is 9.6 px. Body right edge starts 5 px short.
    const wall: Rect = { x: 100, y: 0, w: 4, h: 400 };
    const result = moveBody({ x: 75, y: 200 }, 'east', 50, [wall], BIG);
    expect(result.anchor.x).toBe(80);
    expect(result.blocked).toBe(true);
    expect(result.contacts).toEqual([0]);
    expect(rectsOverlap(bodyRect(result.anchor), wall)).toBe(false);
  });

  it('stops flush in every direction', () => {
    const wall = (x: number, y: number): Rect => ({ x, y, w: 4, h: 4 });
    const start = { x: 500, y: 500 };
    expect(moveBody(start, 'west', 50, [wall(470, 480)], BIG).anchor.x).toBe(474 + 20);
    expect(moveBody(start, 'north', 50, [wall(480, 470)], BIG).anchor.y).toBe(474 + 24);
    expect(moveBody(start, 'south', 50, [wall(480, 503)], BIG).anchor.y).toBe(503);
    expect(moveBody(start, 'east', 50, [wall(523, 490)], BIG).anchor.x).toBe(503);
  });

  it('moves 0 px into a wall it already touches and reports the contact', () => {
    const wall: Rect = { x: 100, y: 0, w: 40, h: 400 };
    const flush = { x: 80, y: 200 };
    const result = moveBody(flush, 'east', 50, [wall], BIG);
    expect(result.anchor).toEqual(flush);
    expect(result.blocked).toBe(true);
    expect(result.contacts).toEqual([0]);
  });

  it('slides along a wall on the other axis', () => {
    const wall: Rect = { x: 100, y: 0, w: 40, h: 400 };
    const result = moveBody({ x: 80, y: 200 }, 'south', 50, [wall], BIG);
    expect(result.anchor.y).toBeCloseTo(209.6, 9);
    expect(result.blocked).toBe(false);
  });

  it('stays inside the bounds', () => {
    const atEdge = moveBody({ x: 22, y: 300 }, 'west', 50, [], BIG);
    expect(atEdge.anchor.x).toBe(20);
    expect(atEdge.blocked).toBe(true);
    const top = moveBody({ x: 300, y: 25 }, 'north', 50, [], BIG);
    expect(top.anchor.y).toBe(24);
    const bottom = moveBody({ x: 300, y: 998 }, 'south', 50, [], BIG);
    expect(bottom.anchor.y).toBe(1000);
    const right = moveBody({ x: 978, y: 300 }, 'east', 50, [], BIG);
    expect(right.anchor.x).toBe(980);
  });

  it('clamps a long frame to 50 ms', () => {
    expect(stepDistance(5000)).toBe(stepDistance(50));
    expect(stepDistance(-10)).toBe(0);
    expect(stepDistance(Number.NaN)).toBe(0);
  });
});

describe('touchingRects', () => {
  it('lists only shapes flush with the facing edge', () => {
    const rects: Rect[] = [
      { x: 100, y: 0, w: 10, h: 400 },
      { x: 130, y: 0, w: 10, h: 400 },
    ];
    expect(touchingRects({ x: 80, y: 200 }, 'east', rects)).toEqual([0]);
    expect(touchingRects({ x: 80, y: 200 }, 'west', rects)).toEqual([]);
  });
});

describe('courtyard exit solidity', () => {
  const exit = COURTYARD.exits[0]!;
  const gapAnchor = { x: exit.zone.x - 40, y: exit.zone.y + 60 };

  it('blocks the Ghost at the exit boundary while the lantern is unlit', () => {
    const solids = solidsFor(COURTYARD, INITIAL_CLOCKTOWER_STATE);
    const result = moveBody({ x: 885, y: gapAnchor.y }, 'east', 50, solids, COURTYARD_BOUNDS);
    expect(result.anchor.x).toBe(exit.zone.x - 20);
    expect(result.blocked).toBe(true);
    const entry = solidEntries(COURTYARD, INITIAL_CLOCKTOWER_STATE);
    expect(result.contacts.map((i) => entry[i]?.id)).toContain('courtyard-east');
  });

  it('lets the Ghost pass into the exit zone once the lantern is lit', () => {
    const solids = solidsFor(COURTYARD, { ...INITIAL_CLOCKTOWER_STATE, lanternLit: true });
    const result = moveBody({ x: 892, y: gapAnchor.y }, 'east', 50, solids, COURTYARD_BOUNDS);
    expect(result.anchor.x).toBeGreaterThan(892);
    expect(rectsOverlap(bodyRect(result.anchor), exit.zone)).toBe(true);
  });

  it('includes the exit as a solid exactly when the lantern is unlit', () => {
    const unlit = solidEntries(COURTYARD, INITIAL_CLOCKTOWER_STATE).filter((e) => e.kind === 'exit');
    const lit = solidEntries(COURTYARD, { ...INITIAL_CLOCKTOWER_STATE, lanternLit: true }).filter(
      (e) => e.kind === 'exit'
    );
    expect(unlit).toHaveLength(1);
    expect(lit).toHaveLength(0);
  });
});

describe('nearbyInteractable', () => {
  const lantern = COURTYARD.interactables[0]!;

  it('names the lantern post when the body overlaps its zone', () => {
    expect(nearbyInteractable({ x: 744, y: 420 }, COURTYARD.interactables)).toBe('courtyard-lantern');
  });

  it('returns null when the body only touches the zone edge or is far away', () => {
    expect(nearbyInteractable({ x: 120, y: 420 }, COURTYARD.interactables)).toBeNull();
    // Body right edge flush with the zone's left edge: touching, not overlapping.
    expect(nearbyInteractable({ x: lantern.zone.x - 20, y: 420 }, COURTYARD.interactables)).toBeNull();
  });
});

describe('landmarksInView', () => {
  it('lists Landmarks whose image intersects the view, in Route_Data order', () => {
    expect(landmarksInView(COURTYARD, { x: 0, y: 0, w: 960, h: 672 })).toEqual(['yew-tree', 'stone-well']);
    expect(landmarksInView(COURTYARD, { x: 400, y: 200, w: 200, h: 200 })).toEqual(['stone-well']);
  });

  it('returns an empty list when none is in view', () => {
    expect(landmarksInView(COURTYARD, { x: 560, y: 480, w: 200, h: 150 })).toEqual([]);
  });
});

describe('cameraScroll', () => {
  const viewport = { w: 400, h: 300 };

  it('centers on the Ghost, 53 px above the anchor, in the middle of the map', () => {
    const scroll = cameraScroll({ x: 480, y: 353 }, viewport, COURTYARD_BOUNDS, null, false);
    expect(scroll).toEqual({ x: 280, y: 150 });
  });

  it('clamps at each courtyard edge', () => {
    const topLeft = cameraScroll({ x: 100, y: 100 }, viewport, COURTYARD_BOUNDS, null, false);
    expect(topLeft).toEqual({ x: 0, y: 0 });
    const bottomRight = cameraScroll({ x: 900, y: 650 }, viewport, COURTYARD_BOUNDS, null, false);
    expect(bottomRight).toEqual({ x: 560, y: 372 });
  });

  it('centers the map and leaves space around it when the viewport is larger', () => {
    const scroll = cameraScroll({ x: 480, y: 336 }, { w: 1200, h: 800 }, COURTYARD_BOUNDS, null, false);
    expect(scroll).toEqual({ x: -120, y: -64 });
  });

  it('returns the exact target at once with reduced motion', () => {
    const previous = { x: 0, y: 0 };
    const reduced = cameraScroll({ x: 480, y: 353 }, viewport, COURTYARD_BOUNDS, previous, true);
    const exact = cameraScroll({ x: 480, y: 353 }, viewport, COURTYARD_BOUNDS, null, false);
    expect(reduced).toEqual(exact);
  });

  it('eases toward the target and keeps the Ghost in view when motion is allowed', () => {
    const previous = { x: 0, y: 0 };
    const anchor = { x: 480, y: 353 };
    const eased = cameraScroll(anchor, viewport, COURTYARD_BOUNDS, previous, false, 16.7);
    expect(eased.x).toBeGreaterThan(0);
    expect(eased.x).toBeLessThan(280);
    expect(anchor.x).toBeGreaterThanOrEqual(eased.x);
    expect(anchor.x).toBeLessThanOrEqual(eased.x + viewport.w);
    expect(anchor.y).toBeGreaterThanOrEqual(eased.y);
    expect(anchor.y).toBeLessThanOrEqual(eased.y + viewport.h);
  });

  it('never lets the easing lose the Ghost after a teleport-sized jump', () => {
    const anchor = { x: 900, y: 600 };
    const eased = cameraScroll(anchor, viewport, COURTYARD_BOUNDS, { x: 0, y: 0 }, false, 16.7);
    expect(anchor.x).toBeLessThanOrEqual(eased.x + viewport.w);
    expect(anchor.y).toBeLessThanOrEqual(eased.y + viewport.h);
  });
});
