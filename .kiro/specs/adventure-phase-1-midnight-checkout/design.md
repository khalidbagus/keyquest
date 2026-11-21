# Design: Adventure Phase 1 — Playable Midnight Checkout

## Baseline (Code Mode Playwright, before changes)

| Viewport | Observation |
| --- | --- |
| 1280×800 menu | Start button at y=402; briefing and four curse cards follow. |
| 1280×800 room | Buy Now at y=982, below the fold. 11 Tab stops before it. Four repair cards compete beside the sandbox. No stated objective. |
| 375×667 room | Sandbox starts at y=786, Buy Now at y=1655 in a 3345px page. Companion, hint, and Ghost Vision fill the first screen. |

## Layout

```
Header (KeyQuest · status · Exit)
Room header: "Room 1 · Nocturne Apothecary" / h2 Midnight Checkout / candles N of 4 / Costumes · Reset
Objective card: ghost medallion | h3 objective | instruction | one control | polite status
┌ left column ─────────────────────┐ ┌ right column ──────────────┐
│ Ghost Vision (compact radiogroup) │ │ Repair Studio (active curse)│
│ Sandbox                           │ │ Hint (one clue at a time)   │
│  containment bar + disclaimer     │ │ Room journal (<details>)    │
│  Counter: lantern · Buy Now · key │ └─────────────────────────────┘
│  Shopper's order: bag · candle ·  │
│  price · qty · Add to Cart · total│
└───────────────────────────────────┘
```

On phones the columns stack. The counter is the first row of the sandbox so the objective,
lantern, and Buy Now share the first screen.

## State

`ProgressState.checkout = { lanternLit, candleAdded, orderPlaced }` (schema version stays 1).
`StorageAdapter.loadProgress` fills a missing or malformed `checkout` with defaults.
`GameProvider` hydrates a valid, incomplete, meaningful save at startup without changing
phase or writing storage.

New reducer actions:

- `ROOM_ACTION { action: 'light-lantern' | 'add-candle' | 'place-order' }`, guarded in the
  reducer (lantern needs verified focus; order needs four verified repairs, lantern, candle).
- `HYDRATE_PROGRESS { progress }` for the startup load.

`COMPLETE_LEVEL` is dispatched by **Take the key**, not automatically.

`src/registry/roomRegistry.ts` holds objective copy and pure helpers:
`getCheckoutStage(progress)` and `getBuyNowOutcome(progress)`.

## Repair Studio

Shows one active curse (latest found, else first unverified found). Other found curses are
listed as switch buttons. States: choosing → checking → verified | check failed. Focus after
verification goes to the repaired control when focusable (Buy Now, Add to Cart, bag button),
otherwise to the result panel. A ref guard ignores repeat clicks while a check runs.

## Motion timeline (after a verified repair, then the player's use of it)

| Element | Role | Starts | Duration | Motion | Relationship |
| --- | --- | --- | --- | --- | --- |
| Patch button press | Feedback | 0ms | 120ms | scale 0.97 | — |
| Focus ring on Buy Now | Lead | on verify | 0ms | none (real CSS ring) | — |
| Candle pip | Support | on verify | 180ms | opacity + scale 0.9→1 | Together with ring |
| Ghost celebrate | Decoration | on verify | Rive | Rive trigger | After state change |
| Lantern glass + halo | Lead | on lantern press | 220ms | opacity crossfade | — |
| Status text | Support | on lantern press | 0ms | none | Together |
| Key on counter | Lead | on order placed | 420ms | opacity + 10px rise + scale 0.96→1 | Room-complete beat |

Reduced motion (system or footer toggle) removes durations via the existing global rule and
Rive switches to static poses.
