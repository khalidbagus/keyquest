/**
 * World physics: collision, camera, and zone checks as pure functions.
 * No React, DOM, or Phaser. The motion setting is never an input to `moveBody`;
 * it only changes how `cameraScroll` places the camera (Requirement 12.1).
 */

import {
  GHOST_BODY,
  GHOST_CAMERA_OFFSET_Y,
  GHOST_SPEED,
} from '../registry/clocktowerRoute';
import type {
  AreaDefinition,
  ClocktowerState,
  Direction,
  ExitDefinition,
  ImagePlacement,
  InteractableId,
  LandmarkId,
  Rect,
  Vec2,
} from '../types/clocktower';

const EPSILON = 1e-9;
const MAX_STEP_MS = 50;
/** Camera ease factor per 16.7 ms frame when reduced motion is off. */
const CAMERA_EASE = 0.2;
const CAMERA_FRAME_MS = 16.7;
/** Margin kept around the Ghost's anchor when the map and viewport allow it. */
const CAMERA_MARGIN = 8;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The Collision_Body rectangle for a Ghost anchor. */
export function bodyRect(anchor: Vec2): Rect {
  return {
    x: anchor.x + GHOST_BODY.offsetX,
    y: anchor.y + GHOST_BODY.offsetY,
    w: GHOST_BODY.w,
    h: GHOST_BODY.h,
  };
}

/** True when the rectangles share area. Shapes that only touch do not overlap. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function rectInside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x - EPSILON &&
    inner.y >= outer.y - EPSILON &&
    inner.x + inner.w <= outer.x + outer.w + EPSILON &&
    inner.y + inner.h <= outer.y + outer.h + EPSILON
  );
}

export function rectCenter(rect: Rect): Vec2 {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

export function stepDistance(deltaMs: number): number {
  const clamped = clamp(Number.isFinite(deltaMs) ? deltaMs : 0, 0, MAX_STEP_MS);
  return (GHOST_SPEED * clamped) / 1000;
}

function perpendicularOverlap(body: Rect, solid: Rect, horizontalMove: boolean): boolean {
  return horizontalMove
    ? body.y < solid.y + solid.h && body.y + body.h > solid.y
    : body.x < solid.x + solid.w && body.x + body.w > solid.x;
}

/**
 * Indexes of `rects` that the body touches on the side it faces `direction`:
 * the facing edge is flush with the shape and the shapes overlap along the
 * other axis.
 */
export function touchingRects(
  anchor: Vec2,
  direction: Direction,
  rects: readonly Rect[]
): number[] {
  const body = bodyRect(anchor);
  const horizontal = direction === 'east' || direction === 'west';
  const found: number[] = [];
  rects.forEach((rect, index) => {
    if (!perpendicularOverlap(body, rect, horizontal)) return;
    let gap: number;
    switch (direction) {
      case 'east':
        gap = rect.x - (body.x + body.w);
        break;
      case 'west':
        gap = body.x - (rect.x + rect.w);
        break;
      case 'south':
        gap = rect.y - (body.y + body.h);
        break;
      default:
        gap = body.y - (rect.y + rect.h);
        break;
    }
    if (Math.abs(gap) <= EPSILON) found.push(index);
  });
  return found;
}

export interface MoveResult {
  anchor: Vec2;
  /** True when a solid or the bounds shortened the step. */
  blocked: boolean;
  /** Indexes of solids the body touches in the movement direction after the step. */
  contacts: readonly number[];
}

/**
 * Move the Ghost along one axis with an axis-aligned sweep. The step is clamped
 * to the nearest blocking edge ahead, so a long frame cannot skip a thin wall.
 */
