# Implementation Plan: Clocktower Gate (Adventure Phase 3)

## Overview

This plan builds Clocktower Gate in the four build checkpoints from
`.kiro/skills/keyquest-room-slice/references/clocktower-pilot.md`. Each checkpoint ends with a
Checkpoint task that runs the gates in `.kiro/steering/quality-gates.md`.

1. **Checkpoint 1: Animated courtyard** (tasks 2 to 14). Requirements 1 to 12, plus the
   Requirement 24, 25, and 27 criteria that apply to the courtyard.
2. **Checkpoint 2: Complete route** (tasks 15 to 20). Requirements 13 to 18, except 18.1.
3. **Checkpoint 3: Live bell focus repair** (tasks 21 to 27). Requirements 19 to 22 and 18.1,
   which publishes the room.
4. **Checkpoint 4: Motion pass** (tasks 28 and 29). Requirement 23.

The order follows design.md: pure modules come first (`clocktowerRoute`, `worldPhysics`,
`heldInput`, `clocktowerRules`), then Game_Context wiring, then the lazy WorldScene adapter,
then the React controls, then the view that connects them. Every task names the requirement
clauses it satisfies.

### Gating

Checkpoints 2, 3, and 4 are **gated behind the courtyard review**, as the Part C introduction of
requirements.md states. Do not start task 15 or any later task until the Checkpoint 1 report and
its Code Mode evidence have been reviewed and the user approves expansion. Each later
checkpoint also waits for review of the checkpoint before it.

### Decisions before implementation

Task 1 validates that these decisions agree across the spec.

| Item | Status | Where it matters |
|---|---|---|
| Design decision 1: preview entry `/?preview=courtyard`, guarded by `import.meta.env.DEV`, removed from the URL after activation | Use the development-only preview and keep its progress in memory. | Tasks 3.2, 8.1, 13.7 |
| Design decision 4: bell ring order Moon, Key, Thorn, stated in the Clue texts | Use the proposed order consistently in the clues, journal, and rules. | Tasks 5.1, 15.1, 24.1 |
| Design decision 6: lit lantern drawn from a generated canvas texture (`lantern-post.png` plus a radial glow) | Use the existing asset and generate its lit state. | Task 10.3 |
| Design decision 8: Requirement 25.7 tested in two steps | Distinguish wrong-patch feedback from a failed live check followed by retry. | Task 25.1 |
| Design decision 10: a bell ring needs an open gate | Enforce the prerequisite from Requirement 16.4. | Tasks 16.1, 24.1 |
| Design decision 11: Coming later, Locked, Open, and Cleared | Use the existing Cleared and Revisit behavior after the lights are restored. | Tasks 4.1, 4.2, 4.3 |
| Planning choice: in Checkpoint 1, Clocktower_State lives in memory in the Game_Context reducer state, because schema version 3 is Checkpoint 2 work (Requirement 16). Task 17.1 moves it into `ProgressState.clocktower`. `dispatchWorldAction` keeps the same signature, so only `GameContext.tsx` changes. | Planning note, no confirmation needed | Tasks 8.1, 17.1, 18.1 |
| Planning choice: Requirement 18.1 puts `built: true` in the change that adds coverage for all five Areas, the bell repair, and the Bell_Sequence. That change is task 26, at the end of Checkpoint 3, not Checkpoint 2. | Planning note, matches design.md "Quality gates per checkpoint" | Task 26 |

## Tasks

- [x] 1. Validate the aligned spec
  - Check that the recorded decisions match the four door states, the courtyard preview, basic motion in Checkpoint 1, and the publish step in Checkpoint 3.
  - Run `validate_spec_format` on the three spec files.
  - No source code changes in this task.
  - _Requirements: 1.1, 4.1, 7.8, 16.4, 18.1, 24.1, 25.7_

### Checkpoint 1: Animated courtyard (Parts A and B)

- [x] 2. Add the Phaser dependency and the import guardrails
  - The prerequisite setup added `phaser@^4.2.1` to `package.json` with `4.2.1` in the lockfile. Verify it with `npm ls phaser` and install from the lockfile if needed.
  - Add `optimizeDeps.include: ['phaser']` to `vite.config.ts`.
  - Add an ESLint `no-restricted-imports` rule to `eslint.config.js` that blocks `phaser` everywhere except `src/components/WorldScene/phaser/**`.
  - _Requirements: 2.6, 2.7, 24.13, 27.7_

- [x] 3. Add shared Clocktower types and dev flags
  - [x] 3.1 Create `src/types/clocktower.ts` and re-export it from `src/types/index.ts`
    - `AreaId`, `ClueId`, `BellId`, `InteractableId`, `Direction`, `Rect`, `Vec2`, `ImagePlacement`, `AreaDefinition`, `ClocktowerState`, `WorldSession`, `WorldAction`, `RejectReason`, `WorldOutcome`, `RulesContext`, `WorldSnapshot`, `WorldSceneCallbacks`, `WorldSceneHandle`, as specified in design.md "WorldScene adapter interface" and "Data Models". No Phaser types.
    - Add `WORLD_ACTION` and `ENTER_COURTYARD_PREVIEW` to `GameAction`.
    - _Requirements: 2.1, 2.2, 2.6, 3.1_
  - [x] 3.2 Create `src/registry/devFlags.ts`
    - Pure `readDevFlags(search)` that parses `preview=courtyard` and `built=clocktower`.
    - `DEV_FLAGS` reads `window.location.search` only when `import.meta.env.DEV` is true; otherwise it is `{ preview: null, built: new Set() }`.
    - _Requirements: 4.2, 4.5_
  - [x] 3.3 Write `tests/unit/devFlags.test.ts`
    - Parse cases for each flag, unknown values, repeated parameters, and an empty query.
    - Assert the production constant shape when `import.meta.env.DEV` is false.
    - _Requirements: 4.2, 4.5_

- [x] 4. Derive the Clocktower door from the built flag and the potion
  - [x] 4.1 Update `src/registry/roomsRegistry.ts`, `src/views/DoorSelectorView.tsx`, and `src/views/CompletionView.tsx`
    - Add `isRoomBuilt(id) = getRoom(id).built || DEV_FLAGS.built.has(id)`. Give `getDoorState` and `isRoomUnlocked` an optional `built` argument for unit tests.
    - Keep the Clocktower `built: false` (task 26 flips it).
    - Split `DOOR_REQUIREMENT.clocktower` into the built text ("Needs the lantern potion from the Potion Pantry.") and a `coming-soon`-only "later update" string.
    - The Pantry entry in `CompletionView` derives `nextState` and `nextDetail` from `getDoorState`.
    - Make sure `ENTER_ROOM` for `clocktower` returns the same reducer state while the door is Coming later or Locked.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.9, 18.4_
  - [x] 4.2 Write `tests/unit/DoorAndCompletionCopy.test.tsx`
    - Door state for: not built with and without the potion (Coming later), built without the potion (Locked), built with the potion before restoration (Open), built after a Pantry reset (Locked). Task 17.2 adds the fourth state after the progress schema includes the lights.
    - `ENTER_ROOM` rejected for Coming later and Locked, with `currentRoom`, phase, and saved progress unchanged.
    - A save with `potionTaken` true and the `color-only-ingredients` curse unverified migrates to Locked.
    - Door and completion copy with and without the built override. No "later update" text while built.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9, 18.4, 18.5, 24.1_
  - [ ]* 4.3 Write property test for door state (`tests/unit/clocktowerProgress.property.test.ts`)
    - Add `fast-check@^4` to `devDependencies` and run `npm install`. This is the first task that needs it. If an earlier optional property task was skipped, whichever property task runs first adds it.
    - **Property 19: Door entry depends on built and the potion, with Cleared after restoration**
    - **Validates: Requirements 1.1, 1.7, 18.4**

