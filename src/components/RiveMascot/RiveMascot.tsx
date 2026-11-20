/**
 * RiveMascot Component
 * Plays any KeyQuest v2 character via the self-hosted Rive Canvas runtime
 * with instant first-frame neutral.png poster fallback, live Reduced Motion
 * ViewModel syncing, crisp DPR canvas rendering, and full resource cleanup.
 */

import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import type {
  MascotDefinition,
  MascotTriggerName,
} from '../../registry/mascotRegistry';
import type { MascotSignal } from '../../context/MascotContext';
import {
  canRunRiveCanvas,
  getRiveToolkit,
  loadRivBytes,
  type RiveArtboard,
  type RiveFile,
  type RiveRenderer,
  type RiveRuntime,
  type RiveStateMachineInstance,
  type RiveViewModelBoolean,
  type RiveViewModelInstance,
  type RiveViewModelTrigger,
} from './riveRuntimeLoader';
import styles from './RiveMascot.module.css';

export type RiveMascotVariant = 'medallion' | 'hero' | 'sanctuary';

interface RiveMascotProps {
  mascot: MascotDefinition;
  signal?: MascotSignal | null;
  initialTrigger?: MascotTriggerName;
  variant?: RiveMascotVariant;
  size?: number;
  className?: string;
}

const TRIGGER_NAMES: readonly MascotTriggerName[] = [
  'greet',
  'celebrate',
  'reactFailure',
  'requestAttention',
  'reset',
];

