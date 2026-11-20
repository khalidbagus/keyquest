# Rive Canvas runtime instructions for coding agents

Use this toolkit for browser playback of existing `.riv` assets. The bundled JavaScript and WASM are ready to use. The tool changes playback on each artboard instance. The same `.riv` file still shows its splash in stock players.

1. Inspect the host’s current Rive runtime, artboard and state machine selection, data bindings, and teardown. The toolkit targets the low-level Canvas Advanced Lite browser API. It omits Rive text, audio, layout, and scripting. Check the real asset in the comparison preview before choosing this build for a feature that depends on those capabilities.
2. Follow the [comparison demo instructions](../../tools/rive-splash-demo/README.md) from the KeyQuest root. Compare the included fixture, then load the user’s `.riv` through the file picker. Click **Replay** to compare startup again.
3. Import `createRiveRuntime` and `instantiateRiveArtboard` from `index.mjs` or `@keyquest/rive-canvas`. Load the file with that runtime and use `instantiateRiveArtboard(file, artboardName)` before constructing the state machine, binding its view model, or advancing a frame. Instantiate each root artboard this way, including after a file or artboard switch.
4. Keep the host’s named artboards, state machines, view models, input handling, reduced-motion rules, and resource cleanup. A stock high-level wrapper such as `@rive-app/react-canvas` does not call the toolkit helper. Integrate it in the host’s low-level render loop or adapt the comparison demo.
5. Verify a production build with the actual `.riv`. Check the WASM loads, the artwork is visible on the first frame, the original interactions work, and resource cleanup works when the player unmounts. Report what you tested and which build you used.

See [README.md](README.md) for installation, API usage, deployment, troubleshooting, and source rebuild instructions.
