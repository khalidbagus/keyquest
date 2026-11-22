# Requirements Document

## Introduction

Clocktower Gate is room 3 of the KeyQuest adventure and the finale of the route described in
`.kiro/steering/adventure-overhaul.md` (Phase 3). The player leaves the Potion Pantry with
the Lantern Potion and travels a scrolling top-down Phaser map: Apothecary Exit, Moonlit
Courtyard, Overgrown Graveyard, Clockworks Passage, and the Belfry. Each area has one action
that advances the route: light the lantern, find the named clues, open a shortcut, then repair
the bell confirmation dialog and ring the bells in order to restore the apothecary lights.

The work follows the four checkpoints in the Clocktower build brief
(`.kiro/skills/keyquest-room-slice/references/clocktower-pilot.md`):

1. **Animated courtyard.** One playable Moonlit Courtyard behind a preview entry. This is the
   first deliverable and is specified in full (Requirements 4 to 12).
2. **Complete route.** All five areas, saved checkpoints, and the published door
   (Requirements 13 to 18). Gated behind review of the courtyard.
3. **Live repair.** The Belfry bell focus repair and bell sequence (Requirements 19 to 22).
4. **Motion pass.** Distinct feedback for moving, stopping, interacting, and succeeding
   (Requirement 23).

Requirements 1 to 3 are shared foundations that the courtyard slice needs. Requirements 24 to
27 cover verification and release review. This spec session stops before implementation.

### What exists today (traced in `src/`)

- **Door unlock.** `isRoomUnlocked(progress, 'clocktower')` in `src/registry/roomsRegistry.ts`
  already returns `getRoom('clocktower').built && isRoomCleared(progress, 'pantry')`, and
  `isRoomCleared('pantry')` reads `progress.pantry.potionTaken`. The room entry has
  `built: false`, reward `Bell rope`, and `ROOM_DEFECTS.clocktower` is empty.
- **Lantern Potion reward.** `PANTRY_ACTION { action: 'bottle' }` in `GameContext.tsx` sets
  `pantry.potionTaken` only when `pantry.brewed` is true. `normalizePantryState` and
  `migrateProgress` clear `brewed` and `potionTaken` unless the `color-only-ingredients` curse
  is verified, so holding the potion already implies verified Pantry progress.
- **Routing.** `GameRouter.tsx` renders `PantryView` when `currentRoom === 'pantry'` and
  `ChallengeView` otherwise during the `challenge` phase. `ENTER_ROOM` rejects unbuilt or locked
  rooms. The header shows Emergency Exit only in the `challenge` phase.
- **Saves.** `StorageAdapter` uses key `keyquest-progress-v1`. `ProgressState.version` is the
  literal `2`. `migrateProgress` accepts versions 1 and 2 only, and its resumable `ROOM_IDS`
  list is `['checkout', 'pantry']`. `resetRoom(roomId)` saves at once. `hasMeaningfulProgress`
  checks defects, Checkout actions, and the cauldron.
- **Repair cycle.** `RepairStudio` finds the target by `data-testid`, runs `applyRepair`, then
  `verify`, dispatches `APPLY_REPAIR` and `VERIFICATION_RESULT`, offers **Check again** on a
  failed check, and moves focus through `PAYOFF_FOCUS`. Patch copy lives in `patchRegistry`.
- **Rive.** `MascotContext.triggerCompanion` and `triggerHintKeeper` send a
  `{ trigger, seq }` signal. `RiveMascot` fires only when `seq` changes, binds the triggers
  `greet`, `celebrate`, `reactFailure`, `requestAttention`, and `reset`, and syncs the
  view-model boolean `reducedMotion`. The canvas is `aria-hidden` with a poster fallback.
- **Reduced motion.** `ReducedMotionProvider` combines `prefers-reduced-motion` with the stored
  footer toggle (`keyquest-reduced-motion-v1`) and writes `html[data-reduced-motion]`.
- **Emergency Exit.** `EmergencyExitButton` listens for Escape on `document` and skips the exit
  while any `dialog[open]` exists. `ResetConfirmDialog` uses `showModal()`, which makes the
  rest of the page inert while open.

### Constraints and gaps found

1. When this spec was written, Phaser was not installed and no source file referenced it. The
   prerequisite setup has since added `phaser@^4.2.1` to `package.json` (4.2.1 in the
   lockfile). The tech steering approves Phaser for this overworld, and task 2 adds the build
   and import guardrails for it.
2. The exploration art has four static facing images per direction
   (`public/adventure/player/pumpkin-ghost-{south,north,west,east}.png`, 128 × 128, anchor
   64, 117) and no walk-cycle frames. Movement feedback must come from tweens on these frames
   unless the motion review (Requirement 23) requests new frames.
3. Only the Pumpkin Ghost has exploration sprites. Other costumes appear in the Rive medallion
   only.
4. The schema version is a literal type. Clocktower progress needs schema version 3, and
   `migrateProgress`, `ROOM_IDS`, `hasMeaningfulProgress`, `resetRoomProgress`, and
   `isAdventureComplete` must learn about the room.
5. `DefectType`, `ROOM_DEFECTS`, `ALL_DEFECT_TYPES`, `resetAllRepairs`, the hint registry,
   `CONCEPTS.clocktower`, and `PAYOFF_FOCUS` have no entry for a Clocktower curse.
   `VerificationEngine` has no focus-management check.
6. Emergency Exit skips Escape whenever any `dialog[open]` exists, and a modal opened with
   `showModal()` makes the header Exit button inert. The bell dialog design must resolve this
   against the brief's rule that Emergency Exit stays available.
7. Vitest runs in jsdom, which cannot run a Phaser canvas. Route rules must live in pure
   modules for unit tests; Phaser behavior is checked in Playwright, which runs against
   `npm run dev` (`playwright.config.ts`).
8. The quality-gates steering mentions jsx-a11y, but `eslint.config.js` does not load it. The
   lint gate in this spec is the existing `npm run lint`.
9. Door selector and completion copy for the Clocktower say the door "opens in a later
   update" (`DOOR_REQUIREMENT.clocktower`, `CompletionView` Pantry entry).

## Glossary

- **Adventure_Route**: The ordered list of five Areas from Apothecary Exit to Belfry.
- **Area**: One of Apothecary Exit, Moonlit Courtyard, Overgrown Graveyard, Clockworks
  Passage, or Belfry.
- **Area_Action**: The one action in an Area that advances the route: learn the controls,
  light the lantern, find a clue, open the gate, or ring the bells.
- **Bell_Dialog**: The confirmation dialog inside the Challenge_Sandbox that asks the player
  to confirm ringing a bell. In its defective state the dialog does not receive focus on open
  and does not return focus on close.
- **Bell_Focus_Curse**: The Clocktower defect type for the Bell_Dialog focus failure
  (WCAG 2.4.3 Focus Order).
- **Bell_Sequence**: The three labeled bells and the order in which the player rings them.
- **Challenge_Sandbox**: The existing labeled container (`data-testid="challenge-sandbox"`)
  that holds intentional defects.
- **Checkpoint**: A saved Area the player has reached. Resume places the Ghost at the spawn
  point of the last Checkpoint.
- **Clocktower_State**: The Clocktower part of saved progress: Checkpoints, lantern, clues,
  gate, shortcut, bell rings, and lights.
- **Clocktower_View**: The React view that renders the Clocktower Gate room during the
  `challenge` phase.
- **Clue**: One of the three named discoveries in the Overgrown Graveyard: Moon, Thorn, and
  Key.
- **Collision_Body**: The fixed physics shape of the Ghost used for wall and object
  collision.
- **Costume_Locker**: The existing costume selection dialog
  (`src/components/CostumeLocker/CostumeLockerModal.tsx`) whose selected costume drives the
  Rive_Mascot medallion.
- **Courtyard_Preview_Entry**: A development and test entry that opens the Moonlit Courtyard
  before the full route is published.
- **Courtyard_Slice**: Checkpoint 1: the playable, animated Moonlit Courtyard.
- **Door_Selector**: The existing `DoorSelectorView` hub.
- **Emergency_Exit**: The existing header button (`data-testid="emergency-exit"`) and its
  document-level Escape listener.
- **Game_Context**: The existing `GameProvider` reducer, actions, and autosave.
- **Checkpoint_Report**: The evidence-of-work report required by the quality-gates steering when
  a build checkpoint is marked complete.
- **Ghost**: The player character drawn in the World_Scene.
- **Hint_Panel**: `src/components/HintPanel/HintPanel.tsx` and the hint registry.
- **Interactable**: A world object with an interaction zone defined in Route_Data, such as the
  lantern post, a Clue plaque, the gate, or a bell.
- **Journal**: The HTML panel that lists found Clues and the Bell_Sequence as static, named
  text.
- **Lantern_Potion**: The Pantry reward, held when `progress.pantry.potionTaken` is true.
- **Landmark**: A named, visible world object that orients the player, such as the stone well
  or the yew tree.
- **Mascot_Context**: The existing `MascotProvider` signals and speech line.
- **Nearby_Interactable**: The Interactable whose interaction zone overlaps the Ghost's
  Collision_Body.
- **Pantry_Key**: The Checkout reward, held when `progress.checkout.keyTaken` is true.
- **Play_Area**: The focusable HTML element that contains the World_Scene canvas and receives
  game keys.
- **Playwright_Suite**: The checked-in browser tests under `tests/e2e/`, run with
  `npm run test:e2e`.
- **Production_Build**: The static output of `npm run build`.
- **Progress_Schema**: `src/storage/progressSchema.ts`: initial progress, validation, and
  migration.
- **Review_Evidence**: The interactive captures and notes gathered through the Code Mode
  Playwright integration for each checkpoint.
- **Reduced_Motion_Setting**: The combined result of `prefers-reduced-motion: reduce` and the
  manual footer toggle from `ReducedMotionProvider`.
- **Repair_Engine**: `src/engines/RepairEngine.ts`.
- **Repair_Studio**: `src/components/RepairStudio/RepairStudio.tsx`.
- **Rive_Mascot**: `src/components/RiveMascot/RiveMascot.tsx` and its trigger contract.
- **Room_Status**: The polite live region (`data-testid="room-status"`) that states world
  changes in text.