export function RiveMascot({
  mascot,
  signal = null,
  initialTrigger,
  variant = 'medallion',
  size = 112,
  className = '',
}: RiveMascotProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { prefersReducedMotion } = usePrefersReducedMotion();
  const [readyMascotId, setReadyMascotId] = useState<string | null>(null);
  const riveReady = readyMascotId === mascot.id;

  const reducedMotionBoolRef = useRef<RiveViewModelBoolean | null>(null);
  const triggersRef = useRef<
    Partial<Record<MascotTriggerName, RiveViewModelTrigger>>
  >({});
  const prefersReducedMotionRef = useRef(prefersReducedMotion);

  const lastHandledSeqRef = useRef<number>(signal?.seq ?? 0);

  // Sync live Reduced Motion changes to the active Rive ViewModel boolean
  useEffect(() => {
    prefersReducedMotionRef.current = prefersReducedMotion;
    if (reducedMotionBoolRef.current) {
      reducedMotionBoolRef.current.value = prefersReducedMotion;
    }
  }, [prefersReducedMotion]);

  // Fire incoming reaction triggers whenever signal.seq increments
  useEffect(() => {
    if (!signal || signal.seq === lastHandledSeqRef.current) return;
    lastHandledSeqRef.current = signal.seq;
    const targetTrigger = triggersRef.current[signal.trigger];
    if (targetTrigger) {
      targetTrigger.trigger();
    }
  }, [signal]);

  // Mount, load, render, and dispose the Rive artboard per character
  useEffect(() => {
    reducedMotionBoolRef.current = null;
    triggersRef.current = {};

    const canvas = canvasRef.current;
    if (!canvas || !canRunRiveCanvas()) {
      return undefined;
    }

    let cancelled = false;
    let runtime: RiveRuntime | null = null;
    let file: RiveFile | null = null;
    let artboard: RiveArtboard | null = null;
    let machine: RiveStateMachineInstance | null = null;
    let viewModel: RiveViewModelInstance | null = null;
    let renderer: RiveRenderer | null = null;
    let frameId: number | undefined;
    let previousTime: number | undefined;

    function dispose() {
      if (frameId !== undefined && runtime) {
        runtime.cancelAnimationFrame(frameId);
        frameId = undefined;
      }
      reducedMotionBoolRef.current = null;
      triggersRef.current = {};
      renderer?.delete();
      renderer = null;
      machine?.delete();
      machine = null;
      artboard?.delete();
      artboard = null;
      viewModel?.unref();
      viewModel = null;
      file?.unref();
      file = null;
    }

    async function boot() {
      try {
        const loaded = await getRiveToolkit();
        if (cancelled) return;
        runtime = loaded.runtime;

        const bytes = await loadRivBytes(mascot.rivUrl);
        if (cancelled) return;

        file = await runtime.load(bytes, undefined, false);
        if (!file || cancelled) {
          dispose();
          return;
        }

        artboard = loaded.toolkit.instantiateRiveArtboard(
          file,
          mascot.artboard
        );
        const controller = artboard.stateMachineByName(mascot.stateMachine);
        if (!controller) {
          throw new Error(`State machine "${mascot.stateMachine}" not found.`);
        }

        machine = new runtime.StateMachineInstance(controller, artboard);
        viewModel =
          file.defaultArtboardViewModel(artboard)?.defaultInstance() ?? null;

        if (viewModel) {
          const motionProp = viewModel.boolean('reducedMotion');
          if (motionProp) {
            motionProp.value = prefersReducedMotionRef.current;
            reducedMotionBoolRef.current = motionProp;
          }
          const boundTriggers: Partial<
            Record<MascotTriggerName, RiveViewModelTrigger>
          > = {};
          for (const triggerName of TRIGGER_NAMES) {
            const trig = viewModel.trigger(triggerName);
            if (trig) {
              boundTriggers[triggerName] = trig;
            }
          }
          triggersRef.current = boundTriggers;
          machine.bindViewModelInstance(viewModel);
        }

        if (!canvas || cancelled) {
          dispose();
          return;
        }

        renderer = runtime.makeRenderer(canvas);

        const drawFrame = (elapsed: number) => {
          if (!runtime || !machine || !artboard || !renderer || !canvas) return;
          machine.advanceAndApply(elapsed);

          const rect = canvas.getBoundingClientRect();
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const pixelWidth = Math.max(1, Math.round((rect.width || size) * dpr));
          const pixelHeight = Math.max(
            1,
            Math.round((rect.height || size) * dpr)
          );
          if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
          if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

          renderer.beginFrame();
          renderer.save();
          renderer.align(
            runtime.Fit.contain,
            runtime.Alignment.center,
            { minX: 0, minY: 0, maxX: pixelWidth, maxY: pixelHeight },
            artboard.bounds
          );
          artboard.draw(renderer);
          renderer.restore();
        };

        // Draw the first frame immediately
        drawFrame(0);
        runtime.resolveAnimationFrame();
        setReadyMascotId(mascot.id);

        if (initialTrigger && triggersRef.current[initialTrigger]) {
          triggersRef.current[initialTrigger]?.trigger();
        }

        const animate = (time: number) => {
          if (cancelled || !runtime) return;
          const elapsed =
            previousTime === undefined
              ? 0
              : Math.min((time - previousTime) / 1000, 0.1);
          previousTime = time;
          drawFrame(elapsed);
          frameId = runtime.requestAnimationFrame(animate);
        };

        frameId = runtime.requestAnimationFrame(animate);
      } catch (error) {
        // Keep the crisp neutral.png poster visible as graceful fallback
        if (!cancelled) {
          console.warn(
            `[KeyQuest] Falling back to static poster for ${mascot.name}:`,
            error
          );
        }
        dispose();
      }
    }

    void boot();

    return () => {
      cancelled = true;
      dispose();
    };
  }, [
    mascot.id,
    mascot.name,
    mascot.artboard,
    mascot.rivUrl,
    mascot.stateMachine,
    initialTrigger,
    size,
  ]);

  const variantClass =
    variant === 'hero'
      ? styles.stageHero
      : variant === 'sanctuary'
        ? styles.stageSanctuary
        : styles.stageMedallion;

  return (
    <div
      className={`${styles.stage} ${variantClass} ${className}`.trim()}
      style={{
        width: variant === 'medallion' ? `${size}px` : undefined,
        height: variant === 'medallion' ? `${size}px` : undefined,
        ['--mascot-accent' as string]: mascot.accentColor,
      }}
      data-testid={`rive-mascot-${mascot.id}`}
      data-rive-ready={riveReady ? 'true' : 'false'}
      aria-hidden="true"
    >
      {/* Instant first-paint poster fallback (hidden smoothly once Rive draws frame 0) */}
      <img
        src={mascot.posterUrl}
        alt=""
        className={`${styles.poster} ${riveReady ? styles.posterHidden : ''}`}
        decoding="async"
      />
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${riveReady ? styles.canvasVisible : ''}`}
        width={size * 2}
        height={size * 2}
        aria-hidden="true"
      />
    </div>
  );
}
