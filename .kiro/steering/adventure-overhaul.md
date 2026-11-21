---
inclusion: manual
---

# KeyQuest adventure overhaul

Keep KeyQuest's cozy haunted apothecary and its real accessibility repairs. Make the checkout feel like the first room of an adventure. This brief extends the single-level MVP described in product steering. Follow the existing accessibility, design-system, and quality guidance throughout.

Give the adventure one goal. The apothecary goes dark when its bell stops ringing. The player relights the counter, brews a lantern potion, and rings the clocktower bell to bring the rooms back to life. Each room starts with a concrete action. Each verified repair changes a real control, and the player immediately gets to use it. Show that payoff in the room before offering the technical explanation.

## Phase 1 — Make Midnight Checkout playable from the opening screen

1. Put **Enter Midnight Checkout** up front. Let the player start with the default ghost or resume their save. Keep costume selection available on demand. Move the mission briefing and curse catalog into optional help or a journal.
2. Open on the room with one immediate job, **Light the counter lantern**. The lantern and ghost draw attention to the objective. Give the player a short action label, one relevant control, and a way to inspect it with keyboard, touch, or a screen reader. Keep direct discovery available in the accessible shell. The first encounter must be solvable without seeing a glow or waiting for an animation.
3. Use the missing focus ring as the first encounter. Make the current checkout button double as the lantern encounter, keeping the sandbox's focus-defect target and verification contract. Offer the relevant repair beside the scene as soon as the player discovers the curse. Present patch choices as short actions such as **Show a ring on keyboard focus**. Use the existing Repair Studio and verification engine. Keep the exact patch code, WCAG reference, and detailed evidence behind **How this repair works**. Let **Hint** reveal one clue at a time.
4. On verified success, show the real focus ring and let the player use the repaired control to light the lantern. Give that action a short accessible status and a brief ghost reaction. Keep a failed verification recoverable with a clear retry. Finish the other three checkout curses as part of completing a shopper's order. End with a key on the counter so the player can see what they earned and where it takes them.

Aim for a first meaningful action within 10 seconds and a first repair within 60 seconds for a new player. Observe a first-time player if one is available. Report timings from an internal walkthrough separately from novice playtest results.

## Phase 2 — Give each room its own kind of puzzle

Build a complete route with a compact door selector. Make each new room reuse the real repair and verification cycle while changing what the player has to accomplish. A complete run should take roughly 8–12 minutes on a first playthrough, with room to move faster on a repeat.

| Room | Player's goal | Repair and payoff |
| --- | --- | --- |
| Midnight Checkout | Unjam the counter and claim the first key | Reuse the four existing curses. Verified fixes light candles at the counter and open the next door. |
| Potion Pantry | Brew a lantern potion from a three-ingredient recipe | Ingredients are identified by color alone inside the sandbox. Restore visible labels or symbols with equivalent accessible names. Use the repaired controls to choose the ingredients and see the empty cauldron fill. Verify the labeling and exercise the recipe interaction with keyboard and touch. An incorrect ingredient can be removed immediately. |
| Clocktower Gate | Ring three bells in an indicated order | The sandbox confirmation dialog loses focus. Repair focus entry and return, then complete the sequence to bring back the apothecary lights. Keep the sequence available as a static, named list. Verify the actual focus behavior and keep Emergency Exit reachable. |

Ship Pantry end to end before adding the Clocktower. Keep the hub simple enough to build with the current React/CSS stack. If time allows, add an optional remixed room with familiar curses in a different layout. Offer a completion mark or costume reward without putting core progress behind a timer, a hint penalty, or a repeat grind.

## Visual and motion workflow