- [x] 5. Build the courtyard Route_Data and collision module
  - [x] 5.1 Create `src/registry/clocktowerRoute.ts` with the Moonlit Courtyard
    - Use the values in design.md "Route_Data for the Moonlit Courtyard": floor 20 × 14 tiles, wall solids, the `courtyard-east` exit zone, the yew tree and stone well Landmarks, the lantern post Interactable and its zone, the `courtyard-west` spawn.
    - Export `GHOST_BODY` (40 × 24, offset (-20, -24)), `GHOST_SPEED` (192 px/s), the courtyard asset manifest, and the `CLUES`, `BELLS`, and `BELL_SEQUENCE` id constants.
    - _Requirements: 5.1, 5.2, 5.8, 6.8, 7.2_
  - [x] 5.2 Write `tests/unit/clocktowerRoute.test.ts` for the courtyard
    - Spawn inside the bounds and outside every solid.
    - Zones have non-zero width and height. Landmark names are unique.
    - A flood fill over a 4 px grid of body positions reaches the lantern zone and the exit zone from the spawn.
    - Every manifest key maps to a file under `public/adventure/`.
    - _Requirements: 5.1, 5.2, 5.8, 24.10_
  - [x] 5.3 Create `src/engines/worldPhysics.ts`
    - `bodyRect`, `moveBody` (axis-aligned sweep, `deltaMs` clamped to [0, 50]), `touchingRects`, `nearbyInteractable`, `landmarksInView`, `cameraScroll`, and `solidsFor(area, state)` for the courtyard exit.
    - Use the behavior in design.md "Collision choice" and "Camera". Reduced motion is an input to `cameraScroll` only, never to `moveBody`.
    - _Requirements: 5.6, 5.7, 6.8, 7.1, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.10, 12.1, 12.2_
  - [x] 5.4 Write `tests/unit/worldPhysics.test.ts` with examples
    - A step longer than a wall is thick stops flush with 0 px overlap. A body flush against a wall moves 0 px into it.
    - The lantern-unlit exit blocks the body, and the lit exit lets it pass.
    - The camera clamps at each courtyard edge. Reduced motion returns the exact target.
    - _Requirements: 7.1, 7.3, 7.5, 7.6, 7.7, 8.5, 8.10_
  - [ ]* 5.5 Write property test for collision (`tests/unit/worldPhysics.property.test.ts`)
    - **Property 13: Collision never overlaps and never leaves bounds**
    - **Validates: Requirements 7.1, 7.4, 7.5**
  - [ ]* 5.6 Write property test for frame-rate independence
    - **Property 14: Speed does not depend on frame rate**
    - **Validates: Requirements 6.8**
  - [ ]* 5.7 Write property test for the camera
    - **Property 15: The camera keeps the Ghost in view and stays in bounds**
    - **Validates: Requirements 7.3, 7.6, 7.7, 12.2**
  - [ ]* 5.8 Write property test for the Nearby_Interactable
    - **Property 17: Nearby Interactable matches zone overlap**
    - **Validates: Requirements 8.1, 8.2**
  - [ ]* 5.9 Write property test for Landmarks in view
    - **Property 18: Landmarks in view match image intersection**
    - **Validates: Requirements 5.6, 5.7**

- [x] 6. Build the held-direction input model
  - [x] 6.1 Create `src/engines/heldInput.ts`
    - A pure stack with `press(source, direction)`, `release(source)`, `clear()`, and `current()`. The most recent still-held source wins. No diagonals.
    - _Requirements: 6.7, 9.8_
  - [x] 6.2 Write `tests/unit/heldInput.test.ts`
    - Examples: press two keys, release the newer one, mix key and touch sources, clear empties the stack, pressing the same source again moves it to the top.
    - _Requirements: 6.7, 9.8_
  - [ ]* 6.3 Write property test for held input (`tests/unit/heldInput.property.test.ts`)
    - **Property 16: The most recent held direction wins**
    - **Validates: Requirements 6.7, 9.8**

- [x] 7. Implement the World_Action rules for the courtyard
  - [x] 7.1 Create `src/engines/clocktowerRules.ts` and `src/registry/clocktowerCopy.ts`
    - `INITIAL_CLOCKTOWER_STATE`, and `evaluateWorldAction` with runtime id validation (`invalid`), `light-lantern` (needs the potion, `celebrate` on success, `repeat` when already lit), and `enter-area` within the courtyard, which is `rejected: 'unreachable'` toward the Graveyard while `previewCourtyardOnly`.
    - Non-`changed` outcomes return the input state and session objects unchanged.
    - `getClocktowerStage`, `getObjective`, `getAvailableActions`, and `actionForInteractable` for the courtyard stages.
    - Copy builders in `clocktowerCopy.ts` take only the outcome: lantern lit and way open, already lit, missing potion, nothing close enough, exit needs the lantern, graveyard opens in a later checkpoint, invalid target, control instructions.
    - `find-clue`, `open-gate`, and `ring-bell` return `invalid` until tasks 16.1 and 24.1 add them.
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.5, 3.8, 8.6, 8.7, 8.8, 8.9, 8.11, 10.3, 10.7, 12.1_
  - [x] 7.2 Write `tests/unit/clocktowerRules.test.ts` for the courtyard
    - Accepted `light-lantern` with the potion. Rejected without it, with the potion named in the message. Repeat when lit.
    - Unknown Area, Interactable, and spawn ids return `invalid` with the same state objects.
    - Preview `enter-area` toward the Graveyard is rejected as unreachable.
    - Identical states give identical objectives and available actions.
    - _Requirements: 2.4, 2.5, 3.3, 3.5, 3.8, 8.9, 24.2, 24.3_
  - [ ]* 7.3 Write property test for non-changed outcomes (`tests/unit/clocktowerRules.property.test.ts`)
    - Generators `arbWorldAction` and `arbReachable` cover all five action kinds. Rerun this test after tasks 16.1 and 24.1 extend the rules.
    - **Property 1: Non-changed outcomes are no-ops**
    - **Validates: Requirements 2.4, 3.5, 3.8, 15.3, 21.2, 23.12**
  - [ ]* 7.4 Write property test for repeated actions
    - **Property 2: Repeating a successful action changes nothing**
    - **Validates: Requirements 3.3, 8.9, 14.5, 15.7, 21.11**
  - [ ]* 7.5 Write property test for input-method equivalence
    - Uses the keyboard, Touch_Controls, scene, and Route_Panel adapters from tasks 11 and 12.
    - **Property 3: Every input method produces the same action and result**
    - **Validates: Requirements 2.3, 3.1, 3.2, 9.5, 10.5**
  - [ ]* 7.6 Write property test for available actions
    - **Property 4: Available actions are exactly the accepted actions**
    - **Validates: Requirements 2.5, 10.3**
  - [ ]* 7.7 Write property test for outcome messages
    - **Property 11: Outcome messages name their target**
    - **Validates: Requirements 10.7, 14.6**

- [x] 8. Wire World_Actions and the courtyard preview into the Game_Context
  - [x] 8.1 Update `src/context/GameContext.tsx` and `src/App.tsx`
    - Hold Clocktower_State and `WorldSession` in the reducer state in memory for this checkpoint (see "Decisions before implementation"). Task 17.1 moves Clocktower_State into saved progress.
    - The `WORLD_ACTION` branch calls `evaluateWorldAction` and returns the previous reducer state object for any outcome other than `changed`, so autosave does not run.
    - Add `dispatchWorldAction(action)`, which returns the same outcome the reducer applies.
    - Add `ENTER_COURTYARD_PREVIEW`, ignored unless `import.meta.env.DEV`. It stashes the current progress, then sets potion held, `currentRoom = 'clocktower'`, the initial Clocktower_State, the session at `courtyard-west`, and the `challenge` phase.
    - While the preview is active, `saveProgress`, autosave, and save-at-once do nothing. `EMERGENCY_EXIT` restores the stash.
    - `App` dispatches the preview after `LOADING_COMPLETE` when `DEV_FLAGS.preview === 'courtyard'`, then removes the parameter with `history.replaceState`.
    - _Requirements: 2.1, 2.3, 2.4, 3.2, 3.3, 4.1, 4.3, 4.6, 4.7, 11.4, 11.8_
  - [x] 8.2 Write `tests/unit/clocktowerGameContext.test.tsx`
    - A rejected or repeated `WORLD_ACTION` returns the same reducer state object and makes no storage write.
    - The preview leaves `keyquest-progress-v1` byte-identical, or absent if it was absent. Emergency Exit restores the stashed progress.
    - Every preview activation builds the same state. `ENTER_COURTYARD_PREVIEW` does nothing when DEV is false.
    - _Requirements: 2.4, 3.3, 4.1, 4.3, 4.5, 4.6_
  - [ ]* 8.3 Write property test for preview isolation (`tests/unit/clocktowerProgress.property.test.ts`)
    - **Property 29: The preview is isolated from saved progress**
    - **Validates: Requirements 4.1, 4.6**

