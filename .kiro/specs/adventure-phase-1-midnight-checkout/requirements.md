# Requirements: Adventure Phase 1 — Playable Midnight Checkout

Source brief: `.kiro/steering/adventure-overhaul.md` (Phase 1 only). Potion Pantry and
Clocktower Gate are out of scope until this slice has been played and reviewed.

## Goal

The apothecary went dark when its bell stopped ringing. In the first room the player
relights the counter lantern, finishes a shopper's order, and earns the key to the next
room. Every step uses the existing repair and verification engines on the real sandbox DOM.

## R1 Opening screen

1. The first control in `<main>` is **Enter Midnight Checkout** (`data-testid="start-challenge"`).
2. When a valid, incomplete save exists, the same control reads **Resume Midnight Checkout**,
   shows a one-line save summary, and a secondary **Start over** control (`start-fresh`)
   clears the save and enters a fresh room. No modal blocks the opening screen.
3. The player starts with the current ghost. **Change ghost** opens the Costume Locker on demand.
4. The mission briefing and curse catalog live in a collapsed journal, not on the main path.
5. The opening keeps the sandbox disclaimer and the Escape-to-exit notice.

## R2 First encounter: Light the counter lantern

1. Entering the room moves focus to the room heading.
2. The objective card names one job, **Light the counter lantern**, with a short instruction
   and one relevant control: **Inspect Buy Now**.
3. The player can find the curse by Tab focus on Buy Now, by clicking/tapping Buy Now,
   or with Inspect Buy Now. Each path announces the finding in a polite live region.
4. The encounter is solvable from text alone. No glow or animation carries required information.
5. The Buy Now button stays the `defect-invisible-focus` target with the existing verification contract.

## R3 Repair beside the scene

1. When a curse is found, the Repair Studio shows that curse's repair immediately.
2. Patch choices are short actions (for example **Show a ring on keyboard focus**).
3. A wrong patch explains why in one sentence and leaves all choices available to retry.
4. The correct patch runs `applyRepair` then `verify` on the live element.
5. A failed verification keeps the repair recoverable with **Check again**.
6. Patch code, WCAG reference, and evidence sit behind **How this repair works**.
7. **Hint** reveals one clue at a time, up to three per curse.

## R4 Payoff and room completion

1. On verified focus repair, focus moves to Buy Now so the real ring is visible, progress
   updates immediately, and the ghost plays one brief reaction.
2. Pressing the repaired Buy Now lights the lantern, with a short accessible status.
3. The other three curses are framed as finishing the shopper's order. Each verified repair
   says what the repaired control now does, and the player can use it.
4. Placing the order requires all four verified repairs and the candle in the order.
5. A placed order leaves a key on the counter. **Take the key** opens the completion summary,
   which names the key and the next door (Potion Pantry, locked until the next update).

## R5 Persistence

1. Room actions (lantern lit, candle added, order placed) persist with progress.
2. Older v1 saves without room actions load with those actions unset; discoveries,
   repairs, verification, and hints are kept.
3. Reload, exit, and resume restore DOM repairs and room actions.

## R6 Motion

1. Immediate control feedback; on success the repaired object and progress update first,
   followed by one companion reaction. No queued or stale reactions on rapid retries.
2. Ambient motion stays quiet while choosing a repair.
3. Room completion has the fuller beat (key arrives on the counter).
4. With either reduced-motion setting the same outcomes appear instantly with equivalent text.

## R7 Quality

Build, lint, typecheck, unit tests, Playwright suites, and shell axe scans pass. The room is
playable by keyboard only and at 375×667 without horizontal overflow.
