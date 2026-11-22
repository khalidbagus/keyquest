/**
 * Route_Data integrity for all five Areas.
 * Requirements: 5.1, 5.2, 5.8, 13.1, 13.2, 14.1, 15.2, 15.4, 24.10
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ALL_AREA_IDS,
  ASSET_FILES,
  AREAS,
  BELL_SEQUENCE,
  COURTYARD,
  COURTYARD_BOUNDS,
  COURTYARD_SPAWN,
  GATE_ART,
  GHOST_BODY,
  GHOST_SPEED,
  GRAVEYARD,
  PASSAGE,
  SHORTCUTS,
} from '../../src/registry/clocktowerRoute';
import { INITIAL_CLOCKTOWER_STATE } from '../../src/engines/clocktowerRules';
import {
  areaBounds,
  bodyRect,
  rectInside,
  rectsOverlap,
  solidsFor,
} from '../../src/engines/worldPhysics';
import type { AreaDefinition, ClocktowerState, Rect, Vec2 } from '../../src/types/clocktower';

const LIT: ClocktowerState = { ...INITIAL_CLOCKTOWER_STATE, lanternLit: true };
const OPEN: ClocktowerState = {
  ...INITIAL_CLOCKTOWER_STATE,
  lanternLit: true,
  cluesFound: ['moon', 'thorn', 'key'],
  gateOpen: true,
  shortcutUnlocked: true,
};

/** Every anchor reachable from `start` on a 4 px grid, given the Area's solids for `state`. */
function reachable(area: AreaDefinition, state: ClocktowerState, start: Vec2): Vec2[] {
  const bounds = areaBounds(area);
  const solids: Rect[] = solidsFor(area, state);
  const step = 4;
  const key = (p: Vec2) => `${p.x},${p.y}`;
  const valid = (p: Vec2) => {
    const body = bodyRect(p);
    return rectInside(body, bounds) && !solids.some((s) => rectsOverlap(body, s));
  };
  const seen = new Set<string>([key(start)]);
  const queue: Vec2[] = [start];
  const all: Vec2[] = [];
  while (queue.length > 0) {
    const at = queue.pop()!;
    all.push(at);
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]] as const) {
      const next = { x: at.x + dx, y: at.y + dy };
      if (seen.has(key(next)) || !valid(next)) continue;
      seen.add(key(next));
      queue.push(next);
    }
  }
  return all;
}

function touches(points: readonly Vec2[], zone: Rect): boolean {
  return points.some((p) => rectsOverlap(bodyRect(p), zone));
}

describe('the route', () => {
  it('defines exactly five Areas in route order', () => {
    expect([...ALL_AREA_IDS]).toEqual(['apothecary-exit', 'courtyard', 'graveyard', 'passage', 'belfry']);
    expect(Object.keys(AREAS).sort()).toEqual([...ALL_AREA_IDS].sort());
    expect(ALL_AREA_IDS.map((id) => AREAS[id].name)).toEqual([
      'Apothecary Exit',
      'Moonlit Courtyard',
      'Overgrown Graveyard',
      'Clockworks Passage',
      'Belfry',
    ]);
  });

  it('uses the floor sizes from the design', () => {
    const sizes = ALL_AREA_IDS.map((id) => [AREAS[id].floor.cols, AREAS[id].floor.rows]);
    expect(sizes).toEqual([[14, 10], [20, 14], [24, 14], [20, 12], [24, 16]]);
  });

  it('connects each adjacent pair with one exit each way, and nothing else', () => {
    for (const id of ALL_AREA_IDS) {
      const index = ALL_AREA_IDS.indexOf(id);
      const neighbours = [ALL_AREA_IDS[index - 1], ALL_AREA_IDS[index + 1]].filter(Boolean);
      const targets = AREAS[id].exits.map((exit) => exit.to);
      expect(targets.sort(), id).toEqual([...neighbours].sort());
    }
  });

  it.each(ALL_AREA_IDS)('%s: exits lead to spawns that exist in the target Area', (id) => {
    for (const exit of AREAS[id].exits) {
      expect(AREAS[exit.to].spawns[exit.spawnInTarget], `${exit.id} -> ${exit.spawnInTarget}`).toBeDefined();
    }
    expect(AREAS[id].spawns[AREAS[id].entrySpawn]).toBeDefined();
  });

  it.each(ALL_AREA_IDS)('%s: zones are non-zero and spawns sit inside the bounds, clear of solids and exits', (id) => {
    const area = AREAS[id];
    const bounds = areaBounds(area);
    for (const zone of [...area.interactables.map((i) => i.zone), ...area.exits.map((e) => e.zone)]) {
      expect(zone.w).toBeGreaterThan(0);
      expect(zone.h).toBeGreaterThan(0);
      expect(rectInside(zone, bounds)).toBe(true);
    }
    for (const [name, spawn] of Object.entries(area.spawns)) {
      const body = bodyRect(spawn);
      expect(rectInside(body, bounds), name).toBe(true);
      for (const solid of solidsFor(area, INITIAL_CLOCKTOWER_STATE)) {
        expect(rectsOverlap(body, solid), `${name} overlaps a solid`).toBe(false);
      }
      // Arriving inside an exit would send the Ghost straight back.
      for (const exit of area.exits) {
        expect(rectsOverlap(body, exit.zone), `${name} overlaps ${exit.id}`).toBe(false);
      }
    }
  });

  it.each(ALL_AREA_IDS)('%s: every spawn reaches every exit and Interactable once the route is open', (id) => {
    const area = AREAS[id];
    for (const [name, spawn] of Object.entries(area.spawns)) {
      const points = reachable(area, OPEN, spawn);
      for (const exit of area.exits) expect(touches(points, exit.zone), `${name} -> ${exit.id}`).toBe(true);
      for (const item of area.interactables) expect(touches(points, item.zone), `${name} -> ${item.id}`).toBe(true);
    }
  });

  it.each(ALL_AREA_IDS)('%s: every texture it draws is in its asset list and the manifest', (id) => {
    const area = AREAS[id];
    const drawn = new Set<string>([
      area.floor.tileKey,
      ...area.decor.map((p) => p.key),
      ...area.landmarks.map((l) => l.image.key),
      ...area.interactables.map((i) => i.image.key),
      ...area.interactables.flatMap((i) => (i.doneImageKey ? [i.doneImageKey] : [])),
      ...(area.backdrop ? [area.backdrop.key] : []),
    ]);
    for (const key of drawn) expect(area.assets, key).toContain(key);
    for (const key of area.assets) expect(Object.keys(ASSET_FILES), key).toContain(key);
  });

  it('maps every manifest key to a file under public/adventure', () => {
    for (const [key, file] of Object.entries(ASSET_FILES)) {
      expect(existsSync(resolve('public/adventure', file)), `${key} -> ${file}`).toBe(true);
    }
  });

  it('lists the ring order Moon, Key, Thorn', () => {
    expect([...BELL_SEQUENCE]).toEqual(['moon', 'key', 'thorn']);
  });
});

