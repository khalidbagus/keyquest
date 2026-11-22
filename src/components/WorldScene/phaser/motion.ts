/**
 * Clocktower motion: the tween catalog from design.md "Motion pass".
 *
 * Ghost cues (move lean, stop settle, idle hover, interact pulse) target the inner
 * sprite only. Prop cues (lantern warmup, clue reveal, gate opening, bell swing,
 * window lighting) target prop images or temporary overlays. The anchor container,
 * the world anchor, and every Collision_Body never move, so motion and reduced
 * motion cannot change where anything is (Requirements 7.2, 7.8, 12.1, 23.4).
 *
 * The state and texture change always happen before a cue starts, so a cue only
 * decorates a final state that is already drawn (Requirement 23.1). Every cue can
 * be finished at once, which jumps it to its final values (Requirements 23.5, 23.8).
 */

import type Phaser from 'phaser';
import type { Direction } from '../../../types/clocktower';

const LEAN_ROTATION = 0.1;
const LEAN_OFFSET = 3;
const LEAN_MS = 90;
const SETTLE_MS = 180;
const HOVER_RISE = -6;
const HOVER_MS = 1200;
const PULSE_PEAK = 1.1;
// design.md lists 220 ms. Requirement 23.11 ends the pulse within 300 ms of the press,
// and the pulse can only start on the next frame (about 33 to 100 ms here), so 180 ms
// keeps the end inside the limit.
const PULSE_MS = 180;

/** Prop cue durations, all within the 1,500 ms limit (Requirement 23.3). */
export const CUE_MS = {
  lantern: 900,
  clue: 500,
  gate: 600,
  bell: 1200,
  window: 500,
} as const;

export type GhostPoseState = 'rest' | 'lean' | 'settle' | 'hover';

export interface GhostPose {
  state: GhostPoseState;
  rotation: number;
  x: number;
  y: number;
  scale: number;
  pulsing: boolean;
}

export interface GhostMotion {
  /** Set whether the Ghost is moving and which way it faces. Call when either changes. */
  setMovement(moving: boolean, facing: Direction): void;
  /** Stop every decorative tween and show the resting pose. */
  setReducedMotion(reduced: boolean): void;
  /** A short scale pulse with no tilt, played when Interact runs (Requirement 23.11). */
  pulse(): void;
  /** The current pose, for the DEV test hooks. */
  pose(): GhostPose;
  destroy(): void;
}

function leanTarget(facing: Direction): { rotation: number; x: number; y: number } {
  switch (facing) {
    case 'east':
      return { rotation: LEAN_ROTATION, x: LEAN_OFFSET, y: 0 };
    case 'west':
      return { rotation: -LEAN_ROTATION, x: -LEAN_OFFSET, y: 0 };
    case 'north':
      return { rotation: 0, x: 0, y: -LEAN_OFFSET };
    default:
      return { rotation: 0, x: 0, y: LEAN_OFFSET };
  }
}

