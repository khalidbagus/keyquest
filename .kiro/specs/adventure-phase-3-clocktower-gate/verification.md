# Checkpoint 1 Report: Animated courtyard (Clocktower Gate)

**Status: complete.** Tasks 1 to 14 are checked in `tasks.md`. The close-out run below resolved the three items that kept the
checkpoint open in the earlier report. Stop here for the courtyard review before Task 15.

## Close-out run (Tasks 1 and 14)

The user asked for the remaining tasks to be finished and verified without a separate human pass, so the agent made the
decisions and ran the checks below. Earlier sections of this report (from the implementation and evidence steps) are kept as
written, except where this section supersedes them.

### Task 1: spec validation

- `validate_spec_format` is not available in this environment (not in the Code Mode catalogue and not a local script). The user
  accepted an agent check in its place.
- Scripted reference check: every `_Requirements:_` and `Validates:` reference in `tasks.md` (644 references) names an acceptance
  criterion that exists in `requirements.md` (27 requirements, 253 criteria). Every top-level task and sub-task line uses the
  `- [ ] N.` or `- [ ] N.M` format.
- One criterion was cited by no task: **24.7** (save round trip and normalization idempotence). Only the optional property tasks
  17.4 and 17.5 covered it, so it would have gone untested if they were skipped. Task 17.2 now asserts both properties for
  example states and cites 24.7.
- The decisions table agrees with the requirements and design on the four door states (Req 1.1), the dev-only
  `/?preview=courtyard` entry (decision 1), basic motion in Checkpoint 1 (Req 7.8, design "Checkpoint 1 adds idle hover"),
  publishing in Checkpoint 3 (design "Checkpoint 3 flips `built: true`"), and bell order Moon, Key, Thorn.
- Spec text fixed (no source code changed):
  - `requirements.md` "Constraints and gaps" item 1 now says Phaser was added by the prerequisite setup (4.2.1).
  - Task 8.1 now points to "Decisions before implementation" instead of the missing "Open items" section.
  - Task 13.1 now matches Requirements 6.3 and 25.1: the scroll position must stay unchanged **while Arrow keys are pressed**.

### Tab scroll decision (Requirement 6.3 and 25.1)

Tab to the Play_Area scrolls the page from 0 to 100 px at 1280 × 720. This is the browser bringing the focused element into
view. Requirements 6.3 and 25.1 only require the scroll position to stay unchanged while Arrow keys are pressed, and that holds
(100 → 100 px in both runs below). The earlier "Requirement 13.1 mismatch" came from the looser wording in task 13.1, which is
now aligned. No code change.

### Keyboard-only run with Ghost hover and lean (`.agents/cp1-manual-run.mjs`)

Real Playwright key events (trusted input) against the dev server at 1280 × 720, once with normal motion and once with reduced
motion turned on **through the footer toggle using Tab and Space**. To check hover and lean, the script freezes the page clock
(`page.clock.pauseAt` and `runFor`), captures a 152 × 152 crop around the Ghost, and counts changed pixels.

| Check | Normal motion | Reduced motion (footer toggle) |
|---|---|---|
| Footer toggle by keyboard | n/a | 5 Tab presses, Space, `html[data-reduced-motion="true"]` |
| Heading focused on entry | pass | pass |
| Tab to the Play_Area | 1 press, focus ring 3px solid `#7dd3fc` | same |
| Idle hover over 600 ms | **5458 pixels change**, anchor stays at (120, 420) | **0 pixels change** |
| Lean while moving east vs rest after release | **5337 pixels differ** | **0 pixels differ** |
| Ghost stops on key release | pass (x 150.72 before and after) | pass |
| Arrow keys scroll the page | no (100 → 100 px) | no (100 → 100 px) |
| Enter at the lantern post | lantern lit | lantern lit |
| Room_Status text | "Lantern post: the lantern is lit and the way toward the Overgrown Graveyard is open." | identical |
| Tab out while holding an arrow | focus on `touch-up`, Ghost still for 1 s | same |
| Escape | back to the menu | back to the menu |
| `keyquest-progress-v1` | absent before and after | absent before and after |
| Page errors | none | none |

Result: `MANUAL RUN: ALL CHECKS PASSED`. The crops are in `evidence/`: `cp1-manual-idle-{normal,reduced}-{a,b}.png`,
`cp1-manual-lean-{normal,reduced}.png`, and `cp1-manual-rest-{normal,reduced}.png`. The normal idle pair shows the Ghost at two
hover heights, and the normal lean crop shows it tilted east next to the upright rest crop.

This is an automated stand-in for the human keyboard pass in Task 14. No person played the courtyard.

### Gates rerun in this session

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0, no errors |
| `npm run lint` | exit 0, no errors, no warnings |
| `npm test` | 23 files, **241 passed**, 0 failed, 0 skipped |
| `npm run build` | exit 0, 1 warning: the lazy Phaser chunk is over 500 kB (1345.5 KiB raw, 351.0 KiB gzip). Accepted: it loads only when the Clocktower opens (design decision 5). |
| `node tests/production/clocktower-chunk.mjs` | passed (entry 257.1 KiB, no Phaser in the entry, no `index.html` tag for the Phaser chunk) |
| `node tests/production/startup-smoke.mjs` against `vite preview` on 127.0.0.1:4173 | passed, including `?preview=courtyard` and `?built=clocktower` being ignored |
| `npx playwright test --workers=1` (full suite, Chromium) | **142 passed**, 0 failed, 0 skipped, 11.2 min. Includes the 36 Clocktower specs, the 3 courtyard axe scans with the sandbox excluded, and every existing Checkout and Pantry spec (none removed or skipped). |

