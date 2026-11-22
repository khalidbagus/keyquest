/**
 * Clocktower Gate Route_Data.
 * Static map data, ids, and the asset manifest. Pure: no React, DOM, or Phaser.
 * Five Areas in route order: Apothecary Exit, Moonlit Courtyard, Overgrown
 * Graveyard, Clockworks Passage, and Belfry (Requirement 13.1).
 */

import type {
  AreaDefinition,
  AreaId,
  BellId,
  ClueId,
  Direction,
  ImagePlacement,
  Rect,
  SpawnId,
  Vec2,
} from '../types/clocktower';

export const TILE_SIZE = 48;

/** Collision_Body: 40 x 24 box with its bottom-center at the sprite anchor. */
export const GHOST_BODY = { w: 40, h: 24, offsetX: -20, offsetY: -24 } as const;
/** Pixels per second: four tiles. */
export const GHOST_SPEED = 192;
/** Sprite pixel that sits on the Ghost's world position (128 x 128 frames). */
export const GHOST_FRAME = { w: 128, h: 128, anchorX: 64, anchorY: 117 } as const;
/** The camera centers on the middle of the 128 px frame, 53 px above the anchor. */
export const GHOST_CAMERA_OFFSET_Y = -53;

/** Route order. Checkpoints and travel buttons follow it. */
export const ALL_AREA_IDS: readonly AreaId[] = [
  'apothecary-exit',
  'courtyard',
  'graveyard',
  'passage',
  'belfry',
];

export const CLUE_IDS: readonly ClueId[] = ['moon', 'thorn', 'key'];
export const BELL_IDS: readonly BellId[] = ['moon', 'thorn', 'key'];
/** Ring order: Moon, Key, Thorn. The single source for the Journal, rules, and copy. */
export const BELL_SEQUENCE: readonly BellId[] = ['moon', 'key', 'thorn'];

export interface ClueDefinition {
  id: ClueId;
  /** The Clue's name in the Journal and Room_Status. */
  label: string;
  /** The plaque's Interactable name. */
  name: string;
  text: string;
}

export const CLUES: readonly ClueDefinition[] = [
  { id: 'moon', label: 'Moon', name: 'Moon plaque', text: 'The Moon bell wakes the tower first.' },
  {
    id: 'thorn',
    label: 'Thorn',
    name: 'Thorn plaque',
    text: 'The Thorn bell rings last, when the others are done.',
  },
  { id: 'key', label: 'Key', name: 'Key plaque', text: 'The Key bell answers the Moon.' },
];

export function getClue(id: ClueId): ClueDefinition {
  return CLUES.find((clue) => clue.id === id) ?? CLUES[0]!;
}

export interface BellDefinition {
  id: BellId;
  label: string;
}

export const BELLS: readonly BellDefinition[] = [
  { id: 'moon', label: 'Moon bell' },
  { id: 'thorn', label: 'Thorn bell' },
  { id: 'key', label: 'Key bell' },
];

/**
 * Texture key to file path under `public/adventure/`. Every key used by an
 * Area's `assets` list must be listed here.
 */
export const ASSET_FILES: Readonly<Record<string, string>> = {
  'tile-courtyard-cobbles': 'tiles/courtyard-cobbles.png',
  'tile-graveyard-dirt': 'tiles/graveyard-dirt.png',
  'tile-clockworks-flagstones': 'tiles/clockworks-flagstones.png',
  'ghost-south': 'player/pumpkin-ghost-south.png',
  'ghost-north': 'player/pumpkin-ghost-north.png',
  'ghost-west': 'player/pumpkin-ghost-west.png',
  'ghost-east': 'player/pumpkin-ghost-east.png',
  'wall-horizontal': 'props/wall-horizontal.png',
  'wall-vertical': 'props/wall-vertical.png',
  'wall-corner': 'props/wall-corner.png',
  'wall-post': 'props/wall-post.png',
  'lantern-post': 'props/lantern-post.png',
  'stone-well': 'props/stone-well.png',
  'yew-tree': 'props/yew-tree.png',
  gravestone: 'props/gravestone.png',
  'clue-moon': 'props/clue-moon.png',
  'clue-thorn': 'props/clue-thorn.png',
  'clue-key': 'props/clue-key.png',
  'gate-closed': 'props/gate-closed.png',
  'gate-open': 'props/gate-open.png',
  'bell-chamber': 'clocktower/bell-chamber.png',
  'crescent-bell': 'clocktower/crescent-bell.png',
  'window-dark': 'clocktower/window-dark.png',
  'window-lit': 'clocktower/window-lit.png',
  'alchemists-lantern': 'clocktower/alchemists-lantern.png',
};

