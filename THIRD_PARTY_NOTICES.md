# Third-party notices

The root MIT License applies to KeyQuest project contributions. It does not replace dependency licenses, grant trademark rights, or establish ownership of unrelated assets.

## Runtime dependencies

The inspected lockfile resolves React and React DOM to 19.3.1; both declare MIT licensing. Their distribution notices are retained in [React](release/licenses/react-LICENSE.txt) and [React DOM](release/licenses/react-dom-LICENSE.txt). Preserve required notices when redistributing bundled code.

## Development and testing dependencies

The lockfile records the exact package versions and declared licenses. Major tools include:

| Package | Declared license |
| --- | --- |
| Vite and Vitest | MIT |
| TypeScript and Playwright | Apache-2.0 |
| `@axe-core/playwright`, `axe-core`, `lightningcss` | MPL-2.0 |
| `caniuse-lite` browser data | CC-BY-4.0 |

`caniuse-lite` packages browser support data from [Can I Use](https://caniuse.com/), maintained by Alexis Deveria and contributors; its declared license is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). These packages support development, testing, and build tooling; their individual files and notices remain under their respective terms. Installed package license files are the source for exact notices. No third-party package source was modified during publication preparation.

The inspected lockfile declares MIT, Apache-2.0, MPL-2.0, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD, BlueOak-1.0.0, and CC-BY-4.0 licenses. This inventory is not a legal opinion or a guarantee about transitive contents.

## Starter structure and assets

KeyQuest incorporates a React/TypeScript/Vite starter structure. The inherited `src/assets/hero.png`, React/Vite logo SVGs (`src/assets/react.svg`, `src/assets/vite.svg`), `public/favicon.svg`, and `public/icons.svg` were byte-compared with the React/TypeScript template in the published npm package `create-vite@9.3.4`: all five match exactly. The complete upstream [create-vite license and bundled notices](release/licenses/create-vite-LICENSE.txt) are retained. Relevant upstream projects: [Vite](https://github.com/vitejs/vite), [React](https://github.com/facebook/react). Their brands remain their owners' trademarks; no endorsement is implied.

Interface illustrations are inline SVG/CSS in the application. The new `release/artwork/keyquest-cover.png` is AI-generated promotional artwork created for this release preparation; its [provenance and full prompt](release/artwork/PROVENANCE.md) are recorded. It is not an application screenshot, certification mark, or implemented mascot feature. The original unused template `hero.png` is preserved.

README screenshots, when included, are captures of the actual local application rather than generated product mockups. System-rendered emoji may vary by operating system. No external font or stock-photo service is loaded by the inspected application source.
