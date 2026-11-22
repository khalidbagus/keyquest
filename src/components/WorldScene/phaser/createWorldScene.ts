/**
 * Clocktower WorldScene (Phaser). The only file that imports Phaser outside motion.ts.
 * React owns every decision; this scene draws, moves the Ghost with the pure
 * worldPhysics module, and reports facts back through callbacks.
 *
 * Draws only with features both renderers support: images, a tilemap layer,
 * canvas textures, alpha, scale, rotation, and position tweens. No filters or masks.
 */

import Phaser from 'phaser';
import {
  areaBounds,
  bodyInZone,
  cameraScroll,
  isExitOpen,
  landmarksInView,
  moveBody,
  nearbyInteractable,
  solidEntries,
  spawnPoint,
} from '../../../engines/worldPhysics';
import {
  ASSET_FILES,
  GHOST_FRAME,
  GHOST_TEXTURE,
  TILE_SIZE,
  getArea,
} from '../../../registry/clocktowerRoute';
import type {
  AreaDefinition,
  ClocktowerState,
  Direction,
  ImagePlacement,
  InteractableId,
  Vec2,
  WorldEffect,
  WorldSceneCallbacks,
  WorldSceneHandle,
  WorldSnapshot,
} from '../../../types/clocktower';
import {
  bellSwing,
  clueReveal,
  createGhostMotion,
  fadeOutOverlay,
  lanternWarmup,
  type Cue,
  type GhostMotion,
} from './motion';

const LIT_TEXTURE = 'lantern-post-lit';
const GLOW_TEXTURE = 'lantern-glow';
/** The hanging lantern glass in the 101 x 210 lantern-post image. */
const LANTERN_GLASS = { x: 76, y: 79 };
const LANTERN_GLOW_RADIUS = 26;
const BACKGROUND = '#140d21';
/** Alpha for warm-up draws: drawn by the GPU, invisible on screen. */
const WARM_ALPHA = 0.002;
const WINDOW_DARK = 'window-dark';
const WINDOW_LIT = 'window-lit';

class SceneLoadError extends Error {
  resource: string;
  constructor(resource: string) {
    super(`Could not load ${resource}`);
    this.name = 'SceneLoadError';
    this.resource = resource;
  }
}