- [x] 9. Add the Clocktower hooks
  - [x] 9.1 Create `src/hooks/useHeldDirections.ts`
    - Merges keyboard and touch holds through `heldInput` and calls `handle.setHeld` on change.
    - Clears every hold on `window` blur, on `visibilitychange` to hidden, when `inputBlocked` turns true, and on unmount. Clears keyboard holds on Play_Area blur.
    - Refuses `press` and `interact` while `inputBlocked`.
    - _Requirements: 6.6, 6.10, 9.4, 9.10, 11.1, 11.2, 11.3, 11.6, 11.7_
  - [x] 9.2 Create `src/hooks/useRoomStatus.ts` and `src/hooks/useReactionToken.ts`
    - `announce(text)` sets the text in the same render. When the text is identical, it clears the region and sets the text again on the next animation frame.
    - The reaction token's `next()` and `isCurrent(n)` invalidate pending mascot reactions when a new attempt starts and on unmount.
    - _Requirements: 3.4, 3.6, 10.7, 12.5, 23.5_
  - [x] 9.3 Write `tests/unit/clocktowerHooks.test.tsx`
    - Hold clearing on each trigger. A key held through blur does not restart movement on `repeat` keydowns.
    - An identical status text is announced again. A stale reaction token is skipped after a new attempt and after unmount.
    - _Requirements: 3.6, 6.10, 11.1, 11.2, 11.3, 11.6, 12.5, 23.5_

- [x] 10. Build the WorldScene adapter with a lazy chunk and safe disposal
  - [x] 10.1 Create `src/components/WorldScene/WorldSceneHost.tsx` (no Phaser import)
    - `await import('./phaser/createWorldScene')` with a `generation` guard, a module-level `activeHandle` so at most one game exists, and a 10 s timeout.
    - Cleanup sets `cancelled`, swaps the callbacks for no-ops, calls `game.destroy(true)`, and clears the parent.
    - Sets `aria-hidden="true"` on the canvas holder and `tabindex="-1"` on the canvas. Reports `data-scene-state` (`loading`, `ready`, `failed`) and names the failed resource.
    - _Requirements: 2.7, 2.8, 2.9, 2.10, 2.11, 10.1_
  - [x] 10.2 Write `tests/unit/WorldSceneHost.test.tsx` with a fake dynamic module
    - A StrictMode double mount creates one handle. Unmount destroys the handle and silences its callbacks.
    - With fake timers, the 10 s timeout fails the scene and destroys a game that arrives later. An import rejection reports "Phaser module".
    - _Requirements: 2.8, 2.9, 2.11_
  - [x] 10.3 Create `src/components/WorldScene/phaser/createWorldScene.ts` for the courtyard
    - The game config from design.md: `Phaser.AUTO`, `Scale.RESIZE`, every input plugin off, no audio, `autoFocus: false`.
    - Load courtyard textures from the manifest. Draw the data-built tilemap floor unscaled, the wall kit decor, the Landmarks, and the lantern post.
    - Generate the `lantern-post-lit` canvas texture (design decision 6) unless `props/lantern-post-lit.png` is listed in the manifest.
    - Ghost container at the anchor with four facing textures using origin (64/128, 117/128). Depth sorting by anchor `y`.
    - `update` steps `moveBody` with `solidsFor`, sets the camera from `cameraScroll` (exact on the first frame and under reduced motion), and fires the callbacks only when values change. Exit callbacks are edge-triggered.
    - `update(snapshot)` swaps the lantern texture and exit solidity in the same call. `inputBlocked` stops movement. `setHeld` sets facing even when movement is blocked.
    - `onDebug` writes DEV data attributes at most once per frame. A `loaderror` or an exception inside `update` reports through `onLoadError`.
    - Add basic idle hover, move lean, and stop settle on the inner sprite. When reduced motion is enabled, stop those tweens and restore the resting pose without moving the world anchor. Task 28.1 extends this motion to the other route actions.
    - _Requirements: 2.2, 2.12, 3.4, 5.2, 5.3, 5.4, 6.2, 6.4, 6.5, 6.6, 6.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 8.5, 8.10, 10.6, 10.11, 12.1, 12.2, 12.3, 12.4_

- [x] 11. Build the Clocktower controls
  - [x] 11.1 Create `src/components/Clocktower/PlayArea.tsx` and its `.module.css`
    - A focusable `role="application"` wrapper with `aria-label="Clocktower Gate play area"` and `aria-describedby` pointing to the visible instruction text.
    - Arrow keys always call `preventDefault()` and press or release a hold, ignoring `repeat`. Enter and Space call `interact()` once per press, ignoring `repeat`. Tab, Shift+Tab, and Escape are left alone.
    - Blur releases keyboard holds. The focus ring is on the outer element and the clipping is on an inner holder.
    - In DEV, render the `data-ghost-*`, `data-camera-*`, `data-area`, `data-lantern`, and `data-renderer` attributes. In every build, render `data-scene-state`.
    - _Requirements: 3.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.9, 6.10, 8.4, 8.7, 10.1, 11.5_
  - [x] 11.2 Create `src/components/Clocktower/TouchControls.tsx` and its `.module.css`
    - Five native buttons: "Move up", "Move down", "Move left", "Move right", and "Interact". Each has an `aria-hidden` glyph and a hidden text name.
    - Direction buttons are 48 × 48 and Interact is 56 × 56, with no overlap.
    - Pointer down presses. Pointer up, cancel, leave, and `lostpointercapture` release. Enter or Space keydown presses and keyup or blur releases.
    - Interact runs `interact()` once, from either `onKeyDown` with `preventDefault()` or from `onClick`.
    - Set `touch-action: none` and block text selection, the touch callout, and the context menu on the group only.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.8, 9.9, 9.10, 11.7_
  - [x] 11.3 Create `src/components/Clocktower/RoutePanel.tsx` and its `.module.css`
    - Shows the Area name, the "In view" Landmarks (every Landmark in the Area while the scene is not running), "Nearby", and action buttons from `getAvailableActions`. Each button name gives the action and the target.
    - After a successful action removes its button, focus moves to the first remaining action button or to the heading on the next frame. After a rejection, focus stays on the button.
    - _Requirements: 5.5, 5.6, 5.7, 8.1, 8.2, 10.2, 10.3, 10.4, 10.5, 10.8, 10.9, 10.10_

- [x] 12. Compose the ClocktowerView and route to it
  - [x] 12.1 Create `src/views/ClocktowerView.tsx` and `.module.css`, and update `src/GameRouter.tsx`
    - Put the content in the DOM order from design.md "ClocktowerView composition". A layout effect focuses `#room-heading` on mount.
    - Show the preview label in `--color-warning` on `--color-bg-deep`. Show the companion `RiveMascot` medallion with the selected costume, the objective, and Room_Status (`role="status"`, polite, atomic).
    - The world column holds the scene status line, `PlayArea`, the instructions, and `TouchControls`. The route column holds `RoutePanel`.
    - Room tools (Doors, Costumes, Reset) and their dialogs follow `PantryView`. `inputBlocked` comes from the open dialogs.
    - `interact()` announces "nothing close enough" when nothing is nearby, and otherwise dispatches `actionForInteractable(nearby)`.
    - Snapshot updates run in `useLayoutEffect` in the same commit. The view announces the nearby Interactable once per change, the exit-contact message once per contact, the preview exit message once per entry, and the "visual map is unavailable" notice on failure.
    - `celebrate` is sent through the reaction token after the lit commit, and only for a `changed` lantern outcome. Pass `reducedMotion` from `usePrefersReducedMotion` in every snapshot.
    - Render `ClocktowerView` from `GameRouter` when `currentRoom === 'clocktower'`.
    - _Requirements: 1.6, 2.2, 2.5, 2.10, 2.11, 2.12, 3.2, 3.4, 3.5, 3.6, 4.4, 8.3, 8.6, 8.7, 8.8, 8.11, 9.7, 10.8, 10.11, 11.3, 11.4, 11.5, 11.8, 12.5, 12.6, 12.7, 12.8, 12.9_
  - [x] 12.2 Write `tests/unit/ClocktowerView.test.tsx` with `WorldSceneHost` mocked by a fake handle
    - Heading focus on mount. Loading and failure text. Route_Panel buttons operable while loading.
    - One dispatch per non-repeat Enter. "Nothing close enough" when nothing is nearby. The nearby Interactable announced once. A repeated rejection announced again.
    - Focus after Route_Panel success and rejection. Touch pointer and key events. Holds cleared on blur and when a dialog opens.
    - `celebrate` sent once on lighting, never on a repeat or on mount with a lit lantern. No signal after unmount.
    - _Requirements: 1.6, 2.2, 2.10, 2.11, 3.6, 3.7, 8.3, 8.4, 8.7, 9.4, 9.6, 10.9, 10.10, 11.2, 11.3, 12.5, 12.6, 23.5_
  - [x] 12.3 Write `tests/unit/noPhaserImport.test.ts`
    - Mock `phaser` to throw on import, then import every Clocktower module and `ClocktowerView` with `WorldSceneHost` mocked. None may load Phaser.
    - _Requirements: 2.6, 24.13_