- Apply [Taste Skill](https://github.com/leonxlnx/taste-skill/tree/f6b76575f949707b4e3c37cd86cb44b0b98643e8) as an art-direction and rendered-review reference. Frame each room around its puzzle object: lantern, cauldron, or bell. Use the existing twilight-plum palette and costume assets. On both desktop and phone, check whether the objective and control are visible together, whether the repair payoff is legible, and whether the supporting UI competes with them. Use the project's own game layout and quality gates.
- Use the workspace `/ui-design` skill from Uizze for readable room layouts, progressive hints, and mobile, restore, failure, and locked-door states. Read the distill and craft playbooks for the first room. Use local screenshots and the game itself as reference evidence. Optional reference retrieval is outside the core workflow.
- Use Emil Kowalski's workspace `/animate` and `/choreograph` skills for individual transitions and the sequence after a repair. Use `/review-animations` after the scene is playable. The installed Uizze skill is from [fc401e9](https://github.com/uizze/uizze/tree/fc401e9e654cbafe427b0c98142fc8bccd0c4e7e). Emil's skills are from [64eb3de](https://github.com/emilkowalski/skills/tree/64eb3deb9a5fbfa041faf783e0bc3fd635872e9c).

Create a motion sequence around each meaningful action. Start with immediate control feedback. On success, show the repaired object and update progress immediately, then play one brief companion reaction. Keep ambient motion quiet while the player is choosing a repair. Reserve a fuller door-opening beat for finishing a room. Use existing React/CSS for room and UI state and existing Rive signals for the mascot. Check that rapid retries, skipped transitions, and repeat visits do not queue stale reactions or delay input. Both reduced-motion settings should show the same outcomes instantly with a static pose and equivalent label or status.

## Use the local Code Mode gateway for design and playtesting

Use the workspace `code-mode` entry in `.kiro/settings/mcp.json`. This project gateway exposes Photoshop, Rive, Playwright, Google Stitch, OpenDesign, and Rive SplashFree. At the start of the spec, discover capabilities with `search` scoped to the integration, use `describe` before the first call to an operation, then compose the needed calls in `execute`. Return the evidence the task needs. See `tools/code-mode/README.md` for setup and session handling.

| Integration | Work to give it |
| --- | --- |
| Playwright | Capture the existing menu and first encounter as a baseline. Repeat the first-repair journey on narrow and desktop viewports, including a keyboard-only run, a failed patch and retry, reduced motion, and a reload. Capture the task, control, and outcome together. Reuse the returned `browserSession` within each run and close it at the end. Keep reproducible assertions in the checked-in Playwright tests. |
| OpenDesign | Explore two room compositions against the existing twilight-plum palette. Compare where the objective, repaired object, hint, and ghost fit at phone width. Bring the chosen layout back as a reference for the React implementation. |
| Google Stitch | Explore the compact door selector and its locked, available, and cleared states from a text brief with generic labels. Pick one readable arrangement before building the hub. |
| Photoshop | Inspect the existing layered artwork. When a prop needs an export, produce a reusable transparent version from a working copy and check it at its actual game size. |
| Rive | Inspect the active project, artboard, and view-model inputs. Prototype the next cue or reaction on a single ghost first. Verify that the new animation cooperates with `RiveMascot`'s existing trigger contract and reduced-motion behavior before extending it to other costumes. Work from a duplicate or an explicitly selected editable document. |
| Rive SplashFree | Run `prepare_playback` on the candidate `.riv` with its intended artboard and state machine. Use the result to check the first frame, then test the actual game through Playwright for the reaction, reduced-motion pose, and poster fallback. |

Start with Playwright and one clear design question. Use each additional integration at the point where it produces an asset, a decision, or a check. Record the operation used and its result. If an editor or provider is unavailable, keep building with the existing exports and local references and report the gap. Keep source documents intact, use the existing gateway permissions, and use generic briefs for external concept tools.

## Implementation and acceptance

- Read `ChallengeView`, `ChallengeSandbox`, `RepairStudio`, the repair and verification engines, the progress storage, and the Rive component before changing the flow. Start with a new Kiro spec and implement Phase 1 as a playable slice. Use observations from that slice to refine the next rooms.
- Keep intentional barriers inside the labeled sandbox. Preserve keyboard and touch paths, visible focus, Emergency Exit, accessible progress and outcomes, expandable explanations, and direct discovery. Use stable focus within a room and move it to the new room's heading on navigation.
- When adding room IDs and per-room progress, migrate existing valid checkout saves, retaining discovered and verified repairs. Derive door unlocks from verified progress. Test reloads, room transitions, and resumed sessions.
- Test the actual defects and live repairs before and after, then run existing build, lint, typecheck, unit and relevant Playwright tests and shell axe checks. Play through using keyboard only and at a narrow mobile viewport. Check both reduced-motion controls, the Rive fallback, and first-load and failed-verification paths.