- **Rooms_Registry**: `src/registry/roomsRegistry.ts`.
- **Route_Data**: Static data for each Area: floor, walls, collision shapes, Landmarks,
  Interactables, interaction zones, spawn points, and exits.
- **Route_Panel**: The semantic HTML route: current Area, Landmarks, Nearby_Interactable, and
  named action buttons.
- **Touch_Controls**: On-screen direction buttons and an Interact button.
- **Unit_Test_Suite**: The Vitest tests under `tests/unit/`, run with `npm test`.
- **Verification_Engine**: `src/engines/VerificationEngine.ts`.
- **World_Action**: A typed action that the World_Scene, Route_Panel, Touch_Controls, and
  keyboard all dispatch to the Game_Context.
- **World_Scene**: The lazy-loaded Phaser game that draws the map, Ghost, and Interactables.

## Requirements

### Part A: Shared foundation

### Requirement 1: Clocktower door from verified progress

**User Story:** As a player who bottled the lantern potion, I want the Clocktower door to open, so that I can carry the potion into the next room.

#### Acceptance Criteria

1. THE Rooms_Registry SHALL derive Clocktower entry from the room's `built` flag and `progress.pantry.potionTaken`, with no separate stored unlock flag. It SHALL report exactly one of four states: Coming later when the room is not built, Locked when built without the potion, Open when built with the potion and the lights are unrestored, and Cleared when built with the potion and the lights are restored.
2. WHILE the Clocktower room is marked not built, THE Door_Selector SHALL show the Clocktower door with the visible text state Coming later and no Enter action. The Door_Selector SHALL do this whether or not the Courtyard_Preview_Entry is available.
3. WHILE the Clocktower room is marked built and the player does not hold the Lantern_Potion, THE Door_Selector SHALL show the Clocktower door with the visible text state Locked, show text saying the door needs the lantern potion, and offer no enabled Enter action.
4. WHILE the Clocktower room is marked built and the player holds the Lantern_Potion, THE Door_Selector SHALL show one enabled Enter action with the Open state until the lights are restored. After restoration, it SHALL show the Cleared state and one enabled Revisit action. Both actions SHALL be operable by mouse and keyboard (Enter or Space).
5. WHEN the Pantry is reset or all progress is reset, THE Rooms_Registry SHALL report the built Clocktower door as Locked on the next render and after a page reload. An unbuilt door SHALL continue to report Coming later.
6. WHEN the player activates Clocktower Enter or Revisit, THE Clocktower_View SHALL render during the `challenge` phase and move keyboard focus to the room heading before any further user input is processed.
7. IF an `ENTER_ROOM` action for the Clocktower room is dispatched while the door state is Coming later or Locked, THEN THE Game_Context SHALL reject the action and leave `currentRoom`, the phase, and saved progress unchanged.
8. IF a loaded save has `pantry.potionTaken` set to true but the `color-only-ingredients` curse is not verified, THEN THE Progress_Schema SHALL clear `potionTaken` during migration. THE Rooms_Registry SHALL report a built door as Locked and an unbuilt door as Coming later.
9. WHILE the Clocktower room is marked built, THE Door_Selector and the Pantry completion summary SHALL show the door's current state as text (Locked, Open, or Cleared, matching criteria 3 and 4).

### Requirement 2: React and Phaser boundary

**User Story:** As a maintainer, I want React to own progress and Phaser to own drawing, so that progress stays testable and the scene can be disposed safely.

#### Acceptance Criteria

1. THE Game_Context SHALL be the only owner of Clocktower_State, the current objective, the available World_Actions, and persistence, and THE World_Scene SHALL NOT write to saved progress or to Clocktower_State directly.
2. THE World_Scene SHALL receive its world state (current Area, Ghost spawn point, and the lantern, Clue, gate, shortcut, bell, and lights values from Clocktower_State) from the Clocktower_View, and SHALL report each player interaction with an Interactable as exactly one World_Action.
3. WHEN a World_Action is dispatched from the World_Scene, the Route_Panel, the Touch_Controls, or the keyboard, THE Game_Context SHALL apply it through the same reducer, which accepts or ignores the action based only on the action and the current Clocktower_State.
4. IF the reducer ignores a World_Action because Clocktower_State does not allow it, THEN THE Game_Context SHALL leave Clocktower_State unchanged and SHALL NOT write progress to storage for that action.
5. THE Clocktower_View SHALL derive the current objective and the available World_Actions from the same Clocktower_State, so that two identical Clocktower_State values always produce the same objective and the same set of available World_Actions.
6. THE Route_Data and the World_Action rules SHALL run as pure functions that return the same output for the same input and that the Unit_Test_Suite can import and run in jsdom without loading the Phaser module.
7. WHEN the Clocktower_View mounts, THE Clocktower_View SHALL load the Phaser module as a separate chunk in the Production_Build, and THE Door_Selector and every other view SHALL render without requesting that chunk.
8. WHEN the Clocktower_View unmounts, THE Clocktower_View SHALL destroy the World_Scene, its canvas, its input listeners, and its timers, so that no World_Scene canvas remains in the document and no World_Action is dispatched from the World_Scene after unmount.
9. WHILE the Clocktower_View is mounted, THE Clocktower_View SHALL run at most one World_Scene instance and render at most one World_Scene canvas, including after a remount of the Clocktower_View.
10. WHILE Phaser is loading, THE Clocktower_View SHALL show a text loading status and keep every Route_Panel action button operable by keyboard and pointer, and SHALL remove the loading status when the World_Scene finishes loading.
11. IF the Phaser module or a required image fails to load, or the World_Scene has not finished loading within 10 seconds of the Clocktower_View mounting, THEN THE Clocktower_View SHALL show a text message naming the failed resource, keep every Area_Action available through the Route_Panel, keep the Emergency_Exit available, and leave Clocktower_State unchanged.
12. WHEN the reducer accepts a World_Action, THE Clocktower_View SHALL pass the updated world state to the World_Scene in the same render as the Clocktower_State change, and THE World_Scene SHALL show the change by its next rendered frame, within 100 ms of the dispatch, whichever input source dispatched the action.

### Requirement 3: Shared World_Actions across input methods

**User Story:** As a player using keyboard, touch, or a screen reader, I want every input to do the same thing, so that no path is missing a quest.

#### Acceptance Criteria

1. THE Clocktower_View SHALL route keyboard, Touch_Controls, World_Scene, and Route_Panel input for the same Area_Action through one World_Action with the same type and the same target Interactable, so that a test comparing the dispatched World_Actions from any two of the four input methods finds them equal.
2. WHEN the same World_Action is dispatched from the same Clocktower_State through any of the four input methods, THE Game_Context SHALL produce the same resulting Clocktower_State and THE Room_Status SHALL show the same text, with no record of which input method was used.
3. WHEN a World_Action is repeated after the World_Action already succeeded, THE Game_Context SHALL leave Clocktower_State unchanged, and THE Clocktower_View SHALL send no Mascot_Context signal and write no saved progress for the repeated World_Action.
4. WHEN a World_Action changes Clocktower_State, THE Clocktower_View SHALL update the Room_Status text and pass the new world state to the World_Scene in the same render as the Clocktower_State change, and THE World_Scene SHALL show the change by its next rendered frame, within 100 ms of the dispatch. The polite announcement of the new Room_Status text SHALL be present in the Room_Status within 1000 ms of the dispatch.
5. IF a World_Action is rejected because a prerequisite in Clocktower_State is not met (for example, lighting the lantern without the Lantern_Potion, or opening the gate before all three Clues are found), THEN THE Room_Status SHALL name the missing prerequisite, THE Game_Context SHALL leave Clocktower_State unchanged, and focus SHALL stay on the control or Play_Area that dispatched the World_Action.
6. IF the player dispatches the same rejected World_Action again, THEN THE Room_Status SHALL announce the missing prerequisite again, so that each attempt produces one polite announcement.
7. WHILE the Play_Area or a Touch_Controls button has focus, WHEN the player holds Enter or Space, THE Clocktower_View SHALL dispatch one World_Action per key press and SHALL ignore keyboard auto-repeat events.
8. IF a World_Action names an Area or Interactable that is not defined in Route_Data, THEN THE Game_Context SHALL leave Clocktower_State unchanged, and THE Clocktower_View SHALL keep the World_Scene, Route_Panel, and Emergency_Exit operable.

### Part B: Courtyard slice (Checkpoint 1)

### Requirement 4: Courtyard preview entry

**User Story:** As a developer and reviewer, I want to open the courtyard before the full route exists, so that the slice can be played and tested on its own.

#### Acceptance Criteria

1. WHERE the build is a development or test build (any build other than the Production_Build), WHEN the Courtyard_Preview_Entry is activated, THE Clocktower_View SHALL open the Moonlit Courtyard in the `challenge` phase with the Lantern_Potion held, the courtyard lantern unlit, and the Ghost at the Moonlit Courtyard spawn point from Route_Data. This applies whether or not saved progress holds the Lantern_Potion, and every activation SHALL open the same initial state.
2. WHERE the build is the Production_Build, WHILE the Rooms_Registry marks the Clocktower room as not built, THE Door_Selector SHALL show the Clocktower door as Coming later and SHALL offer no control that enters the Clocktower room.
3. WHILE the Courtyard_Preview_Entry is active, THE Game_Context SHALL hold all courtyard progress and the preview Lantern_Potion in memory only. It SHALL leave the stored value under `keyquest-progress-v1` identical to its value before entry. If the key was absent before entry, it SHALL stay absent.
4. WHILE the Courtyard_Preview_Entry is active, THE Clocktower_View SHALL show a visible HTML text label outside the World_Scene canvas. The label SHALL state that the courtyard is a preview and that progress is not saved. It SHALL stay visible from entry until exit and SHALL meet a text contrast of at least 4.5:1 against its background.
5. WHERE the build is the Production_Build, THE Production_Build SHALL expose no control, link, or address that activates the Courtyard_Preview_Entry.
6. WHILE the Courtyard_Preview_Entry is active, WHEN the player activates Emergency_Exit, THE Game_Context SHALL end the preview, discard all in-memory courtyard progress and the preview Lantern_Potion, and leave the stored value under `keyquest-progress-v1` unchanged.
7. IF the page reloads while the Courtyard_Preview_Entry is active, THEN THE Game_Context SHALL load progress from `keyquest-progress-v1` with no courtyard preview state and SHALL NOT reopen the preview without a new activation.