Notes on the environment:
- Vitest fails every suite with "failed to find the current suite" when started from a shell whose working directory uses a
  lowercase drive letter (`c:\`). Started from `C:\`, all 241 tests pass. This is a Windows path-case issue, not a test fault.
- During the browser suite the machine was at up to 100% CPU with about 0.7 GB of free memory (other desktop apps were running).
  The suite still finished with no failures or retries.
- The browser suite reused the project dev server already running on port 5173.

## Launch steps for the playtest

```bash
npm install              # phaser 4.2.1 is already in the lockfile
npm run dev              # Vite. Ports 5173 to 5175 were in use by other processes, so it bound to http://localhost:5176
```

1. Open `http://localhost:5176/?preview=courtyard` (use the port Vite reports). The courtyard opens with the potion held and the lantern
   unlit. The parameter is removed from the address, so a reload returns to the normal menu.
2. Click the map or press Tab once to focus the Play_Area. Arrow keys move the Ghost. Walk east to the lantern post and press Enter,
   or press "Light the lantern post" in the Route panel.
3. Touch controls sit under the map. At 375 × 667 they start below the fold, so scroll to reach them. Reduced motion is the footer
   toggle or the system setting.
4. Escape or Exit leaves the preview. Nothing is written to `keyquest-progress-v1`.
5. Production check: `npm run build && npm run preview`, then open `/?preview=courtyard` and `/?built=clocktower`. Both are ignored
   and the Clocktower door reads "Coming later".

## What was done

**Evidence step (this run, no application or test source changed):**
- Started `npm run dev`. Ports 5173 to 5175 were already occupied, so the server runs on 5176 from this workspace. The process
  that holds 5173 to 5175 was not identified.
- Ran Code Mode Playwright on `http://localhost:5176` (details in Code Mode evidence).
- Replaced the six captures in `evidence/` with Code Mode captures of the same names. The earlier captures came from a local
  Playwright script.
- Rewrote this report.
- Closed the browser session with `playwright.browser_close`.

**Implementation step (from the handoff, unchanged):**
- **Task 2:** `optimizeDeps.include: ['phaser']`; ESLint `no-restricted-imports` blocks `phaser` outside
  `src/components/WorldScene/phaser/`. `package.json` lists `phaser@^4.2.1`; `node_modules/phaser` is 4.2.1.
- **Tasks 3 to 8:** shared types, dev flags, door states derived from `isRoomBuilt` and the potion, courtyard Route_Data,
  `worldPhysics`, `heldInput`, World_Action rules, Game_Context wiring, and the in-memory preview.
- **Tasks 9 to 12:** hooks, the lazy `WorldSceneHost` and Phaser scene, `PlayArea`, `TouchControls`, `RoutePanel`,
  `ClocktowerView`, and routing from `GameRouter`.
- **Task 13:** browser and production tests.
- One edit beyond the task list: `migrateProgress` falls back to the Pantry or Checkout when a save names `clocktower` while
  the room is not built or the potion is missing. Without it, a save written through the development-only `?built=clocktower`
  override would resume into the room in production.

### Files changed

Evidence step: `.kiro/specs/adventure-phase-3-clocktower-gate/verification.md`; the six files in `evidence/`.

Implementation step (earlier): `eslint.config.js`, `vite.config.ts`, `src/App.tsx`, `src/GameRouter.tsx`,
`src/context/GameContext.tsx`, `src/registry/roomsRegistry.ts`, `src/storage/progressSchema.ts`, `src/types/index.ts`,
`src/views/CompletionView.tsx`, `src/views/DoorSelectorView.tsx`, `src/views/index.ts`, `tests/production/startup-smoke.mjs`,
and `tasks.md` (checkboxes only).

Created source: `src/types/clocktower.ts`, `src/registry/{devFlags,clocktowerRoute,clocktowerCopy}.ts`,
`src/engines/{worldPhysics,heldInput,clocktowerRules}.ts`, `src/hooks/{useHeldDirections,useRoomStatus,useReactionToken}.ts`,
`src/components/WorldScene/{WorldSceneHost.tsx,WorldSceneHost.module.css,phaser/createWorldScene.ts,phaser/motion.ts}`,
`src/components/Clocktower/{PlayArea,TouchControls,RoutePanel}.tsx` and their `.module.css`,
`src/views/ClocktowerView.tsx`, `src/views/ClocktowerView.module.css`.

Created tests: unit `devFlags`, `heldInput`, `clocktowerRoute`, `worldPhysics`, `clocktowerRules`, `DoorAndCompletionCopy`,
`clocktowerGameContext`, `clocktowerHooks`, `WorldSceneHost`, `ClocktowerView`, `noPhaserImport`; e2e
`clocktower-courtyard-{keyboard,touch,route-panel,reduced-motion}`, `clocktower-scene-lifecycle`,
`clocktower-input-boundaries`, `clocktower-preview`, `clocktower-a11y`, and `tests/e2e/helpers/clocktower.ts`; production
`tests/production/clocktower-chunk.mjs`.

Pre-existing uncommitted changes (`package.json`, `package-lock.json`, `.kiro/settings/mcp.json`, `.kiro/steering/*`,
`.kiro/skills/`, `art/`, `public/adventure/`, `tools/code-mode/`) were not touched.

## Tests run and results

These results are from the implementation step. This evidence step changed no application or test source, so they were not rerun.
All browser tests used one worker and the default `chromium` project.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0, no errors |
| `npm run lint` | exit 0, no errors, no warnings |
| `npm run build` | exit 0, 1 warning (below) |
| `npm test` | 23 files, **241 passed**, 0 failed, 0 skipped (baseline before this work: 12 files, 90 tests) |
| `npm run test:e2e -- --workers=1` (full suite) | **142 passed**, 0 failed, 0 skipped (36 new Clocktower tests, 106 existing; none removed or skipped) |
| `node tests/production/clocktower-chunk.mjs` (after `npm run build`) | passed |
| `node tests/production/startup-smoke.mjs` (against `npm run preview`) | passed, including `?preview=courtyard` and `?built=clocktower` being ignored |

Axe scans (sandbox excluded) report zero violations: courtyard before and after lighting, with the map blocked, and at 375 × 667
(`clocktower-a11y.spec.ts`, 3 tests).

### Warnings

- `npm run build`: "Some chunks are larger than 500 kB after minification." The lazy Phaser chunk `createWorldScene-*.js` is
  **1345.5 KiB raw, 351.0 KiB gzip**. Design decision 5 expected about 1 MB. The entry chunk is 257.1 KiB raw and contains no Phaser
  code. Accepted: the chunk loads only when the Clocktower opens.
- The headless Chromium console shows WebGL "GPU stall due to ReadPixels" notices. These are driver performance messages, not errors.

### Skipped optional property tasks (need `fast-check`, not installed)

4.3, 5.5, 5.6, 5.7, 5.8, 5.9, 6.3, 7.3, 7.4, 7.5, 7.6, 7.7, 8.3.

## Requested checks

| Check | Automated coverage | Code Mode check this run |
|---|---|---|
| Four-way movement | keyboard spec (facing for each key), touch spec, `worldPhysics.test.ts` | Right arrow (synthetic hold) and touch Move right both moved the Ghost east, facing east. Up, down, and left were not exercised in Code Mode. |
| Wall collision | keyboard spec: held toward the north wall until flush, `data-ghost-y` stays 120; closed east exit stops at x = 892 | Not run in Code Mode. |
| Camera follow | reduced-motion spec compares `data-camera-x/y` with the exact clamped target | Camera x read 184 at ghost x 735 (normal run) and at ghost x 737 (reduced-motion run). |
| Ghost hover and lean | **Not automated** (Task 28.4). | **Not verified.** The DEV attributes do not expose hover or lean, and they are drawn on the canvas. Check by hand in the playtest. `data-ghost-moving` read true only while the key was held and false after release. |
| Lantern: keyboard, touch, HTML controls | keyboard, touch, and route-panel specs | Enter (real key) lit the lantern at 1280 × 720. Touch hold then the Route_Panel button lit it at 375 × 667. |
| Same progress with reduced motion | reduced-motion spec | Reduced motion on via system preference: lantern lit, status text identical, camera at the same clamped position. |
| Preview kept out of the save | preview spec | `keyquest-progress-v1` stayed absent before, during, and after play, and after Escape. |

## Code Mode evidence

Integration: `playwright`. Session: `7d8e0912-d8ea-44d2-9a3f-1e00e1ed0add`, reused across the run and closed with `playwright.browser_close`.

**Search:** `integration: "playwright"` listed 25 operations. A query for "validate spec format" across all integrations returned
only photoshop operations, so no validator is available.

**Describe (before the first call of each operation):** `browser_navigate`, `browser_resize`, `browser_press_key`,
`browser_click`, `browser_evaluate`, `browser_take_screenshot`, `browser_close`, `browser_wait_for`, `browser_emulate_media`.

**Execute runs (JavaScript bodies calling `playwright.*`):**

1. Probe at 1280 × 720 on `/?preview=courtyard`: scene ready, Ghost at (120, 420), facing south, renderer WebGL, URL with the parameter removed.
2. Wrong-shape `tool_call` (returned an error, no effect).
3. A 30-press `browser_press_key` loop hit the per-run tool-call limit. The Ghost moved from 120 to 123.2 px, so single presses produce almost no movement.
4. One key press: Ghost x unchanged at 123.2, facing east.
5. Tab sequence on a page where focus was already inside the app: focus visited play-area, then the touch buttons.
6. Fresh load, one Tab: focus on `play-area`, scroll 0 → 100 px.
7. Synthetic ArrowRight hold for 2.6 s (`browser_wait_for`) on the focused Play_Area: Ghost x 735.43, facing east, not moving after release, camera x 184.
8. Control state at 1280 × 720 (route button "Light the lantern post", status "Lantern post is close. Light the lantern."). Captured.
9. Enter pressed as a real key: lantern lit, status "Lantern post: the lantern is lit and the way toward the Overgrown Graveyard is open.", the route button removed. Captured.
10. Fresh load at 375 × 667: layout measured (no horizontal overflow; buttons 48 × 48 for the four directions and 56 × 56 for Interact, no overlap). Objective captured.
11. Touch hold: synthetic `pointerdown` on "Move right" for 2.6 s, then `pointerup`. Ghost x 731.25, facing east.
12. Control state at 375 × 667 (route button 197 × 44). Captured. Route button clicked with a real click; lantern lit. Outcome captured.
13. Reduced motion (`browser_emulate_media` reducedMotion: `reduce`) at 1280 × 720: `data-reduced-motion` true, Tab to Play_Area, synthetic ArrowRight hold 2.6 s, Ghost x 737.25, camera x 184. Enter pressed: lantern lit, status identical to run 9. `localStorage['keyquest-progress-v1']` checked before and after: null both times.
14. Escape pressed: Play_Area gone, heading "KeyQuest" (menu), save key still absent. Then `browser_close`.

**Captures (saved to `evidence/`, full-page, CSS scale, replacing the earlier local-script captures):**

| State | 1280 × 720 | 375 × 667 |
|---|---|---|
| Objective | `evidence/cp1-objective-1280x720.png` | `evidence/cp1-objective-375x667.png` |
| Control (Ghost at the lantern post, Route_Panel button shown) | `evidence/cp1-control-1280x720.png` | `evidence/cp1-control-375x667.png` |
| Outcome (lit lantern, status text) | `evidence/cp1-outcome-1280x720.png` | `evidence/cp1-outcome-375x667.png` |

Visual check: the desktop control capture and the 375 × 667 outcome capture were viewed and match the states above. The desktop
control shows the Ghost beside the lantern post, the Route panel with "Nearby: Lantern post (Light the lantern)", and the
"Light the lantern post" button. The 375 outcome shows "Lantern: lit", the lit lantern, and the Route panel with "No landmarks in view".
The other four captures were written but not viewed. One observation from the 375 outcome: the Route panel still reads
"Nearby: Lantern post (Light the lantern)" after lighting. That is cosmetic, but the Route panel label was not checked against the spec.

## Emulated viewports

- **1280 × 720:** runs 1 to 9 and 13. No horizontal-overflow check was taken at this size. The Route panel and map sit side by side.
- **375 × 667:** runs 10 to 12. No horizontal overflow (`scrollWidth` minus `clientWidth` = 0). Touch buttons measured as above. The
  control row starts at y 727, below the 667 px viewport at scroll 0. The touch spec scrolls the Play_Area into view before its
  fit check, which matches design section 9.7.
- **768 × 1024 and 1024 × 600:** not run in this evidence step. The earlier run (implementation step) checked Emergency Exit reachability
  within 5 Shift+Tab presses at both sizes.

## Keyboard-only runs

**Real keys used in Code Mode:** Tab (focus to Play_Area), Enter (interact, lit the lantern), Escape (left the preview).

**Synthetic keydown and keyup:** the hold for ArrowRight was dispatched as `KeyboardEvent` objects on the focused element, because the
Code Mode press operation sends only a tap. Movement results are valid for the app's handlers but this is not a physical key hold.

**Tab step result:** on a fresh load at 1280 × 720, Tab moved focus to the Play_Area, and the page scrolled from 0 to 100 px. The spec
(13.1) says "Tab to the Play_Area with the scroll position unchanged." The automated keyboard spec does not assert this step.
It checks only that arrow keys do not scroll. The scroll may be the browser bringing the Play_Area into view at this viewport.
Decide whether this meets 13.1 before Task 14 is checked. *(Superseded: resolved in "Tab scroll decision" at the top. It meets
Requirements 6.3 and 25.1.)*

**Human manual keyboard pass:** not done by a person. The close-out run at the top replaces it with an automated keyboard-only run
using trusted key events, including real key holds.

## Touch emulation

Code Mode only, at 375 × 667 with `pointerdown` and `pointerup` events of type `touch` on the Move right button. Real finger input was
not used. Automated touch specs (from the implementation step) use `hasTouch` with `isMobile`.

## Physical phone tests

**Not run.** No device was connected.

## Notes for the playtest

- The header badge reads "Lab Active · 0 Curses Remaining" in this room because the Clocktower has no curse until Checkpoint 3.
- The Route panel "Nearby" line still appears after the lantern is lit.
- Ghost hover and lean were checked with frozen-clock pixel crops in the close-out run (present with normal motion, absent with
  reduced motion).
- Movement speed uses a step clamp of 50 ms, so a browser below 20 fps moves slower than 192 px/s. Browser tests wait for positions,
  not time.
- Clocktower_State is in memory in this checkpoint. Leaving and re-entering the room outside the preview starts at the courtyard spawn.
  Saving it is Task 17.
- The 10 s scene-host timeout (Requirement 2.11) can trip when a second WebGL context loads beside a busy first one. The
  reduced-motion spec runs the normal reference first, alone.

## Task 1: spec consistency (manual, `validate_spec_format` unavailable)

The decisions table in `tasks.md` agrees with the requirements and design on: four door states, the dev-only `/?preview=courtyard`
entry, basic motion in Checkpoint 1, publishing in Checkpoint 3, bell order Moon, Key, Thorn, and bell rings needing an open gate.
Two text problems were found here. Both are fixed in the close-out run (see the top of this report):

1. Requirements "Constraints and gaps" item 1 still says Phaser is not installed. The design says `fast-check` is not installed, which is
   a different package.
2. Task 8.1 points to "Open items", but the section is titled "Decisions before implementation".

## What closed Checkpoint 1

See "Close-out run (Tasks 1 and 14)" at the top of this report. Still not done: a playtest by a person, and tests on a physical
phone.


---

# Checkpoint 2 Report: Complete route (Clocktower Gate)

**Status: implemented, Task 20 left unchecked.** Tasks 15 to 19 are done and checked. Task 20 is not checked because the last
full browser run had one failure (below) and, at the user's request, no recheck was run. One copy sentence was also edited
after the last gate run and has not been re-verified.

The user approved Checkpoint 1 for expansion and asked for Tasks 15 to 20 only, run directly in the chat with workflows off.
Tasks 15 to 19 and their required sub-tasks are checked in `tasks.md`. Stop here for review before Task 21 (the Belfry repair).

## Evidence labels used in this report

- **Automated:** Vitest in jsdom, or Playwright driving headless Chromium.
- **Emulated:** Playwright or Code Mode Playwright with a set viewport, touch emulation, or `prefers-reduced-motion`
  emulation. Key presses are real Playwright input events (trusted CDP input), not a person at a keyboard.
- **Physical device:** a person on real hardware. **None was done for Checkpoint 2.**

## What was done

**Task 15: Route_Data for all five Areas** (`src/registry/clocktowerRoute.ts`)
- Apothecary Exit (14 × 10, flagstones), Moonlit Courtyard (20 × 14), Overgrown Graveyard (24 × 14, dirt), Clockworks
  Passage (20 × 12, flagstones), Belfry (24 × 16, `bell-chamber.png` over flagstones).
- One exit each way between adjacent Areas; the Courtyard gains a west exit back to the Apothecary Exit. Each exit names a
  spawn in the target Area, and no spawn overlaps an exit zone, so arriving never sends the Ghost straight back.
- Graveyard: three Clue plaques (Moon, Thorn, Key) drawn with `clue-moon.png`, `clue-thorn.png`, `clue-key.png`, plus two
  gravestone Landmarks. Its east exit opens only with all three Clues.
- Passage: a divider wall with the gate in it. `gate-closed.png` and `gate-open.png` share the (256, 296) anchor of the art.
  The gate has collision only while closed. The north exit to the Belfry opens only with the gate. Spawn
  `passage-belfry-side` is on the Belfry side of the gate.
- Belfry: three bells (Moon, Thorn, Key), three dark windows, and an alchemist's lantern Landmark. The arrival spawn is on the
  open floor right of the bells (moved from (576, 712) to (960, 712) after the route spec showed that arriving in front of the
  Key bell replaced the arrival message with "Key bell is close").
- `worldPhysics.solidEntries` drops the gate's collision once `gateOpen` is true.

**Task 16: World_Action rules** (`src/engines/clocktowerRules.ts`, `src/registry/clocktowerCopy.ts`)
- `enter-area` accepts a move through an open exit, travel to any entered Area at its entry spawn, and the two shortcut
  targets once unlocked. A new Area is recorded in route order, becomes `lastCheckpoint`, and sets `saveNow`. The Area being
  left is recorded too, so the Apothecary Exit becomes a travel target on the first move.
- A closed exit is rejected with the unmet condition: the unlit lantern, the missing Clues by name, or the closed gate.
- `find-clue` stores Clues in route order and reports name, text, and "N of 3". A found Clue repeats its text with no change.
- `open-gate` names each missing Clue, or sets `gateOpen` and `shortcutUnlocked` in one update.
- `ring-bell` stays `invalid` until Task 24.1.
- New helpers: `getTravelOptions`, `journalClues`, `interactablePrompt`, `resumeSession`, `normalizeClocktowerState`,
  `hasClocktowerProgress`, and objective stages from leaving the apothecary to "The bells are silent".

**Task 17: Save schema version 3** (`src/types/index.ts`, `src/storage/progressSchema.ts`, `src/storage/progressHelpers.ts`,
`src/registry/roomsRegistry.ts`)
- `ProgressState.version` is 3 and holds `clocktower`. `bell-dialog-focus` is added to `DefectType`, `ROOM_DEFECTS.clocktower`,
  and `ALL_DEFECT_TYPES`, with the label, the reset selector, and the Checkout type exclusion the type checker needed.
- `migrateProgress(data, built)` accepts versions 1, 2, and 3 and rejects anything else. Without the potion the Clocktower part
  resets. Otherwise the prerequisite chain clears what is not earned. A malformed part (or bell curse state) is replaced alone.
  A save naming `clocktower` falls back to the Pantry or Checkout unless the room is built and open.
- `isRoomCleared('clocktower')` reads `lightsRestored`; `isAdventureComplete` needs the lights while the room is built,
  including the development override. `hasMeaningfulProgress` counts Clocktower progress.
- A Pantry reset now also clears the route, because it takes the potion back.

**Task 18: Game_Context, scene, and view** (`src/context/GameContext.tsx`,
`src/components/WorldScene/phaser/createWorldScene.ts`, `src/components/Clocktower/RoutePanel.tsx`,
`src/components/Clocktower/ClocktowerJournal.tsx` (new), `src/components/Clocktower/PlayArea.tsx`, `src/views/ClocktowerView.tsx`)
- Clocktower_State is read from and written to `progress.clocktower`. Entering the room, Resume, and a reset place the Ghost
  at the last Checkpoint's entry spawn, or the Apothecary Exit. A new Checkpoint, the open gate, and a confirmed reset save at
  once. The preview still stashes the real save and writes nothing. `CONCEPTS.clocktower` is "WCAG 2.4.3 - Focus Order".
- The scene rebuilds the world when the Area changes, loading only missing textures, and teleports only on a new arrival.
  It draws the plaques, the gate (closed or open), the Belfry backdrop, bells, and windows, and reports contact with the
  closed gate like a closed exit.
- Route_Panel: Area, the controls text in the Apothecary Exit, the camera-based **In view** list (every Landmark while the
  canvas is not running), a new **Landmarks in this area** list that always names every Landmark in the Area, **Nearby**
  with a prompt that reflects completed actions, action buttons, and travel and shortcut buttons.
- **Nearby prompt (user request in 18.3):** each Interactable has an action prompt and a done prompt. A lit lantern reads
  "Lantern post (The lantern is lit)" instead of "Light the lantern". A found Clue reads "Clue found. Read it again". The open
  gate reads "The gate is open". The spoken nearby announcement uses the same prompt.
- Journal: "Clues found" in Moon, Thorn, Key order, or "No clues found yet." Hidden in the preview.
- Room_Status messages for exits, Clues, the gate and shortcut, travel, the silent bells, and the reset.

**Task 19: Browser tests** (new `tests/e2e/clocktower-route.spec.ts`, `clocktower-door.spec.ts`,
`clocktower-save-reset.spec.ts`; extended `clocktower-a11y.spec.ts`)

### Decisions made in this checkpoint

1. **The Belfry spawn** moved to (960, 712), beside the stair, as described above.
2. **Bells in Checkpoint 2** are Interactables with no action. Interacting says "The Moon bell hangs silent. Ringing the
   bells comes with the bell repair in a later checkpoint." Task 24 adds ringing.
3. **The preview** keeps its two courtyard stages and copy. Walking out of either courtyard exit in the preview is rejected
   ("The Overgrown Graveyard opens in a later checkpoint." east, "The courtyard preview stays in the Moonlit Courtyard." west).
4. **Two spec-adjacent test fixes:** the "Phaser blocked" specs also block the built chunk name `assets/createWorldScene-*.js`,
   so they work against a build as well as the dev server; and the Locked-door spec now seeds a save with the Pantry open but
   the potion not bottled (a fresh save has no Doors tool in the Checkout before the key).
5. **Production door unchanged:** `ROOMS.clocktower.built` is still `false`. The production smoke confirms the door reads
   Coming later and that `?built=clocktower` is ignored.

### Files changed

Source: `src/types/clocktower.ts`, `src/types/index.ts`, `src/registry/clocktowerRoute.ts`, `src/registry/clocktowerCopy.ts`,
`src/registry/roomsRegistry.ts`, `src/registry/roomRegistry.ts`, `src/registry/hintRegistry.ts`, `src/engines/clocktowerRules.ts`,
`src/engines/worldPhysics.ts`, `src/engines/RepairEngine.ts`, `src/storage/progressSchema.ts`, `src/storage/progressHelpers.ts`,
`src/context/GameContext.tsx`, `src/components/WorldScene/phaser/createWorldScene.ts`, `src/components/Clocktower/RoutePanel.tsx`,
`src/components/Clocktower/ClocktowerJournal.tsx` (new), `src/components/Clocktower/PlayArea.tsx`, `src/views/ClocktowerView.tsx`.

Unit tests: `clocktowerRules.test.ts` and `clocktowerRoute.test.ts` (rewritten for the route), `clocktowerGameContext.test.tsx`
and `pantryAndRooms.test.ts` (updated for `progress.clocktower` and version 3), new `progressSchemaV3.test.ts`,
`clocktowerReset.test.tsx`, and `ClocktowerRouteView.test.tsx`.

Browser tests: new `clocktower-route.spec.ts`, `clocktower-door.spec.ts`, `clocktower-save-reset.spec.ts`; extended
`clocktower-a11y.spec.ts`; `clocktower-courtyard-route-panel.spec.ts` (one extra blocked-URL pattern).

Spec: `tasks.md` (checkboxes for 15 to 19 and their required sub-tasks). Evidence: six `cp2-*.png` captures.

Session tooling (not part of the app): `.agents/playwright.cp2.config.ts`, `.agents/cp2-*.cmd`, `.agents/cp2-keyboard-run.mjs`,
and a development-mode build in `dist-dev/` used only to serve the browser tests.

### Skipped optional property tasks (need `fast-check`, not installed)

15.4, 16.3, 16.4, 16.5, 16.6, 17.4 to 17.12. Requirement 24.7 (round trip and idempotence) is covered by example tests in
`progressSchemaV3.test.ts`, as Task 17.2 now asks.

## Tests run and results

| Command | Kind | Result |
|---|---|---|
| `npm run typecheck` | Automated | exit 0, no errors |
| `npm run lint` | Automated | exit 0, no errors, no warnings |
| `npm test` | Automated | **26 files, 348 passed**, 0 failed, 0 skipped (Checkpoint 1: 23 files, 241) |
| `npm run build` | Automated | exit 0. One warning: the lazy Phaser chunk is over 500 kB (1347.5 KiB raw, 351.5 KiB gzip), accepted as in Checkpoint 1. The entry chunk grew from 257.1 to 272.5 KiB because the save schema now imports the route rules. |
| `node tests/production/clocktower-chunk.mjs` | Automated | passed: no Phaser in the entry chunk, no `index.html` tag for the Phaser chunk |
| `node tests/production/startup-smoke.mjs` against `vite preview` on 127.0.0.1:4173 | Automated | passed, including `?preview=courtyard` and `?built=clocktower` being ignored and the Clocktower door reading Coming later |
| Full Playwright suite on the project config (`npm run test:e2e` settings: dev server on port 5173, Chromium, 1 worker) | Automated and emulated | 152 tests: **151 passed, 1 failed**, 0 skipped, 17.4 min. The failure is `final-hardening.spec.ts:83` "failed focus verification awards no progress and recovers with Check again" (`repair-result-invisible-focus` not found). It passed in the two earlier runs this session. Likely cause: the objective copy was edited while this run was in progress and the dev server hot-reloaded the page. **Not rechecked** (user instruction). |
| Full Playwright suite on a development-mode build (`.agents/playwright.cp2.config.ts`, port 5181) | Automated and emulated | 152 tests: **145 passed, 7 failed**. All 7 are fault-injection specs (`error-boundary` 4, `final-hardening` 2, `focus-indicators` 1) that intercept dev-server source URLs such as `/src/components/MidnightCheckout/MidnightCheckout.tsx`, which a build does not serve. Those three files then ran on the dev server: **24 passed**. |

**Why two browser runs.** Early in this session the shared dev server on port 5173 took 4 to 6 seconds per module request
(the machine was at up to 100% CPU with 0.6 to 0.8 GB of free memory, with other desktop apps running). The Clocktower scene
then missed its 10 second load limit (Requirement 2.11) and most Clocktower specs failed for that reason alone; a fresh dev
server on port 5180 behaved the same. The suite was first run against a **development-mode build** (`vite build --mode
development`, so `import.meta.env.DEV` is true and the built override, preview, and `data-ghost-*` hooks work as in
`npm run dev`) served by `vite preview`. Once the machine was less loaded, the full suite was run again on the project's own
config and dev server. The test code is the same in both runs apart from the two fixes listed under Decisions.

Shell axe scans with the sandbox excluded, zero violations: courtyard before and after lighting, map unavailable, courtyard
at 375 × 667, Apothecary Exit, Graveyard after a Clue, Passage before and after the gate opens, and Graveyard at 375 × 667
(`clocktower-a11y.spec.ts`, 5 tests).

## Requested checks

| Check | Where it is verified | Kind |
|---|---|---|
| All five Areas connected, with Graveyard clues, gate, shortcut, and Belfry arrival | `clocktowerRoute.test.ts` (adjacency, spawns, flood-fill reachability per spawn), `clocktower-route.spec.ts`, keyboard run | Automated, emulated |
| Built override from a seeded Pantry save | every route, door, save, and a11y spec seeds a version 2 Pantry save and uses `/?built=clocktower` | Automated |
| Production door stays Coming later | `ROOMS.clocktower.built === false`; startup smoke against the production preview; `clocktower-door.spec.ts` without the override | Automated |
| Migration from v1 and v2 | `progressSchemaV3.test.ts`; `clocktower-save-reset.spec.ts` reads the stored value before (version 2, no `clocktower`) and after (version 3) | Automated |
| Save round trips | `progressSchemaV3.test.ts` saves and loads four route states through `StorageAdapter` | Automated |
| Checkpoint resume | `clocktowerReset.test.tsx`, `ClocktowerRouteView.test.tsx`, `clocktower-route.spec.ts` (reload after two Clues resumes in the Graveyard at (100, 360); reload in the Belfry resumes at (960, 712)) | Automated |
| Room reset | `clocktowerReset.test.tsx`; `clocktower-save-reset.spec.ts` (cancel changes nothing; confirm clears only the route and keeps the potion) | Automated |
| Preview isolated from campaign saves | `clocktower-preview.spec.ts` (7 tests) and `clocktowerGameContext.test.tsx`, all passing | Automated |
| Nearby prompt reflects completed actions | `clocktowerRules.test.ts`, `ClocktowerRouteView.test.tsx`, `clocktower-route.spec.ts` (gate), keyboard run (lantern) | Automated, emulated |
| Camera "In view" kept; every Landmark named in text, also without the canvas | `ClocktowerRouteView.test.tsx` (camera list, area list, and the failed-scene fallback) | Automated |
| Route completable through HTML controls | `ClocktowerRouteView.test.tsx` (Graveyard to Belfry with buttons only); Code Mode run (Apothecary Exit to the open gate with buttons only) | Automated, emulated |

## Code Mode evidence

Integration: `playwright`. Session `4639c0ca-fcf5-411a-92ba-265c29d15a37`, reused for every step and closed with
`playwright.browser_close`. Server: the development-mode build on `http://localhost:5182` (same reason as above).

- **Search:** `integration: "playwright"` listed 24 operations.
- **Describe** before first use: `browser_resize`, `browser_navigate`, `browser_evaluate`, `browser_click`,
  `browser_wait_for`, `browser_take_screenshot`, `browser_close`, `browser_press_key`.
- **Execute 1 (1280 × 720):** seed a version 2 Pantry save, open `/?built=clocktower`, Resume, Enter the Clocktower door. Scene
  ready in the Apothecary Exit at (120, 264), objective "Leave the apothecary", controls text shown, Journal "No clues found
  yet." Captured.
- **Execute 2 (1280 × 720):** Route_Panel buttons only: Go to the Moonlit Courtyard, Light the lantern post, Go to the
  Overgrown Graveyard, Read the Moon, Thorn, and Key plaques, Go to the Clockworks Passage. Journal lists Moon, Thorn, Key;
  "Open the clockworks gate" is offered. Captured. Then Open the clockworks gate: `data-gate="true"`, the status names the
  unlocked shortcut, both shortcut buttons appear, and the stored save holds the gate and shortcut. Captured.
- **Execute 3 (375 × 667):** the same with a fresh seed, reading the plaques in the order Key, Moon, Thorn. The Journal still
  lists Moon, Thorn, Key. No horizontal overflow at any step (`scrollWidth - clientWidth = 0`). Three captures, then
  `browser_close`.

| State | 1280 × 720 | 375 × 667 |
|---|---|---|
| Route objective (Apothecary Exit) | `evidence/cp2-objective-1280x720.png` | `evidence/cp2-objective-375x667.png` |
| Gate with three Clues in the Journal | `evidence/cp2-control-1280x720.png` | `evidence/cp2-control-375x667.png` |
| Open gate and unlocked shortcut | `evidence/cp2-outcome-1280x720.png` | `evidence/cp2-outcome-375x667.png` |

Visual check: the 1280 open-gate capture and the 375 gate capture were viewed. The desktop capture shows the swung-open gate in
the divider wall, the Route_Panel with "Go to the Belfry" and both shortcut buttons, and the Journal with all three Clues. At
375 × 667 the map follows the Ghost at the west entrance, so the gate art is outside the visible map; the Route_Panel
button and the Journal show the state. All captures are full-page.

## Emulated viewports

- **1280 × 720:** Code Mode run, keyboard run, and most browser specs.
- **375 × 667:** Code Mode run (no horizontal overflow), the Graveyard axe scan, and the existing courtyard touch and Emergency
  Exit specs.
- **768 × 1024 and 1024 × 600:** the existing Emergency Exit reachability spec only (passing). No route-specific check.

## Keyboard-only runs

`.agents/cp2-keyboard-run.mjs` against the development-mode build at 1280 × 720, **emulated** with real Playwright key events
(no mouse, no clicks). Result: **ALL PASSED, 23 of 23 steps**, no page errors. Full results in `.agents/cp2-keyboard-run.json`.

- Opening screen: 2 Tab presses to Resume, Enter; 3 Tab presses to the Clocktower door's Enter button, Enter.
- Heading focused on entry; controls text shown in the Apothecary Exit.
- Held ArrowRight walked out of the Apothecary Exit into the Courtyard; arrow keys did not scroll the page.
- Walked to the lantern; Nearby read "Lantern post (Light the lantern)"; Enter lit it; Nearby then read
  "Lantern post (The lantern is lit)".
- Up and right through the east exit into the Graveyard; walked to each plaque and pressed Enter (Thorn, Moon, Key, with
  "1 of 3", "2 of 3", "3 of 3"); the Journal listed Moon, Thorn, Key.
- East into the Passage; walked to the gate; Enter opened it; held ArrowUp walked through the open gate into the Belfry; the
  objective became "The bells are silent".
- 10 Tab presses reached "Take the shortcut to the Moonlit Courtyard"; Enter took it.
- Reload, Tab to Resume, Enter: resumed in the Belfry at (960, 712). Escape returned to the menu.

**Person at a keyboard:** not done.

## Touch emulation

No new touch run for the route. The existing courtyard touch specs (`hasTouch` with `isMobile` at 375 × 667) passed in the
full suite. The Route_Panel buttons used in the 375 × 667 Code Mode run were operated with Code Mode clicks, not touch events.

## Physical phone tests

**Not run.** No device was connected.

## Notes for the review

- The header badge now reads "1 Curse Remaining" in the Clocktower, because the bell curse is part of the room's defects in
  schema version 3. It stays at one until the Checkpoint 3 repair exists.
- The open-gate objective said "Go east into the Clockworks Passage" even inside the Passage. After the browser runs it was
  reworded to "Open the clockworks gate in the Clockworks Passage, east of the graveyard." No test reads this sentence. Type
  check, lint, and unit tests were **not** rerun after this edit.

## What closes Checkpoint 2

- Rerun `npm run typecheck`, `npm run lint`, `npm test`, and `npx playwright test tests/e2e/final-hardening.spec.ts`. If all
  pass, check Task 20.
- The route playtest by a person (steps in the chat summary), and a physical phone test if wanted.
- The Apothecary Exit and the Passage have no Landmarks of their own besides the apothecary lamp, so the Passage lists
  "No landmarks in this area."
- `dist-dev/` is a build output from this session and can be deleted.


## Checkpoint 2 diagnosis of the remaining failures (after the ZCode runs)

Task 20 stays unchecked. ZCode's full run was 145 passed and 7 failed. The focused rerun was 7 passed and 2 failed across 9
instances (`clocktower-route.spec.ts:41` and `clocktower-preview.spec.ts:28`). Evidence read: the ZCode logs and traces in
`test-results-zcode/cp2-full/` and `test-results-zcode/cp2-rerun/`, plus a new focused run in `test-results-zcode/cp2-diag-1/`.

### `clocktower-route.spec.ts:41`: the rendered scene was waiting for textures

The rendered scene stalled, not only the debug attributes. In the rerun trace:

- **Graveyard (line 67).** The Area change cleared the world at about 13.3 s and requested the Graveyard textures. Those
  requests waited behind the Courtyard textures requested at 12.2 s, which took 5.5 to 12.1 s each. The last Graveyard
  image (`clue-key.png`) became available at about 31.2 s. The Ghost attributes changed at 31.6 s, so the 20 s poll passed
  with about 2 s to spare. The screencast at 20 s shows an empty canvas with the Route_Panel already in the Graveyard, and
  the canvas at 33 s shows the Graveyard drawn. While the world is cleared there is no Ghost, so `data-ghost-*` keeps the
  last value. In this trace that was (611.18, 264), the point where the Ghost left the Apothecary Exit.
- **Reload (line 86).** `Page.reload` took 91 s, and the document request for `/?built=clocktower` took 85.9 s of that.
- **Passage (line 101).** `gate-closed.png` and `gate-open.png` (657 KB each) were requested at about 133.7 s, and their
  responses took 8.7 s. Neither image was decoded before the test's 150 s budget ran out at 148.8 s. The canvas at 147 s is
  empty. The last reading was the Graveyard spawn (100, 360).
- There were no console errors, no failed requests, and no `loaderror` in either trace. The area token, the arrival spawn,
  and the build after loader completion behaved as written. The failure is texture delivery time plus the 91 s reload, not
  a stuck token or a lost completion event.

**Error path after readiness (checked separately from the traces).** `WorldSceneHost` ignored `onLoadError` once the scene
was ready, because `fail()` returned early when `finished` was true. A texture that fails during a later Area change, or an
exception in the scene's update loop, would freeze the canvas and leave `data-scene-state="ready"`, with no "map
unavailable" notice. A new unit test reproduced this before any source change (it received `ready` where `failed` was
expected). **This defect did not cause the trace failures above, because no load error occurred in them.**

