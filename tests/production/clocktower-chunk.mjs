// Run after `npm run build`. Checks that Phaser ships in its own chunk (Requirement 27.7):
//  - the entry chunk named by dist/index.html contains no Phaser code,
//  - another chunk does contain Phaser,
//  - dist/index.html has no script, modulepreload, or stylesheet reference to that chunk.
// Prints the Phaser chunk size, raw and gzip (design decision 5).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const assets = join(dist, 'assets');
const html = readFileSync(join(dist, 'index.html'), 'utf8');

// Phaser's runtime carries these strings regardless of minification.
const PHASER_MARKERS = [/phaser\.io/i, /Phaser\.Game|"Phaser"/, /WebGLRenderer/, /ScaleManager/];
const looksLikePhaser = (source) => PHASER_MARKERS.filter((marker) => marker.test(source)).length >= 3;

const scripts = readdirSync(assets).filter((name) => name.endsWith('.js'));
const entryMatch = html.match(/<script[^>]+src="([^"]+\.js)"/);
if (!entryMatch) throw new Error('dist/index.html has no entry script');
const entryName = entryMatch[1].split('/').pop();
const entry = readFileSync(join(assets, entryName), 'utf8');

const failures = [];
if (looksLikePhaser(entry)) failures.push(`entry chunk ${entryName} contains Phaser code`);

const phaserChunks = scripts.filter((name) => looksLikePhaser(readFileSync(join(assets, name), 'utf8')));
if (phaserChunks.length === 0) failures.push('no chunk contains Phaser code');
if (phaserChunks.includes(entryName)) failures.push('the Phaser code is in the entry chunk');

for (const name of phaserChunks) {
  if (html.includes(name)) failures.push(`dist/index.html references the Phaser chunk ${name}`);
}
// A modulepreload or script tag must never name any chunk that holds Phaser or the scene module.
const sceneChunks = scripts.filter((name) => /createWorldScene/.test(name));
for (const name of sceneChunks) {
  if (html.includes(name)) failures.push(`dist/index.html references the scene chunk ${name}`);
}

const tags = [...html.matchAll(/<(script|link)\b[^>]*>/g)].map((match) => match[0]);
for (const tag of tags) {
  for (const name of phaserChunks) {
    if (tag.includes(name)) failures.push(`tag references the Phaser chunk: ${tag}`);
  }
}

for (const name of phaserChunks) {
  const bytes = readFileSync(join(assets, name));
  console.log(
    `Phaser chunk ${name}: ${(statSync(join(assets, name)).size / 1024).toFixed(1)} KiB raw, ` +
      `${(gzipSync(bytes).length / 1024).toFixed(1)} KiB gzip`
  );
}
console.log(`Entry chunk ${entryName}: ${(statSync(join(assets, entryName)).size / 1024).toFixed(1)} KiB raw`);

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Clocktower chunk check: passed (entry has no Phaser; no index.html tag names the Phaser chunk)');
