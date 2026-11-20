# Rive splash playback demo

This demo plays the same `.riv` file in two canvases. The first uses Rive’s default playback. The second clears the splash from its own artboard instance before creating the state machine. The demo loads both instances from the same file bytes, so the original export still plays its splash in a stock runtime.

The patch exposes the C++ runtime’s artboard watermark setter to the low-level web runtime as `artboard.clearSplash()`. It uses Rive Web 2.51.0’s Canvas Advanced Lite build. This demo previews the default artboard and its first state machine or animation. Canvas Advanced Lite omits Rive text, audio, layout, and scripting support. [Runtime patch](clear-splash.patch) · [C++ artboard API](https://github.com/rive-app/rive-runtime/blob/bc35f5062f9d9c3e7cca81de9bdd1cfe02579bf3/include/rive/artboard.hpp)

## Run locally

From the KeyQuest directory, run the build with Bash on Linux or WSL. It downloads the pinned Rive sources and builds the patched runtime with upstream’s Emscripten toolchain. On distributions older than Ubuntu 24.04, put a compatible Premake 5.0.0-beta7 build on `PATH` so the upstream script can use it.

```sh
bash tools/rive-splash-demo/build.sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory tools/rive-splash-demo
```

Open [the local demo](http://127.0.0.1:8765/). It starts with Rive’s own watermarked test fixture. Select **Replay** to compare the opening frames again or use the file picker to preview another `.riv` locally in your browser.

The build places the runtime, the fixture, and the upstream MIT notices in `generated/`.
