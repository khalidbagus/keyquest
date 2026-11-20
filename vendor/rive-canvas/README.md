# Rive Canvas Runtime

KeyQuest bundles a patched Rive Web 2.51.0 Canvas Advanced Lite runtime. The JavaScript wrapper creates artboard instances and clears their startup splash through the patched WebAssembly binding. The original .riv files still play their startup splash in stock Rive players.

## Preview a .riv file

Follow the [comparison demo instructions](../../tools/rive-splash-demo/README.md) to play the same file with default startup and with the splash cleared.

## Integrate it into a web project

For a bundler using npm, run this from the host project after copying the toolkit into `vendor/rive-canvas`:

```sh
npm install --save ./vendor/rive-canvas
```

```js
import { createRiveRuntime, instantiateRiveArtboard } from '@keyquest/rive-canvas';

const runtime = await createRiveRuntime();
const response = await fetch('/assets/mascot.riv');
if (!response.ok) throw new Error(`Could not load mascot.riv (${response.status})`);

const file = await runtime.load(new Uint8Array(await response.arrayBuffer()), undefined, false);
if (!file) throw new Error('The Rive runtime could not read mascot.riv.');

const artboard = instantiateRiveArtboard(file, 'Mascot');
const controller = artboard.stateMachineByName('CharacterController');
if (!controller) {
  artboard.delete();
  file.unref();
  throw new Error('State machine CharacterController was not found.');
}
const machine = new runtime.StateMachineInstance(controller, artboard);
const viewModel = file.defaultArtboardViewModel(artboard)?.defaultInstance();
if (viewModel) machine.bindViewModelInstance(viewModel);
```

Use your asset’s exact artboard and state machine names. Omit the second argument to `instantiateRiveArtboard(file)` to choose the default artboard. For a timeline-only asset, create a `runtime.LinearAnimationInstance` instead. Then advance and draw with the low-level runtime. The complete browser example includes the render loop, canvas alignment, replay, file swaps, and resource disposal. After stopping the loop, release the renderer and playback instances with `delete()`, then release the artboard with `delete()` and the view model and file with `unref()`. [Browser example](../../tools/rive-splash-demo/demo.mjs)

For a plain HTML project, serve the toolkit over HTTP and import the same functions from `./path/to/toolkit/index.mjs` in a browser module. The JavaScript resolves the adjacent WASM file by default. If a production bundler requires an explicit static asset URL, copy `runtime/canvas_advanced_c2d_only.wasm` into the host’s public assets and pass that deployed URL to `createRiveRuntime({ wasmUrl: '/assets/canvas_advanced_c2d_only.wasm' })`. Adjust the path for subdirectory deployments. Serve WASM as `application/wasm`.

### Compatibility checks

- This is the Canvas Advanced Lite build for the browser. It omits Rive text, audio, layout, and scripting. Test any features your file depends on.
- Call `instantiateRiveArtboard` for every root artboard before its first advance. Stock high-level Rive wrappers use their own instantiation path.
- If the preview stays blank, serve it over HTTP, confirm the JS, WASM, and `.riv` requests succeeded, and check the exact artboard and state machine names. Assets that reference external images also need the host’s asset loader.
- Verify the first rendered frame, the normal animation, and the relevant state-machine inputs or view-model reactions with the actual asset. Reload the production URL to confirm the WASM path resolves there too.

## Rebuild the runtime

The prebuilt files are included. To reproduce them from the KeyQuest root, use Bash on Linux or WSL with Git, curl, tar, Python 3, and Make. The script fetches pinned Rive sources and uses Rive’s Emscripten build. On Linux with glibc below 2.38, put a compatible Premake 5.0.0-beta7 build on `PATH`.

```sh
bash tools/rive-splash-demo/build.sh
```

The [patch](../../tools/rive-splash-demo/clear-splash.patch) exposes the C++ artboard watermark setter via the web binding. The build uses Rive Web commit `1d4622a903e8fe6a7c9b04a8dabe549f7de31e21` and C++ runtime commit `bc35f5062f9d9c3e7cca81de9bdd1cfe02579bf3`. Upstream MIT notices are included for [Rive Web](runtime/rive-wasm-LICENSE.txt) and the [C++ runtime](runtime/rive-runtime-LICENSE.txt).