export function moveBody(
  anchor: Vec2,
  direction: Direction | null,
  deltaMs: number,
  solids: readonly Rect[],
  bounds: Rect
): MoveResult {
  if (direction === null) return { anchor, blocked: false, contacts: [] };

  const distance = stepDistance(deltaMs);
  const body = bodyRect(anchor);
  const horizontal = direction === 'east' || direction === 'west';
  const forward = direction === 'east' || direction === 'south';

  // The anchor coordinate that the body may reach, as the tightest limit.
  let limit: number;
  if (horizontal) {
    limit = forward
      ? bounds.x + bounds.w - (GHOST_BODY.w + GHOST_BODY.offsetX)
      : bounds.x - GHOST_BODY.offsetX;
  } else {
    limit = forward
      ? bounds.y + bounds.h - (GHOST_BODY.h + GHOST_BODY.offsetY)
      : bounds.y - GHOST_BODY.offsetY;
  }

  for (const solid of solids) {
    if (!perpendicularOverlap(body, solid, horizontal)) continue;
    switch (direction) {
      case 'east':
        // Only solids whose near edge is at or ahead of the body's front edge.
        if (solid.x >= body.x + body.w - EPSILON) {
          limit = Math.min(limit, solid.x - (GHOST_BODY.w + GHOST_BODY.offsetX));
        }
        break;
      case 'west':
        if (solid.x + solid.w <= body.x + EPSILON) {
          limit = Math.max(limit, solid.x + solid.w - GHOST_BODY.offsetX);
        }
        break;
      case 'south':
        if (solid.y >= body.y + body.h - EPSILON) {
          limit = Math.min(limit, solid.y - (GHOST_BODY.h + GHOST_BODY.offsetY));
        }
        break;
      default:
        if (solid.y + solid.h <= body.y + EPSILON) {
          limit = Math.max(limit, solid.y + solid.h - GHOST_BODY.offsetY);
        }
        break;
    }
  }

  const current = horizontal ? anchor.x : anchor.y;
  const wanted = forward ? current + distance : current - distance;
  // Never move backward when a limit is behind the body (an invalid start).
  const reached = forward ? Math.min(wanted, Math.max(limit, current)) : Math.max(wanted, Math.min(limit, current));
  const blocked = distance > 0 && reached !== wanted;

  const next: Vec2 = horizontal ? { x: reached, y: anchor.y } : { x: anchor.x, y: reached };
  return { anchor: next, blocked, contacts: touchingRects(next, direction, solids) };
}

// ---------------------------------------------------------------------------
// Route data helpers
// ---------------------------------------------------------------------------

export function imageRect(placement: ImagePlacement): Rect {
  return {
    x: placement.anchor.x - placement.origin.x * placement.size.w,
    y: placement.anchor.y - placement.origin.y * placement.size.h,
    w: placement.size.w,
    h: placement.size.h,
  };
}

export function areaBounds(area: AreaDefinition): Rect {
  return { x: 0, y: 0, w: area.floor.cols * 48, h: area.floor.rows * 48 };
}

export function isExitOpen(exit: ExitDefinition, state: ClocktowerState): boolean {
  switch (exit.gate) {
    case 'always-open':
      return true;
    case 'lantern':
      return state.lanternLit;
    case 'clues':
      return state.cluesFound.length >= 3;
    case 'gate':
      return state.gateOpen;
    default:
      return false;
  }
}

export interface SolidEntry {
  rect: Rect;
  kind: 'wall' | 'landmark' | 'interactable' | 'exit';
  /** Landmark, Interactable, or exit id; undefined for walls. */
  id?: string;
}

/** Every shape that blocks the Ghost, in a stable order, with its owner. */
export function solidEntries(area: AreaDefinition, state: ClocktowerState): SolidEntry[] {
  const entries: SolidEntry[] = area.solids.map((rect) => ({ rect, kind: 'wall' as const }));
  for (const landmark of area.landmarks) {
    if (landmark.solid) entries.push({ rect: landmark.solid, kind: 'landmark', id: landmark.id });
  }
  for (const item of area.interactables) {
    // The open gate has no collision, so the Ghost walks through (Requirement 15.2).
    if (item.id === 'passage-gate' && state.gateOpen) continue;
    if (item.solid) entries.push({ rect: item.solid, kind: 'interactable', id: item.id });
  }
  for (const exit of area.exits) {
    if (!isExitOpen(exit, state)) entries.push({ rect: exit.zone, kind: 'exit', id: exit.id });
  }
  return entries;
}