- [x] 13. Write the courtyard browser and production tests
  - [x] 13.1 Create `tests/e2e/helpers/clocktower.ts` and `tests/e2e/clocktower-courtyard-keyboard.spec.ts`
    - Helpers: `openCourtyardPreview`, `seedSave`, `openClocktower` (uses `/?built=clocktower`), `ghost`, and `holdKey`, as listed in design.md "Playwright specs by checkpoint". Every spec clears storage or seeds it.
    - Keyboard spec: Tab to the Play_Area, then confirm the scroll position stays unchanged while Arrow keys are pressed (Requirements 6.3 and 25.1; the browser may scroll the Play_Area into view when it takes focus). Hold toward the north wall for 2 s and expect the Ghost flush with the wall. Reach the lantern, press Enter, and check the status. Tab out and expect the Ghost stopped. Also check the facing anchor and the focus ring.
    - _Requirements: 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.9, 6.10, 25.1, 25.12, 25.13_
  - [x] 13.2 Write `tests/e2e/clocktower-courtyard-touch.spec.ts`
    - At 375 × 667 with `hasTouch`: every button is at least 44 × 44 with no overlap, there is no horizontal overflow, a pointer hold moves the Ghost, and Interact at the lantern lights it. The Play_Area and controls fit in the viewport together.
    - _Requirements: 9.1, 9.2, 9.3, 9.7, 9.9, 25.2_
  - [x] 13.3 Write `tests/e2e/clocktower-courtyard-route-panel.spec.ts`
    - Light the lantern with Route_Panel buttons only.
    - With `page.route('**/phaser*', route => route.abort())`, check the failure text and finish the lantern through the Route_Panel.
    - _Requirements: 2.11, 10.11, 25.3, 25.11_
  - [x] 13.4 Write `tests/e2e/clocktower-courtyard-reduced-motion.spec.ts`
    - Run once with `reducedMotion: 'reduce'` and once with only the footer toggle. Check `html[data-reduced-motion="true"]`, the lit lantern, and Room_Status text equal to a normal run. Check exact camera placement.
    - _Requirements: 7.7, 12.1, 12.2, 25.4_
  - [x] 13.5 Write `tests/e2e/clocktower-scene-lifecycle.spec.ts`
    - Enter, leave, enter: one canvas in the Play_Area after each entry and zero after leaving.
    - The menu and the Door_Selector make no Phaser chunk request.
    - _Requirements: 2.7, 2.8, 2.9, 25.5_
  - [x] 13.6 Write `tests/e2e/clocktower-input-boundaries.spec.ts`
    - Play_Area blur, window blur, hidden page, and an open modal (Reset or Costume Locker) each stop the Ghost, which then stays still for 1000 ms.
    - Escape saves and exits. Emergency Exit is within 5 Tab and 5 Shift+Tab presses at 375 × 667, 768 × 1024, and 1024 × 600. Exit still works with storage stubbed to throw.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_
  - [x] 13.7 Write `tests/e2e/clocktower-preview.spec.ts`
    - Same initial state on every activation. The stored value is identical before and after, or stays absent.
    - The preview label is visible. Exit discards preview state. A reload returns to the menu without reopening the preview.
    - _Requirements: 4.1, 4.3, 4.4, 4.6, 4.7_
  - [x] 13.8 Write `tests/e2e/clocktower-a11y.spec.ts` for the courtyard
    - Axe scans with `.exclude('[data-testid="challenge-sandbox"]')` through `tests/e2e/helpers/axe.ts`, before and after lighting. Zero violations of any impact.
    - _Requirements: 10.1, 25.10_
  - [x] 13.9 Write `tests/production/clocktower-chunk.mjs` and extend `tests/production/startup-smoke.mjs`
    - Chunk script: the entry chunk in `dist/assets` has no Phaser code, another chunk does, and `dist/index.html` has no `script` or `modulepreload` tag for that chunk.
    - Smoke: against `npm run preview`, `/?preview=courtyard` and `/?built=clocktower` show the normal menu and a Coming later door.
    - _Requirements: 1.2, 4.2, 4.5, 27.7_

- [x] 14. Checkpoint 1: Animated courtyard
  - Ensure all tests pass, ask the user if questions arise.
  - All tasks 2 to 13 are complete. Optional property tasks that were skipped are listed in the report.
  - Run `npm run build`, `npm run typecheck`, and `npm run lint`. Each must exit 0 with zero errors. List every warning with a justification.
  - Run the full `npm test` and `npm run test:e2e`. Report passed, failed, and skipped counts with zero failures. The existing Checkout and Pantry specs pass with none removed or newly skipped.
  - Run the shell axe scans with the sandbox excluded (`clocktower-a11y.spec.ts`) with zero violations.
  - Do a manual keyboard-only run of the courtyard preview: Tab in, observe hover, move and stop, light, Tab out, Escape. Repeat with reduced motion and verify the same route and outcome.
  - Run `npm run build && npm run preview`, then `node tests/production/clocktower-chunk.mjs` and the startup smoke. Record the Phaser chunk size (design decision 5).
  - Code Mode Playwright evidence through `.kiro/settings/mcp.json`: `search` for the navigate, resize, key press, click, evaluate, screenshot, and close operations, `describe` each one before its first call, and `execute` with one `browserSession` reused for every capture, ending with `browser_close`. Capture the objective, the lantern post with its Route_Panel button, and the lit lantern at 1280 × 720 and 375 × 667 (six captures minimum). Save them under `.kiro/specs/adventure-phase-3-clocktower-gate/evidence/` as `cp1-{state}-{width}x{height}.png`.
  - Write the Checkpoint_Report in `.kiro/specs/adventure-phase-3-clocktower-gate/verification.md`: what was done, files changed, tests run and results, the Code Mode queries and calls, and results under four headings (emulated viewports, keyboard-only runs, touch emulation, physical phone tests, with "not run" where nothing was done). Mark the checkpoint incomplete and name the cause if any gate or capture is missing.
  - Stop here for the courtyard review before task 15.
  - _Requirements: 24.14, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7_

### Checkpoint 2: Complete route (gated behind the courtyard review)

- [x] 15. Extend Route_Data to all five Areas
  - [x] 15.1 Add the full route to `src/registry/clocktowerRoute.ts` and its copy to `src/registry/clocktowerCopy.ts`
    - Apothecary Exit, Overgrown Graveyard, Clockworks Passage, and Belfry, with the floors and sizes from design.md "Area list". Add exits both ways between adjacent Areas, the `passage-belfry-side` spawn, a west exit from the Courtyard, and per-Area asset manifests.
    - Three Clue plaques with the Clue texts from design decision 4, the gate at anchor (256, 296), and Belfry placements for the bells and windows.
    - Add the Apothecary Exit controls text and the Area names to the copy.
    - _Requirements: 13.1, 13.2, 13.4, 14.1, 15.2, 15.4_
  - [x] 15.2 Extend `tests/unit/clocktowerRoute.test.ts` to every Area
    - Exits lead to defined spawns in adjacent Areas only. Zones are non-zero. Spawns are inside the bounds and outside the solids. Each Area is reachable, and the manifests map to files.
    - _Requirements: 13.1, 13.2, 14.1, 24.10_
  - [x] 15.3 Extend `solidsFor` in `src/engines/worldPhysics.ts`
    - The courtyard-east exit stays closed while the lantern is unlit. The gate and the Passage-to-Belfry exit stay closed while the gate is closed. Exits toward earlier Areas are always open.
    - _Requirements: 13.5, 13.6, 13.7, 13.8, 13.9, 15.2_
  - [ ]* 15.4 Write property test for exit solidity (`tests/unit/worldPhysics.property.test.ts`)
    - **Property 8: Exit and gate solidity follow state**
    - **Validates: Requirements 8.5, 8.10, 13.5, 13.6, 13.7, 13.9, 15.2**