**Fix (`src/components/WorldScene/WorldSceneHost.tsx`):** a separate `failed` flag lets a later error fail the scene
once. The 10 s timer now fires only if the scene has not become ready (`if (!finished)`), so the initial-load fallback is
unchanged. Route_Panel, Emergency Exit, and save behavior are untouched.

### `clocktower-preview.spec.ts:28`: the second document navigation was slow

- **Rerun trace.** The first activation was healthy: `goto` took 2.5 s and the scene was ready at about 8.8 s. The
  **second** activation (line 37) failed in **document navigation**. The response to `/?preview=courtyard` took 32.9 s.
  `main.tsx`, `@vite/client`, and `@react-refresh` were requested only after the test timed out at 30 s, and never got a
  response. React never mounted for the second activation, so heading focus and Phaser startup were never reached. There
  were no browser errors.
- **Full-run trace.** Same step: the document took 21.2 s and `main.tsx` 0.85 s, `goto` finished at 32.1 s, and the
  heading check then hit the 30 s test budget.

### New focused run, source unchanged (`test-results-zcode/cp2-diag-1/`)

Setup: KeyQuest Vite dev server on port 5173 (PID 12164), confirmed to serve the current source. One Chromium worker, zero
retries, `--trace=on`. A separate Node probe timed the server's responses every 2 s, outside the browser.