export const ASSET_BASE_PATH = '/adventure/';

export const GHOST_TEXTURE: Readonly<Record<Direction, string>> = {
  south: 'ghost-south',
  north: 'ghost-north',
  west: 'ghost-west',
  east: 'ghost-east',
};

const GHOST_ASSETS = ['ghost-south', 'ghost-north', 'ghost-west', 'ghost-east'] as const;
const WALL_ASSETS = ['wall-horizontal', 'wall-vertical', 'wall-corner', 'wall-post'] as const;

// ---------------------------------------------------------------------------
// Wall kit helpers
// ---------------------------------------------------------------------------

const WALL_RUN_H = { w: 218, h: 85 } as const;
const WALL_RUN_LOW = { w: 164, h: 64 } as const;
const VERTICAL_PIECE = { w: 48, h: 116 } as const;
const POST = { w: 48, h: 69 } as const;
const CORNER = { w: 101, h: 97 } as const;

function image(
  key: string,
  anchor: Vec2,
  size: { w: number; h: number },
  origin: Vec2 = { x: 0.5, y: 1 },
  flipX = false
): ImagePlacement {
  return flipX ? { key, anchor, size, origin, flipX } : { key, anchor, size, origin };
}

/** Evenly spaced horizontal wall pieces from x0 to x1, bottoms on `bottomY`. */
function horizontalSegment(
  x0: number,
  x1: number,
  bottomY: number,
  size: { w: number; h: number }
): ImagePlacement[] {
  const width = x1 - x0;
  if (width <= 0) return [];
  if (width <= size.w) return [image('wall-horizontal', { x: x0 + width / 2, y: bottomY }, { w: width, h: size.h })];
  const count = Math.ceil(width / size.w) + 1;
  const step = (width - size.w) / (count - 1);
  return Array.from({ length: count }, (_, i) =>
    image('wall-horizontal', { x: x0 + size.w / 2 + i * step, y: bottomY }, size)
  );
}

/** Evenly spaced horizontal wall pieces from x = 0 to x = width, bottoms on `bottomY`. */
function horizontalRun(width: number, bottomY: number, size: { w: number; h: number }): ImagePlacement[] {
  return horizontalSegment(0, width, bottomY, size);
}

/** Vertical pieces covering [y0, y1], bottoms stepping up from y1, with the last piece top-aligned. */
function verticalRun(x: number, y0: number, y1: number): ImagePlacement[] {
  const pieces: ImagePlacement[] = [];
  let bottom = y1;
  while (bottom - VERTICAL_PIECE.h > y0) {
    pieces.push(image('wall-vertical', { x, y: bottom }, VERTICAL_PIECE));
    bottom -= VERTICAL_PIECE.h;
  }
  pieces.push(image('wall-vertical', { x, y: y0 + VERTICAL_PIECE.h }, VERTICAL_PIECE));
  return pieces;
}

/** Posts on both sides of a gap in a vertical wall at column center `x`. */
function gapPosts(x: number, gapTop: number, gapBottom: number): ImagePlacement[] {
  return [image('wall-post', { x, y: gapTop }, POST), image('wall-post', { x, y: gapBottom + POST.h }, POST)];
}

function northCorners(width: number): ImagePlacement[] {
  return [
    image('wall-corner', { x: 0, y: 96 }, CORNER, { x: 0, y: 1 }),
    image('wall-corner', { x: width, y: 96 }, CORNER, { x: 1, y: 1 }, true),
  ];
}

/** A vertical wall column at x (0 or width - 48) with optional gaps, as solids. */
function wallColumn(x: number, height: number, gaps: readonly [number, number][]): Rect[] {
  const rects: Rect[] = [];
  let top = 0;
  for (const [g0, g1] of gaps) {
    if (g0 > top) rects.push({ x, y: top, w: 48, h: g0 - top });
    top = g1;
  }
  if (height > top) rects.push({ x, y: top, w: 48, h: height - top });
  return rects;
}

