/**
 * Clocktower Gate types.
 * Shared by the pure rules, the route data, React, and the lazy WorldScene chunk.
 * No Phaser types live here, so every module can import this file in jsdom.
 */

export type Direction = 'north' | 'south' | 'west' | 'east';

export type AreaId = 'apothecary-exit' | 'courtyard' | 'graveyard' | 'passage' | 'belfry';
export type ClueId = 'moon' | 'thorn' | 'key';
export type BellId = 'moon' | 'thorn' | 'key';
export type InteractableId =
  | 'courtyard-lantern'
  | `clue-${ClueId}`
  | 'passage-gate'
  | `bell-${BellId}`;

/** Spawn, exit, and landmark ids are plain strings checked against Route_Data. */
export type SpawnId = string;
export type ExitId = string;
export type LandmarkId = string;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface ImagePlacement {
  /** Texture key; maps to a file through the asset manifest. */
  key: string;
  /** World position of the image's origin point. */
  anchor: Vec2;
  /** Drawn size in world pixels; the scene scales the texture to this size. */
  size: { w: number; h: number };
  /** Origin as a fraction of the image size, like Phaser's setOrigin. */
  origin: Vec2;
  /** Mirror the image left to right. */
  flipX?: boolean;
}

export interface LandmarkDefinition {
  id: LandmarkId;
  name: string;
  image: ImagePlacement;
  /** Collision shape in world pixels, when the Landmark blocks movement. */
  solid?: Rect;
}

export interface InteractableDefinition {
  id: InteractableId;
  name: string;
  /** Verb phrase shown in the Route_Panel, such as "Light the lantern". */
  actionLabel: string;
  /** Shown instead of `actionLabel` once the action is done, such as "The lantern is lit". */
  doneLabel: string;
  image: ImagePlacement;
  /** Texture shown once the action is done (the open gate). */
  doneImageKey?: string;
  solid?: Rect;
  zone: Rect;
}

export type ExitGate = 'always-open' | 'lantern' | 'clues' | 'gate';

export interface ExitDefinition {
  id: ExitId;
  to: AreaId;
  zone: Rect;
  spawnInTarget: SpawnId;
  /** Which part of Clocktower_State opens this exit. */
  gate: ExitGate;
}

export interface AreaDefinition {
  id: AreaId;
  name: string;
  floor: { tileKey: string; cols: number; rows: number };
  /** Walls and fixed blockers in world pixels. */
  solids: readonly Rect[];
  /** Wall kit pieces drawn on top of the floor. */
  decor: readonly ImagePlacement[];
  landmarks: readonly LandmarkDefinition[];
  interactables: readonly InteractableDefinition[];
  spawns: Readonly<Record<SpawnId, Vec2>>;
  /** The spawn used on resume and by travel buttons. */
  entrySpawn: SpawnId;
  exits: readonly ExitDefinition[];
  /** Texture keys this Area needs. */
  assets: readonly string[];
  /** A full-area backdrop drawn under the props (the Belfry chamber). */
  backdrop?: ImagePlacement;
}

/** Clocktower_State: everything the room remembers about the route. */
export interface ClocktowerState {
  /** Areas entered at least once, in route order, no duplicates. */
  checkpoints: AreaId[];
  /** The last newly entered Area; resume spawns here. Null before first entry. */
  lastCheckpoint: AreaId | null;
  lanternLit: boolean;
  /** Found Clues in route order (moon, thorn, key), no duplicates. */
  cluesFound: ClueId[];
  gateOpen: boolean;
  shortcutUnlocked: boolean;
  /** Correct rings so far: always a prefix of the bell sequence. */
  bellRings: BellId[];
  lightsRestored: boolean;
}

/** The current Area and arrival spawn. Session state, not saved. */
export interface WorldSession {
  area: AreaId;
  arrival: { spawn: SpawnId; seq: number };
}

export type WorldAction =
  | { type: 'light-lantern' }
  | { type: 'find-clue'; clue: ClueId }
  | { type: 'open-gate' }
  | { type: 'enter-area'; area: AreaId; spawn: SpawnId }
  | { type: 'ring-bell'; bell: BellId };

export type RejectReason =
  | 'no-potion'
  | 'lantern-unlit'
  | 'clues-missing'
  | 'gate-closed'
  | 'jammed'
  | 'out-of-order'
  | 'unreachable';

export interface WorldEffect {
  id: number;
  kind: 'lantern' | 'clue' | 'gate' | 'bell' | 'lights';
  target: string;
}

export type WorldOutcome =
  | {
      kind: 'changed';
      message: string;
      celebrate: boolean;
      saveNow: boolean;
      effect: WorldEffect | null;
    }
  | { kind: 'repeat'; message: string }
  | { kind: 'rejected'; reason: RejectReason; missing: readonly string[]; message: string }
  | { kind: 'invalid'; message: string };

export interface RulesContext {
  potionHeld: boolean;
  bellCurseVerified: boolean;
  previewCourtyardOnly: boolean;
}

export interface WorldSnapshot {
  area: AreaId;
  /** Teleport target. The scene moves the Ghost only when `seq` changes. */
  arrival: { spawn: SpawnId; seq: number };
  lanternLit: boolean;
  cluesFound: readonly ClueId[];
  gateOpen: boolean;
  bellRings: readonly BellId[];
  lightsRestored: boolean;
  /** True while any dialog is open: the scene ignores held input. */
  inputBlocked: boolean;
  reducedMotion: boolean;
  /** The latest accepted action's success animation (Checkpoint 4). */
  effect: WorldEffect | null;
  /** Courtyard preview: exits to unbuilt Areas stay closed. */
  previewCourtyardOnly: boolean;
}

export interface GhostDebug {
  x: number;
  y: number;
  facing: Direction;
  moving: boolean;
  cameraX: number;
  cameraY: number;
  /** Windows drawn with `window-lit`, or undefined when the Area has no windows. */
  litWindows?: number;
  /** The Ghost's inner-sprite pose as JSON: state, rotation, x, y, scale, pulsing. */
  pose?: string;
  /** Prop cues playing now as "kind:target" entries, or "none". */
  anim?: string;
}

export interface WorldSceneCallbacks {
  onReady(info: { renderer: 'webgl' | 'canvas' }): void;
  /** File key or "Phaser module". */
  onLoadError(resource: string): void;
  onNearbyChange(id: InteractableId | null): void;
  onLandmarksInView(ids: readonly LandmarkId[]): void;
  /** Edge-triggered when the body starts touching an exit shape. */
  onExitContact(exitId: ExitId, open: boolean): void;
  /** Edge-triggered when the body enters an open exit zone. */
  onExitEntered(exitId: ExitId): void;
  /** DEV only. */
  onDebug?(info: GhostDebug): void;
}

export interface WorldSceneHandle {
  update(snapshot: WorldSnapshot): void;
  setHeld(direction: Direction | null): void;
  /** Checkpoint 4 interact cue; no-op before then. */
  pulseInteract(): void;
  destroy(): void;
}

export type WorldSceneState = 'loading' | 'ready' | 'failed';