- [x] 16. Extend the World_Action rules to the route
  - [x] 16.1 Extend `src/engines/clocktowerRules.ts` and `src/registry/clocktowerCopy.ts`
    - `enter-area` covers adjacency through open exits, travel to entered Areas, and the shortcut. A new Area is appended to `checkpoints`, becomes `lastCheckpoint`, and sets `saveNow`.
    - `find-clue` stores Clues in route order and reports the name, the text, and "N of 3". `open-gate` sets `gateOpen` and `shortcutUnlocked` together, and a rejection names each missing Clue.
    - Add `journalClues`, the travel targets, the objective stages through the open gate, `normalizeClocktowerState(raw, verified)` with the prerequisite chain from design.md, and `hasClocktowerProgress`.
    - _Requirements: 13.3, 13.8, 13.10, 13.11, 14.2, 14.3, 14.5, 14.6, 15.1, 15.3, 15.5, 15.6, 15.7, 16.4, 16.5, 17.1, 17.6_
  - [x] 16.2 Extend `tests/unit/clocktowerRules.test.ts`
    - The gate with 0, 1, and 2 Clues is rejected with the missing Clues named. Three Clues open the gate and the shortcut.
    - Each Clue found in any order, and each repeat leaves the state unchanged. The gate is already open on a repeat.
    - `enter-area` through a closed exit, a new Checkpoint, and a known Checkpoint. Travel and shortcut targets.
    - _Requirements: 13.8, 13.10, 14.2, 14.5, 15.1, 15.3, 15.7, 17.1, 24.2, 24.3_
  - [ ]* 16.3 Write property test for the prerequisite chain (`tests/unit/clocktowerRules.property.test.ts`)
    - **Property 6: Reachable states satisfy the prerequisite chain**
    - **Validates: Requirements 13.3, 14.2, 15.1, 16.4**
  - [ ]* 16.4 Write property test for travel targets
    - **Property 9: Travel targets match entered Areas and the shortcut**
    - **Validates: Requirements 13.10, 15.4, 15.6**
  - [ ]* 16.5 Write property test for Checkpoints
    - **Property 10: Entering a new Area records one Checkpoint**
    - **Validates: Requirements 13.3, 17.1**
  - [ ]* 16.6 Write property test for the Journal
    - **Property 12: The Journal lists found Clues in route order**
    - **Validates: Requirements 14.3**

- [x] 17. Move to save schema version 3
  - [x] 17.1 Update `src/types/index.ts`, `src/storage/progressSchema.ts`, `src/storage/progressHelpers.ts`, and `src/registry/roomsRegistry.ts`
    - Set `ProgressState.version: 3` and add `clocktower: ClocktowerState`.
    - Add `'bell-dialog-focus'` to `DefectType`, `ALL_DEFECT_TYPES`, and `ROOM_DEFECTS.clocktower`. Add any `Record<DefectType, …>` entry the type checker requires, using the patch table in design.md. Task 21.1 finishes the hint copy.
    - `PROGRESS_VERSION = 3`. `migrateProgress(data, built)` follows steps 1 to 7 in design.md "Progress schema version 3", including the resumable room list from `isRoomBuilt` and the `currentRoom` fallback.
    - `hasMeaningfulProgress` includes `hasClocktowerProgress`. `resetRoomProgress(progress, 'clocktower')` resets the Clocktower part only.
    - `isRoomCleared('clocktower')` reads `lightsRestored`. `isAdventureComplete` needs the lights when the room is built.
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 17.3, 17.5, 17.6, 17.9, 18.2, 18.3, 18.6_
  - [x] 17.2 Write `tests/unit/progressSchemaV3.test.ts`
    - Version 1 and version 2 saves keep Checkout and Pantry and gain the initial Clocktower part and bell curse at version 3.
    - Clearing cases: Clocktower progress without the potion, an open gate with fewer than three Clues, and rings without a verified curse. A malformed Clocktower part is replaced while the rest of the save stays unchanged.
    - The `currentRoom` fallback when not built. Unsupported versions are rejected.
    - Extend the door test to cover Cleared when the room is built, the potion is held, and the lights are restored.
    - For example valid states, saving then loading returns equivalent progress, and normalizing a normalized Clocktower_State returns the same state. This covers Requirement 24.7 when the optional property tasks 17.4 and 17.5 are skipped.
    - _Requirements: 1.4, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 24.1, 24.5, 24.6, 24.7_
  - [x] 17.3 Write `tests/unit/clocktowerReset.test.ts`
    - A Clocktower reset clears Clocktower_State, the bell curse, and its hints, and keeps Checkout, Pantry, and the potion.
    - Start over clears every room. A save whose only progress is Clocktower_State counts as meaningful.
    - _Requirements: 17.3, 17.5, 17.6, 24.8, 24.9_
  - [ ]* 17.4 Write property test for the save round trip (`tests/unit/progressSchemaV3.property.test.ts`)
    - **Property 20: Saving then loading returns the same progress**
    - **Validates: Requirements 16.8**
  - [ ]* 17.5 Write property test for normalization
    - **Property 21: Normalization is idempotent and enforces the chain**
    - **Validates: Requirements 16.4, 16.9**
  - [ ]* 17.6 Write property test for older saves
    - **Property 22: Migration keeps older rooms**
    - **Validates: Requirements 1.8, 16.2**
  - [ ]* 17.7 Write property test for malformed Clocktower data
    - **Property 23: Bad Clocktower data replaces only that part**
    - **Validates: Requirements 16.3, 16.5, 17.9**
  - [ ]* 17.8 Write property test for the room fallback
    - **Property 24: An unavailable Clocktower room falls back**
    - **Validates: Requirements 16.6, 18.2, 18.6**
  - [ ]* 17.9 Write property test for unsupported versions
    - **Property 25: Unsupported versions are rejected**
    - **Validates: Requirements 16.7**
  - [ ]* 17.10 Write property test for the room reset (`tests/unit/clocktowerProgress.property.test.ts`)
    - **Property 26: A Clocktower reset leaves other rooms alone**
    - **Validates: Requirements 17.3**
  - [ ]* 17.11 Write property test for meaningful progress
    - **Property 27: Meaningful Clocktower progress**
    - **Validates: Requirements 17.6**
  - [ ]* 17.12 Write property test for adventure completion
    - **Property 28: Adventure completion includes the lights when built**
    - **Validates: Requirements 18.3**

- [x] 18. Connect the full route to the Game_Context, scene, and view
  - [x] 18.1 Update `src/context/GameContext.tsx`
    - Read and write Clocktower_State through `progress.clocktower` instead of the in-memory slot. The preview stash keeps working.
    - `ENTER_ROOM`, `START_CHALLENGE` into the Clocktower, and `RESET_ROOM` set the session to `lastCheckpoint ?? 'apothecary-exit'` and advance `arrival.seq`. `saveNow` saves at once.
    - A Clocktower reset clears the room and saves. A cancelled reset changes nothing. Add `CONCEPTS.clocktower`.
    - _Requirements: 14.4, 17.1, 17.2, 17.3, 17.5, 17.7, 17.8, 17.9, 18.2_
  - [x] 18.2 Extend `src/components/WorldScene/phaser/createWorldScene.ts` to every Area
    - Build each Area from Route_Data, loading its textures when the Area changes. Teleport only when `arrival.seq` changes.
    - Exit contact and exit entry are reported through the callbacks. Draw the Clue plaques and the closed and open gate textures. Report a texture `loaderror` with its file key.
    - _Requirements: 2.11, 13.3, 13.5, 13.6, 13.7, 13.8, 13.9, 14.1, 15.2, 17.2_
  - [x] 18.3 Update `RoutePanel.tsx`, create `src/components/Clocktower/ClocktowerJournal.tsx`, and update `ClocktowerView.tsx`
    - Add travel buttons for entered Areas, plus the two shortcut buttons while `shortcutUnlocked`.
    - The Journal shows "Clues found" in route order, or "No clues found yet."
    - Show the Apothecary Exit controls text. `onExitEntered` dispatches `enter-area`. Exit-contact messages name the unmet condition. Show the gate and shortcut messages and the reset message.
    - _Requirements: 10.4, 13.3, 13.4, 13.8, 13.10, 13.11, 14.3, 14.4, 14.6, 14.7, 15.4, 15.5, 15.6, 17.7_
  - [x] 18.4 Extend `tests/unit/ClocktowerView.test.tsx`
    - Travel and shortcut buttons. Journal order and its empty state. Spawn at the last Checkpoint on mount. The reset status message.
    - _Requirements: 13.10, 13.11, 14.3, 14.7, 15.4, 15.6, 17.2, 17.7_

