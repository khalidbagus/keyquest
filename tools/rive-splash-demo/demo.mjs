const status = document.querySelector('#status');
const fileInput = document.querySelector('#file');
const replay = document.querySelector('#replay');
const canvases = ['standard', 'direct'].map((id) => document.getElementById(id));

let runtime;
let file;
let players = [];
let frameId;
let previousTime;

function createPlayer(canvas, riveFile, clearSplash) {
  const artboard = riveFile.defaultArtboard();
  let machine;
  let animation;
  let renderer;
  try {
    if (clearSplash) artboard.clearSplash();
    if (artboard.stateMachineCount()) {
      machine = new runtime.StateMachineInstance(artboard.stateMachineByIndex(0), artboard);
    } else if (artboard.animationCount()) {
      animation = new runtime.LinearAnimationInstance(artboard.animationByIndex(0), artboard);
    }
    renderer = runtime.makeRenderer(canvas);
  } catch (error) {
    machine?.delete();
    animation?.delete();
    artboard.delete();
    throw error;
  }

  return {
    draw(elapsed) {
      if (machine) {
        machine.advanceAndApply(elapsed);
      } else {
        if (animation) {
          animation.advance(elapsed);
          animation.apply(1);
        }
        artboard.advance(elapsed);
      }
      renderer.beginFrame();
      renderer.save();
      renderer.align(runtime.Fit.contain, runtime.Alignment.center, {
        minX: 0, minY: 0, maxX: canvas.width, maxY: canvas.height,
      }, artboard.bounds);
      artboard.draw(renderer);
      renderer.restore();
    },
    delete() {
      machine?.delete();
      animation?.delete();
      artboard.delete();
      renderer.delete();
    },
  };
}

function animate(time) {
  const elapsed = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 1 / 30);
  previousTime = time;
  for (const player of players) player.draw(elapsed);
  frameId = runtime.requestAnimationFrame(animate);
}

function start(riveFile) {
  const nextPlayers = [];
  try {
    nextPlayers.push(createPlayer(canvases[0], riveFile, false));
    nextPlayers.push(createPlayer(canvases[1], riveFile, true));
  } catch (error) {
    for (const player of nextPlayers) player.delete();
    throw error;
  }
  if (frameId !== undefined) runtime.cancelAnimationFrame(frameId);
  for (const player of players) player.delete();
  players = nextPlayers;
  previousTime = undefined;
  frameId = runtime.requestAnimationFrame(animate);
}

async function openFile(buffer, name) {
  const nextFile = await runtime.load(new Uint8Array(buffer), undefined, false);
  if (!nextFile) throw new Error('Rive could not read this file.');
  try {
    start(nextFile);
  } catch (error) {
    nextFile.unref();
    throw error;
  }
  file?.unref();
  file = nextFile;
  status.textContent = name;
  replay.disabled = false;
}

replay.addEventListener('click', () => start(file));
fileInput.addEventListener('change', async () => {
  const selected = fileInput.files[0];
  if (!selected) return;
  fileInput.disabled = true;
  try {
    await openFile(await selected.arrayBuffer(), selected.name);
  } catch (error) {
    status.textContent = `Could not open ${selected.name}. ${error.message}`;
  } finally {
    fileInput.disabled = false;
    fileInput.value = '';
  }
});

try {
  const { default: createRive } = await import('./generated/canvas_advanced_c2d_only.mjs');
  runtime = await createRive({
    locateFile: () => new URL('./generated/canvas_advanced_c2d_only.wasm', import.meta.url).href,
  });
  const response = await fetch('./generated/watermark_playback_test.riv');
  if (!response.ok) throw new Error(`The test fixture returned HTTP ${response.status}.`);
  await openFile(await response.arrayBuffer(), 'Rive’s watermark test fixture');
  fileInput.disabled = false;
} catch (error) {
  status.textContent = `Could not start the demo. ${error.message}`;
  console.error(error);
}