/** The collision shapes for an Area given Clocktower_State: closed exits are solid. */
export function solidsFor(area: AreaDefinition, state: ClocktowerState): Rect[] {
  return solidEntries(area, state).map((entry) => entry.rect);
}

/**
 * The Interactable whose zone the body overlaps. With several overlaps, the one
 * whose zone center is closest to the body center wins; ties go to Route_Data order.
 */
export function nearbyInteractable(
  anchor: Vec2,
  interactables: readonly { id: InteractableId; zone: Rect }[]
): InteractableId | null {
  const body = bodyRect(anchor);
  const bodyCenter = rectCenter(body);
  let best: InteractableId | null = null;
  let bestDistance = Infinity;
  for (const item of interactables) {
    if (!rectsOverlap(body, item.zone)) continue;
    const center = rectCenter(item.zone);
    const distance = Math.hypot(center.x - bodyCenter.x, center.y - bodyCenter.y);
    if (distance < bestDistance) {
      best = item.id;
      bestDistance = distance;
    }
  }
  return best;
}

/** Landmarks whose drawn image intersects the camera view, in Route_Data order. */
export function landmarksInView(area: AreaDefinition, view: Rect): LandmarkId[] {
  return area.landmarks
    .filter((landmark) => rectsOverlap(imageRect(landmark.image), view))
    .map((landmark) => landmark.id);
}

/** True when the body overlaps an exit's zone. */
export function bodyInZone(anchor: Vec2, zone: Rect): boolean {
  return rectsOverlap(bodyRect(anchor), zone);
}

export function spawnPoint(area: AreaDefinition, spawn: string): Vec2 | null {
  return area.spawns[spawn] ?? null;
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

function clampAxis(scroll: number, viewport: number, start: number, length: number): number {
  if (viewport >= length) return start + (length - viewport) / 2;
  return clamp(scroll, start, start + length - viewport);
}

/** The exact camera top-left that centers the Ghost, clamped to the map bounds. */
export function cameraTarget(
  anchor: Vec2,
  viewport: { w: number; h: number },
  bounds: Rect
): Vec2 {
  const centerX = anchor.x;
  const centerY = anchor.y + GHOST_CAMERA_OFFSET_Y;
  return {
    x: clampAxis(centerX - viewport.w / 2, viewport.w, bounds.x, bounds.w),
    y: clampAxis(centerY - viewport.h / 2, viewport.h, bounds.y, bounds.h),
  };
}

/**
 * The camera's top-left corner. With no previous scroll or with reduced motion on,
 * the result is the exact target. Otherwise it eases toward the target, keeps the
 * Ghost's anchor in view, and stays inside the map bounds (bounds win at an edge).
 */
export function cameraScroll(
  anchor: Vec2,
  viewport: { w: number; h: number },
  bounds: Rect,
  previous: Vec2 | null,
  reducedMotion: boolean,
  deltaMs = CAMERA_FRAME_MS
): Vec2 {
  const target = cameraTarget(anchor, viewport, bounds);
  if (previous === null || reducedMotion) return target;

  const factor = 1 - Math.pow(1 - CAMERA_EASE, clamp(deltaMs, 0, 100) / CAMERA_FRAME_MS);
  const eased = {
    x: previous.x + (target.x - previous.x) * factor,
    y: previous.y + (target.y - previous.y) * factor,
  };

  const keepVisible = (scroll: number, anchorValue: number, size: number): number => {
    if (size <= CAMERA_MARGIN * 2) return scroll;
    return clamp(scroll, anchorValue - (size - CAMERA_MARGIN), anchorValue - CAMERA_MARGIN);
  };
  return {
    x: clampAxis(keepVisible(eased.x, anchor.x, viewport.w), viewport.w, bounds.x, bounds.w),
    y: clampAxis(keepVisible(eased.y, anchor.y, viewport.h), viewport.h, bounds.y, bounds.h),
  };
}

/** The visible world rectangle for a scroll position. */
export function viewRect(scroll: Vec2, viewport: { w: number; h: number }): Rect {
  return { x: scroll.x, y: scroll.y, w: viewport.w, h: viewport.h };
}