/** Decor for a vertical wall column with gaps: runs between gaps, posts beside each gap. */
function wallColumnDecor(x: number, height: number, gaps: readonly [number, number][]): ImagePlacement[] {
  const pieces: ImagePlacement[] = [];
  let top = 96;
  for (const [g0, g1] of gaps) {
    if (g0 > top) pieces.push(...verticalRun(x, top, g0));
    pieces.push(...gapPosts(x, g0, g1));
    top = g1;
  }
  pieces.push(...verticalRun(x, top, height - 48));
  return pieces;
}

function boundsOf(cols: number, rows: number): Rect {
  return { x: 0, y: 0, w: cols * TILE_SIZE, h: rows * TILE_SIZE };
}

// ---------------------------------------------------------------------------
// Apothecary Exit (14 x 10)
// ---------------------------------------------------------------------------

const APOTHECARY_W = 14 * TILE_SIZE; // 672
const APOTHECARY_H = 10 * TILE_SIZE; // 480
const APOTHECARY_EAST_GAP: [number, number] = [192, 288];

export const APOTHECARY_EXIT: AreaDefinition = {
  id: 'apothecary-exit',
  name: 'Apothecary Exit',
  floor: { tileKey: 'tile-clockworks-flagstones', cols: 14, rows: 10 },
  solids: [
    { x: 0, y: 0, w: APOTHECARY_W, h: 96 },
    { x: 0, y: APOTHECARY_H - 48, w: APOTHECARY_W, h: 48 },
    { x: 0, y: 0, w: 48, h: APOTHECARY_H },
    ...wallColumn(APOTHECARY_W - 48, APOTHECARY_H, [APOTHECARY_EAST_GAP]),
  ],
  decor: [
    ...horizontalRun(APOTHECARY_W, 96, WALL_RUN_H),
    ...horizontalRun(APOTHECARY_W, APOTHECARY_H, WALL_RUN_LOW),
    ...verticalRun(24, 96, APOTHECARY_H - 48),
    ...wallColumnDecor(APOTHECARY_W - 24, APOTHECARY_H, [APOTHECARY_EAST_GAP]),
    ...northCorners(APOTHECARY_W),
  ],
  landmarks: [
    {
      id: 'apothecary-lamp',
      name: 'Apothecary lamp',
      image: image('alchemists-lantern', { x: 168, y: 196 }, { w: 112, h: 112 }),
      solid: { x: 140, y: 172, w: 56, h: 24 },
    },
  ],
  interactables: [],
  spawns: {
    'apothecary-start': { x: 120, y: 264 },
    'apothecary-east-side': { x: 560, y: 264 },
  },
  entrySpawn: 'apothecary-start',
  exits: [
    {
      id: 'apothecary-east',
      to: 'courtyard',
      zone: { x: APOTHECARY_W - 48, y: 192, w: 48, h: 96 },
      spawnInTarget: 'courtyard-west',
      gate: 'always-open',
    },
  ],
  assets: ['tile-clockworks-flagstones', ...GHOST_ASSETS, ...WALL_ASSETS, 'alchemists-lantern'],
};

// ---------------------------------------------------------------------------
// Moonlit Courtyard (20 x 14)
// ---------------------------------------------------------------------------

const COURTYARD_COLS = 20;
const COURTYARD_ROWS = 14;
export const COURTYARD_BOUNDS: Rect = boundsOf(COURTYARD_COLS, COURTYARD_ROWS);

const NORTH_WALL: Rect = { x: 0, y: 0, w: 960, h: 96 };
const SOUTH_WALL: Rect = { x: 0, y: 624, w: 960, h: 48 };
const WEST_WALL_NORTH: Rect = { x: 0, y: 0, w: 48, h: 384 };
const WEST_WALL_SOUTH: Rect = { x: 0, y: 480, w: 48, h: 192 };
const EAST_WALL_NORTH: Rect = { x: 912, y: 0, w: 48, h: 288 };
const EAST_WALL_SOUTH: Rect = { x: 912, y: 384, w: 48, h: 288 };
const EAST_EXIT_ZONE: Rect = { x: 912, y: 288, w: 48, h: 96 };
const WEST_EXIT_ZONE: Rect = { x: 0, y: 384, w: 48, h: 96 };