### Requirement 5: Courtyard map and art

**User Story:** As a player, I want a readable courtyard with clear landmarks, so that I know where I am and where to go.

#### Acceptance Criteria

1. THE Route_Data SHALL define, for the Moonlit Courtyard, the floor bounds measured in whole 48 × 48 tiles, the walls, the collision shapes, at least two Landmarks, the lantern post Interactable with its interaction zone, one spawn point, and one exit toward the Overgrown Graveyard. Each Landmark SHALL have a unique text name and a world position.
2. THE World_Scene SHALL draw the Moonlit Courtyard using only the prepared exports in `public/adventure/`. The floor SHALL use `tiles/courtyard-cobbles.png`. The walls SHALL use `props/wall-horizontal.png`, `props/wall-vertical.png`, `props/wall-corner.png`, and `props/wall-post.png`. The lantern post Interactable SHALL use `props/lantern-post.png`. The stone well Landmark SHALL use `props/stone-well.png`, and the yew tree Landmark SHALL use `props/yew-tree.png`.
3. THE World_Scene SHALL draw each 128 × 128 Ghost direction image with its pixel (64, 117) at the Ghost's world position, so that switching between the south, north, west, and east images moves that point by 0 pixels.
4. WHILE the camera zoom is 1, THE World_Scene SHALL draw each floor tile unscaled, covering exactly 48 × 48 world pixels, with no gap or overlap between neighboring tiles.
5. WHILE the Ghost is in the Moonlit Courtyard, THE Route_Panel SHALL show the current Area name, Moonlit Courtyard, as text.
6. WHILE the Ghost is in the Moonlit Courtyard, THE Route_Panel SHALL list, by text name and in Route_Data order, every Landmark whose drawn image is at least partly inside the camera view, and SHALL update the list within 250 ms after that set of Landmarks changes.
7. IF no Landmark's drawn image is inside the camera view, THEN THE Route_Panel SHALL state in text that no landmarks are in view, and SHALL keep showing the current Area name.
8. THE Route_Data SHALL place the spawn point on the courtyard floor with the Collision_Body overlapping no collision shape, and SHALL leave a path that the Collision_Body can travel from the spawn point to both the lantern post interaction zone and the exit toward the Overgrown Graveyard.

### Requirement 6: Keyboard movement in the Play_Area

**User Story:** As a keyboard player, I want arrow keys to move the ghost only when the play area has focus, so that the game never takes over page navigation.

#### Acceptance Criteria

1. THE Play_Area SHALL receive focus through sequential Tab and Shift+Tab navigation from the adjacent focusable elements in the Clocktower_View, SHALL expose the accessible name from Requirement 10.1 that identifies it as the Clocktower Gate play area, and SHALL show a visible text instruction outside the World_Scene canvas that lists Arrow keys to move, Enter to interact, and Tab to leave, exposed as the Play_Area's accessible description.
2. WHILE the Play_Area has focus, WHEN the player presses and holds an Arrow key, THE World_Scene SHALL begin moving the Ghost in that key's direction (up = north, down = south, left = west, right = east) within 100 ms of the key press and SHALL show the matching facing image, including when a Collision_Body contact blocks movement in that direction.
3. WHILE the Play_Area has focus, THE Play_Area SHALL prevent the default page scroll for the four Arrow keys, so that the document scroll position stays unchanged while the player moves the Ghost.
4. WHILE the Play_Area does not have focus, THE World_Scene SHALL ignore Arrow keys and Enter, so that the Ghost position, the facing image, and the Area_Action state stay unchanged.
5. WHILE the Play_Area has focus, WHEN the player presses Tab, Shift+Tab, or Escape, THE Play_Area SHALL leave the key's default behavior intact: Tab and Shift+Tab move focus to the next or previous element in normal tab order, and Escape reaches the Emergency_Exit listener.
6. WHEN the player releases every held Arrow key, THE World_Scene SHALL stop the Ghost within 100 ms and SHALL keep the facing image of the last movement direction.
7. WHILE two or more Arrow keys are held, THE World_Scene SHALL move the Ghost only in the direction of the most recently pressed key that is still held, with no diagonal movement. When that key is released, the Ghost SHALL continue in the direction of the most recently pressed key that remains held.
8. THE World_Scene SHALL move the Ghost at the speed defined in Route_Data, independent of frame rate and of operating-system key auto-repeat. During an unobstructed continuous hold of 1 second, the distance moved SHALL be within ±10% of the Route_Data speed at both 30 and 60 frames per second.
9. WHILE the Play_Area has focus, THE Play_Area SHALL show the focus indicator from the design system (3px solid `#7dd3fc`, 2px offset), fully visible around the Play_Area's outer edge and not clipped by surrounding containers.
10. IF the Play_Area loses focus while one or more Arrow keys are held, THEN THE World_Scene SHALL stop the Ghost within 100 ms, SHALL keep the last facing image, and SHALL not resume movement until the Play_Area has focus again and the player presses an Arrow key. Window focus loss and hidden-page cases follow Requirements 11.2 and 11.6.

### Requirement 7: Collision and camera

**User Story:** As a player, I want walls to stop the ghost and the camera to follow, so that the map feels solid and I can always see the ghost.

#### Acceptance Criteria

1. WHEN a movement step would make the Ghost's Collision_Body overlap a wall or a solid Landmark collision shape defined in Route_Data, THE World_Scene SHALL stop the Ghost flush against that shape with 0 pixels of overlap, including when a single frame's movement step is longer than the shape is thick.
2. THE World_Scene SHALL keep the Collision_Body size and its offset from the sprite anchor (64, 117) equal to the values defined in Route_Data for all four facing images and for the whole of every sprite tween, including scale, squash, and bob tweens.
3. WHILE the Ghost moves, THE World_Scene SHALL follow the Ghost and keep its anchor in view. The camera SHALL clamp to the courtyard bounds. At a map edge or exit the sprite frame may extend beyond the viewport. WHEN the Play_Area is larger than the map, THE World_Scene SHALL center the map and fill the unused space with the scene background.
4. THE World_Scene SHALL keep the Ghost's Collision_Body entirely inside the courtyard bounds defined in Route_Data, from the spawn point onward and after every movement step.
5. WHILE the player holds an Arrow key toward a wall or solid Landmark that the Collision_Body already touches, THE World_Scene SHALL leave the Ghost's position unchanged (0 pixels of movement) and show the facing image for the held Arrow key.
6. WHEN the World_Scene starts, THE World_Scene SHALL place the camera on the Ghost at the courtyard spawn point, clamped to the courtyard bounds, before it draws the first frame.
7. WHILE the Reduced_Motion_Setting is on, THE World_Scene SHALL move the camera with the Ghost in the same frame, with no easing or follow delay.
8. WHILE reduced motion is off, THE Courtyard_Slice SHALL show a subtle idle hover, a lean when movement begins, and a return to the resting pose when movement stops. These effects SHALL change the sprite only, with the Collision_Body staying at the world anchor. Requirement 12 governs the reduced-motion presentation.

### Requirement 8: Interacting with the lantern

**User Story:** As a player carrying the lantern potion, I want to light the courtyard lantern, so that the way forward opens.

#### Acceptance Criteria

1. WHEN the Ghost's Collision_Body starts to overlap an Interactable's interaction zone defined in Route_Data, THE Route_Panel SHALL name that Interactable as the Nearby_Interactable and name its Area_Action, for example "Light the lantern" for the lantern post.
2. WHEN the Ghost's Collision_Body stops overlapping every interaction zone, THE Route_Panel SHALL state that no object is nearby.
3. WHEN the Nearby_Interactable changes from none or from another Interactable to a new Interactable, THE Room_Status SHALL announce the new Nearby_Interactable's name exactly once. THE Room_Status SHALL not repeat that announcement while the Ghost stays inside the same interaction zone.
4. WHILE the Play_Area has focus and the lantern post is the Nearby_Interactable, WHEN the player presses Enter, THE Clocktower_View SHALL dispatch exactly one light-lantern World_Action for each key press and SHALL ignore keyboard auto-repeat events while Enter is held.
5. WHEN the light-lantern World_Action succeeds, THE World_Scene SHALL replace the unlit lantern image with the lit lantern image and let the Ghost's Collision_Body pass into the exit zone toward the Overgrown Graveyard, in the same render as the Clocktower_State change.
6. WHEN the light-lantern World_Action succeeds, THE Room_Status SHALL state, in one message, that the lantern is lit and the way toward the Overgrown Graveyard is open.
7. WHILE the Play_Area has focus and no Interactable is the Nearby_Interactable, WHEN the player presses Enter, THE Clocktower_View SHALL dispatch no World_Action and SHALL set the Room_Status text to state that nothing is close enough to use.
8. WHILE the Courtyard_Preview_Entry is active and the lantern is lit, WHEN the Ghost's Collision_Body enters the courtyard exit zone defined in Route_Data, THE Room_Status SHALL state once per entry into that zone that the graveyard opens in a later checkpoint.
9. IF the light-lantern World_Action is dispatched while the lantern is already lit, THEN THE Room_Status SHALL state that the lantern is already lit. The lantern SHALL stay lit and the exit SHALL stay open.
10. WHILE the lantern is unlit, WHEN the Ghost's Collision_Body meets the courtyard exit toward the Overgrown Graveyard, THE World_Scene SHALL stop the Ghost at the exit boundary.
11. WHILE the lantern is unlit, WHEN the Ghost's Collision_Body first touches the courtyard exit toward the Overgrown Graveyard, THE Room_Status SHALL state once per contact that the lantern must be lit before the way opens.

### Requirement 9: Touch controls

**User Story:** As a phone player, I want on-screen controls, so that I can move and interact without a keyboard.

#### Acceptance Criteria