- [x] 19. Write the route browser tests
  - [x] 19.1 Write `tests/e2e/clocktower-route.spec.ts`
    - From a seeded Pantry save with `/?built=clocktower`, play from the Apothecary Exit to the open gate and into the Belfry.
    - Reload after a Clue: the Ghost is at the last Checkpoint spawn, and the lantern, Clues, and Journal are unchanged. Task 25.3 extends this spec to the lights.
    - _Requirements: 13.3, 13.11, 14.4, 15.2, 17.1, 17.2, 25.8_
  - [x] 19.2 Write `tests/e2e/clocktower-door.spec.ts`
    - Coming later without the override. Locked and Open with the override. Enter moves focus to the heading. No "later update" text on the door or completion views.
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.9, 18.5_
  - [x] 19.3 Write `tests/e2e/clocktower-save-reset.spec.ts`
    - Migration from a seeded version 2 save. A Clocktower reset keeps the other rooms. Cancelling changes nothing. Start over clears everything.
    - _Requirements: 16.2, 17.3, 17.5, 17.7, 17.8_
  - [x] 19.4 Extend `tests/e2e/clocktower-a11y.spec.ts`
    - Add shell axe scans in the Graveyard and the Passage, with the sandbox excluded and zero violations.
    - _Requirements: 25.10_

- [ ] 20. Checkpoint 2: Complete route
  - Ensure all tests pass, ask the user if questions arise.
  - All tasks 15 to 19 are complete. Skipped optional property tasks are listed.
  - Run `npm run build`, `npm run typecheck`, and `npm run lint` (exit 0, warnings justified), the full `npm test`, and `npm run test:e2e` with zero failed or skipped tests. The Checkout and Pantry specs are unchanged and passing.
  - Run the shell axe scans with the sandbox excluded, a manual keyboard-only run through the route with `/?built=clocktower`, `npm run build && npm run preview`, the Phaser chunk script, and the startup smoke.
  - Code Mode Playwright evidence (search, describe, execute, one `browserSession`, `browser_close`): the route objective, the gate with three Clues in the Journal, and the open gate at 1280 × 720 and 375 × 667, saved as `cp2-{state}-{width}x{height}.png`.
  - Append the Checkpoint 2 report to `verification.md` under the same four headings.
  - Stop for review before task 21.
  - _Requirements: 24.14, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7_

### Checkpoint 3: Live bell focus repair (gated behind the courtyard review and Checkpoint 2 review)

- [x] 21. Add the bell curse registry entries
  - [x] 21.1 Update `src/registry/patchRegistry.ts`, `src/registry/hintRegistry.ts`, and the defect labels
    - Catalog entry with `testId: 'defect-bell-focus'`, `repairTestId: 'repair-bell-focus'`, and `wcagCriterion: 'WCAG 2.4.3 Focus Order'`. Add the three patches and the trap diagnoses from design.md.
    - Add three progressive hints and `DEFECT_LABELS`.
    - _Requirements: 20.1, 20.3, 20.11, 20.12_
  - [ ]* 21.2 Write property test for bell hints (`tests/unit/clocktowerProgress.property.test.ts`)
    - **Property 30: Hints for the bell curse advance one at a time**
    - **Validates: Requirements 20.12**

- [x] 22. Stop Emergency Exit from acting on a handled Escape (regression test first)
  - [x] 22.1 Write `tests/unit/EmergencyExitEscape.test.tsx` before changing the button
    - A handled Escape and a repeated Escape do not exit. A fresh, unhandled Escape exits.
    - Run it and confirm the first case fails before task 22.2.
    - _Requirements: 22.2, 22.6_
  - [x] 22.2 Update `src/components/EmergencyExit/EmergencyExitButton.tsx`
    - Ignore `event.defaultPrevented` and `event.repeat` in the document Escape listener. Keep the `dialog[open]` check. Confirm task 22.1 now passes.
    - _Requirements: 22.2, 22.5, 22.6_

- [x] 23. Build the bell sandbox, repair, and verification
  - [x] 23.1 Create `src/components/BellTower/BellTower.tsx` (sandbox only)
    - Use the markup from design.md "Sandbox markup". The bell row is re-keyed by `dialogSession` on close, which is the defect. The non-modal `role="dialog"` has a title, Ring, and Cancel.
    - Fire the `keyquest-bell-open` and `keyquest-bell-close` events from layout effects. A capture-phase `document` Escape handler runs while the dialog is open.
    - Skip discovery, `onRing`, and status messages while `data-keyquest-verifying` is set. Discovery is recorded once. Reapply the repair in a layout effect when the saved curse is repaired.
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.10, 22.1, 22.3_
  - [x] 23.2 Update `src/engines/RepairEngine.ts`
    - `repairBellDialogFocus(dialog)` adds the open and close listeners through `addedListeners` and sets `data-keyquest-repaired="bell-focus"`.
    - Add a reset branch for `'bell-dialog-focus'` and include it in `resetAllRepairs`.
    - _Requirements: 17.4, 20.2_
  - [x] 23.3 Update `src/engines/VerificationEngine.ts` and `src/types/index.ts`
    - Async `verifyDialogFocus(dialog)` following design.md "Verification" steps 1 to 5. Add the `DialogFocusVerificationDetails` type.
    - _Requirements: 20.4, 20.5, 20.6, 20.7, 20.8_
  - [x] 23.4 Update `src/components/RepairStudio/RepairStudio.tsx`
    - `PAYOFF_FOCUS['bell-dialog-focus']` returns the Moon bell control. Add a `formatVerificationDetails` case `dialog-focus` that lists each check with pass or fail and the focused element.
    - Check again reruns all four checks.
    - _Requirements: 20.3, 20.9, 20.10, 20.11_
  - [x] 23.5 Write `tests/unit/BellFocusVerification.test.tsx`
    - Before repair, the entry and return checks fail. After repair, all four pass.
    - Spies show no `onRing`, no discovery, and no Emergency Exit during verification, and the dialog ends closed.
    - A missing first bell fails all four checks with "element not found". Reset restores the defect.
    - _Requirements: 17.4, 19.2, 19.3, 20.2, 20.4, 20.5, 20.6, 20.7, 20.8, 24.11, 24.12_

