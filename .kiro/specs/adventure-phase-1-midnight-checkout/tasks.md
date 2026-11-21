# Tasks: Adventure Phase 1 — Playable Midnight Checkout

- [x] 1. Capture baseline menu and first encounter (desktop 1280×800, phone 375×667) with Code Mode Playwright
- [x] 2. State: `checkout` room actions, `ROOM_ACTION`, `HYDRATE_PROGRESS`, storage normalization, unit tests
- [x] 3. Registry: room objective copy, stage helpers, short patch labels, plain curse copy, unit tests
- [x] 4. Opening screen: Enter/Resume up front, Change ghost, journal, remove blocking restore modal
- [x] 5. Room: header, objective card, live status, focus on entry, journal with direct inspect
- [x] 6. Sandbox: counter-first layout, lantern and key props, Buy Now outcomes, bag readout
- [x] 7. Repair Studio: active curse, short patches, Check again, How this repair works, focus payoff
- [x] 8. Hint panel: compact, one clue at a time
- [x] 9. Completion: key and next-door state
- [x] 10. Motion: lantern, candles, key; reduced-motion parity; review-animations pass
- [x] 11. Update Playwright suites; add room flow, reload/resume, failed-check retry, keyboard-only, phone tests
- [ ] 12. Checkpoint: build, lint, typecheck, unit, e2e, axe; Code Mode playtest desktop/phone/keyboard/reduced motion/reload
- [ ] 13. Novice playtest with a first-time player (not yet run)

## Playtest findings fixed during the slice

- Room tools (Costumes, Reset) sat before the objective in Tab order; moved after the scene.
- Passive Tab discovery switched the active repair; focus now finds curses without swapping the open repair.
- The order checklist grew the objective card and pushed the lit lantern out of view; replaced with one next task.
- Studio next action went stale after the lantern was lit; it now reflects room state.
- A repeated failed check looked identical; failed checks are now counted and announced.
- Verified results disappeared when the curse had been found by focus; the verified curse stays selected.
- Phone: Buy Now sat at y=779 on a 667px screen; compacted to y=582.
- Global reduced-motion CSS used a 0.01ms transition on every property, which made the live contrast check read the old color. Now 0s.
- Costume cards, Ghost Vision buttons, and patch buttons turned crimson on hover (global `button:hover` won on specificity), failing text contrast in the locker.
