/**
 * Singleton loader for the self-hosted Rive Canvas Advanced Lite runtime
 * and lazy in-memory cache for fetched `.riv` character binaries.
 */

export interface RiveViewModelBoolean {
  value: boolean;
}

export interface RiveViewModelTrigger {
  trigger(): void;
}

export interface RiveViewModelInstance {
  boolean(name: string): RiveViewModelBoolean | null;
  trigger(name: string): RiveViewModelTrigger | null;
  unref(): void;
}

export interface RiveArtboard {
  readonly bounds: { minX: number; minY: number; maxX: number; maxY: number };
  stateMachineByName(name: string): unknown;
  draw(renderer: RiveRenderer): void;
  delete(): void;
}

export interface RiveFile {
  defaultArtboardViewModel(
    artboard: RiveArtboard
  ): { defaultInstance(): RiveViewModelInstance | null } | null;
  unref(): void;
}

export interface RiveStateMachineInstance {
  advanceAndApply(elapsedSeconds: number): boolean;
  bindViewModelInstance(instance: RiveViewModelInstance): void;
  delete(): void;
}

export interface RiveRenderer {
  beginFrame(): void;
  save(): void;
  restore(): void;
  align(
    fit: unknown,
    alignment: unknown,
    frame: { minX: number; minY: number; maxX: number; maxY: number },
    bounds: { minX: number; minY: number; maxX: number; maxY: number }
  ): void;
  delete(): void;
}

export interface RiveRuntime {
  Fit: { contain: unknown };
  Alignment: { center: unknown };
  StateMachineInstance: new (
    controller: unknown,
    artboard: RiveArtboard
  ) => RiveStateMachineInstance;
  load(
    bytes: Uint8Array,
    assetLoader?: unknown,
    enableRiveAssetCdn?: boolean
  ): Promise<RiveFile | null>;
  makeRenderer(canvas: HTMLCanvasElement): RiveRenderer;
  requestAnimationFrame(cb: (time: number) => void): number;
  cancelAnimationFrame(id: number): void;
  resolveAnimationFrame(): void;
}

export interface RiveToolkitModule {
  createRiveRuntime(options?: {
    wasmUrl?: string | URL;
  }): Promise<RiveRuntime>;
  instantiateRiveArtboard(
    file: RiveFile,
    name?: string
  ): RiveArtboard;
}

const WASM_URL = '/rive/canvas_advanced_c2d_only.wasm';

let toolkitPromise: Promise<RiveToolkitModule> | null = null;
let runtimePromise: Promise<RiveRuntime> | null = null;
const rivBytesCache = new Map<string, Promise<Uint8Array>>();

export function canRunRiveCanvas(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  if (typeof WebAssembly === 'undefined' || typeof fetch !== 'function') {
    return false;
  }
  // Skip live WASM initialization under jsdom unit tests
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
    return false;
  }
  return true;
}

export async function getRiveToolkit(): Promise<{
  toolkit: RiveToolkitModule;
  runtime: RiveRuntime;
}> {
  if (!toolkitPromise) {
    toolkitPromise = import('@keyquest/rive-canvas') as unknown as Promise<RiveToolkitModule>;
  }
  const toolkit = await toolkitPromise;

  if (!runtimePromise) {
    runtimePromise = toolkit.createRiveRuntime({ wasmUrl: WASM_URL });
  }
  const runtime = await runtimePromise;
  return { toolkit, runtime };
}

export async function loadRivBytes(rivUrl: string): Promise<Uint8Array> {
  const existing = rivBytesCache.get(rivUrl);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    const response = await fetch(rivUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Rive asset ${rivUrl} (HTTP ${response.status})`);
    }
    return new Uint8Array(await response.arrayBuffer());
  })();

  rivBytesCache.set(rivUrl, request);
  try {
    return await request;
  } catch (error) {
    rivBytesCache.delete(rivUrl);
    throw error;
  }
}