1. THE Touch_Controls SHALL provide five native buttons: Up, Down, Left, Right, and Interact. Each button SHALL show a visible text label or icon. Each button SHALL have a unique accessible name that states its action (for example, "Move up" or "Interact"), and an icon-only button SHALL still have that text name.
2. THE Touch_Controls SHALL give each button a target of at least 44 × 44 CSS pixels, and no two button targets SHALL overlap.
3. WHILE the player holds a direction button pressed with a pointer, THE World_Scene SHALL move the Ghost in that direction at the same Route_Data speed used for Arrow keys and show the matching facing image.
4. WHEN the player releases the held direction button, or the pointer on that button is cancelled, or the pointer leaves that button, or the page loses focus or becomes hidden, THE World_Scene SHALL stop the Ghost and keep the last facing image.
5. WHEN the player activates Interact, THE Clocktower_View SHALL produce the same result as pressing Enter in the Play_Area with the same Nearby_Interactable. This includes dispatching that Interactable's World_Action, or the Room_Status statement that nothing is close enough to use when no Interactable is nearby.
6. WHILE a Touch_Controls button has keyboard focus, WHEN the player presses Enter or Space, THE Touch_Controls SHALL produce the same result as a pointer press on that button. Interact SHALL dispatch once per key press and ignore key auto-repeat. A direction button SHALL move the Ghost while the key is held and stop it when the key is released.
7. WHILE the viewport is 375 × 667 with touch emulation, THE Clocktower_View SHALL show the Play_Area, the current objective, and all five Touch_Controls buttons with no horizontal scrolling (document scroll width no greater than 375 CSS pixels). After the Play_Area is scrolled into view, the Touch_Controls and the Play_Area SHALL be fully inside the viewport at the same time.
8. WHILE two direction buttons are held at the same time, THE World_Scene SHALL move the Ghost in the direction of the button pressed most recently.
9. WHILE the player holds a Touch_Controls button, THE Clocktower_View SHALL prevent the page scroll, double-tap zoom, text selection, and long-press context menu that the touch on that button would otherwise start, and SHALL leave pinch zoom available outside the Touch_Controls.
10. THE Touch_Controls SHALL move the Ghost and dispatch Interact whether or not the Play_Area has focus.

### Requirement 10: Semantic HTML route

**User Story:** As a screen reader user, I want every quest available as named HTML controls, so that I can finish the route without the canvas.

#### Acceptance Criteria

1. THE World_Scene canvas SHALL be hidden from assistive technology, so that the accessibility tree contains no node for the canvas or for any shape drawn on it, while the Play_Area keeps an accessible name that identifies it as the Clocktower Gate play area.
2. WHILE the Clocktower_View is rendered, THE Route_Panel SHALL show the following as text content: the current objective, the name of the current Area, the name of every Landmark in the current Area, and the name of the Nearby_Interactable. When no Interactable overlaps the Ghost's Collision_Body, the Nearby_Interactable entry SHALL state that nothing is nearby.
3. WHILE the Clocktower_View is rendered, THE Route_Panel SHALL show one native button for each available Area_Action. An Area_Action is available when its prerequisites in Clocktower_State are met and it has not yet been completed. Each button SHALL have an accessible name that names both the action and its target (for example, the lantern post or a named Clue), and every button SHALL be reachable with the Tab key and activatable with Enter or Space.
4. WHEN the Ghost enters a different Area, or the Nearby_Interactable changes, or Clocktower_State changes, THE Route_Panel SHALL update the affected entries and the set of Area_Action buttons in the same render in which the Clocktower_View receives the change.
5. WHEN the player activates an Area_Action button in the Route_Panel, THE Clocktower_View SHALL dispatch the same World_Action, with the same payload, that the in-world interaction with that Interactable dispatches. This SHALL happen whatever the Ghost's position and whichever Area contains the Ghost.
6. WHEN an Area_Action succeeds from the Route_Panel, THE World_Scene SHALL show the same world change that the equivalent in-world interaction shows, such as a lit lantern, a revealed Clue, or an open gate, by its next rendered frame, within 100 ms of the dispatch.
7. WHEN a World_Action changes Clocktower_State, THE Room_Status SHALL update its text in the same render as the state change, and the polite announcement of one text message describing the change SHALL be present in the Room_Status within 1000 ms of the state change. The message SHALL name the affected Interactable or Area.
8. THE Clocktower_View SHALL present the objective, Room_Status, and Route_Panel content as text, so that no state, objective, or action availability can be told apart only by a color cue, an animation, or a sound.
9. WHEN an Area_Action succeeds from the Route_Panel and its button is removed, THE Clocktower_View SHALL move keyboard focus to the first remaining Area_Action button in the Route_Panel, or to the Route_Panel heading if no Area_Action button remains.
10. IF the Game_Context rejects a World_Action dispatched from the Route_Panel, THEN THE Clocktower_View SHALL leave Clocktower_State unchanged, keep keyboard focus on the activated button, and announce through the Room_Status within 1000 ms a message stating that the action could not be completed and naming the unmet prerequisite.
11. IF the World_Scene fails to load or stops rendering, THEN THE Clocktower_View SHALL keep the objective, Room_Status, and Route_Panel rendered and operable, so that every Area_Action in the Adventure_Route can still be completed from the Route_Panel. The Room_Status SHALL also show a text notice that the visual map is unavailable.

### Requirement 11: Input boundaries

**User Story:** As a player, I want the ghost to stop when I leave the game, so that it never keeps walking on its own.

#### Acceptance Criteria

1. WHEN the Play_Area loses focus, THE World_Scene SHALL clear all held direction input from the keyboard and the Touch_Controls and stop the Ghost within 100 ms. After that, the Ghost's position SHALL stay the same for at least the next 1000 ms.
2. WHEN the browser window loses focus or the page visibility state changes to hidden, THE World_Scene SHALL clear all held direction input from the keyboard and the Touch_Controls and stop the Ghost within 100 ms. After that, the Ghost's position SHALL stay the same for at least the next 1000 ms.
3. WHEN a modal dialog opens anywhere on the page, THE World_Scene SHALL clear held direction input and stop the Ghost within 100 ms. Until that dialog closes, THE World_Scene SHALL also ignore direction keys and the interact key, so that the Ghost moves 0 pixels and no World_Action is dispatched.
4. WHILE the Play_Area has focus, WHEN the player presses Escape and no open dialog exists on the page, THE Emergency_Exit SHALL stop the Ghost, save the current progress (including the Clocktower_State and the last Checkpoint) under the `keyquest-progress-v1` storage key, and return to the menu. WHILE the Courtyard_Preview_Entry is active, Requirement 4.6 replaces the save step.
5. WHILE the Clocktower_View is shown, THE Emergency_Exit button SHALL stay visible in the header and inside the viewport at 375×667, 768×1024, and 1024×600. It SHALL receive focus within 5 Tab presses or within 5 Shift+Tab presses starting from the Play_Area. The Play_Area SHALL NOT intercept Tab or Shift+Tab.
6. WHEN the Play_Area regains focus after its held direction input was cleared, THE World_Scene SHALL keep the Ghost stopped until the player starts a new direction key press or a new Touch_Controls direction button press. A direction key held down through the focus loss SHALL NOT restart movement.
7. WHEN a Touch_Controls direction button press ends because the pointer is released, the pointer is cancelled, or the pointer leaves the button, THE World_Scene SHALL clear that direction input and stop the Ghost within 100 ms.
8. IF saving progress fails during the Escape exit because localStorage is unavailable or the write throws, THEN THE Emergency_Exit SHALL still stop the Ghost and return to the menu without showing an unhandled error.

### Requirement 12: Courtyard reduced motion and companion

**User Story:** As a player who reduces motion, I want the same courtyard outcomes without camera easing or decorative motion, so that I can play comfortably.

#### Acceptance Criteria

1. WHILE the Reduced_Motion_Setting is on, THE World_Scene SHALL use the same Ghost movement speed, Collision_Body, interaction zones, Area_Action outcomes, Room_Status messages, and saved Clocktower_State that it uses while the Reduced_Motion_Setting is off, so that the same input sequence from the same spawn point produces the same Ghost position and the same Clocktower_State in both settings.
2. WHILE the Reduced_Motion_Setting is on, THE World_Scene SHALL place the camera on the Ghost's position in every rendered frame, with no interpolation lag, easing, shake, zoom change, or fade.
3. WHILE the Reduced_Motion_Setting is on, THE World_Scene SHALL show the Ghost's idle and stop states as the static facing image for the current direction, and the lantern as either the unlit or the lit static image, with no tween changing position, scale, rotation, or alpha on the Ghost or the lantern.
4. WHEN the Reduced_Motion_Setting changes while the World_Scene runs, THE World_Scene SHALL apply the new setting by the next rendered frame. When the setting turns on, any running decorative tween stops and its object shows the static image for its current state. Ghost position, facing, and Clocktower_State do not change.
5. WHEN the lantern changes from unlit to lit, THE Clocktower_View SHALL send exactly one `celebrate` signal through the Mascot_Context, after the World_Scene shows the lit lantern and after the Room_Status announces that the lantern is lit.
6. IF the lantern is already lit when the Clocktower_View mounts, including on resume from a saved Clocktower_State, or the player interacts with the lantern after it is lit, THEN THE Clocktower_View SHALL send no `celebrate` signal for the lantern.
7. THE Clocktower_View SHALL show the costume currently selected in the Costume_Locker in the existing Rive_Mascot medallion, while the World_Scene continues to draw the Pumpkin Ghost exploration sprites.
8. IF the Rive_Mascot cannot load or play, THEN THE Clocktower_View SHALL show the poster fallback image for the selected costume, keep the canvas `aria-hidden`, and keep every Room_Status message and lantern outcome unchanged.
9. WHILE the Reduced_Motion_Setting is on, THE Rive_Mascot SHALL hold the `reducedMotion` view-model boolean at true, including from the first frame after the medallion mounts and during a `celebrate` signal, so that the mascot shows its static reduced poses instead of animated motion.

### Part C: Full route (Checkpoints 2 and 3, gated behind courtyard review)

These requirements are written at a lower level of detail. Design and tasks for them start
after the Courtyard_Slice has been played and reviewed.

### Requirement 13: Route areas and order

**User Story:** As a player, I want the route to lead from the apothecary to the belfry, so that each area moves me toward the bells.

#### Acceptance Criteria