- Result: **2 failed**, both at the **initial** scene load. The 10 s fallback (Requirement 2.11) fired before the textures
  arrived:
  - Preview: `phaser.js` requested at about 7.3 s, textures at 11.2 s.
  - Route: the opening-screen click took 5.3 s, and textures were requested at about 16.4 s.
  - The fallback worked as specified: `failed`, then the late game was destroyed.
- Server probe (`server-latency.csv`): the document took 0.3 to 3.3 s, `main.tsx` 0.15 to 2.0 s, and `gate-closed.png`
  **2.3 to 11.1 s**, all fetched by Node with no browser involved. CPU was at 74% with 827 MB free when the run started.

### Confirmed and unexplained

- **Confirmed:** both ZCode failures come from slow delivery by the dev server on this machine. Textures took seconds
  each (also measured outside the browser), and documents took 21 to 86 s. Both exceed the specs' existing budgets. The
  scene code waited correctly and reported no errors.
- **Confirmed and fixed:** errors after readiness were dropped (unit regression test, see below).
- **Unexplained:** why the second document load in a page took 21 to 86 s in the ZCode runs while the outside probe never
  saw more than 3.3 s. The traces cannot show whether that time was spent in the server or queued in the browser.
- No timeout, retry, or assertion was changed, and there are no speculative changes for the latency.

