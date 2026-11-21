# Requirements: Adventure Phase 2a — Door selector and Potion Pantry

Source brief: `.kiro/steering/adventure-overhaul.md` (Phase 2, Pantry only). Clocktower Gate
is out of scope until this route has been played and reviewed.

## Phase 1 follow-ups (done first)

1. Phone: after **Inspect**, the patch choices show on the same screen as the counter, and
   the verified payoff does not jump the page.
2. Keyboard: the next Tab after Buy Now reaches the repair (counter is last in the sandbox).
   Passing over Add to Cart no longer finds its curse; trying Enter or Space does.
3. **Start over** asks for confirmation (Cancel is the default and keeps the save).
4. Hover states keep text contrast (global `button:hover` no longer out-ranks component rules).

## Route and saves

1. Rooms: Midnight Checkout, Potion Pantry, Clocktower Gate (shown, not built).
2. A compact door selector shows each door as Cleared, Open, Locked, or Coming later, in words
   and icons, with one action per door.
3. Doors unlock from verified progress: the Pantry opens when all four Checkout curses are
   verified and the order is placed.
4. Saves move to schema version 2 under the same key. Version 1 saves migrate with
   discoveries, repairs, verification, and hints kept; a finished version 1 save earns the key.
5. Reset is per room and saved at once. Start over clears every room.

## Potion Pantry

1. Goal: brew a lantern potion from a three-ingredient recipe (Moonpetal, Ember salt, Glowcap).
2. Defect (sandbox): ingredient jars are told apart by color alone and have no accessible
   names (WCAG 1.4.1, 4.1.2).
3. Repair: reveal each jar's symbol and visible name; the name is the button text (2.5.3).
   Verification checks every jar for a rendered label contained in its accessible name.
4. Payoff: the repaired jars add ingredients; the cauldron fills and changes color; a wrong
   ingredient turns it murky, blocks further additions, and can be removed at once.
5. Lenses: Normal, Screen Reader X-Ray, Grayscale.
6. Completion: bottle the potion beside the cauldron, then a room summary naming the next door.
7. Hints: three clues, one at a time. Reduced motion: same outcomes, instant.