1. THE Route_Data SHALL define exactly five Areas in this order: Apothecary Exit, Moonlit Courtyard, Overgrown Graveyard, Clockworks Passage, and Belfry.
2. THE Route_Data SHALL connect each pair of adjacent Areas with one exit in each direction. Each exit SHALL have a collision shape in the Area it leaves and a spawn point in the Area it leads to. No exit SHALL connect Areas that are not adjacent, apart from the return shortcut covered by Requirement 15.
3. WHEN the Ghost's Collision_Body enters an open exit, THE World_Scene SHALL place the Ghost at the spawn point of the destination Area, and THE Route_Panel SHALL name the destination Area as the current Area.
4. WHEN the player enters the Apothecary Exit, THE Clocktower_View SHALL show text naming the keyboard movement and interact keys, the Touch_Controls, and the Route_Panel, all at the same time.
5. WHILE the courtyard lantern is unlit, THE World_Scene SHALL keep the exit from the Moonlit Courtyard to the Overgrown Graveyard closed.
6. WHILE fewer than three Clues are found, THE World_Scene SHALL keep the Clockworks Passage gate closed.
7. WHILE the Clockworks Passage gate is closed, THE World_Scene SHALL keep the exit from the Clockworks Passage to the Belfry closed.
8. IF the Ghost's Collision_Body moves into a closed exit, THEN THE World_Scene SHALL stop the Ghost at the collision shape and keep it in the current Area, and THE Room_Status SHALL state which condition is unmet: the unlit lantern, the Clues still missing, or the closed gate.
9. WHILE exits toward earlier Areas exist, THE World_Scene SHALL keep them open, so that the player can always walk back toward the Apothecary Exit.
10. THE Route_Panel SHALL offer one travel button for each Area the Ghost has entered at least once in the current save, and no travel button for any Area the Ghost has not entered.
11. WHEN the player activates a Route_Panel travel button, THE World_Scene SHALL place the Ghost at that Area's spawn point, THE Route_Panel SHALL name that Area as the current Area, and THE Room_Status SHALL state the Area name.

### Requirement 14: Graveyard clues

**User Story:** As a player, I want to find the Moon, Thorn, and Key clues, so that I can open the gate.

#### Acceptance Criteria

1. THE Route_Data SHALL place exactly three Clue plaques in the Overgrown Graveyard, one each for Moon, Thorn, and Key. Each plaque SHALL be an Interactable with its own interaction zone and a Clue text. The plaques SHALL be drawn with `clue-moon.png`, `clue-thorn.png`, and `clue-key.png`.
2. WHEN the player interacts with the plaque of a Clue that is not yet found, THE Game_Context SHALL record that Clue as found in Clocktower_State. The player can find the three Clues in any order. Any of these inputs counts as interacting:
   - pressing Enter in the Play_Area while that plaque is the Nearby_Interactable
   - pressing the Touch_Controls Interact button while that plaque is the Nearby_Interactable
   - activating that Clue's Area_Action button in the Route_Panel
3. WHEN a Clue is found, THE Journal SHALL add an entry that shows the Clue's name and Clue text. Entries SHALL appear in Route_Data order (Moon, Thorn, Key), whatever order the player found them in.
4. THE Journal SHALL list exactly the Clues that Clocktower_State records as found. The list SHALL stay the same in every Area, after the player exits and re-enters the Clocktower room, and after a page reload.
5. WHEN the player interacts with the plaque of a Clue that is already found, THE Room_Status SHALL repeat that Clue's name and Clue text, and THE Game_Context SHALL leave Clocktower_State unchanged, including the number of found Clues.
6. WHEN a Clue is found, THE Room_Status SHALL state the Clue's name, its Clue text, and how many of the three Clues have been found.
7. WHILE no Clue is found, THE Journal SHALL state that no Clues have been found yet.

### Requirement 15: Clockworks gate and shortcut

**User Story:** As a player, I want the clues to open the gate and a shortcut, so that I can reach the belfry and come back.

#### Acceptance Criteria

1. WHEN the player interacts with the closed gate with all three Clues found, through the World_Scene, keyboard, Touch_Controls, or Route_Panel, THE Game_Context SHALL record in the same Clocktower_State update both that the gate is open and that the return shortcut is unlocked.
2. WHEN the gate opens, THE World_Scene SHALL swap `gate-closed.png` for `gate-open.png` at the shared anchor (256, 296) and remove the gate's collision, so the Ghost can walk from the Clockworks Passage into the Belfry.
3. IF the player interacts with the gate with fewer than three Clues found, THEN THE Room_Status SHALL name each missing Clue (Moon, Thorn, or Key), THE Game_Context SHALL leave Clocktower_State unchanged, and THE World_Scene SHALL keep the gate closed with its collision.
4. WHILE the return shortcut is unlocked, THE Route_Panel SHALL offer two named travel buttons. One places the Ghost at the Moonlit Courtyard spawn point. The other places the Ghost at the Clockworks Passage spawn point on the Belfry side of the gate, as defined in Route_Data.
5. WHEN the gate opens, THE Room_Status SHALL state in text that the gate is open and that the return shortcut to the Moonlit Courtyard is unlocked.
6. WHILE the return shortcut is locked, THE Route_Panel SHALL offer no shortcut travel buttons.
7. WHEN the player interacts with the gate after it is open, THE Room_Status SHALL state that the gate is already open and THE Game_Context SHALL leave Clocktower_State unchanged.

### Requirement 16: Clocktower save schema and migration

**User Story:** As a returning player, I want my older saves to load with the new room, so that I keep my Checkout and Pantry progress.

#### Acceptance Criteria

1. THE Progress_Schema SHALL store Clocktower_State and the Bell_Focus_Curse defect state under schema version 3 in the `keyquest-progress-v1` key, and every save written after this change SHALL carry version 3.
2. WHEN a version 1 or version 2 save loads, THE Progress_Schema SHALL keep its Checkout and Pantry defect states, hints, and room actions unchanged, SHALL add an initial Clocktower_State and an undiscovered, unrepaired, unverified Bell_Focus_Curse, and SHALL return the result as version 3.
3. IF a loaded save does not hold the Lantern_Potion after Pantry normalization, THEN THE Progress_Schema SHALL replace its Clocktower_State with the initial Clocktower_State.
4. IF a loaded Clocktower_State holds a field whose prerequisite is not met, THEN THE Progress_Schema SHALL clear that field and every field that depends on it, and SHALL keep all supported fields, using these prerequisites: a found Clue requires a lit lantern; an open gate requires all three Clues; an opened shortcut requires an open gate; any bell ring requires an open gate and a verified Bell_Focus_Curse; restored lights require all three bells rung in Bell_Sequence order; a Checkpoint for Overgrown Graveyard requires a lit lantern, for Clockworks Passage requires all three Clues, and for Belfry requires an open gate.
5. IF the saved Clocktower_State or the saved Bell_Focus_Curse defect state is missing, is not an object, holds a field of the wrong type, or names a Clue, Area, or bell outside the Adventure_Route and Bell_Sequence, THEN THE Progress_Schema SHALL replace only that part with its initial state and SHALL keep the rest of the save unchanged.
6. IF a loaded save names `clocktower` as its current room and the Clocktower room is not resumable (the room is not marked built, or `isRoomUnlocked(progress, 'clocktower')` returns false), THEN THE Progress_Schema SHALL set the current room to `pantry` when the Pantry_Key is held and to `checkout` otherwise, matching the existing `migrateProgress` fallback for a current room outside `ROOM_IDS`, and SHALL keep the Clocktower_State that criteria 3 and 4 allow.
7. IF a save's version is not 1, 2, or 3, THEN THE Progress_Schema SHALL reject the save, and the game SHALL start from initial progress for every room.
8. FOR ALL valid version 3 progress states, saving to `keyquest-progress-v1` then loading SHALL produce a state deep-equal to the saved state, including every Clocktower_State field and the Bell_Focus_Curse defect state (round-trip property).
9. FOR ALL valid progress states, normalizing an already normalized Clocktower_State SHALL produce a deep-equal Clocktower_State (idempotence property).

### Requirement 17: Checkpoints, resume, and reset

**User Story:** As a player, I want to resume where I left off and reset only this room, so that I do not lose other rooms.

#### Acceptance Criteria

1. WHEN the Ghost enters an Area that is not yet recorded as a Checkpoint, THE Game_Context SHALL record that Area as a Checkpoint, make it the last Checkpoint, and save progress at once. Entering an Area that is already a Checkpoint SHALL NOT change the last Checkpoint.
2. WHEN the player enters the Clocktower room through the Door_Selector or the opening-screen Resume option, after a page reload or after leaving the room, THE World_Scene SHALL place the Ghost at the spawn point of the last Checkpoint. If no Checkpoint is recorded, it SHALL use the Apothecary Exit spawn point. It SHALL also restore the lantern, found Clues, gate, shortcut, bell rings, and lights exactly as stored in Clocktower_State.
3. WHEN the player confirms a Clocktower reset, THE Game_Context SHALL clear Clocktower_State, set the Bell_Focus_Curse back to undiscovered, unrepaired, and unverified, set its revealed hints to zero, leave Checkout and Pantry progress unchanged (including the Lantern_Potion), and save at once.
4. WHEN the player confirms a Clocktower reset, THE Clocktower_View SHALL return the Bell_Dialog to its defective state: the dialog does not receive focus on open and does not return focus on close.
5. WHEN the player confirms Start over, THE Game_Context SHALL clear the progress of every room including Clocktower_State and save at once.
6. THE Game_Context SHALL count Clocktower_State as meaningful progress for the Resume option on the opening screen if it holds at least one Checkpoint, a lit lantern, a found Clue, an open gate, an open shortcut, or a bell ring.
7. WHEN the player confirms a Clocktower reset while in the Clocktower room, THE World_Scene SHALL place the Ghost at the Apothecary Exit spawn point, and THE Room_Status SHALL state in text that the Clocktower room was reset.
8. IF the player cancels a Clocktower reset or Start over confirmation, THEN THE Game_Context SHALL leave all saved progress unchanged, including Clocktower_State and the Ghost's position.
9. IF the saved Clocktower_State fails Progress_Schema validation on load, THEN THE Game_Context SHALL replace it with the initial Clocktower_State, keep Checkout and Pantry progress unchanged, and start the Ghost at the Apothecary Exit spawn point on the next entry.