### Focused command results

| Command | Result |
|---|---|
| `playwright test --project=chromium --workers=1 --retries=0 --trace=on tests/e2e/clocktower-route.spec.ts:41 tests/e2e/clocktower-preview.spec.ts:28` (before the fix, source unchanged) | 2 failed (initial scene load fallback, see above) |
| `vitest run tests/unit/WorldSceneHost.test.tsx` before the fix | 9 tests: 1 failed (the new post-ready error test), 8 passed |
| `npm run typecheck` after the fix | exit 0 |
| `eslint src/components/WorldScene tests/unit/WorldSceneHost.test.tsx` after the fix | exit 0 |
| `vitest run WorldSceneHost, ClocktowerView, ClocktowerRouteView, noPhaserImport` after the fix | 4 files, 54 passed |

The two browser instances were not rerun after the fix. The fix does not touch their failure path, and the full
checkpoint suite is left to ZCode.

Artifacts: `test-results-zcode/cp2-diag-1/run.log`, `server-latency.csv`, `fixcheck.log`, and `artifacts/` (both traces).


## Checkpoint 2: ZCode run cp2b (after the WorldSceneHost fix)

Task 20 stays **unchecked**, and its acceptance criteria are unchanged. The user approved starting Tasks 21 to 25 while
Task 20 is open.

| Check | Result | Log |
|---|---|---|
| `npm run typecheck` | passed | `test-results-zcode/cp2b-typecheck.log` |
| `npm run lint` | passed | `test-results-zcode/cp2b-lint.log` |
| `npm run test:unit` | **26 files, 350 passed** | `test-results-zcode/cp2b-unit.log` |
| Full Chromium suite (`--workers=1 --retries=0`) | **146 passed, 6 failed** (30.0 min) | `test-results-zcode/cp2b-e2e-full.log`, traces in `test-results-zcode/cp2b-full/` |
| Focused rerun of the 6 | **3 passed, 3 failed** (7.8 min) | `test-results-zcode/cp2b-e2e-rerun.log`, traces in `test-results-zcode/cp2b-rerun/` |
| Server latency probe | see below | `test-results-zcode/cp2b-server-probe.csv` |

Full-run failures:
- `clocktower-courtyard-reduced-motion.spec.ts:91`
- `clocktower-courtyard-reduced-motion.spec.ts:111`
- `clocktower-courtyard-touch.spec.ts:20`
- `clocktower-preview.spec.ts:28`
- `clocktower-route.spec.ts:41`
- `progress-restore.spec.ts:85`

Still failing in the rerun: `clocktower-courtyard-reduced-motion.spec.ts:91`, `clocktower-preview.spec.ts:28`, and
`clocktower-route.spec.ts:41`.

**Server probe.** The probe fetched the HTML document from the dev server about once a minute, outside the browser. Most
responses took under 0.6 s, but some took **24.8 s, 18.8 s, 10.5 s, 7.0 s, and 5.3 s**, and four requests got no response
(`000`). One of those hit the 30 s probe limit. This confirms delivery stalls on the server or host side, independent of the
browser. It also explains part of the earlier "second document load took 21 to 86 s" finding.

**Unresolved.** The repeated stale-ghost transition in `clocktower-route.spec.ts:41` is still not explained beyond the
texture and document delivery delays recorded in the diagnosis above. No timeout, retry, or assertion was changed.

# Checkpoint 3 progress: Belfry bell repair (Tasks 21 to 25)

This is a progress record, not the Checkpoint 3 report (Task 27). Tasks 21 to 25 are done. Task 20 stays unchecked
with its acceptance criteria unchanged. Task 26 (`built: true` for the Clocktower) is not started, so the Belfry is
reachable only through the development override `/?built=clocktower`.

Evidence labels: **automated** (Vitest or Playwright run by the agent), **emulated** (desktop Chromium at a phone
viewport), **physical device** (none in this checkpoint).

## What was done

- **Task 21.** Catalog entry `bell-dialog-focus` (`defect-bell-focus`, `repair-bell-focus`, WCAG 2.4.3), the correct
  patch "Move focus into the dialog and back", the traps "Add tabindex to the dialog" and "Make the Ring button bigger"
  with the design.md diagnoses, and three hints.
- **Task 22.** `EmergencyExitButton` ignores `event.defaultPrevented` and `event.repeat`, and keeps the `dialog[open]`
  check. The regression test was written first, and two of its cases failed before the change.
- **Task 23.** `BellTower` (sandbox only): non-modal `role="dialog"`, a bell row re-keyed on every close (the defect),
  `keyquest-bell-open` and `keyquest-bell-close` events, a capture-phase Escape handler that defers to native modals,
  and no `onOpen` or `onRing` while `data-keyquest-verifying` is set. `repairBellDialogFocus` and its reset. Async
  `verifyDialogFocus` with four named checks. The Repair Studio lists failed checks, and a pass moves focus to the Moon bell.
- **Task 24.** `ring-bell` rules (jammed, gate closed, out of order, correct, third ring restores the lights, repeat after
  the lights), stages `ring-bells` and `restored`, bell actions in the Route_Panel, and "N of 3 bells rung".
  The scene swaps `window-dark` for `window-lit` for the first `bellRings.length` windows, and lights all three once
  the lights are restored. In DEV builds it writes `data-lit-windows` on the Play_Area.
  `ClocktowerView` adds the Belfry section once the gate is open. It holds the Inspect button outside the sandbox, the
  sandbox with `BellTower`, the Repair Studio, and the Hint Panel with the hint keeper medallion. A bell Interactable
  and the Route_Panel bell action open the same dialog. The Journal lists the static bell order. "See the finale"
  dispatches `COMPLETE_ROOM`, and Reset calls `resetRepair`.
- **Task 25.** New specs `clocktower-bell-repair.spec.ts` and `clocktower-bell-exit.spec.ts`. A seeded-Belfry lights test
  in `clocktower-route.spec.ts`. Belfry shell and sandbox scans in `clocktower-a11y.spec.ts`. New helpers:
  `seedBelfrySave`, `openSeededBelfry`, `focusedTestId`, `expectBellDialog`. `seedSave` takes optional extra defects.