/** The part of Clocktower_State that the scene needs for exit solidity. */
function stateFromSnapshot(snapshot: WorldSnapshot): ClocktowerState {
  return {
    checkpoints: [],
    lastCheckpoint: null,
    lanternLit: snapshot.lanternLit,
    cluesFound: [...snapshot.cluesFound],
    gateOpen: snapshot.gateOpen,
    shortcutUnlocked: snapshot.gateOpen,
    bellRings: [...snapshot.bellRings],
    lightsRestored: snapshot.lightsRestored,
  };
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

interface SceneHooks {
  callbacks: WorldSceneCallbacks;
  onCreated: (renderer: 'webgl' | 'canvas') => void;
  onFailed: (resource: string) => void;
}

class ClocktowerScene extends Phaser.Scene {
  private hooks: SceneHooks;
  private snapshot: WorldSnapshot;
  private area: AreaDefinition | null = null;

  private anchor: Vec2 = { x: 0, y: 0 };
  private held: Direction | null = null;
  private facing: Direction = 'south';
  private moving = false;
  private arrivalSeq: number;
  private scroll: Vec2 | null = null;

  private ghost: Phaser.GameObjects.Container | null = null;
  private ghostSprite: Phaser.GameObjects.Image | null = null;
  private motion: GhostMotion | null = null;
  private lantern: Phaser.GameObjects.Image | null = null;
  private lanternGlow: Phaser.GameObjects.Image | null = null;
  private lanternShownLit: boolean | null = null;
  private gate: Phaser.GameObjects.Image | null = null;
  private gateShownOpen: boolean | null = null;
  /** The Belfry windows in Route_Data order, and how many are drawn lit. */
  private windows: { image: Phaser.GameObjects.Image; placement: ImagePlacement }[] = [];
  private windowsShownLit: number | null = null;
  /** Interactable images by id, for the clue and bell cues. */
  private propImages = new Map<string, Phaser.GameObjects.Image>();
  /** Running prop cues by target; a newer cue on a target finishes the older one. */
  private cues = new Map<string, Cue>();
  /** The last effect seen, so an effect plays once and never replays on a rebuild. */
  private lastEffectId: number | null;
  /** Every object built for the current Area, destroyed on an Area change. */
  private worldObjects: { destroy(): void }[] = [];
  /** The Area the snapshot asks for; `area` stays null while its textures load. */
  private areaId: AreaDefinition['id'];
  private areaToken = 0;
  private created = false;

  private nearby: InteractableId | null = null;
  private landmarks: readonly string[] = [];
  private touchingExits = new Set<string>();
  private insideExits = new Set<string>();
  private lastDebug = '';
  private failed = false;
  private silenced = false;

  constructor(snapshot: WorldSnapshot, hooks: SceneHooks) {
    super({ key: 'clocktower' });
    this.snapshot = snapshot;
    this.hooks = hooks;
    this.arrivalSeq = snapshot.arrival.seq;
    this.areaId = snapshot.area;
    this.lastEffectId = snapshot.effect?.id ?? null;
  }

  // -------------------------------------------------------------------------
  // Public surface used by the handle
  // -------------------------------------------------------------------------

  applySnapshot(next: WorldSnapshot): void {
    const previous = this.snapshot;
    this.snapshot = next;
    // Before `create`, the scene builds from the latest snapshot when it starts.
    if (this.failed || !this.created) {
      this.lastEffectId = next.effect?.id ?? this.lastEffectId;
      return;
    }

    // A new Area rebuilds the world; its arrival spawn is read when the build runs.
    if (next.area !== this.areaId) {
      this.lastEffectId = next.effect?.id ?? this.lastEffectId;
      this.areaId = next.area;
      this.arrivalSeq = next.arrival.seq;
      this.switchArea(next.area);
      return;
    }
    if (!this.area) {
      // An effect that lands while the Area loads is already part of the state it builds.
      this.lastEffectId = next.effect?.id ?? this.lastEffectId;
      return;
    }

    if (next.arrival.seq !== this.arrivalSeq) {
      this.arrivalSeq = next.arrival.seq;
      this.teleport(next.arrival.spawn);
    }
    if (next.reducedMotion !== previous.reducedMotion) {
      this.motion?.setReducedMotion(next.reducedMotion);
      // Anything still playing jumps to its final state (Requirement 23.8).
      if (next.reducedMotion) this.finishCues();
    }
    // State first: the textures swap in the same call that receives the snapshot,
    // before any cue starts (Requirement 23.1).
    this.syncLantern();
    this.syncGate();
    const newlyLit = this.syncWindows();
    this.playEffect(next.effect, newlyLit);
  }

  pulseInteract(): void {
    if (this.failed || this.silenced || !this.area) return;
    this.motion?.pulse();
  }

  setHeld(direction: Direction | null): void {
    this.held = direction;
    if (direction) {
      // Facing changes even when a wall blocks movement or input is blocked.
      this.facing = direction;
      this.ghostSprite?.setTexture(GHOST_TEXTURE[direction]);
      // The lean starts on the input itself, one frame before the step that moves the
      // body (Requirement 23.2). If a wall blocks the step, that step settles it again.
      if (this.area && !this.snapshot.inputBlocked) {
        this.moving = true;
        this.motion?.setMovement(true, direction);
      }
    }
  }

  silence(): void {
    this.silenced = true;
  }

  // -------------------------------------------------------------------------
  // Phaser lifecycle
  // -------------------------------------------------------------------------

  preload(): void {
    const area = getArea(this.snapshot.area);
    if (!area) {
      this.fail(`area ${this.snapshot.area}`);
      return;
    }
    this.load.setBaseURL(`${import.meta.env.BASE_URL}adventure/`);
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.fail(ASSET_FILES[file.key] ?? file.key);
    });
    for (const key of area.assets) {
      const file = ASSET_FILES[key];
      if (file) this.load.image(key, file);
    }
  }

  create(): void {
    if (this.failed) return;
    try {
      const area = getArea(this.snapshot.area);
      if (!area) throw new SceneLoadError(`area ${this.snapshot.area}`);
      this.cameras.main.setBackgroundColor(BACKGROUND);
      this.warmShaderVariants();
      this.created = true;
      this.areaId = area.id;
      this.arrivalSeq = this.snapshot.arrival.seq;
      // The Area may have changed while the first textures loaded.
      if (area.assets.every((key) => this.textures.exists(key))) {
        this.buildArea(area);
      } else {
        this.switchArea(area.id);
      }

      const renderer = this.game.renderer?.type === Phaser.WEBGL ? 'webgl' : 'canvas';
      this.hooks.onCreated(renderer);
    } catch (error: unknown) {
      this.fail(error instanceof SceneLoadError ? error.resource : 'scene create');
    }
  }

  /**
   * Compile the image batch shader for every texture count before play starts.
   * Phaser's WebGL renderer builds one program per texture count, lazily, on the first
   * frame that needs it. Lighting the lantern adds two textures to the batch (the lit
   * post and the glow), so the first lighting compiled a program mid-frame and stalled
   * the main thread during the interact pulse (cp5 profile). Canvas rendering has no
   * shaders, so this does nothing there. A failure here never stops the scene.
   */
  private warmShaderVariants(): void {
    try {
      const renderer = this.game.renderer as unknown as {
        type: number;
        maxTextures?: number;
        renderNodes?: { getNode(name: string): unknown };
      };
      if (renderer.type !== Phaser.WEBGL || !renderer.renderNodes) return;
      const node = renderer.renderNodes.getNode('BatchHandlerQuad') as {
        finalizeTextureCount?: (count: number) => void;
        programManager?: { getCurrentProgramSuite(): unknown };
      } | null;
      if (!node?.finalizeTextureCount || !node.programManager) return;
      const max = Math.max(1, renderer.maxTextures ?? 1);
      for (let count = 1; count <= max; count += 1) {
        node.finalizeTextureCount(count);
        node.programManager.getCurrentProgramSuite();
      }
    } catch (error: unknown) {
      console.warn('Clocktower scene: shader warm-up skipped', error);
    }
  }

  /** Build an Area from Route_Data and place the Ghost at the snapshot's arrival spawn. */
  private buildArea(area: AreaDefinition): void {
    this.area = area;
    this.buildFloor(area);
    this.buildDecor(area);
    this.buildProps(area);
    this.buildGhost();
    this.syncLantern();
    this.syncGate();
    this.syncWindows();

    const start = spawnPoint(area, this.snapshot.arrival.spawn) ?? spawnPoint(area, area.entrySpawn);
    this.anchor = start ?? { x: 0, y: 0 };
    this.moving = false;
    this.scroll = null;
    this.touchingExits.clear();
    this.insideExits.clear();
    this.placeGhost();
    // The camera starts on the Ghost before the first frame is drawn.
    this.updateCamera(0, true);
  }

  /** Destroy the current Area's objects, load the next Area's textures, then build it. */
  private switchArea(areaId: AreaDefinition['id']): void {
    const area = getArea(areaId);
    if (!area) {
      this.fail(`area ${areaId}`);
      return;
    }
    this.areaToken += 1;
    const token = this.areaToken;
    this.clearWorld();

    const build = () => {
      if (token !== this.areaToken || this.failed || this.silenced) return;
      try {
        this.buildArea(area);
      } catch (error: unknown) {
        this.fail(error instanceof SceneLoadError ? error.resource : 'scene build');
      }
    };
    const ready = () => area.assets.every((key) => !ASSET_FILES[key] || this.textures.exists(key));
    if (ready()) {
      build();
      return;
    }
    for (const key of area.assets) {
      if (ASSET_FILES[key] && !this.textures.exists(key)) this.load.image(key, ASSET_FILES[key]!);
    }
    // Build once this Area's own textures exist. Waiting for the loader's COMPLETE
    // would also wait for images of an Area the player already left, because files
    // added while a load runs join that batch (cp3-prepublish route trace).
    const loader = this.load;
    const check = () => {
      if (token !== this.areaToken) {
        detach();
        return;
      }
      if (!ready()) return;
      detach();
      build();
    };
    const detach = () => {
      loader.off(Phaser.Loader.Events.FILE_COMPLETE, check);
      loader.off(Phaser.Loader.Events.COMPLETE, check);
    };
    loader.on(Phaser.Loader.Events.FILE_COMPLETE, check);
    loader.on(Phaser.Loader.Events.COMPLETE, check);
    loader.start();
  }

  private clearWorld(): void {
    // Cues end in their final state and remove their overlays before the objects go.
    this.finishCues();
    this.propImages.clear();
    this.area = null;
    this.motion?.destroy();
    this.motion = null;
    for (const object of this.worldObjects) object.destroy();
    this.worldObjects = [];
    this.ghost = null;
    this.ghostSprite = null;
    this.lantern = null;
    this.lanternGlow = null;
    this.lanternShownLit = null;
    this.gate = null;
    this.gateShownOpen = null;
    this.windows = [];
    this.windowsShownLit = null;
    if (this.nearby !== null) {
      this.nearby = null;
      this.safe(() => this.hooks.callbacks.onNearbyChange(null));
    }
    if (this.landmarks.length > 0) {
      this.landmarks = [];
      this.safe(() => this.hooks.callbacks.onLandmarksInView([]));
    }
  }

  private track<T extends { destroy(): void }>(object: T): T {
    this.worldObjects.push(object);
    return object;
  }

  update(_time: number, delta: number): void {
    if (this.failed || this.silenced || !this.area) return;
    try {
      this.step(delta);
    } catch (error: unknown) {
      // Keep the cause visible for diagnosis; the view falls back to the Route_Panel.
      console.error('Clocktower scene update failed', error);
      this.fail('scene update');
    }
  }

  // -------------------------------------------------------------------------
  // Building the world
  // -------------------------------------------------------------------------

  private buildFloor(area: AreaDefinition): void {
    const { cols, rows, tileKey } = area.floor;
    try {
      const map = this.make.tilemap({
        tileWidth: TILE_SIZE,
        tileHeight: TILE_SIZE,
        width: cols,
        height: rows,
      });
      const tileset = map.addTilesetImage('floor', tileKey, TILE_SIZE, TILE_SIZE, 0, 0);
      const layer = tileset ? map.createBlankLayer('floor', tileset, 0, 0, cols, rows) : null;
      if (!layer) throw new Error('tilemap layer unavailable');
      layer.fill(0, 0, 0, cols, rows);
      layer.setDepth(-1);
      // Destroying the map destroys its layer too.
      this.track(map);
    } catch {
      // A tile sprite draws the same unscaled 48 px tiles if the tilemap API differs.
      this.track(
        this.add
          .tileSprite(0, 0, cols * TILE_SIZE, rows * TILE_SIZE, tileKey)
          .setOrigin(0, 0)
          .setDepth(-1)
      );
    }
  }

  private place(placement: ImagePlacement, depth = placement.anchor.y): Phaser.GameObjects.Image {
    return this.track(
      this.add
        .image(placement.anchor.x, placement.anchor.y, placement.key)
        .setOrigin(placement.origin.x, placement.origin.y)
        .setDisplaySize(placement.size.w, placement.size.h)
        .setFlipX(placement.flipX === true)
        .setDepth(depth)
    );
  }

  private buildDecor(area: AreaDefinition): void {
    // The Belfry's chamber art sits on the floor, under every prop.
    if (area.backdrop) this.place(area.backdrop, -0.5);
    for (const piece of area.decor) {
      const image = this.place(piece);
      if (piece.key === WINDOW_DARK) this.windows.push({ image, placement: piece });
    }
  }

  /**
   * Lit windows equal the recorded correct rings, and all of them once the lights
   * are restored (Requirements 21.3, 21.6, 21.10, 21.11). Swaps in the same call.
   */
  private syncWindows(): number[] {
    if (this.windows.length === 0) return [];
    const count = this.snapshot.lightsRestored
      ? this.windows.length
      : Math.min(this.snapshot.bellRings.length, this.windows.length);
    if (this.windowsShownLit === count) return [];
    const before = this.windowsShownLit;
    this.windowsShownLit = count;
    this.windows.forEach(({ image, placement }, index) => {
      const key = index < count && this.textures.exists(WINDOW_LIT) ? WINDOW_LIT : WINDOW_DARK;
      image.setTexture(key).setDisplaySize(placement.size.w, placement.size.h);
    });
    // Windows lit by this call; none on the first sync after a build or resume.
    if (before === null || count <= before) return [];
    return Array.from({ length: count - before }, (_, i) => before + i);
  }

  /**
   * Play the success cue for a new effect, once. The state it decorates is already
   * drawn. Reduced motion and effects for targets outside this Area play nothing.
   */
  private playEffect(effect: WorldEffect | null, newlyLit: readonly number[]): void {
    if (!effect || effect.id === this.lastEffectId) return;
    this.lastEffectId = effect.id;
    if (this.snapshot.reducedMotion || !this.area) return;
    switch (effect.kind) {
      case 'lantern': {
        const glow = this.lanternGlow;
        if (glow && this.snapshot.lanternLit) this.startCue(effect.target, () => lanternWarmup(this, glow));
        break;
      }
      case 'clue': {
        const plaque = this.propImages.get(effect.target);
        if (plaque) this.startCue(effect.target, () => clueReveal(this, plaque));
        break;
      }
      case 'gate': {
        const gate = this.gate;
        const item = this.area.interactables.find((entry) => entry.id === 'passage-gate');
        if (gate && item && this.snapshot.gateOpen) {
          this.startCue(effect.target, () => fadeOutOverlay(this, 'gate', gate, item.image.key));
        }
        break;
      }
      case 'bell':
      case 'lights': {
        const bell = this.propImages.get(effect.target);
        if (bell) this.startCue(effect.target, () => bellSwing(this, bell));
        for (const index of newlyLit) {
          const pane = this.windows[index];
          if (pane) this.startCue(`window-${index}`, () => fadeOutOverlay(this, 'window', pane.image, WINDOW_DARK));
        }
        break;
      }
    }
  }

  /** A newer cue on the same target finishes the older one first, so nothing queues. */
  private startCue(target: string, make: () => Cue): void {
    this.cues.get(target)?.finish();
    this.cues.set(target, make());
  }

  private finishCues(): void {
    for (const cue of this.cues.values()) cue.finish();
    this.cues.clear();
  }

  /** "kind:target" for each cue still playing, for the DEV test hooks. */
  private runningCues(): string {
    const running: string[] = [];
    for (const [target, cue] of this.cues) {
      if (cue.done) this.cues.delete(target);
      else running.push(`${cue.kind}:${target}`);
    }
    return running.length > 0 ? running.join(' ') : 'none';
  }

  private buildProps(area: AreaDefinition): void {
    for (const landmark of area.landmarks) this.place(landmark.image);

    if (area.interactables.some((item) => item.id === 'courtyard-lantern')) {
      this.createLitLanternTextures();
    }
    for (const item of area.interactables) {
      const image = this.place(item.image);
      this.propImages.set(item.id, image);
      if (item.id === 'passage-gate') this.gate = image;
      if (item.id === 'courtyard-lantern') {
        this.lantern = image;
        const glassX = item.image.anchor.x - item.image.origin.x * item.image.size.w + LANTERN_GLASS.x;
        const glassY = item.image.anchor.y - item.image.origin.y * item.image.size.h + LANTERN_GLASS.y;
        this.lanternGlow = this.track(
          this.add
            .image(glassX, glassY, GLOW_TEXTURE)
            .setDepth(item.image.anchor.y + 1)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setVisible(false)
        );
        this.warmFirstDraw(item.image.anchor.x, item.image.anchor.y, glassX, glassY);
      }
    }
  }

  /**
   * Draw the lit post and the additive glow for the first two frames after the
   * Courtyard is built, at an alpha that shows nothing (0.002, under half a level).
   * The GPU builds the pipeline for a new draw state on its first use. The glow is the
   * only additive-blend sprite, so the first lighting used to wait about 170 ms on that
   * build in the middle of the interact pulse (cp5 production trace: a compositor
   * readback waiting on the GPU). Warming it here moves that cost to the map's first frame.
   */
  private warmFirstDraw(postX: number, postY: number, glowX: number, glowY: number): void {
    if (this.snapshot.lanternLit || !this.textures.exists(LIT_TEXTURE) || !this.textures.exists(GLOW_TEXTURE)) return;
    const item = this.area?.interactables.find((entry) => entry.id === 'courtyard-lantern');
    if (!item) return;
    const warm = [
      this.track(
        this.add
          .image(postX, postY, LIT_TEXTURE)
          .setOrigin(item.image.origin.x, item.image.origin.y)
          .setDisplaySize(item.image.size.w, item.image.size.h)
          .setAlpha(WARM_ALPHA)
          .setDepth(item.image.anchor.y)
      ),
      this.track(
        this.add.image(glowX, glowY, GLOW_TEXTURE).setBlendMode(Phaser.BlendModes.ADD).setAlpha(WARM_ALPHA).setDepth(item.image.anchor.y + 1)
      ),
    ];
    let frames = 0;
    const done = () => {
      frames += 1;
      if (frames < 2) return;
      this.events.off(Phaser.Scenes.Events.RENDER, done);
      for (const image of warm) if (image.active) image.destroy();
    };
    this.events.on(Phaser.Scenes.Events.RENDER, done);
  }

  /** Show the open or closed gate art at the shared anchor (Requirement 15.2). */
  private syncGate(): void {
    const open = this.snapshot.gateOpen;
    if (this.gateShownOpen === open || !this.gate) return;
    this.gateShownOpen = open;
    const item = this.area?.interactables.find((entry) => entry.id === 'passage-gate');
    if (!item) return;
    const key = open && item.doneImageKey ? item.doneImageKey : item.image.key;
    this.gate.setTexture(key).setDisplaySize(item.image.size.w, item.image.size.h);
  }

  /**
   * The lit lantern is generated from `lantern-post.png` plus a warm radial glow
   * (design decision 6), unless the manifest lists a dedicated export.
   */
  private createLitLanternTextures(): void {
    if (!this.textures.exists(LIT_TEXTURE)) {
      const source = this.textures.get('lantern-post').getSourceImage() as CanvasImageSource & {
        width: number;
        height: number;
      };
      const canvasTexture = this.textures.createCanvas(LIT_TEXTURE, source.width, source.height);
      if (canvasTexture) {
        const context = canvasTexture.getContext();
        context.drawImage(source, 0, 0);
        context.globalCompositeOperation = 'lighter';
        const gradient = context.createRadialGradient(
          LANTERN_GLASS.x,
          LANTERN_GLASS.y,
          0,
          LANTERN_GLASS.x,
          LANTERN_GLASS.y,
          LANTERN_GLOW_RADIUS
        );
        gradient.addColorStop(0, 'rgba(251, 191, 36, 0.95)');
        gradient.addColorStop(0.5, 'rgba(251, 191, 36, 0.55)');
        gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, source.width, source.height);
        canvasTexture.refresh();
      }
    }
    if (!this.textures.exists(GLOW_TEXTURE)) {
      const size = 192;
      const glow = this.textures.createCanvas(GLOW_TEXTURE, size, size);
      if (glow) {
        const context = glow.getContext();
        const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(251, 191, 36, 0.5)');
        gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        glow.refresh();
      }
    }
  }

  private buildGhost(): void {
    const sprite = this.add
      .image(0, 0, GHOST_TEXTURE[this.facing])
      .setOrigin(GHOST_FRAME.anchorX / GHOST_FRAME.w, GHOST_FRAME.anchorY / GHOST_FRAME.h);
    const container = this.track(this.add.container(0, 0, [sprite]));
    this.ghostSprite = sprite;
    this.ghost = container;
    this.motion = createGhostMotion(this, sprite, this.snapshot.reducedMotion);
  }

  /** Swap the lantern texture and glow to match the snapshot, in the same call. */
  private syncLantern(): void {
    const lit = this.snapshot.lanternLit;
    if (this.lanternShownLit === lit || !this.lantern) return;
    this.lanternShownLit = lit;
    this.lantern.setTexture(lit && this.textures.exists(LIT_TEXTURE) ? LIT_TEXTURE : 'lantern-post');
    this.lanternGlow?.setVisible(lit);
  }

  // -------------------------------------------------------------------------
  // Per-frame work
  // -------------------------------------------------------------------------

  private teleport(spawn: string): void {
    if (!this.area) return;
    const point = spawnPoint(this.area, spawn);
    if (!point) return;
    this.anchor = point;
    this.moving = false;
    this.scroll = null;
    this.touchingExits.clear();
    this.insideExits.clear();
    this.placeGhost();
    this.updateCamera(0, true);
  }

  private placeGhost(): void {
    if (!this.ghost) return;
    this.ghost.setPosition(this.anchor.x, this.anchor.y);
    this.ghost.setDepth(this.anchor.y);
  }

  private step(delta: number): void {
    const area = this.area;
    if (!area) return;
    const entries = solidEntries(area, stateFromSnapshot(this.snapshot));
    const direction = this.snapshot.inputBlocked ? null : this.held;

    let moved = false;
    if (direction) {
      const result = moveBody(
        this.anchor,
        direction,
        delta,
        entries.map((entry) => entry.rect),
        areaBounds(area)
      );
      moved = result.anchor.x !== this.anchor.x || result.anchor.y !== this.anchor.y;
      this.anchor = result.anchor;

      // Closed exits report once per contact.
      const touching = new Set<string>();
      for (const index of result.contacts) {
        const entry = entries[index];
        // The closed gate reports like a closed exit, so the view can name what is missing.
        const blocksWay = entry?.kind === 'exit' || (entry?.kind === 'interactable' && entry.id === 'passage-gate');
        if (blocksWay && entry?.id) touching.add(entry.id);
      }
      for (const id of touching) {
        if (!this.touchingExits.has(id)) this.safe(() => this.hooks.callbacks.onExitContact(id, false));
      }
      this.touchingExits = touching;
    }

    if (moved) this.placeGhost();
    this.moving = moved;
    this.motion?.setMovement(this.moving, this.facing);

    this.reportExits(area);
    this.reportNearby(area);
    this.updateCamera(delta, false);
    this.reportLandmarks(area);
    this.reportDebug();
  }

  private reportExits(area: AreaDefinition): void {
    const state = stateFromSnapshot(this.snapshot);
    const inside = new Set<string>();
    for (const exit of area.exits) {
      if (isExitOpen(exit, state) && bodyInZone(this.anchor, exit.zone)) inside.add(exit.id);
    }
    for (const id of inside) {
      if (!this.insideExits.has(id)) this.safe(() => this.hooks.callbacks.onExitEntered(id));
    }
    this.insideExits = inside;
  }

  private reportNearby(area: AreaDefinition): void {
    const nearby = nearbyInteractable(this.anchor, area.interactables);
    if (nearby !== this.nearby) {
      this.nearby = nearby;
      this.safe(() => this.hooks.callbacks.onNearbyChange(nearby));
    }
  }

  private updateCamera(delta: number, exact: boolean): void {
    const area = this.area;
    if (!area) return;
    const camera = this.cameras.main;
    const viewport = { w: this.scale.width, h: this.scale.height };
    const reduced = this.snapshot.reducedMotion;
    const scroll = cameraScroll(
      this.anchor,
      viewport,
      areaBounds(area),
      exact ? null : this.scroll,
      reduced,
      delta
    );
    this.scroll = scroll;
    camera.setScroll(scroll.x, scroll.y);
  }

  private reportLandmarks(area: AreaDefinition): void {
    if (!this.scroll) return;
    const view = { x: this.scroll.x, y: this.scroll.y, w: this.scale.width, h: this.scale.height };
    const ids = landmarksInView(area, view);
    if (!sameList(ids, this.landmarks)) {
      this.landmarks = ids;
      this.safe(() => this.hooks.callbacks.onLandmarksInView(ids));
    }
  }

  private reportDebug(): void {
    if (!import.meta.env.DEV || !this.hooks.callbacks.onDebug || !this.scroll) return;
    const info = {
      x: this.anchor.x,
      y: this.anchor.y,
      facing: this.facing,
      moving: this.moving,
      cameraX: this.scroll.x,
      cameraY: this.scroll.y,
      litWindows: this.windows.length > 0 ? (this.windowsShownLit ?? 0) : undefined,
      pose: this.poseText(),
      anim: this.runningCues(),
    };
    const key = `${info.x}|${info.y}|${info.facing}|${info.moving}|${info.cameraX}|${info.cameraY}|${info.litWindows}|${info.pose}|${info.anim}`;
    if (key === this.lastDebug) return;
    this.lastDebug = key;
    const onDebug = this.hooks.callbacks.onDebug;
    this.safe(() => onDebug(info));
  }

  /** The Ghost's inner-sprite pose as JSON, rounded for stable comparisons. */
  private poseText(): string {
    const pose = this.motion?.pose();
    if (!pose) return '';
    const round = (value: number) => Math.round(value * 1000) / 1000;
    return JSON.stringify({
      state: pose.state,
      rotation: round(pose.rotation),
      x: round(pose.x),
      y: round(pose.y),
      scale: round(pose.scale),
      pulsing: pose.pulsing,
    });
  }

  private safe(run: () => void): void {
    if (!this.silenced) run();
  }

  private fail(resource: string): void {
    if (this.failed) return;
    this.failed = true;
    this.hooks.onFailed(resource);
  }
}