### Requirement 18: Publishing the route

**User Story:** As a player, I want the Clocktower door to open only when the whole route works, so that I never enter a half-built room.

#### Acceptance Criteria

1. THE Rooms_Registry SHALL mark the Clocktower room as built only in the change that also adds passing Unit_Test_Suite and Playwright_Suite coverage for all five Areas, the Bell_Focus_Curse repair, and the Bell_Sequence.
2. WHILE the Clocktower room is marked built, THE Game_Context SHALL accept `clocktower` as a resumable room. On Resume with `clocktower` saved as the current room, an uncleared room SHALL reopen at the last saved Checkpoint and a cleared room SHALL open the Door_Selector with Revisit available.
3. WHILE the Clocktower room is marked built, THE Game_Context SHALL count the adventure as complete only when the Checkout is cleared, the Pantry is cleared, and the Clocktower_State records the apothecary lights as restored.
4. IF the Clocktower room is not marked built, THEN THE Game_Context SHALL reject `ENTER_ROOM` for `clocktower` and leave the current phase and room unchanged, and the Door_Selector SHALL show the Clocktower door as Coming later.
5. WHILE the Clocktower room is marked built and the Lantern_Potion is held, THE Door_Selector SHALL show the Clocktower door as enterable. Neither the Door_Selector nor the completion screen SHALL show text saying the Clocktower door opens in a later update.
6. IF saved progress names `clocktower` as the current room while the Clocktower room is not marked built, THEN THE Game_Context SHALL resume in the fallback room set by Requirement 16.6, opening the Door_Selector when that room is already cleared (as `START_CHALLENGE` does today), and SHALL keep the saved Clocktower_State unchanged apart from the clearing in Requirements 16.3 and 16.4.

### Requirement 19: Bell dialog defect in the sandbox

**User Story:** As a learner, I want to meet a real dialog focus failure, so that I can see why focus management matters.

#### Acceptance Criteria

1. THE Challenge_Sandbox SHALL contain the three bell controls and the Bell_Dialog as descendants of `[data-testid="challenge-sandbox"]`, with the visible sandbox disclaimer rendered above the bell controls, and THE Clocktower_View SHALL place no part of the Bell_Focus_Curse in the app shell.
2. WHILE the Bell_Focus_Curse is not repaired, WHEN a bell control, a bell Interactable, or a Route_Panel bell action opens the Bell_Dialog, THE Bell_Dialog SHALL leave focus on the element that had focus immediately before the dialog opened, with no element inside the Bell_Dialog focused.
3. WHILE the Bell_Focus_Curse is not repaired, WHEN the Bell_Dialog closes through Ring, Cancel, or Escape, THE Bell_Dialog SHALL leave focus on the document body instead of the control that opened the dialog.
4. THE Bell_Dialog SHALL limit the defect to focus entry and focus return, and SHALL keep a visible title that names the selected bell and gives the dialog its accessible name, a Ring button, and a Cancel button, each with visible text.
5. WHILE the Bell_Focus_Curse is not repaired and the Bell_Dialog is open, THE Bell_Dialog SHALL keep the Ring and Cancel buttons reachable with Tab within 5 presses from the control that opened the dialog, operable with Enter, Space, pointer, and touch, and free of any focus trap.
6. WHEN the player opens the Bell_Dialog for the first time through any opening path in criterion 2, THE Clocktower_View SHALL record the Bell_Focus_Curse as discovered and announce the finding once in Room_Status.
7. IF the Bell_Focus_Curse is already recorded as discovered, including after a reload, THEN THE Clocktower_View SHALL open the Bell_Dialog without recording the discovery again or repeating the Room_Status announcement.
8. THE Clocktower_View SHALL offer an Inspect control for the bells, outside the Challenge_Sandbox, that is a keyboard-operable button.
9. WHEN the player activates the Inspect control, THE Clocktower_View SHALL record the Bell_Focus_Curse as discovered if it is not already recorded, and SHALL move focus to the Bell_Focus_Curse repair in the Repair_Studio.
10. WHEN the player interacts with a bell Interactable that is the Nearby_Interactable in the Belfry, or activates a bell action in the Route_Panel, THE Clocktower_View SHALL open the same Bell_Dialog, with the same bell named in its title, as the matching sandbox bell control.

### Requirement 20: Bell focus repair and verification

**User Story:** As a learner, I want the repair checked on the live dialog, so that I know focus really moves in and back.

#### Acceptance Criteria

1. WHEN the Bell_Focus_Curse is discovered, THE Repair_Studio SHALL show its patch choices as buttons, each labeled with a short action phrase that names the one change the patch makes.
2. WHEN the player picks the correct patch, THE Repair_Engine SHALL change the live Bell_Dialog inside the Challenge_Sandbox so that opening moves focus into the dialog and closing returns focus to the control that opened the dialog.
3. IF the player picks an incorrect patch, THEN THE Repair_Studio SHALL explain in one sentence why that patch does not fix the focus failure, leave the Bell_Dialog defect in place, keep every patch choice available, and leave the Bell_Focus_Curse unverified.
4. WHEN the Repair_Studio runs verification for the Bell_Focus_Curse, THE Verification_Engine SHALL open the live Bell_Dialog from the first bell control and pass the focus-entry check only if the document's real focused element is the Bell_Dialog or an element inside it.
5. WHEN the focus-entry check completes, THE Verification_Engine SHALL close the live Bell_Dialog once each through Ring, Cancel, and Escape, reopening it from the first bell control before each close, and pass each focus-return check only if the document's real focused element after that close is the first bell control.
6. WHILE the Verification_Engine runs its checks, THE Verification_Engine SHALL leave the Bell_Sequence, Clocktower_State, and saved progress unchanged, SHALL NOT record a bell ring or announce one in Room_Status, SHALL NOT trigger Emergency_Exit through its Escape check, and SHALL leave the Bell_Dialog closed when the checks end.
7. WHEN the checks end, THE Verification_Engine SHALL report four named results (focus entry, return after Ring, return after Cancel, return after Escape), each with pass or fail and the element that held focus at the time of the check, and SHALL report an overall pass only if all four results pass.
8. IF the live Bell_Dialog or the first bell control is not present in the Challenge_Sandbox when verification runs, THEN THE Verification_Engine SHALL report all four checks as failed with evidence that the element was not found, and THE Bell_Focus_Curse SHALL stay unverified.
9. IF one or more verification checks fail, THEN THE Repair_Studio SHALL name each failed check, keep the Bell_Focus_Curse unverified, and offer Check again, which reruns all four checks on the live Bell_Dialog.
10. WHEN all four verification checks pass, THE Game_Context SHALL record the Bell_Focus_Curse as verified, and THE Repair_Studio SHALL move focus to the first bell control.
11. THE Repair_Studio SHALL keep the patch code, WCAG 2.4.3 reference, and evidence behind How this repair works.
12. WHEN the player activates Hint for the Bell_Focus_Curse, THE Hint_Panel SHALL reveal the next of three hints, one hint per activation, and SHALL reveal no further hints after the third.

### Requirement 21: Ringing the bell sequence

**User Story:** As a player, I want to ring the three bells in the shown order, so that the apothecary lights come back.

#### Acceptance Criteria

1. THE Journal SHALL list the Bell_Sequence as a static ordered list of exactly three entries. Each entry SHALL show the visible label of one bell, in ring order. The list SHALL appear whether or not the Bell_Focus_Curse is verified, and its text SHALL not animate.
2. WHILE the Bell_Focus_Curse is not verified, WHEN the player confirms Ring, THE Room_Status SHALL state that the bell rope is jammed. THE Game_Context SHALL leave the Bell_Sequence progress and the count of lit windows unchanged.
3. WHILE the Bell_Focus_Curse is verified, WHEN the player confirms Ring for the next unrung bell in the Bell_Sequence, THE Game_Context SHALL record the ring and THE World_Scene SHALL swap one `window-dark.png` for `window-lit.png`. After the swap, the number of lit windows SHALL equal the number of recorded correct rings, from 0 to 3. THE Room_Status SHALL name the bell that rang.
4. WHILE the Bell_Focus_Curse is verified, WHEN the player confirms Ring for a bell that is out of order, THE Game_Context SHALL keep every earlier correct ring and SHALL not record the new ring. This includes a bell that has already been rung. THE World_Scene SHALL leave the count of lit windows unchanged, and THE Room_Status SHALL name the bell that comes next.
5. WHEN the Game_Context records the third correct ring in the Bell_Sequence, THE Game_Context SHALL record the apothecary lights as restored in Clocktower_State and mark the Clocktower room as cleared.
6. WHEN the apothecary lights are restored, THE World_Scene SHALL show all three windows lit and THE Room_Status SHALL state that the apothecary lights are back.
7. WHEN the player cancels the Bell_Dialog, THE Game_Context SHALL leave the Bell_Sequence progress and the count of lit windows unchanged.
8. THE Route_Panel SHALL show the Bell_Sequence progress as text in the form "N of 3 bells rung", where N is the number of recorded correct rings from 0 to 3. The text SHALL update when the Game_Context records a correct ring.
9. THE Clocktower_View SHALL not apply any time limit, countdown, or delay between rings. An out-of-order ring, a cancelled Bell_Dialog, or a jammed ring SHALL not reset or remove any recorded ring.
10. WHEN the player resumes saved progress that contains recorded bell rings, THE Clocktower_View SHALL restore the Bell_Sequence progress, the Route_Panel progress text, and the matching number of lit windows from Clocktower_State.
11. WHILE the apothecary lights are restored, WHEN the player confirms Ring for any bell, THE Game_Context SHALL leave Clocktower_State unchanged and THE World_Scene SHALL keep all three windows lit.

### Requirement 22: Dialog Escape and Emergency Exit

**User Story:** As a player, I want Escape to close the bell dialog and the exit to stay available, so that I am never trapped.

#### Acceptance Criteria