Skipped optional property tasks: 21.2 (Property 30), 24.3 (Property 7), and 24.4 (Property 5). They need `fast-check`,
which is not installed.

## Files changed

`src/registry/patchRegistry.ts`, `src/registry/hintRegistry.ts`, `src/registry/clocktowerCopy.ts`,
`src/components/EmergencyExit/EmergencyExitButton.tsx`, `src/components/BellTower/BellTower.tsx`,
`src/components/BellTower/BellTower.module.css`, `src/components/ChallengeSandbox/visionModes.ts`,
`src/engines/RepairEngine.ts`, `src/engines/VerificationEngine.ts`, `src/engines/clocktowerRules.ts`,
`src/types/index.ts`, `src/types/clocktower.ts`, `src/components/RepairStudio/RepairStudio.tsx`,
`src/components/WorldScene/phaser/createWorldScene.ts`, `src/components/WorldScene/WorldSceneHost.tsx`,
`src/components/Clocktower/RoutePanel.tsx`, `src/components/Clocktower/ClocktowerJournal.tsx`,
`src/views/ClocktowerView.tsx`, `src/views/ClocktowerView.module.css`.
Tests: `tests/unit/EmergencyExitEscape.test.tsx`, `tests/unit/BellFocusVerification.test.tsx`,
`tests/unit/hintRegistry.test.ts`,
`tests/unit/clocktowerRules.test.ts`, `tests/unit/ClocktowerRouteView.test.tsx`, `tests/e2e/helpers/clocktower.ts`,
`tests/e2e/clocktower-bell-repair.spec.ts`, `tests/e2e/clocktower-bell-exit.spec.ts`,
`tests/e2e/clocktower-route.spec.ts`, `tests/e2e/clocktower-a11y.spec.ts`.
`ROOMS.clocktower.built` is unchanged. The WorldSceneHost `failed` flag fix and its regression tests are unchanged.

## Focused checks (automated)

| Check | Result | Evidence |
|---|---|---|
| `npm run typecheck` | passed | `.agents/tc4.log` |
| ESLint on every changed source and test file | passed, 0 warnings | `.agents/lint4.log` |
| `EmergencyExitEscape.test.tsx` before the Task 22.2 change | 2 of 4 failed, as intended | earlier in this session |
| Focused Vitest (rules, route view, view, WorldSceneHost, bell verification, Exit, reset, game context) | **8 files, 137 passed** | `.agents/u3.log` |
| Wider focused Vitest (adds Repair, Verification, hints, Hint Panel, patches, progress, rooms, GameContext) | first run: `hintRegistry.test.ts` 2 failed (it still counted 15 hints and 5 curses after Task 21.1); after updating it to 18 hints and 6 curses: **15 files, 268 passed** | `.agents/u5.log`, `.agents/u6.log` |
| Bell repair and exit specs, Chromium, dev server, `--workers=1 --retries=0 --trace=on` | **6 passed** (2.3 min) | `test-results-zcode/cp3-bell-1/` (`run.log`, traces, `server-latency.csv`) |
| Lights test, Belfry axe scans, Passage scan with the Belfry section shown | **5 passed** (3.5 min) | `test-results-zcode/cp3-lights-1/` (`run.log`, traces, `server-latency.csv`) |

Browser checks covered:
- Ring, Cancel, and Escape focus before the repair (focus stays outside the dialog, then falls to the body) and after
  it (focus moves to Ring, then returns to the Moon bell).
- The trap diagnosis, and a forced failed entry check named in `failed-checks-bell-dialog-focus`. After the listener
  is removed, Check again verifies.
- Escape from the Play_Area saves the Belfry Checkpoint and exits.
- Escape closes the dialog. Auto-repeat keeps the view, and a fresh press exits.
- A native modal takes the first Escape.
- Emergency Exit with the dialog open records no ring.
- Ringing Moon, Key, and Thorn with one out-of-order retry lights 0, 1, 1, 2, then 3 windows (`data-lit-windows`).
- After a reload, the door reads Cleared, Revisit shows the lights restored, and See the finale opens the completion screen.
- The Belfry shell scans have zero violations at 1280 × 720 and at 375 × 667 (emulated), with the sandbox excluded.
- In the sandbox, axe has no rule for focus entry or return, so a live focus probe shows the defect before the repair
  and the fix after it. The sandbox axe scan reports zero violations in both states.

No navigation or scene stall blocked these runs. No timeout, retry, or existing assertion was changed. The full suite is
left to ZCode.

## Not run here

The full `npm test` and `npm run test:e2e`, `npm run build`, the long-walk route spec (`clocktower-route.spec.ts:43`),
Code Mode captures, the manual keyboard run, and physical phone checks. These belong to Task 27, after Task 26.

## Manual playthrough (user, in-app browser)

- **Who and where:** the user, in the in-app browser on the development build with `/?built=clocktower`.
- **Result:** Room 3 (Clocktower Gate) was completed. The user did not notice the map going blank at any point.
- **Input:** the exact input sequence (keyboard, pointer, or Route_Panel, and their timing) was not recorded.
- **Label:** manual playthrough on a desktop browser. It is not an automated check, and not a physical phone test.
  It does not show whether the Courtyard-to-Graveyard switch below was exercised with the same timing.

## Pre-publish route failure: blank map after Courtyard to Graveyard (`cp3-prepublish`)

**Symptom.** In `test-results-zcode/cp3-prepublish/`, `clocktower-route.spec.ts:43` failed at line 69. The Route_Panel
showed "Area: Overgrown Graveyard" and the canvas was blank. The ghost test hooks read (604.78, 264) while the test
expected (100, 360).

**What the trace shows** (`trace.zip`, times from the start of the test):
- The ghost held Right and reached the Apothecary exit at about 12.4 s. The scene cleared the Apothecary and requested
  the Courtyard images: `courtyard-cobbles` and `yew-tree` took 6.7 s, `lantern-post` and `stone-well` took 15.0 s.
- At 13.4 s, after the Route_Panel lantern and Graveyard clicks, the Graveyard images were requested while the Courtyard
  load was still running. `graveyard-dirt` took 14.0 s and `gravestone` 18.0 s. The three clue images had no response
  when the test ended at 32.9 s.
- (604.78, 264) is not a Courtyard position. It is the last Apothecary position, at the Apothecary exit zone
  (`x` 624 to 672, spawn row `y` 264). The scene writes the ghost hooks only after an Area is built. Once the Apothecary
  was cleared, no Area was ever built, so the hooks kept their old values.

**Cause.** `switchArea` built the next Area on the loader's batch `COMPLETE` event. In Phaser, a file added while a load
is running joins that same batch, so the Graveyard build also waited for every superseded Courtyard image. React state
moves at once (by design), so the Route_Panel showed the Graveyard. The canvas stayed blank until the slowest image of
*either* Area arrived. The dev server's slow responses made that wait longer than the test's 20 s limit.

**Reproduction** (automated, `.agents/cp3-repro.mjs`, dev server, Chromium; results in `test-results-zcode/cp3-repro-before/`):