- [x] 24. Implement the bell sequence and the Belfry
  - [x] 24.1 Extend `src/engines/clocktowerRules.ts` and `src/registry/clocktowerCopy.ts` with `ring-bell`
    - `rejected: 'jammed'` until the curse is verified. `rejected: 'out-of-order'` names the next bell. A correct ring appends to `bellRings`. The third ring sets `lightsRestored` with `celebrate`. After the lights, every ring is a `repeat`.
    - Add the objective stages through Restored, the bell actions in `getAvailableActions`, and the "N of 3 bells rung" text.
    - _Requirements: 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9, 21.11_
  - [x] 24.2 Extend `tests/unit/clocktowerRules.test.ts`
    - A ring while unverified. A correct next ring. An out-of-order ring that keeps earlier rings. A repeat of a rung bell. A cancel that leaves the sequence unchanged. The third ring restores the lights. A ring after the lights.
    - _Requirements: 21.2, 21.3, 21.4, 21.5, 21.7, 21.11, 24.2, 24.4_
  - [ ]* 24.3 Write property test for the bell sequence (`tests/unit/clocktowerRules.property.test.ts`)
    - **Property 7: The bell sequence never loses a correct ring**
    - **Validates: Requirements 21.2, 21.3, 21.4, 21.5, 21.9, 21.11**
  - [ ]* 24.4 Write property test for completing the route from the Route_Panel
    - **Property 5: The Route_Panel alone completes the route**
    - **Validates: Requirements 10.11, 14.2**
  - [x] 24.5 Extend `createWorldScene.ts` for the Belfry
    - Draw the bell chamber, three bells, three windows, and the alchemist's lantern. The number of lit windows equals `bellRings.length`, and all three are lit when the lights are restored.
    - Bell Interactables report through `onNearbyChange`.
    - _Requirements: 19.10, 21.3, 21.4, 21.6, 21.10, 21.11_
  - [x] 24.6 Update `ClocktowerView.tsx`, `RoutePanel.tsx`, `ClocktowerJournal.tsx`, and `GameContext.tsx`
    - Show the Belfry section once the gate is open: the Inspect button (`data-testid="inspect-bell-focus"`), `ChallengeSandbox` with `BellTower`, `RepairStudio`, and `HintPanel` with the hint keeper medallion bound to `hintKeeperSignal`.
    - A bell Interactable and the Route_Panel bell actions open the same dialog. `onRing` dispatches `ring-bell`. Show the bell progress text and the static Journal bell order.
    - `RulesContext.bellCurseVerified` comes from the defect state. After the lights, the objective shows "See the finale", which dispatches `COMPLETE_ROOM`. Send `celebrate` once when the room becomes cleared. A Clocktower reset calls `resetRepair`.
    - _Requirements: 17.4, 19.1, 19.6, 19.8, 19.9, 19.10, 21.1, 21.5, 21.6, 21.8, 21.10, 22.4, 22.5, 23.6, 23.7_
  - [x] 24.7 Extend `tests/unit/ClocktowerView.test.tsx`
    - Inspect discovers the curse and moves focus to the repair. A bell Interactable opens the named dialog. Jammed and out-of-order messages. Progress text.
    - `celebrate` on clearing only, and not on resume. The hint keeper gets one `requestAttention` per hint.
    - _Requirements: 19.9, 19.10, 21.2, 21.4, 21.8, 21.10, 23.6, 23.7_

- [x] 25. Write the bell browser tests
  - [x] 25.1 Write `tests/e2e/clocktower-bell-repair.spec.ts`
    - The defect before repair and the fix after it, for Ring, Cancel, and Escape.
    - The trap patch shows its diagnosis and the curse stays unverified. A capture `focusin` blur listener forces a failed check, which is named with Check again. After removing the listener, Check again verifies and focus lands on the Moon bell.
    - _Requirements: 19.2, 19.3, 20.2, 20.3, 20.9, 20.10, 25.6, 25.7_
  - [x] 25.2 Write `tests/e2e/clocktower-bell-exit.spec.ts`
    - Escape with the Play_Area focused saves and exits. Escape with the bell dialog open closes it and the view stays through auto-repeat. Release Escape and press it again to exit. An active native modal gets the first Escape.
    - Emergency Exit with the dialog open returns to the menu with no ring recorded.
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 25.9_
  - [x] 25.3 Extend `tests/e2e/clocktower-route.spec.ts` to the lights
    - Ring Moon, Key, Thorn, with one out-of-order retry. Each correct ring lights a window.
    - Reload after the lights: the Door_Selector shows Cleared, and Revisit shows the lights restored in Room_Status or the Route_Panel.
    - _Requirements: 21.3, 21.4, 21.5, 21.6, 21.10, 18.3, 25.8_
  - [x] 25.4 Extend `tests/e2e/clocktower-a11y.spec.ts` to the Belfry
    - Shell scan with the bell controls shown and the sandbox excluded, with zero violations. Add a sandbox scan that expects the bell focus defect before repair.
    - _Requirements: 19.1, 25.10_

- [x] 26. Publish the Clocktower room
  - Set `built: true` for the Clocktower in `src/registry/roomsRegistry.ts`, in the same change that lands the passing coverage from tasks 15 to 25.
  - Update `clocktower-door.spec.ts` and `startup-smoke.mjs`: without an override, the door is Locked or Open, and production still ignores `?preview=courtyard`.
  - Rerun the door, route, and existing Pantry specs.
  - _Requirements: 1.3, 1.4, 4.5, 18.1, 18.2, 18.5_

- [ ] 27. Checkpoint 3: Live bell focus repair
  - Ensure all tests pass, ask the user if questions arise.
  - All tasks 21 to 26 are complete. Skipped optional property tasks are listed.
  - Run `npm run build`, `npm run typecheck`, and `npm run lint` (exit 0, warnings justified), the full `npm test`, and `npm run test:e2e` with zero failed or skipped tests. The Checkout and Pantry specs are unchanged and passing.
  - Run the shell axe scans with the sandbox excluded, a manual keyboard-only run from a Pantry save to the lights (including Escape and Emergency Exit with the dialog open), `npm run build && npm run preview`, the Phaser chunk script, and the startup smoke against the published room.
  - Code Mode Playwright evidence (search, describe, execute, one `browserSession`, `browser_close`): the Belfry objective, the broken dialog with focus outside it, and the verified repair with a lit window in one take, at 1280 × 720 and 375 × 667, saved as `cp3-{state}-{width}x{height}.png`.
  - Record the first-playthrough Clocktower segment time against the 8 to 12 minute full-run target, with the slowest Area if a full run falls outside it.
  - Append the Checkpoint 3 report to `verification.md` under the four headings.
  - Stop for review before task 28.
  - _Requirements: 24.14, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8, 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7_

### Checkpoint 4: Motion pass (gated behind the courtyard review and Checkpoint 3 review)

- [ ] 28. Add distinct motion that never delays state
  - [x] 28.1 Create `src/components/WorldScene/phaser/motion.ts` and integrate it in `createWorldScene.ts`
    - Add the tween catalog from design.md "Motion pass": move lean, stop settle, hover bob, interact pulse, lantern warmup, clue reveal, gate opening, bell swing, and window lighting. Tweens apply to the inner sprite or the props only, never to the anchor container or the bodies.
    - The state and texture change happen in `update(snapshot)` first. Tweens are keyed by `effect.id`. A newer effect on the same target completes the older tween first. Tweens never block `setHeld` or interact.
    - Extend reduced-motion handling from the courtyard to every new effect. Each effect shows its final state immediately and the hover stops.
    - Report `data-ghost-pose` and `data-anim` through `onDebug` in DEV.
    - _Requirements: 7.2, 12.3, 12.4, 23.1, 23.2, 23.3, 23.4, 23.5, 23.8, 23.10, 23.11, 23.12_
  - [x] 28.2 Update `ClocktowerView.tsx` and `PlayArea.tsx`
    - Pass `outcome.effect` in the snapshot for `changed` outcomes only. Call `handle.pulseInteract()` when Interact runs with a Nearby_Interactable. Render the pose and animation attributes in DEV.
    - _Requirements: 23.1, 23.9, 23.11, 23.12_
  - [x] 28.3 Extend `tests/unit/ClocktowerView.test.tsx`
    - Room_Status updates before the effect reaches the fake handle. Rapid retries send no stale `celebrate`. A rejection sends no effect. Status text is the same with reduced motion on and off.
    - _Requirements: 23.1, 23.5, 23.8, 23.9, 23.12_
  - [x] 28.4 Write `tests/e2e/clocktower-motion.spec.ts`
    - Sample `data-ghost-pose` and `data-anim` with `page.evaluate` timing: a lean within 100 ms, a settle within 300 ms, a hover of at most 6 px, a pulse peak between 1.05 and 1.15 ending within 300 ms, and success animations within 1500 ms while movement continues.
    - Under reduced motion, final states appear within one frame.
    - _Requirements: 23.2, 23.3, 23.4, 23.8, 23.10, 23.11_

- [ ] 29. Checkpoint 4: Motion pass and release verification
  - Ensure all tests pass, ask the user if questions arise.
  - All tasks 28.1 to 28.4 are complete.
  - Run `npm run build`, `npm run typecheck`, and `npm run lint` (exit 0, warnings justified), the full `npm test`, and `npm run test:e2e` with zero failed or skipped tests. The Checkout and Pantry specs are unchanged and passing.
  - Run all shell axe scans with the sandbox excluded, and a manual keyboard-only run with reduced motion on and with sound off.
  - Run `npm run build && npm run preview`. From the production build, play from a Pantry save to the lights, show the defect and its repair, and check that progress survives a reload. Run the Phaser chunk script and the startup smoke.
  - Code Mode Playwright evidence (search, describe, execute, one `browserSession`, `browser_close`): the lantern, gate, and bell states mid-animation and settled, at 1280 × 720 and 375 × 667, saved as `cp4-{state}-{width}x{height}.png`.
  - Record the segment time against the 8 to 12 minute target.
  - Append the Checkpoint 4 report to `verification.md` under the four headings, with physical phone tests reported separately from emulation.
  - _Requirements: 23.8, 23.9, 24.14, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8, 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7_