1. WHILE the Bell_Dialog is open and no native modal is active, WHEN the player presses Escape, THE Bell_Dialog SHALL close on that key press without recording a bell ring and without changing the Bell_Sequence progress. This applies wherever keyboard focus is and whether or not the Bell_Focus_Curse is repaired. An active native modal SHALL handle Escape first.
2. WHILE the Bell_Dialog is open, WHEN the player presses Escape, THE Emergency_Exit SHALL NOT trigger on that key press, and THE Clocktower_View SHALL remain displayed.
3. WHILE the Bell_Dialog is open, THE Emergency_Exit button SHALL remain non-inert, reachable with the Tab key, and activatable with Enter, Space, or a pointer click.
4. WHILE the Bell_Dialog is open, WHEN the player activates the Emergency_Exit button, THE Emergency_Exit SHALL close the Bell_Dialog without recording a bell ring, save the Clocktower_State, and return to the menu.
5. WHILE the Bell_Dialog is closed and no other dialog is open, WHEN the player presses Escape with focus on the Play_Area or any other element of the Clocktower_View, THE Emergency_Exit SHALL save the Clocktower_State, including the last reached Checkpoint, and return to the menu.
6. WHEN the player presses Escape once to close the Bell_Dialog and then releases and presses Escape again with no dialog open, THE Emergency_Exit SHALL save the Clocktower_State and return to the menu on the second press. Holding the first press through keyboard auto-repeat SHALL leave the Clocktower_View displayed.

### Part D: Motion pass (Checkpoint 4)

### Requirement 23: Distinct motion with immediate state

**User Story:** As a player, I want moving, stopping, interacting, and succeeding to feel different, so that the world responds to me.

#### Acceptance Criteria

1. WHEN a World_Action succeeds, THE Game_Context SHALL update Clocktower_State and THE Clocktower_View SHALL update the Room_Status text before the first frame of the matching success animation, and the stored outcome SHALL NOT depend on the animation finishing.
2. WHILE the Ghost is moving, THE World_Scene SHALL show the facing image for the direction of travel and lean the Ghost toward that direction, starting within 100 ms of the first movement input. A lean is a visible tilt or offset away from the resting pose.
3. WHEN a World_Action succeeds, THE World_Scene SHALL play that action's success animation as a Phaser tween on the existing frames, with no new sprite frames, and finish it within 1,500 ms. The success animations are lantern warmup for the lantern post, gate opening for the gate, bell swing for a rung bell, and window lighting when the lights are restored.
4. WHILE a success animation plays, THE World_Scene SHALL move the Ghost within 100 ms of a movement input and SHALL process Interact input, without restarting or cancelling the animation that is playing.
5. WHEN the player starts a new attempt at an Area_Action before the previous attempt's animation or Rive_Mascot performance ends, or the Clocktower_View unmounts during such a reaction, THE Clocktower_View SHALL send no Mascot_Context signal for the earlier attempt and THE World_Scene SHALL start no animation queued for the earlier attempt. After an unmount, no Mascot_Context signal and no World_Scene animation SHALL start.
6. WHEN the player requests a hint, THE Clocktower_View SHALL send the hint keeper's existing `requestAttention` signal (Lantern Search) exactly once for that request.
7. WHEN the Clocktower room changes from not cleared to cleared, THE Clocktower_View SHALL send the selected costume's `celebrate` signal exactly once. Loading, resuming, or re-entering a room that is already cleared SHALL send no `celebrate` signal.
8. WHILE the Reduced_Motion_Setting is on, THE World_Scene SHALL show the final state of every animation within one rendered frame, show no lean, hover, settle, or interaction-cue motion, and produce the same Room_Status text as when the setting is off. If the setting turns on while an animation is playing, that animation SHALL jump to its final state within one rendered frame.
9. THE Clocktower_View SHALL state the current objective in the Route_Panel and the outcome of every World_Action, success or rejection, in the Room_Status. A player with sound off and motion reduced therefore gets the same information as a player with both on.
10. WHEN the Ghost stops moving, THE World_Scene SHALL return the Ghost to its resting pose with zero lean within 300 ms, keep the last facing image, and then resume a hover bob of at most 6 px vertical travel.
11. WHEN the player presses Interact while a Nearby_Interactable exists, THE World_Scene SHALL start a scale pulse on the Ghost within 100 ms and end it within 300 ms. The pulse peaks between 1.05 and 1.15 times the resting scale and has no tilt, so it differs from the moving lean and the stopping settle.
12. IF a World_Action is rejected, for example a bell rung out of order or a locked gate, THEN THE Game_Context SHALL leave Clocktower_State unchanged, THE World_Scene SHALL play no success animation, and THE Clocktower_View SHALL state the reason for the rejection in the Room_Status.

### Part E: Verification and release review

### Requirement 24: Unit tests

**User Story:** As a maintainer, I want pure rules covered by unit tests, so that regressions show up without a browser.

#### Acceptance Criteria

1. THE Unit_Test_Suite SHALL assert the Clocktower door state for an unbuilt room (Coming later regardless of potion status), a built room without the potion (Locked), a built room with the potion before the lights are restored (Open), a built room with the potion after the lights are restored (Cleared), and a built room after a Pantry reset (Locked).
2. THE Unit_Test_Suite SHALL assert, for each World_Action, one case where the Game_Context accepts the action and changes Clocktower_State, and one case where the action's prerequisite is missing and Clocktower_State stays unchanged. The prerequisites tested SHALL include a gate interaction with 0, 1, and 2 Clues found and a bell ring while the Bell_Focus_Curse is not verified.
3. THE Unit_Test_Suite SHALL assert that repeating each World_Action after it has already succeeded leaves Clocktower_State unchanged. The repeated actions tested SHALL include lighting the lit lantern, finding each already-found Clue, and opening the open gate.
4. THE Unit_Test_Suite SHALL assert the Bell_Sequence rules with the Bell_Focus_Curse verified: a correct next ring is recorded; an out-of-order ring keeps the earlier correct rings; a cancelled Bell_Dialog leaves the Bell_Sequence unchanged; and the third correct ring records the apothecary lights as restored and the Clocktower room as cleared.
5. THE Unit_Test_Suite SHALL assert that loading a version 1 save and a version 2 save keeps the Checkout and Pantry progress, adds an initial Clocktower_State, and produces schema version 3.
6. THE Unit_Test_Suite SHALL assert that loading a save clears unsupported Clocktower_State. The cases SHALL include Clocktower progress without the Lantern_Potion, an open gate with fewer than three Clues, and bell rings without a verified Bell_Focus_Curse. THE Unit_Test_Suite SHALL also assert that a malformed Clocktower_State is replaced with the initial state while the rest of the save stays unchanged.
7. THE Unit_Test_Suite SHALL assert two properties for valid progress states. Saving then loading SHALL produce equivalent progress (round trip). Normalizing an already normalized Clocktower_State SHALL produce the same state (idempotence).
8. THE Unit_Test_Suite SHALL assert that a per-room Clocktower reset clears Clocktower_State, the Bell_Focus_Curse progress, and its hints, and keeps Checkout and Pantry progress unchanged. THE Unit_Test_Suite SHALL also assert that Start over clears every room, including Clocktower_State.
9. THE Unit_Test_Suite SHALL assert that a save whose only progress is Clocktower_State counts as meaningful progress for the Resume option.
10. THE Unit_Test_Suite SHALL check Route_Data integrity for all five Areas. Every exit SHALL lead to a spawn point defined in its target Area. Every Interactable SHALL have an interaction zone with non-zero width and height. Every spawn point SHALL lie inside its Area's bounds and outside every collision shape.
11. THE Unit_Test_Suite SHALL assert that, before the correct patch is applied, the Verification_Engine reports a failed focus entry check and a failed focus return check against the Bell_Dialog.
12. THE Unit_Test_Suite SHALL assert that, after the correct patch is applied, the Verification_Engine reports a passing focus entry check and a passing focus return check for each close path: Ring, Cancel, and Escape. THE Unit_Test_Suite SHALL also assert that Clocktower_State and the Bell_Sequence are unchanged after verification runs.
13. WHEN `npm test` runs, THE Unit_Test_Suite SHALL execute every Clocktower unit test in jsdom without loading the Phaser module or a browser.
14. IF any Clocktower unit test fails or is skipped, THEN THE Checkpoint_Report SHALL mark the build checkpoint as incomplete and name each failing or skipped test.

### Requirement 25: Browser tests

**User Story:** As a maintainer, I want end-to-end coverage of the real scene and repair, so that the route works for every input.

#### Acceptance Criteria

1. THE Playwright_Suite SHALL play the Courtyard_Slice through the Courtyard_Preview_Entry with keyboard input only. The test SHALL Tab to the Play_Area and confirm the page scroll position does not change while Arrow keys are pressed. It SHALL hold an Arrow key toward a wall for at least 2 seconds and confirm the Ghost stops at the wall boundary defined in Route_Data. It SHALL move until the Route_Panel names the lantern post as the Nearby_Interactable, then press Enter and confirm the Room_Status states that the lantern is lit and the way forward is open. Finally it SHALL press Tab and confirm that focus is outside the Play_Area and the Ghost has stopped.
2. THE Playwright_Suite SHALL play the Courtyard_Slice through the Courtyard_Preview_Entry at a 375 × 667 viewport with touch emulation, using only the Touch_Controls. The test SHALL confirm that each Touch_Controls button measures at least 44 × 44 CSS pixels, that the page has no horizontal overflow, and that the Room_Status states the lantern is lit after Interact is activated at the lantern post.
3. THE Playwright_Suite SHALL complete the courtyard Area_Action through the Courtyard_Preview_Entry using only Route_Panel buttons, with no keyboard input to the Play_Area and no pointer input on the World_Scene canvas, and SHALL confirm the Room_Status states that the lantern is lit.
4. THE Playwright_Suite SHALL run the Courtyard_Slice once with `prefers-reduced-motion: reduce` emulated and once more with only the footer toggle switched on. In each run the test SHALL confirm that `html[data-reduced-motion]` is `true`, that the lantern reaches its lit state, and that the Room_Status text matches the text from a run with the Reduced_Motion_Setting off.
5. THE Playwright_Suite SHALL enter the Clocktower_View, leave it, and enter it again. It SHALL confirm that the Play_Area holds exactly one World_Scene canvas after each entry and that the page has zero World_Scene canvases after leaving.
6. THE Playwright_Suite SHALL confirm the Bell_Focus_Curse defect before repair and its resolution after repair. Before repair, focus SHALL stay outside the Bell_Dialog when the dialog opens and SHALL land on the document body when it closes. After repair, focus SHALL move inside the Bell_Dialog when it opens and SHALL return to the opening bell control after each of Ring, Cancel, and Escape.
7. THE Playwright_Suite SHALL test the Bell_Focus_Curse repair feedback in two steps. First, it SHALL apply an incorrect patch and confirm that the Repair_Studio explains why that patch does not fix the focus failure and that the Bell_Focus_Curse stays unverified (Requirement 20.3). Second, it SHALL produce a failed live check by adding a test-only capture `focusin` listener inside the Bell_Dialog that blurs focus, apply the correct patch, and confirm that the Repair_Studio names the failed check and offers Check again (Requirement 20.9). It SHALL then remove the listener, activate Check again, and confirm that the Bell_Focus_Curse is recorded as verified and that focus moves to the first bell control.
8. THE Playwright_Suite SHALL load a seeded save under `keyquest-progress-v1` in which the Lantern_Potion is held and the Clocktower room is marked built, then play to the restored apothecary lights. After at least one Clue is found, the test SHALL reload the page and confirm three things: the Ghost appears at the spawn point of the last Checkpoint, the lantern and found Clues match their state before the reload, and the Journal lists the same Clues. After the lights are restored, the test SHALL reload again and confirm that the Room_Status or Route_Panel shows the lights as restored and the Clocktower room as cleared.
9. THE Playwright_Suite SHALL run these exit checks:
   - With the Play_Area focused and no dialog open, pressing Escape saves progress and returns to the menu.
   - With the Bell_Dialog open, pressing Escape closes the dialog and leaves the Clocktower_View shown.
   - With the Bell_Dialog open, activating the Emergency_Exit button returns to the menu.