describe('courtyard Route_Data', () => {
  it('is 20 x 14 whole tiles', () => {
    expect(areaBounds(COURTYARD)).toEqual(COURTYARD_BOUNDS);
    expect(COURTYARD_BOUNDS).toEqual({ x: 0, y: 0, w: 960, h: 672 });
  });

  it('keeps the Ghost body at 40 x 24 with a 192 px/s speed', () => {
    expect(GHOST_BODY).toMatchObject({ w: 40, h: 24, offsetX: -20, offsetY: -24 });
    expect(GHOST_SPEED).toBe(192);
  });

  it('has at least two Landmarks with unique names and positions', () => {
    const names = COURTYARD.landmarks.map((landmark) => landmark.name);
    expect(names.length).toBeGreaterThanOrEqual(2);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(COURTYARD.landmarks.map((l) => l.id)).size).toBe(names.length);
  });

  it('has the lantern post, the east exit behind the lantern, and the west exit back', () => {
    expect(COURTYARD.interactables.map((i) => i.id)).toEqual(['courtyard-lantern']);
    expect(COURTYARD.exits.map((e) => [e.id, e.to, e.gate])).toEqual([
      ['courtyard-east', 'graveyard', 'lantern'],
      ['courtyard-west', 'apothecary-exit', 'always-open'],
    ]);
  });

  it('cannot reach the east exit zone while the lantern is unlit, but can once lit', () => {
    const spawn = COURTYARD.spawns[COURTYARD_SPAWN]!;
    const east = COURTYARD.exits[0]!.zone;
    expect(touches(reachable(COURTYARD, INITIAL_CLOCKTOWER_STATE, spawn), east)).toBe(false);
    expect(touches(reachable(COURTYARD, LIT, spawn), east)).toBe(true);
  });
});

describe('graveyard, passage, and shortcut Route_Data', () => {
  it('places exactly three Clue plaques, Moon, Thorn, and Key, drawn with their own art', () => {
    expect(GRAVEYARD.interactables.map((i) => [i.id, i.image.key])).toEqual([
      ['clue-moon', 'clue-moon'],
      ['clue-thorn', 'clue-thorn'],
      ['clue-key', 'clue-key'],
    ]);
  });

  it('keeps the graveyard east exit closed until all three Clues are found', () => {
    const east = GRAVEYARD.exits.find((e) => e.to === 'passage')!;
    expect(east.gate).toBe('clues');
    const spawn = GRAVEYARD.spawns['graveyard-west']!;
    const twoClues = { ...LIT, cluesFound: ['moon', 'thorn'] } as ClocktowerState;
    expect(touches(reachable(GRAVEYARD, twoClues, spawn), east.zone)).toBe(false);
    expect(touches(reachable(GRAVEYARD, { ...twoClues, cluesFound: ['moon', 'thorn', 'key'] }, spawn), east.zone)).toBe(true);
  });

  it('draws both gate textures at the shared (256, 296) anchor of the art', () => {
    const gate = PASSAGE.interactables.find((i) => i.id === 'passage-gate')!;
    expect(gate.image.key).toBe('gate-closed');
    expect(gate.doneImageKey).toBe('gate-open');
    expect(gate.image.origin).toEqual({ x: GATE_ART.anchorX / GATE_ART.w, y: GATE_ART.anchorY / GATE_ART.h });
    expect(GATE_ART).toMatchObject({ w: 512, h: 320, anchorX: 256, anchorY: 296 });
  });

  it('keeps the Belfry side of the gate unreachable from the west until the gate opens', () => {
    const west = PASSAGE.spawns['passage-west']!;
    const belfrySide = PASSAGE.spawns['passage-belfry-side']!;
    const north = PASSAGE.exits.find((e) => e.to === 'belfry')!;
    const closed = { ...OPEN, gateOpen: false, shortcutUnlocked: false };
    const fromWest = reachable(PASSAGE, closed, west);
    expect(fromWest.some((p) => p.x === belfrySide.x && p.y === belfrySide.y)).toBe(false);
    expect(touches(fromWest, north.zone)).toBe(false);
    expect(touches(reachable(PASSAGE, OPEN, west), north.zone)).toBe(true);
  });

  it('defines the two shortcut targets at the courtyard spawn and the Belfry side of the gate', () => {
    expect(SHORTCUTS.map((s) => [s.area, s.spawn])).toEqual([
      ['courtyard', 'courtyard-west'],
      ['passage', 'passage-belfry-side'],
    ]);
  });
});