export function createGhostMotion(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Image,
  initiallyReduced: boolean
): GhostMotion {
  let reduced = initiallyReduced;
  let moving = false;
  let facing: Direction = 'south';
  let destroyed = false;
  let state: GhostPoseState = 'rest';
  // Pose tweens (rotation and offset) and the pulse (scale) are separate, so a
  // lean or settle never cancels a pulse and the pulse never tilts the Ghost.
  let poseTween: Phaser.Tweens.Tween | null = null;
  let pulseTween: Phaser.Tweens.Tween | null = null;

  const stopPose = () => {
    poseTween?.stop();
    poseTween = null;
  };

  const stopPulse = () => {
    pulseTween?.stop();
    pulseTween = null;
    sprite.setScale(1);
  };

  const rest = () => {
    stopPose();
    stopPulse();
    sprite.setPosition(0, 0);
    sprite.setRotation(0);
    state = 'rest';
  };

  const startHover = () => {
    if (destroyed || reduced || moving) return;
    stopPose();
    state = 'hover';
    poseTween = scene.tweens.add({
      targets: sprite,
      y: HOVER_RISE,
      duration: HOVER_MS / 2,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  };

  const lean = () => {
    stopPose();
    state = 'lean';
    const target = leanTarget(facing);
    poseTween = scene.tweens.add({
      targets: sprite,
      rotation: target.rotation,
      x: target.x,
      y: target.y,
      duration: LEAN_MS,
      ease: 'Sine.easeOut',
    });
  };

  const settle = () => {
    stopPose();
    state = 'settle';
    poseTween = scene.tweens.add({
      targets: sprite,
      rotation: 0,
      x: 0,
      y: 0,
      duration: SETTLE_MS,
      ease: 'Cubic.easeOut',
      onComplete: startHover,
    });
  };

  if (!reduced) startHover();

  return {
    setMovement(nextMoving, nextFacing) {
      if (destroyed) return;
      const movingChanged = nextMoving !== moving;
      const facingChanged = nextFacing !== facing;
      moving = nextMoving;
      facing = nextFacing;
      if (reduced) return;
      if (moving && (movingChanged || facingChanged)) lean();
      else if (!moving && movingChanged) settle();
    },
    setReducedMotion(next) {
      if (destroyed || next === reduced) return;
      reduced = next;
      if (reduced) {
        rest();
      } else if (moving) {
        lean();
      } else {
        startHover();
      }
    },
    pulse() {
      if (destroyed || reduced) return;
      // A new press restarts the pulse from rest instead of stacking.
      stopPulse();
      pulseTween = scene.tweens.add({
        targets: sprite,
        scale: PULSE_PEAK,
        duration: PULSE_MS / 2,
        ease: 'Sine.easeOut',
        yoyo: true,
        onComplete: () => {
          pulseTween = null;
          sprite.setScale(1);
        },
      });
    },
    pose() {
      return {
        state,
        rotation: sprite.rotation,
        x: sprite.x,
        y: sprite.y,
        scale: sprite.scaleX,
        pulsing: pulseTween !== null,
      };
    },
    destroy() {
      destroyed = true;
      stopPose();
      stopPulse();
    },
  };
}

// ---------------------------------------------------------------------------
// Prop cues
// ---------------------------------------------------------------------------

export type CueKind = 'lantern' | 'clue' | 'gate' | 'bell' | 'window';

export interface Cue {
  kind: CueKind;
  /** Jump to the final values now and clean up. Safe to call more than once. */
  finish(): void;
  readonly done: boolean;
}

/** Run a tween whose end, natural or forced, always applies `final`. */
function runCue(
  scene: Phaser.Scene,
  kind: CueKind,
  config: Phaser.Types.Tweens.TweenBuilderConfig | Phaser.Types.Tweens.NumberTweenBuilderConfig,
  final: () => void,
  counter = false
): Cue {
  let done = false;
  let tween: Phaser.Tweens.Tween | null = null;
  const end = () => {
    if (done) return;
    done = true;
    final();
  };
  const cue: Cue = {
    kind,
    finish() {
      if (done) return;
      tween?.stop();
      end();
    },
    get done() {
      return done;
    },
  };
  const withEnd = { ...config, onComplete: end };
  tween = counter
    ? scene.tweens.addCounter(withEnd as Phaser.Types.Tweens.NumberTweenBuilderConfig)
    : scene.tweens.add(withEnd as Phaser.Types.Tweens.TweenBuilderConfig);
  return cue;
}

/** Lantern warmup: the glow over the lit texture rises from alpha 0 and scale 0.8. */
export function lanternWarmup(scene: Phaser.Scene, glow: Phaser.GameObjects.Image): Cue {
  glow.setVisible(true).setAlpha(0).setScale(0.8);
  return runCue(
    scene,
    'lantern',
    { targets: glow, alpha: 1, scale: 1, duration: CUE_MS.lantern, ease: 'Sine.easeOut' },
    () => glow.setAlpha(1).setScale(1)
  );
}

/** Clue reveal: the plaque lifts 4 px and flashes to 0.7 alpha, then settles back. */
export function clueReveal(scene: Phaser.Scene, plaque: Phaser.GameObjects.Image): Cue {
  const baseY = plaque.y;
  return runCue(
    scene,
    'clue',
    {
      targets: plaque,
      y: baseY - 4,
      alpha: 0.7,
      duration: CUE_MS.clue / 2,
      ease: 'Sine.easeInOut',
      yoyo: true,
    },
    () => plaque.setY(baseY).setAlpha(1)
  );
}

/**
 * Fade a temporary copy of the old texture out over a prop that already shows its
 * new texture. Used for the gate (closed over open) and each window (dark over lit).
 */
export function fadeOutOverlay(
  scene: Phaser.Scene,
  kind: 'gate' | 'window',
  under: Phaser.GameObjects.Image,
  oldKey: string
): Cue {
  const overlay = scene.add
    .image(under.x, under.y, oldKey)
    .setOrigin(under.originX, under.originY)
    .setDisplaySize(under.displayWidth, under.displayHeight)
    .setFlipX(under.flipX)
    .setDepth(under.depth + 0.01);
  return runCue(
    scene,
    kind,
    {
      targets: overlay,
      alpha: 0,
      duration: kind === 'gate' ? CUE_MS.gate : CUE_MS.window,
      ease: 'Sine.easeInOut',
    },
    () => overlay.destroy()
  );
}

const BELL_SWING = 0.2;
const BELL_SWINGS = 3;
/** The rope point near the top of the crescent bell image, as an origin fraction. */
const BELL_PIVOT_Y = 0.08;

/** Bell swing: ±0.2 rad around the rope, damped over 3 swings. */
export function bellSwing(scene: Phaser.Scene, bell: Phaser.GameObjects.Image): Cue {
  const baseOriginY = bell.originY;
  const baseY = bell.y;
  // Pivot at the rope for the swing; the drawn image does not move.
  bell.setOrigin(bell.originX, BELL_PIVOT_Y);
  bell.setY(baseY - (baseOriginY - BELL_PIVOT_Y) * bell.displayHeight);
  return runCue(
    scene,
    'bell',
    {
      from: 0,
      to: 1,
      duration: CUE_MS.bell,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const p = tween.getValue() ?? 0;
        bell.setRotation(BELL_SWING * Math.sin(p * BELL_SWINGS * 2 * Math.PI) * (1 - p));
      },
    },
    () => {
      bell.setRotation(0);
      bell.setOrigin(bell.originX, baseOriginY);
      bell.setY(baseY);
    },
    true
  );
}