const COURTYARD_DECOR: readonly ImagePlacement[] = [
  ...horizontalRun(960, 96, WALL_RUN_H),
  ...horizontalRun(960, 672, WALL_RUN_LOW),
  ...verticalRun(24, 96, 384),
  ...verticalRun(24, 480, 624),
  ...verticalRun(936, 96, 288),
  ...verticalRun(936, 384, 624),
  // Corners at both ends of the north wall, scaled to the wall's 96 px height.
  ...northCorners(960),
  // Posts on each side of the east and west gaps.
  ...gapPosts(936, 288, 384),
  ...gapPosts(24, 384, 480),
];

export const COURTYARD: AreaDefinition = {
  id: 'courtyard',
  name: 'Moonlit Courtyard',
  floor: { tileKey: 'tile-courtyard-cobbles', cols: COURTYARD_COLS, rows: COURTYARD_ROWS },
  solids: [NORTH_WALL, SOUTH_WALL, WEST_WALL_NORTH, WEST_WALL_SOUTH, EAST_WALL_NORTH, EAST_WALL_SOUTH],
  decor: COURTYARD_DECOR,
  landmarks: [
    {
      id: 'yew-tree',
      name: 'Yew tree',
      image: image('yew-tree', { x: 240, y: 264 }, { w: 210, h: 212 }),
      solid: { x: 216, y: 232, w: 48, h: 32 },
    },
    {
      id: 'stone-well',
      name: 'Stone well',
      image: image('stone-well', { x: 480, y: 360 }, { w: 133, h: 162 }),
      solid: { x: 432, y: 320, w: 96, h: 40 },
    },
  ],
  interactables: [
    {
      id: 'courtyard-lantern',
      name: 'Lantern post',
      actionLabel: 'Light the lantern',
      doneLabel: 'The lantern is lit',
      image: image('lantern-post', { x: 744, y: 456 }, { w: 101, h: 210 }),
      solid: { x: 724, y: 432, w: 40, h: 24 },
      zone: { x: 680, y: 392, w: 128, h: 112 },
    },
  ],
  spawns: {
    'courtyard-west': { x: 120, y: 420 },
    'courtyard-east-side': { x: 860, y: 360 },
  },
  entrySpawn: 'courtyard-west',
  exits: [
    {
      id: 'courtyard-east',
      to: 'graveyard',
      zone: EAST_EXIT_ZONE,
      spawnInTarget: 'graveyard-west',
      gate: 'lantern',
    },
    {
      id: 'courtyard-west',
      to: 'apothecary-exit',
      zone: WEST_EXIT_ZONE,
      spawnInTarget: 'apothecary-east-side',
      gate: 'always-open',
    },
  ],
  assets: [
    'tile-courtyard-cobbles',
    ...GHOST_ASSETS,
    ...WALL_ASSETS,
    'lantern-post',
    'stone-well',
    'yew-tree',
  ],
};

export const COURTYARD_SPAWN = 'courtyard-west';

// ---------------------------------------------------------------------------
// Overgrown Graveyard (24 x 14)
// ---------------------------------------------------------------------------

const GRAVEYARD_W = 24 * TILE_SIZE; // 1152
const GRAVEYARD_H = 14 * TILE_SIZE; // 672
const GRAVEYARD_GAP: [number, number] = [288, 384];
const PLAQUE_SIZE = { w: 112, h: 117 } as const;

function plaque(id: ClueId, x: number, y: number) {
  const clue = getClue(id);
  return {
    id: `clue-${id}` as const,
    name: clue.name,
    actionLabel: 'Read the plaque',
    doneLabel: 'Clue found. Read it again',
    image: image(`clue-${id}`, { x, y }, PLAQUE_SIZE),
    solid: { x: x - 32, y: y - 24, w: 64, h: 24 },
    zone: { x: x - 64, y: y - 48, w: 128, h: 112 },
  };
}