/**
 * Create the game, wait until its textures are loaded and the world is built,
 * and return the handle. Rejects with an error carrying the failed resource.
 */
export function createWorldScene(
  parent: HTMLElement,
  initial: WorldSnapshot,
  callbacks: WorldSceneCallbacks
): Promise<WorldSceneHandle> {
  return new Promise<WorldSceneHandle>((resolve, reject) => {
    let settled = false;
    let game: Phaser.Game | null = null;
    let scene: ClocktowerScene | null = null;

    const destroy = () => {
      scene?.silence();
      const target = game;
      game = null;
      scene = null;
      target?.destroy(true);
    };

    const handle: WorldSceneHandle = {
      update(snapshot) {
        scene?.applySnapshot(snapshot);
      },
      setHeld(direction) {
        scene?.setHeld(direction);
      },
      pulseInteract() {
        scene?.pulseInteract();
      },
      destroy,
    };

    const hooks: SceneHooks = {
      callbacks,
      onCreated(renderer) {
        if (settled) return;
        settled = true;
        callbacks.onReady({ renderer });
        resolve(handle);
      },
      onFailed(resource) {
        if (settled) {
          // After the scene was ready, report through the callback and let the host destroy it.
          callbacks.onLoadError(resource);
          return;
        }
        settled = true;
        destroy();
        reject(new SceneLoadError(resource));
      },
    };

    try {
      scene = new ClocktowerScene(initial, hooks);
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        backgroundColor: BACKGROUND,
        scale: { mode: Phaser.Scale.RESIZE },
        render: { roundPixels: true, antialias: true },
        input: { keyboard: false, mouse: false, touch: false, gamepad: false },
        audio: { noAudio: true },
        // Use real frame deltas. Phaser's smoothing caps each delta at 16.7 ms while the
        // window is unfocused or after a focus change, which made 1,200 ms cues take
        // 2.9 s at 20 to 30 fps. Movement already caps each step at 50 ms and sweeps
        // against solids, and the camera caps at 100 ms, so long frames stay safe.
        fps: { smoothStep: false },
        banner: false,
        autoFocus: false,
        scene,
      });
    } catch {
      if (!settled) {
        settled = true;
        destroy();
        reject(new SceneLoadError('Phaser game'));
      }
    }
  });
}