| Sequence | Courtyard-only images | Graveyard drawn after the click | Notes |
|---|---|---|---|
| Immediate (the spec's sequence) | normal | 0.18 s | not reproduced at normal delivery speed |
| After the Courtyard finishes drawing | normal | 0.19 s | |
| Immediate | `lantern-post` and `stone-well` held 15 s | **13.4 s** | All Graveyard images had loaded before the click. The canvas stayed blank and the hooks read (606.72, 264) until the held images arrived. |
| After the Courtyard finishes drawing | held 15 s | 0.19 s | The Courtyard took 15.0 s to draw, then the Graveyard was immediate. |

**Fix.** `createWorldScene.ts` `switchArea` now builds when every texture of the requested Area exists. It checks on each
`FILE_COMPLETE`, with `COMPLETE` as a fallback, and detaches its listeners once it builds or once a newer Area replaces it.
Superseded images still download, but they no longer hold back the current Area.

**Regression test.** I added a test to `clocktower-scene-lifecycle.spec.ts` (line 63). It holds the two Courtyard-only
images for 30 s, runs the spec's immediate sequence, and expects the ghost at (100, 360) within 15 s.
- Against the old code it **failed** with (604.77, 264), the same state as the ZCode failure (`test-results-zcode/cp3-superseded-before/`).
- With the fix it **passed** (`test-results-zcode/cp3-superseded-after/`).

**After the fix, unthrottled** (`test-results-zcode/cp3-repro-after/immediate-0.json`). The dev server was slow on its
own in this run. The last Graveyard image arrived at 29.3 s and the Graveyard was drawn at 30.0 s, while the superseded
Courtyard images were still arriving (32.5 to 34.6 s). Before the fix, the build would have waited for those.

**Reproduction after the fix** (`test-results-zcode/cp3-repro-after/`):

| Sequence | Courtyard-only images | Graveyard drawn after the click |
|---|---|---|
| Immediate | normal (the server was slow on its own) | 6.3 s, right after its own last image and before the Courtyard images |
| After the Courtyard finishes drawing | normal | not measured: the Apothecary images took over 10 s, and the script's 30 s wait ran out first |
| Immediate | held 15 s | **0.39 s** (was 13.4 s). The held images arrived 10 s later. |
| After the Courtyard finishes drawing | held 15 s | 0.55 s |

**Original long-walk test and directly affected checks, after the fix** (automated, Chromium, dev server,
`--workers=1 --retries=0`, `test-results-zcode/cp3-superseded-after/`):
- Passed (4): `clocktower-scene-lifecycle.spec.ts` (all three tests, including the new regression test) and
  `clocktower-route.spec.ts:165` (Belfry lights).
- `clocktower-route.spec.ts:43` passed the Courtyard-to-Graveyard step at line 69 and the reload at line 90. It then
  failed at line 103, waiting for the Clockworks Passage spawn (100, 400). The Passage needs three images, and all
  three took 16.3 s, arriving together at about 89.9 s. Only one of them had been decoded when the 20 s wait ended at
  93.5 s. The reload before that step took 29 s for the document. No superseded Area was involved: the Graveyard had
  fully loaded. This is the delivery stall recorded in the Checkpoint 2 diagnosis, not the loader behavior fixed here.
- `clocktower-route.spec.ts:225` failed in `holdKeyUntil` (15 s). After "Go to the Moonlit Courtyard", the Courtyard
  images took 6.4 to 12.8 s, so the Courtyard was drawn only about 4 s before the wait ended. That left too little
  time for the walk east. Again, only one Area was loading, so this is delivery speed.
- The latency probe in the same folder recorded HTML responses of 5.2 to 12.4 s and one `gate-closed.png` of 37.3 s
  during the run, fetched outside the browser.

**Rerun of the two route failures** (automated, `test-results-zcode/cp3-route-rerun/`, 3.4 min):
- `clocktower-route.spec.ts:225` **passed**. Its earlier failure was the slow Courtyard download.
- `clocktower-route.spec.ts:43` passed every step through line 90 again, including Courtyard to Graveyard, where the
  Graveyard images took 0.8 to 2.0 s. It failed at line 103 a second time. In the trace, `gate-closed.png` and
  `gate-open.png` (657 KB each, both needed by the Passage) received response headers after 6.0 s, but their bodies
  never finished (`receive: -1`, size `-1`) before the 20 s wait ended. The Passage could not be built without them.
  During the same run, the probe outside the browser timed `gate-closed.png` at 18.2 s and 30.4 s.

**Conclusion.** The `cp3-prepublish` failure had two causes, and the trace confirms both:
1. A loader defect, now fixed. A superseded Area's slow images held back the next Area. The regression test above
   failed before the fix and passes after it.
2. Dev-server delivery stalls, unchanged. The 657 KB gate images stall most often, and they block the Passage step of
   the long walk. This matches the "gate textures 8.7 s" finding in the Checkpoint 2 diagnosis. No code path waits on a
   superseded Area at that step, so this run shows nothing further to fix in the scene. Shrinking the gate images, or
   running the suite against `npm run preview`, are options for the user to decide. Neither was done.

No assertion, timeout, or retry was changed. Task 20 stays unchecked. `ROOMS.clocktower.built` is unchanged. The traces
listed below are kept in `cp3-prepublish/`, `cp3-repro-before/`, `cp3-repro-after/`, `cp3-superseded-before/`,
`cp3-superseded-after/`, and `cp3-route-rerun/` under `test-results-zcode/`.

# Checkpoint 4 progress: motion pass (Task 28, development preview)

The user approved starting Task 28 while Tasks 20 and 27 stay open. `ROOMS.clocktower.built` is unchanged. The
scene-loading fix and its regression test are kept. This is a progress record, not the Checkpoint 4 report (Task 29).
Evidence labels: **automated**, **emulated**, **physical device** (none here).

## What was done

- **28.1, `motion.ts` and `createWorldScene.ts`.**
  - Ghost cues: lean, settle, and hover as before. The pose tweens and the new interact pulse are separate, so a lean
    or settle never cancels a pulse. The pulse scales 1 to 1.1 and back with no tilt.
  - Prop cues from the design table: lantern warmup (glow alpha and scale, 900 ms), clue reveal (plaque lift and
    alpha flash, 500 ms), gate opening (a fading `gate-closed` copy over the open gate, 600 ms), bell swing (damped
    ±0.2 rad around the rope, 1200 ms), and window lighting (a fading `window-dark` copy over each newly lit window,
    500 ms).
  - The texture swap always happens first, in the same `update(snapshot)` call. Cues decorate a state that is already
    final. Each cue has a `finish()` that jumps to the final values and removes its overlay.
  - A newer cue on the same target finishes the older one. An Area change finishes every cue. Turning reduced motion
    on finishes every cue and rests the Ghost. An effect plays once and never replays on a rebuild or resume.
  - DEV hooks: `data-ghost-pose` (JSON: state, rotation, x, y, scale, pulsing) and `data-anim` ("kind:target" entries,
    or `none`).
- **28.2, `ClocktowerView.tsx` and `WorldSceneHost.tsx`.** A `changed` outcome with an effect sets the snapshot's
  `effect` in the same commit as the state and the Room_Status text. The effect id is a per-view sequence, so a success
  repeated after a reset plays again. Interact with something Nearby calls `pulseInteract()`. The host exposes
  `pulseInteract` and writes the two hooks.
- **28.3, `ClocktowerView.test.tsx`.** Six new tests:
  - Room_Status is already updated when the first snapshot with the effect reaches the fake handle.
  - A rejection or a repeat sends no new effect.
  - A success repeated after a reset gets a new effect id.
  - A new attempt in the same frame sends no stale celebrate.
  - One pulse per Interact with something Nearby, and none without.
  - The same Room_Status text with reduced motion on and off.
- **28.4, `clocktower-motion.spec.ts`.** It samples the hooks on every frame inside the page and times each input by
  the page's own event timestamp.

**Two engine changes found by the measurements:**
1. The lean now starts on the movement input (`setHeld`) instead of one frame later, on the step that moves the body.
   This changed the lean from 73 to 94 ms after the key to 47 to 53 ms (`test-results-zcode/cp4-latency-1.json` and
   `-3.json`).
2. The Phaser game uses real frame deltas (`fps: { smoothStep: false }`). The smoothing caps each delta at 16.7 ms
   while the window is unfocused, so movement ran slow in wall time. Movement already caps each step at 50 ms and
   sweeps against solids. Tweens run on the tween manager's own wall clock and are unaffected. This change applies to
   every Area, so release verification should cover it.

The pulse is 180 ms instead of the design table's 220 ms. It can only start on the next frame, and Requirement 23.11
ends it within 300 ms of the press.

## Focused checks (automated, Chromium, dev server)

| Check | Result | Evidence |
|---|---|---|
| `npm run typecheck` | passed | `.agents/tc10.log` |
| ESLint on changed files | passed, 0 warnings | `.agents/lint8.log`, `.agents/lint10.log` |
| Vitest: ClocktowerView, ClocktowerRouteView, WorldScene, Clocktower rules and route | 8 files, 179 passed, then 4 files, 72 passed after the last engine change | `.agents/u8.log`, `.agents/u10.log` |
| `clocktower-motion.spec.ts`, third run | **5 passed, 1 failed** (2.2 min) | `test-results-zcode/cp4-motion-3/` |

Passing in the browser:
- **Lean, settle, and hover:** a lean within 100 ms of the keydown, zero tilt within 300 ms of the keyup, then a bob
  between 0 and −6 px.
- **Lantern:** the warmup ends within 1,500 ms of the click, and the Ghost walks during it.
- **Bell and window:** an out-of-order ring shows no cue, and a correct ring swings the bell and lights a window, both
  ending within 1,500 ms.
- **Reduced motion on:** the pose stays at rest and no cue plays.
- **Reduced motion turned on mid-swing:** the cue finishes, and the hook reads `none` within 100 ms.

**Open: the pulse end, when the same press lights the lantern.**
- The pulse starts within 100 ms and peaks between 1.05 and 1.15 with no tilt, but it ended 429 ms after the press.
- A frame recording (`test-results-zcode/cp4-pulse-2.json`) shows one 169 ms long task starting 77 ms after the
  press. It occurs only on the press that succeeds and celebrates. The repeat press had no long task, and its pulse
  ended at 216 ms.
- The long task lines up with the companion `celebrate` signal, sent on the next frame after the commit.
- I left the design's timing as it is. Moving the celebrate after the pulse would hide the stall, not remove it. The
  likely cost is the mascot update or a dev-mode React render, and it should be measured in a production build.

**Blocked once: the scene-loading regression test** (`clocktower-scene-lifecycle.spec.ts:63`).
- It failed in `cp4-motion-1` and `cp4-motion-2`. In the `cp4-motion-2` trace (`.agents/net-reg2.txt`), the Graveyard's
  own images had no complete body after 13 to 14 s, and `graveyard-dirt.png` had no response at all.
- That is delivery, not the loader. The host was at **99% CPU with 878 MB of 7,991 MB free** (`.agents/load.txt`).
- The test is unchanged and left for release verification.

## Not run here

The full browser suite, the long-walk route test, `npm run build`, Code Mode captures, and physical devices.

# Release pass, step 1: the first-lantern stall (automated)

Profiles are in `test-results-zcode/cp5-profile/`. They time the first Interact at the unlit lantern on a fresh load
(it lights the lantern and celebrates) and a repeat Interact (already lit). The script is `.agents/cp5-profile.mjs`.
Production runs used throwaway builds with `built: true`, made by `.agents/build-profile*.mjs`. Each build script
restored `roomsRegistry.ts` (and, for the baseline, `createWorldScene.ts`), and the restore was checked. The profile
builds were deleted afterwards.

| Build | First press: long tasks (ms after press + duration) | Largest frame gap | Repeat press |
|---|---|---|---|
| Dev, before the fix | 92+198 | 172 ms | no long task, pulse ended 221 ms |
| Production, no warm-up (baseline) | 21+59, 86+**248** | **433 ms** | 142+52, 238+50 |
| Production, both warm-ups (`prod-warm2-1`) | 462+56 only, after the pulse | 54 ms | 53+51 |
| Production, both warm-ups (`prod-warm2-2`) | 7+50, 266+52, 319+51, 462+62 (none over 62 ms) | 65 ms | none |

**The stall persists in production** (the baseline row). It has two parts, both first uses inside Phaser's WebGL
renderer. Neither is in React or the celebration.
1. **A shader program compiled mid-frame.** The renderer builds one image-batch program per texture count, lazily.
   Lighting adds the lit post and the glow to the batch, so `createShaderProgram` and `getProgramParameter` ran inside
   the first lit frame (dev CPU profile, `.agents/stack-first.txt`).
   - **Fix:** `warmShaderVariants()` compiles every count, 1 to `maxTextures`, once when the scene is created. A
     failure is caught and logged and never stops the scene.
2. **A GPU pipeline built for the additive blend.** With fix 1 alone, production still had a 177 ms task. The
   timeline trace (`prod-trace-1-summary.txt`) shows 171.9 ms of it in `CommandBufferProxyImpl::WaitForGetOffset` under
   `GLES2::ReadPixels` in the compositor commit. The main thread waited on the GPU process, which was building the
   pipeline for the glow, the only additive-blend sprite.
   - **Fix:** `warmFirstDraw()` draws the lit post and the additive glow at alpha 0.002 for the Courtyard's first two
     frames, then destroys them. It only runs while the lantern is unlit. Alpha 0.002 is under half of one 8-bit level,
     so nothing shows.

Kept as they were:
- the celebration, still sent on the next frame after the commit;
- the game state and Room_Status, updated in the press handler;
- reduced motion;
- the 180 ms pulse, and every timing assertion.

The remaining 50 to 62 ms tasks also appear on the repeat press, so they are ordinary frame cost on this host.

**Motion spec after the fix** (`test-results-zcode/cp5-focused-1/`): **6 of 6 passed**. This includes "Interact
pulses ... ending within 300 ms" on the press that lights the lantern, which failed in `cp4-motion-3`.

# Release pass, step 2: the Passage textures (automated)

- **Before:** `gate-closed.png` and `gate-open.png` were 512 × 320 RGBA8 and 657,363 bytes each. The IDAT was
  barely compressed (655,791 bytes of deflate for 655,680 bytes of raw rows).
- **Recompression** (`.agents/png-recompress.mjs`): adaptive row filters, deflate level 9, every ancillary chunk kept
  (pHYs, iTXt). The script then decodes the result and checks that IHDR, all 655,360 pixel bytes, and the ancillary
  chunks are byte-identical before writing.
- **Result:** `gate-closed.png` is 192,551 bytes (29.3%) and `gate-open.png` is 168,498 bytes (25.6%). Dimensions,
  color type, and pixels are unchanged. The originals are kept in `.agents/gate-backup/`.
- **Delivery from the dev server** (`test-results-zcode/cp5-gate/bench-dev.json`): 30 alternating rounds, both images
  fetched in parallel each round. The temporary `public/__bench/` copies used for the bench were removed afterwards.

  | | Median | p90 | Max |
  |---|---|---|---|
  | Original | 18.8 ms | 84.0 ms | 342.7 ms |
  | Optimized | 10.1 ms | 48.6 ms | 485.8 ms |

  The worst outlier is a host stall either way.

# Focused browser run `cp5-focused-1` (automated, Chromium, dev server): 8 passed, 2 failed

1. **`clocktower-route.spec.ts:43`, line 69** (`expectGhostAt(page, 100, 360)` after "Go to the Overgrown Graveyard").
   - Received (609.45, 264), which is the last Apothecary position. The trace is
     `test-results-zcode/cp5-focused-1/artifacts/clocktower-route-plays-fro-9cbe1--resumes-at-each-Checkpoint-chromium/trace.zip`.
   - Network (`.agents/net-cp5route.txt`): the Courtyard images waited **15.6 s for the first byte**, and `yew-tree.png`
     never finished. All five Graveyard images had **no response at all** within the 20 s wait.
   - The test did not reach the Passage, so this run does not test the gate change on the route.
2. **`clocktower-scene-lifecycle.spec.ts:63`** (the scene-loading regression test).
   - Received (609.5, 264). The trace is
     `test-results-zcode/cp5-focused-1/artifacts/clocktower-scene-lifecycle-77ab4-not-after-a-superseded-Area-chromium/trace.zip`.
   - The Graveyard's own images (8 to 135 KB) waited 6.3 to 6.4 s for the first byte. Bodies finished at 6.4 to 13.2
     s, and `clue-key.png` never finished within the 15 s wait (`.agents/net-cp5reg.txt`).
   - The error snapshot shows the Graveyard landmarks reported right after the wait ended, so the build came after
     its own images, as the fix intends.

The probe in the same folder recorded, outside the browser, HTML responses of 3.9, 4.8, 7.7, 11.3, 12.1, and 15.0 s,
and `gate-closed.png` (now 192 KB) at 18.6 and 24.6 s. During the run the host sampled at 29 to 97% CPU with 838 MB of
7,991 MB free (`.agents/load2.txt`). The other processes included ZCode, several Kiro windows, ChatGPT, and OneDrive.

Per the instruction, I stopped here before step 3. Task 26 is not applied: `ROOMS.clocktower.built` is still
`false`, and `clocktower-door.spec.ts` is back to its original text. The prepared Task 26 version of the door spec is
in `.agents/task26-clocktower-door.spec.ts`.

# ZCode prepublish pair (`test-results-zcode/cp5-prepublish/`, reported by ZCode)

ZCode ran these on the snapshot with release steps 1 and 2 in place, before Task 26:
- **Command:** `npm run test:e2e -- --project=chromium --workers=1 --retries=0 --reporter=line --output=test-results-zcode/cp5-prepublish tests/e2e/clocktower-route.spec.ts:43 tests/e2e/clocktower-scene-lifecycle.spec.ts:63`.
- **Setup:** Playwright started its own dev server. CPU was at 57% with 1.17 GB free.
- **`clocktower-route.spec.ts:43` (long walk): passed.** This was its first pass. It is the prepublish evidence for
  the game code, which did not change after that run. Only tests and Task 26 changed later.
- **`clocktower-scene-lifecycle.spec.ts:63`: failed** at line 95, with `{ x: 606.26, y: 264 }` received after the 15 s
  wait. Three required Graveyard images were still downloading: `clue-moon`, `clue-thorn`, and `clue-key` waited 7.0 to
  8.2 s for the first byte and their bodies never finished. `courtyard-cobbles` (not held by the test) got no response.
  No image arrived and then failed to draw. ZCode's probe saw one 5.6 s stall outside the browser.

# Superseded-area regression made deterministic (automated)

Only `clocktower-scene-lifecycle.spec.ts`, in "the next Area draws as soon as its own images load, not after a
superseded Area", was changed:
- **Delivery:** every `/adventure/**.png` request is answered with `route.fulfill` from the real file in
  `public/adventure`. Paths that leave that folder are aborted.
- **Hold:** `props/lantern-post.png` and `props/stone-well.png` are held until after the spawn assertion. A `finally`
  block releases them even when the assertion fails.
- **New checks after the spawn assertion:** both held images were requested, and neither had been served when the
  Graveyard drew.
- **Unchanged:** the route sequence, the expected spawn (100, 360), the 15 s poll, the 90 s test timeout, and the
  retries. Every other browser test still uses normal Vite delivery.

**Run:** `test-results-zcode/cp6-regression/`, Chromium, `--workers=1 --retries=0`, Playwright's own dev server:
**1 passed (43.6 s)**. Lint and typecheck of the file passed.

# Task 26 prepared locally (not deployed)

- **`src/registry/roomsRegistry.ts`:** the Clocktower has `built: true`.
- **`tests/e2e/clocktower-door.spec.ts`:**
  - Without the override, a Pantry-cleared save shows the door Open and enters the room with the heading focused.
  - Without the potion, the door reads Locked and names the potion.
  - The two override tests are unchanged.
- **`tests/production/startup-smoke.mjs`:** with a Pantry-cleared save and no override, the door is Open and the menu
  and doors request no Phaser code. Entering then loads Phaser, the scene becomes ready, and the shell axe scan
  (sandbox excluded) has zero violations. `?preview=courtyard` is still ignored, on both the seeded and the fresh run.
- **Expectations updated for a published room:**
  - `tests/e2e/potion-pantry.spec.ts`: the door is `available` after bottling.
  - `tests/unit/DoorAndCompletionCopy.test.tsx`: the unbuilt cases now pass `built = false` explicitly, and the
    default (published) case is Locked or Open.
  - `tests/unit/pantryAndRooms.test.ts`: the same split between the default and `built = false`.
  - `tests/unit/progressSchemaV3.test.ts`: the round-trip examples are not complete while the lights are out.
- **Missed in Task 21.1:** `tests/unit/mascotAndPatches.test.ts` now counts 6 catalog curses, including
  `bell-dialog-focus`.

| Check (automated) | Result | Log |
|---|---|---|
| `npx vitest run` (full unit suite) | **28 files, 387 passed** | `.agents/g-unit.log` |
| `npm run typecheck` | passed | `.agents/g-typecheck.log` |
| `npm run lint` | passed. The first run failed only on my scratch copy `.agents/createWorldScene.fixed.ts`, which I deleted | `.agents/g-lint2.log` |
| `npm run build` | passed. The warning is the known size of the lazy Phaser chunk | `.agents/g-build.log` |
| `node tests/production/clocktower-chunk.mjs` | passed: the entry chunk (274.1 KiB) has no Phaser; Phaser is 1,352.6 KiB raw, 353.2 KiB gzip | `.agents/g-chunk.log` |
| `node tests/production/startup-smoke.mjs` on `vite preview` (127.0.0.1:4173) | **all six sections passed** | `.agents/g-smoke.log` |

# Code Mode evidence, production preview with Task 26 (automated, emulated viewports)

Integration `playwright`. I ran `search` and `describe` before first use of each operation, then `execute`. There
were two `browserSession`s, both closed with `browser_close`. I navigated, seeded saves with `browser_evaluate`,
clicked through the DOM, and took viewport screenshots at CSS scale into `evidence/`. Production has no DEV hooks, so
state was read from the Room_Status, the objective stage, and the focused element.

| Capture | 1280 × 720 | 375 × 667 | Read at capture |
|---|---|---|---|
| Belfry objective (curse not verified) | `cp3-belfry-objective` | `cp3-belfry-objective` | stage `bells-silent`, scene `ready`; no horizontal overflow at 375 |
| Broken dialog, focus outside it | `cp3-broken-dialog` | not captured (see below) | `data-open=true`, focus on `bell-control-moon`, not inside the dialog |
| Two rings, settled | `cp4-bells-two-rung-settled` | | "2 of 3 bells rung"; the window in view is the third, still dark, as expected |
| Lights restored, all windows lit | `cp3-lights-restored` | `cp3-lights-restored` | "3 of 3 bells rung: the apothecary lights are back.", See the finale shown; no overflow at 375 |
| Lantern before and after | `cp4-lantern-before`, `cp4-lantern-settled` | | lit-lantern status text |
| Gate before and after | `cp4-gate-before`, `cp4-gate-settled` | | gate-open status text |
| Check again state | | `cp3-check-again` | see the observation below |

The repaired Repair Studio state at 1280 × 720 was read directly. The result was "Verified on the live page", stage
`ring-bells`, and focus on the Moon bell. The same read at 375 × 667 gave the same result.

**Not captured: mid-animation frames.** Each Code Mode screenshot landed 0.7 to 1.6 s after the ring, measured with
`performance.now()` in the page. That is longer than the cues (600 to 1,200 ms), so these screenshots can only show
settled states. Mid-animation evidence comes from the automated per-frame `data-anim` samples in
`clocktower-motion.spec.ts`, which passed 6 of 6 in `cp5-focused-1`.

**Observation, not a confirmed defect: `cp3-check-again-375x667.png`.**
- In one scripted 375 run, a single `browser_evaluate` clicked the Moon bell. It then clicked Cancel, Inspect, and the
  correct patch in the same task before React had committed.
- The live check then reported "Focus moves into the dialog" as failed and offered Check again. That is the designed
  failure path.
- A clean rerun with separate steps verified on the first try. Humans cannot press four controls in one task, so this
  is most likely a scripting artifact. The 375 broken-dialog state was not recaptured.

# Release-candidate status

Tasks 26 and 28.4 are checked in `tasks.md`. Tasks 20, 27, and 29 stay open until ZCode's release checks pass on this
snapshot. Nothing was deployed.
