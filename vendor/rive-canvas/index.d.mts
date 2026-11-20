import type { Artboard, File, RiveCanvas } from './runtime/canvas_advanced_c2d_only.mjs';

export function createRiveRuntime(options?: { wasmUrl?: string | URL }): Promise<RiveCanvas>;
export function instantiateRiveArtboard(file: File, name?: string): Artboard;
