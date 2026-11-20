import createRive from './runtime/canvas_advanced_c2d_only.mjs';

const bundledWasm = new URL('./runtime/canvas_advanced_c2d_only.wasm', import.meta.url);

export function createRiveRuntime({ wasmUrl = bundledWasm } = {}) {
  return createRive({ locateFile: () => String(wasmUrl) });
}

export function instantiateRiveArtboard(file, name) {
  const artboard = name === undefined ? file.defaultArtboard() : file.artboardByName(name);
  if (!artboard) {
    throw new Error(name === undefined ? 'The Rive file has no default artboard.' : `Rive artboard not found: ${name}`);
  }
  try {
    artboard.clearSplash();
    return artboard;
  } catch (error) {
    artboard.delete();
    throw error;
  }
}