export const GRAVEYARD: AreaDefinition = {
  id: 'graveyard',
  name: 'Overgrown Graveyard',
  floor: { tileKey: 'tile-graveyard-dirt', cols: 24, rows: 14 },
  solids: [
    { x: 0, y: 0, w: GRAVEYARD_W, h: 96 },
    { x: 0, y: GRAVEYARD_H - 48, w: GRAVEYARD_W, h: 48 },
    ...wallColumn(0, GRAVEYARD_H, [GRAVEYARD_GAP]),
    ...wallColumn(GRAVEYARD_W - 48, GRAVEYARD_H, [GRAVEYARD_GAP]),
  ],
  decor: [
    ...horizontalRun(GRAVEYARD_W, 96, WALL_RUN_H),
    ...horizontalRun(GRAVEYARD_W, GRAVEYARD_H, WALL_RUN_LOW),
    ...wallColumnDecor(24, GRAVEYARD_H, [GRAVEYARD_GAP]),
    ...wallColumnDecor(GRAVEYARD_W - 24, GRAVEYARD_H, [GRAVEYARD_GAP]),
    ...northCorners(GRAVEYARD_W),
  ],
  landmarks: [
    {
      id: 'leaning-gravestone',
      name: 'Leaning gravestone',
      image: image('gravestone', { x: 300, y: 232 }, { w: 124, h: 114 }),
      solid: { x: 272, y: 208, w: 56, h: 24 },
    },
    {
      id: 'mossy-gravestone',
      name: 'Mossy gravestone',
      image: image('gravestone', { x: 860, y: 232 }, { w: 124, h: 114 }, { x: 0.5, y: 1 }, true),
      solid: { x: 832, y: 208, w: 56, h: 24 },
    },
  ],
  // Route_Data order is Moon, Thorn, Key (Requirement 14.1).
  interactables: [plaque('moon', 300, 540), plaque('thorn', 576, 240), plaque('key', 860, 540)],
  spawns: {
    'graveyard-west': { x: 100, y: 360 },
    'graveyard-east-side': { x: 1050, y: 360 },
  },
  entrySpawn: 'graveyard-west',
  exits: [
    {
      id: 'graveyard-west',
      to: 'courtyard',
      zone: { x: 0, y: 288, w: 48, h: 96 },
      spawnInTarget: 'courtyard-east-side',
      gate: 'always-open',
    },
    {
      id: 'graveyard-east',
      to: 'passage',
      zone: { x: GRAVEYARD_W - 48, y: 288, w: 48, h: 96 },
      spawnInTarget: 'passage-west',
      gate: 'clues',
    },
  ],
  assets: [
    'tile-graveyard-dirt',
    ...GHOST_ASSETS,
    ...WALL_ASSETS,
    'gravestone',
    'clue-moon',
    'clue-thorn',
    'clue-key',
  ],
};

// ---------------------------------------------------------------------------
// Clockworks Passage (20 x 12)
// ---------------------------------------------------------------------------

const PASSAGE_W = 20 * TILE_SIZE; // 960
const PASSAGE_H = 12 * TILE_SIZE; // 576
const PASSAGE_WEST_GAP: [number, number] = [336, 432];
/** The divider wall that holds the gate, and the gate opening in it. */
const DIVIDER_Y = 216;
const GATE_OPENING = { x0: 432, x1: 528 } as const;
/** The gate image's shared anchor is pixel (256, 296) of the 512 x 320 art. */
export const GATE_ART = { w: 512, h: 320, anchorX: 256, anchorY: 296 } as const;
const GATE_SIZE = { w: 192, h: 120 } as const;