10. THE Playwright_Suite SHALL run axe-core on the Clocktower_View, with the Challenge_Sandbox excluded, in two states: the Moonlit Courtyard before and after the lantern is lit, and the Belfry with the bell controls shown. Each scan SHALL report zero violations of any impact level.
11. IF the Phaser module request is blocked during the test, THEN THE Playwright_Suite SHALL confirm that the Clocktower_View shows a text message naming the load problem and that the courtyard Area_Action completes through the Route_Panel.
12. THE Playwright_Suite SHALL start each Clocktower test with localStorage either cleared or seeded with a save the test defines, so that results do not depend on test order.
13. THE Playwright_Suite SHALL pass criteria 1 to 12 in the default `chromium` project of `playwright.config.ts`.

### Requirement 26: Code Mode evidence

**User Story:** As a reviewer, I want interactive captures from desktop and phone widths, so that I can judge the slice before the route expands.

#### Acceptance Criteria

1. WHEN a Checkpoint_Report is marked complete for one of the four build checkpoints (animated courtyard, complete route, live repair, motion pass), THE Review_Evidence SHALL include at least one Code Mode Playwright capture of each of these three states at each of two viewports, for a minimum of six captures per build checkpoint. The three states are the objective (the current objective text visible on screen), the control (the control that build checkpoint adds or repairs, shown before activation), and the outcome (the visible in-world result after activation). The two viewports are a desktop viewport at least 1280 × 720 and a phone viewport at exactly 375 × 667.
2. THE Review_Evidence SHALL label each capture with its build checkpoint name, its state (objective, control, or outcome), and its viewport width × height in CSS pixels.
3. THE Review_Evidence SHALL list, for each Code Mode run, every Code Mode operation used by name, the `search` query through which each operation was discovered, and the `describe` call through which each operation was inspected.
4. WHILE a Code Mode run is in progress, THE Review_Evidence SHALL show that exactly one `browserSession` was opened and reused for every capture in that run, and that the session was closed with `browser_close` as the last operation of the run.
5. IF a required capture from criterion 1 cannot be produced, or a Code Mode run ends without `browser_close`, THEN THE Review_Evidence SHALL name the missing capture or unclosed session and the observed cause, and THE Checkpoint_Report SHALL list that build checkpoint as having incomplete Review_Evidence.
6. THE Review_Evidence SHALL report results under four separately labeled headings: emulated viewports, keyboard-only runs, touch emulation, and physical phone tests. Each heading SHALL state either the results observed or "not run", and the physical phone heading SHALL name the device model and browser for each test performed.
7. WHEN a Checkpoint_Report is marked complete for the live repair or motion pass build checkpoint, THE Review_Evidence SHALL record, as a playtest observation, the first-playthrough time in minutes and seconds for the Clocktower segment, which runs from entering Clocktower Gate through the Door_Selector to the moment the apothecary lights are restored. THE Review_Evidence SHALL report that segment time alongside the 8 to 12 minute first-playthrough target for a complete run of all rooms, and alongside the full-run time from the Checkout when a full run was also timed.
8. IF a full-run time is recorded and falls outside the 8 to 12 minute target, THEN THE Review_Evidence SHALL record the Area or Areas of the Clocktower segment where the playtester spent the most time. Neither the segment time nor the full-run time SHALL, by itself, mark the build checkpoint as failed.

### Requirement 27: Quality gates

**User Story:** As a maintainer, I want the existing gates to pass at each checkpoint, so that the new room does not break the shipped rooms.

#### Acceptance Criteria

1. WHEN a build checkpoint is marked complete, THE Checkpoint_Report SHALL show that `npm run build`, `npm run typecheck`, and `npm run lint` were each run on the code being marked complete, and that each one exited with code 0 and reported zero errors.
2. WHEN a build checkpoint is marked complete, THE Checkpoint_Report SHALL list every warning from `npm run build` and `npm run lint`, and give a written justification for each warning that remains.
3. WHEN a build checkpoint is marked complete, THE Checkpoint_Report SHALL show that the full Unit_Test_Suite was run with `npm test`. It SHALL report the passed, failed, and skipped test counts, with zero failed tests.
4. WHEN a build checkpoint is marked complete, THE Checkpoint_Report SHALL name each Playwright_Suite spec that covers a requirement assigned to that build checkpoint. It SHALL show each named spec run with `npm run test:e2e`, with its passed, failed, and skipped test counts and zero failed or skipped tests.
5. WHEN a build checkpoint is marked complete, THE Checkpoint_Report SHALL show the existing Checkout and Pantry Playwright_Suite specs passing with zero failed or skipped tests. No test in those specs SHALL be removed or newly marked skipped since the previous build checkpoint.
6. IF any command or spec required by criteria 1 to 5 exits with a nonzero code, reports an error, or reports a failed test, THEN THE Checkpoint_Report SHALL mark the build checkpoint as incomplete and name the failing command or spec.
7. THE Production_Build SHALL emit Phaser in a JavaScript chunk separate from the entry chunk. The entry chunk SHALL contain no Phaser module code. The built `index.html` SHALL not reference the Phaser chunk in any `script` or `modulepreload` tag.

## Out of scope

- Implementation during this spec session.
- Backend services, accounts, or any storage other than localStorage.
- Animation libraries beyond Phaser, Rive, and CSS.
- Timers, hint penalties, or repeat grinds that gate progress.
- New exploration sprites for costumes other than the Pumpkin Ghost.
- The optional remixed room from Phase 2.

## Open questions for design

1. **Preview entry.** Playwright runs against `npm run dev`, so the development entry is
   testable independently of the normal saved adventure.
   *Resolved in design (decision 1):* `/?preview=courtyard`, guarded
   by `import.meta.env.DEV`, removed from the URL after activation.
2. **Bell dialog and Emergency Exit.** A `showModal()` dialog makes the header Exit inert, and
   the Escape listener skips the exit while any `dialog[open]` exists. Options: a non-modal
   dialog with its own Escape handling, or an exit control inside the dialog. Requirement 22
   states the outcome; design picks the mechanism.
   *Resolved in design (decision 2):* a non-modal `role="dialog"` with a capture-phase Escape
   handler that calls `preventDefault()`, and `EmergencyExitButton` skips Escape when
   `event.defaultPrevented` is set.
3. **One curse or two.** Requirements 19 and 20 treat focus entry and return as one
   Bell_Focus_Curse with one verification that reports both parts. Splitting them into two
   curses would add a second Repair Studio card.
   *Resolved in design (decision 3):* one curse, `bell-dialog-focus`, with one Repair Studio card
   and four named checks.
4. **Bell names and order.** The brief says the bells are labeled and the order is indicated.
   Naming the bells after the Moon, Thorn, and Key Clues would tie the graveyard to the finale;
   design should confirm the order source.
   *Resolved in design (decision 4):* Moon, Thorn, and Key
   bells, rung Moon, Key, Thorn. The Clue texts state the order and the Journal lists it.
5. **Phaser renderer.** Headless Chromium may lack WebGL. Design should pick `Phaser.AUTO` with
   Canvas fallback or Canvas only, and confirm the Phaser version and chunk size.
   *Resolved in design (decision 5):* `Phaser.AUTO` with Phaser `^4.2.1`, using only features
   both renderers support. The chunk size is measured in the Checkpoint 1 report.
6. **Lit lantern art.** Requirements 8.5 and 12.3 need an unlit and a lit lantern image, but
   `public/adventure/props/` has one `lantern-post.png` export and no lit variant. Options: a
   new lit export, a Phaser glow overlay on the same frame (static under reduced motion), or
   `clocktower/alchemists-lantern.png` as the lit state.
   *Resolved in design (decision 6):* a canvas texture generated at
   scene start from `lantern-post.png` plus a radial glow. A later
   `props/lantern-post-lit.png` export can replace it under the same texture key.
7. **Built override for full-route tests.** Requirement 25.8 seeds a save "in which the
   Clocktower room is marked built", but `built` lives in the Rooms_Registry, not in saves.
   Until Requirement 18.1 publishes the room, the full-route browser tests need a development
   and test-only override for `built`. Design should pick the mechanism and confirm the
   Production_Build ignores it (Requirement 4.5).
   *Resolved in design (decision 7):* `/?built=clocktower` in development and test builds, read
   into `isRoomBuilt`. The parameter stays in the URL across reloads, and the Production_Build
   ignores it.