## Verification

Test files from design.md "Testing Strategy", by the checkpoint and task that creates or extends
them. Files marked "new in this plan" are not in the design table. They exist so that every
module has required example tests even if the optional property tasks are skipped.

### Unit tests (`npm test`)

| File | Checkpoint | Tasks |
|---|---|---|
| `tests/unit/devFlags.test.ts` | 1 | 3.3 |
| `tests/unit/DoorAndCompletionCopy.test.tsx` | 1 | 4.2 |
| `tests/unit/clocktowerRoute.test.ts` | 1, 2 | 5.2, 15.2 |
| `tests/unit/worldPhysics.test.ts` (new in this plan) | 1 | 5.4 |
| `tests/unit/worldPhysics.property.test.ts` | 1, 2 | 5.5 to 5.9, 15.4 |
| `tests/unit/heldInput.test.ts` (new in this plan) | 1 | 6.2 |
| `tests/unit/heldInput.property.test.ts` | 1 | 6.3 |
| `tests/unit/clocktowerRules.test.ts` | 1, 2, 3 | 7.2, 16.2, 24.2 |
| `tests/unit/clocktowerRules.property.test.ts` | 1, 2, 3 | 7.3 to 7.7, 16.3 to 16.6, 24.3, 24.4 |
| `tests/unit/clocktowerGameContext.test.tsx` (new in this plan) | 1 | 8.2 |
| `tests/unit/clocktowerHooks.test.tsx` (new in this plan) | 1 | 9.3 |
| `tests/unit/WorldSceneHost.test.tsx` | 1 | 10.2 |
| `tests/unit/ClocktowerView.test.tsx` | 1, 2, 3, 4 | 12.2, 18.4, 24.7, 28.3 |
| `tests/unit/noPhaserImport.test.ts` | 1 | 12.3 |
| `tests/unit/clocktowerProgress.property.test.ts` | 1, 2, 3 | 4.3, 8.3, 17.10 to 17.12, 21.2 |
| `tests/unit/progressSchemaV3.test.ts` | 2 | 17.2 |
| `tests/unit/progressSchemaV3.property.test.ts` | 2 | 17.4 to 17.9 |
| `tests/unit/clocktowerReset.test.ts` | 2 | 17.3 |
| `tests/unit/EmergencyExitEscape.test.tsx` | 3 | 22.1 |
| `tests/unit/BellFocusVerification.test.tsx` | 3 | 23.5 |

### Browser tests (`npm run test:e2e`, `chromium` project)

| Spec | Checkpoint | Tasks |
|---|---|---|
| `tests/e2e/helpers/clocktower.ts` | 1 | 13.1 |
| `tests/e2e/clocktower-courtyard-keyboard.spec.ts` | 1 | 13.1 |
| `tests/e2e/clocktower-courtyard-touch.spec.ts` | 1 | 13.2 |
| `tests/e2e/clocktower-courtyard-route-panel.spec.ts` | 1 | 13.3 |
| `tests/e2e/clocktower-courtyard-reduced-motion.spec.ts` | 1 | 13.4 |
| `tests/e2e/clocktower-scene-lifecycle.spec.ts` | 1 | 13.5 |
| `tests/e2e/clocktower-input-boundaries.spec.ts` | 1 | 13.6 |
| `tests/e2e/clocktower-preview.spec.ts` | 1 | 13.7 |
| `tests/e2e/clocktower-a11y.spec.ts` | 1, 2, 3 | 13.8, 19.4, 25.4 |
| `tests/e2e/clocktower-route.spec.ts` | 2, 3 | 19.1, 25.3 |
| `tests/e2e/clocktower-door.spec.ts` | 2, 3 | 19.2, 26 |
| `tests/e2e/clocktower-save-reset.spec.ts` | 2 | 19.3 |
| `tests/e2e/clocktower-bell-repair.spec.ts` | 3 | 25.1 |
| `tests/e2e/clocktower-bell-exit.spec.ts` | 3 | 25.2 |
| `tests/e2e/clocktower-motion.spec.ts` | 4 | 28.4 |
| Existing Checkout and Pantry specs | All | Regression in tasks 14, 20, 27, 29 |

### Production checks (against `npm run build` and `npm run preview`)

| Script | Checkpoint | Tasks |
|---|---|---|
| `tests/production/clocktower-chunk.mjs` | 1 onward | 13.9 |
| `tests/production/startup-smoke.mjs` (extended) | 1, 3 | 13.9, 26 |

## Notes

- Tasks marked with `*` are optional property-based tests (fast-check, at least 100 runs, tagged `// Feature: adventure-phase-3-clocktower-gate, Property N: <title>`). Each names its property from design.md and the requirements it validates. Skipped properties must be listed in the checkpoint report, as quality-gates.md requires.
- Example unit tests and Playwright specs are **not** optional. quality-gates.md blocks merging a new feature without tests and requires a failing regression test before a bug fix (task 22.1 before 22.2).
- Several property tasks share one file (for example tasks 5.5 to 5.9). They sit in separate waves of the dependency graph so that no two tasks write the same file at once.
- Property tests 1 to 4 and 11 start in Checkpoint 1 with generators that cover all five action kinds, and are rerun as the rules grow in tasks 16.1 and 24.1.
- Phaser is imported only under `src/components/WorldScene/phaser/`. No unit test loads Phaser (task 12.3 enforces it).
- No source code is written as part of this spec session. To start implementation, open this file and choose "Start task" next to task 1.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2", "3.1"] },
    { "id": 2, "tasks": ["3.2", "5.1", "6.1"] },
    { "id": 3, "tasks": ["3.3", "4.1", "5.2", "5.3", "6.2", "7.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.4", "7.2", "8.1", "9.1"] },
    { "id": 5, "tasks": ["5.5", "6.3", "7.3", "8.2", "9.2", "10.1"] },
    { "id": 6, "tasks": ["5.6", "7.4", "8.3", "9.3", "10.2", "10.3"] },
    { "id": 7, "tasks": ["5.7", "7.6", "11.1", "11.2", "11.3"] },
    { "id": 8, "tasks": ["5.8", "7.7", "12.1"] },
    { "id": 9, "tasks": ["5.9", "7.5", "12.2", "12.3"] },
    { "id": 10, "tasks": ["13.1", "13.9"] },
    { "id": 11, "tasks": ["13.2", "13.3", "13.4", "13.5", "13.6", "13.7", "13.8"] },
    { "id": 12, "tasks": ["14"] },
    { "id": 13, "tasks": ["15.1"] },
    { "id": 14, "tasks": ["15.2", "15.3", "16.1"] },
    { "id": 15, "tasks": ["15.4", "16.2", "17.1", "18.2"] },
    { "id": 16, "tasks": ["16.3", "17.2", "17.3", "17.4", "17.10", "18.1"] },
    { "id": 17, "tasks": ["16.4", "17.5", "17.11", "18.3"] },
    { "id": 18, "tasks": ["16.5", "17.6", "17.12", "18.4"] },
    { "id": 19, "tasks": ["16.6", "17.7", "19.1", "19.2", "19.3", "19.4"] },
    { "id": 20, "tasks": ["17.8"] },
    { "id": 21, "tasks": ["17.9"] },
    { "id": 22, "tasks": ["20"] },
    { "id": 23, "tasks": ["21.1", "22.1", "23.2", "24.1"] },
    { "id": 24, "tasks": ["21.2", "22.2", "23.1", "23.3", "24.2", "24.5"] },
    { "id": 25, "tasks": ["23.4", "23.5", "24.3"] },
    { "id": 26, "tasks": ["24.4", "24.6"] },
    { "id": 27, "tasks": ["24.7", "25.1", "25.2", "25.3", "25.4"] },
    { "id": 28, "tasks": ["26"] },
    { "id": 29, "tasks": ["27"] },
    { "id": 30, "tasks": ["28.1"] },
    { "id": 31, "tasks": ["28.2"] },
    { "id": 32, "tasks": ["28.3", "28.4"] },
    { "id": 33, "tasks": ["29"] }
  ]
}
```