export const PASSAGE: AreaDefinition = {
  id: 'passage',
  name: 'Clockworks Passage',
  floor: { tileKey: 'tile-clockworks-flagstones', cols: 20, rows: 12 },
  solids: [
    // North wall with the gap that leads up into the Belfry.
    { x: 0, y: 0, w: GATE_OPENING.x0, h: 96 },
    { x: GATE_OPENING.x1, y: 0, w: PASSAGE_W - GATE_OPENING.x1, h: 96 },
    { x: 0, y: PASSAGE_H - 48, w: PASSAGE_W, h: 48 },
    ...wallColumn(0, PASSAGE_H, [PASSAGE_WEST_GAP]),
    { x: PASSAGE_W - 48, y: 0, w: 48, h: PASSAGE_H },
    // The divider on both sides of the gate opening.
    { x: 48, y: DIVIDER_Y, w: GATE_OPENING.x0 - 48, h: 48 },
    { x: GATE_OPENING.x1, y: DIVIDER_Y, w: PASSAGE_W - 48 - GATE_OPENING.x1, h: 48 },
  ],
  decor: [
    ...horizontalSegment(0, GATE_OPENING.x0, 96, WALL_RUN_H),
    ...horizontalSegment(GATE_OPENING.x1, PASSAGE_W, 96, WALL_RUN_H),
    ...horizontalRun(PASSAGE_W, PASSAGE_H, WALL_RUN_LOW),
    ...horizontalSegment(48, GATE_OPENING.x0 - 24, DIVIDER_Y + 48, WALL_RUN_LOW),
    ...horizontalSegment(GATE_OPENING.x1 + 24, PASSAGE_W - 48, DIVIDER_Y + 48, WALL_RUN_LOW),
    ...wallColumnDecor(24, PASSAGE_H, [PASSAGE_WEST_GAP]),
    ...verticalRun(PASSAGE_W - 24, 96, PASSAGE_H - 48),
    image('wall-post', { x: GATE_OPENING.x0 - 24, y: 96 }, POST),
    image('wall-post', { x: GATE_OPENING.x1 + 24, y: 96 }, POST),
    ...northCorners(PASSAGE_W),
  ],
  landmarks: [],
  interactables: [
    {
      id: 'passage-gate',
      name: 'Clockworks gate',
      actionLabel: 'Open the gate',
      doneLabel: 'The gate is open',
      image: image(
        'gate-closed',
        { x: (GATE_OPENING.x0 + GATE_OPENING.x1) / 2, y: DIVIDER_Y + 48 },
        GATE_SIZE,
        { x: GATE_ART.anchorX / GATE_ART.w, y: GATE_ART.anchorY / GATE_ART.h }
      ),
      doneImageKey: 'gate-open',
      // Solid only while the gate is closed (see worldPhysics.solidEntries).
      solid: { x: GATE_OPENING.x0, y: DIVIDER_Y, w: GATE_OPENING.x1 - GATE_OPENING.x0, h: 48 },
      zone: { x: 400, y: DIVIDER_Y + 48, w: 160, h: 96 },
    },
  ],
  spawns: {
    'passage-west': { x: 100, y: 400 },
    // On the Belfry side of the gate (Requirement 15.4).
    'passage-belfry-side': { x: 480, y: 180 },
  },
  entrySpawn: 'passage-west',
  exits: [
    {
      id: 'passage-west',
      to: 'graveyard',
      zone: { x: 0, y: 336, w: 48, h: 96 },
      spawnInTarget: 'graveyard-east-side',
      gate: 'always-open',
    },
    {
      id: 'passage-north',
      to: 'belfry',
      zone: { x: GATE_OPENING.x0, y: 0, w: GATE_OPENING.x1 - GATE_OPENING.x0, h: 96 },
      spawnInTarget: 'belfry-south',
      gate: 'gate',
    },
  ],
  assets: ['tile-clockworks-flagstones', ...GHOST_ASSETS, ...WALL_ASSETS, 'gate-closed', 'gate-open'],
};

// ---------------------------------------------------------------------------
// Belfry (24 x 16)
// ---------------------------------------------------------------------------

const BELFRY_W = 24 * TILE_SIZE; // 1152
const BELFRY_H = 16 * TILE_SIZE; // 768
/** The chamber art's floor starts here; everything above is the back wall. */
const BELFRY_FLOOR_Y = 624;
const BELL_SIZE = { w: 128, h: 128 } as const;
const WINDOW_SIZE = { w: 112, h: 112 } as const;

/** Bell placements for the Belfry. Checkpoint 3 makes them ring. */
export const BELL_PLACEMENTS: Readonly<Record<BellId, Vec2>> = {
  moon: { x: 400, y: 640 },
  key: { x: 576, y: 640 },
  thorn: { x: 752, y: 640 },
};

/** One window per bell; the lit texture replaces the dark one when the lights return. */
export const WINDOW_PLACEMENTS: readonly ImagePlacement[] = [
  image('window-dark', { x: 330, y: 470 }, WINDOW_SIZE),
  image('window-dark', { x: 576, y: 230 }, WINDOW_SIZE),
  image('window-dark', { x: 822, y: 470 }, WINDOW_SIZE),
];

function bell(id: BellId) {
  const at = BELL_PLACEMENTS[id];
  const label = BELLS.find((entry) => entry.id === id)!.label;
  return {
    id: `bell-${id}` as const,
    name: label,
    actionLabel: 'Ring the bell',
    doneLabel: 'Rung',
    image: image('crescent-bell', at, BELL_SIZE),
    solid: { x: at.x - 40, y: BELFRY_FLOOR_Y - 24, w: 80, h: 40 },
    zone: { x: at.x - 72, y: BELFRY_FLOOR_Y, w: 144, h: 64 },
  };
}

export const BELFRY: AreaDefinition = {
  id: 'belfry',
  name: 'Belfry',
  floor: { tileKey: 'tile-clockworks-flagstones', cols: 24, rows: 16 },
  backdrop: image('bell-chamber', { x: 0, y: 0 }, { w: BELFRY_W, h: BELFRY_H }, { x: 0, y: 0 }),
  solids: [
    // The back wall of the chamber art, and its two pillar bases.
    { x: 0, y: 0, w: BELFRY_W, h: BELFRY_FLOOR_Y },
    { x: 120, y: BELFRY_FLOOR_Y, w: 156, h: 24 },
    { x: 876, y: BELFRY_FLOOR_Y, w: 156, h: 24 },
  ],
  decor: [...WINDOW_PLACEMENTS],
  landmarks: [
    {
      id: 'alchemists-lantern',
      name: 'Alchemist’s lantern',
      image: image('alchemists-lantern', { x: 1072, y: 740 }, { w: 112, h: 112 }),
      solid: { x: 1044, y: 716, w: 56, h: 24 },
    },
  ],
  // Route_Data order is Moon, Thorn, Key; the ring order lives in BELL_SEQUENCE.
  interactables: [bell('moon'), bell('thorn'), bell('key')],
  // The stair from the passage comes up on the open floor right of the bells, so
  // arriving does not put the Ghost straight into a bell's zone.
  spawns: { 'belfry-south': { x: 960, y: 712 } },
  entrySpawn: 'belfry-south',
  exits: [
    {
      id: 'belfry-south',
      to: 'passage',
      zone: { x: 912, y: BELFRY_H - 24, w: 96, h: 24 },
      spawnInTarget: 'passage-belfry-side',
      gate: 'always-open',
    },
  ],
  assets: [
    'tile-clockworks-flagstones',
    ...GHOST_ASSETS,
    'bell-chamber',
    'crescent-bell',
    'window-dark',
    'window-lit',
    'alchemists-lantern',
  ],
};

/** Every Area of the route. */
export const AREAS: Readonly<Record<AreaId, AreaDefinition>> = {
  'apothecary-exit': APOTHECARY_EXIT,
  courtyard: COURTYARD,
  graveyard: GRAVEYARD,
  passage: PASSAGE,
  belfry: BELFRY,
};

/** The two shortcut destinations unlocked with the gate (Requirement 15.4). */
export const SHORTCUTS: readonly { area: AreaId; spawn: SpawnId; label: string }[] = [
  { area: 'courtyard', spawn: 'courtyard-west', label: 'Take the shortcut to the Moonlit Courtyard' },
  {
    area: 'passage',
    spawn: 'passage-belfry-side',
    label: 'Take the shortcut to the Clockworks Passage, Belfry side',
  },
];

export function getArea(id: AreaId): AreaDefinition | undefined {
  return AREAS[id];
}

export function isAreaId(value: unknown): value is AreaId {
  return typeof value === 'string' && (ALL_AREA_IDS as readonly string[]).includes(value);
}

export function isClueId(value: unknown): value is ClueId {
  return typeof value === 'string' && (CLUE_IDS as readonly string[]).includes(value);
}

export function isBellId(value: unknown): value is BellId {
  return typeof value === 'string' && (BELL_IDS as readonly string[]).includes(value);
}

export function getAreaName(id: AreaId): string {
  return AREAS[id]?.name ?? id;
}

/** The index of an Area in route order, for sorting. */
export function areaOrder(id: AreaId): number {
  return ALL_AREA_IDS.indexOf(id);
}
