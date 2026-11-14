# Project Structure

## Directory Layout

```
keyquest/
├── src/
│   ├── components/        # React components
│   ├── context/           # React Context providers
│   ├── engines/           # Core game logic (repair, verification)
│   ├── hooks/             # Custom React hooks
│   ├── registry/          # Static data (defects, hints)
│   ├── storage/           # localStorage adapter
│   ├── types/             # TypeScript interfaces
│   ├── views/             # Page-level components
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tests/
│   ├── unit/              # Vitest unit tests
│   ├── integration/       # Component integration tests
│   └── e2e/               # Playwright browser tests
├── public/                # Static assets
└── .kiro/                 # Specs and steering docs
```

## Directory Ownership

| Directory | Owns | Does Not Own |
|-----------|------|--------------|
| `components/` | UI rendering, event handlers | Business logic, state mutations |
| `context/` | Global state shape, reducers | DOM manipulation, storage I/O |
| `engines/` | Repair logic, verification checks | React rendering, UI concerns |
| `hooks/` | Reusable stateful logic | Direct DOM access outside effects |
| `registry/` | Static defect/hint definitions | Runtime state |
| `storage/` | localStorage read/write | Game logic decisions |
| `views/` | Page composition, routing | Reusable UI primitives |

## Boundary: Challenge Sandbox vs App Shell

The app has two distinct accessibility zones:

**App Shell** (WCAG 2.1 AA compliant):
- `components/AppShell/` - Header, navigation, footer
- `components/HintPanel/` - Hint button and display
- `components/Notifications/` - Aria-live announcements
- `views/` - Menu, completion screens

**Challenge Sandbox** (intentionally broken):
- `components/ChallengeSandbox/` - Container with disclaimer
- `components/MidnightCheckout/` - The defective checkout UI

Never mix accessible shell code with intentionally defective sandbox code.

## Boundary: Game State vs Verification

**Game State** (`context/`, `hooks/`):
- Tracks discovered, repaired, verified status
- Manages phase transitions (menu → challenge → completion)
- Handles persistence via StorageAdapter

**Verification** (`engines/VerificationEngine`):
- Inspects actual DOM via `getComputedStyle()`
- Returns pass/fail with detailed evidence
- Has no side effects on game state

**Repair** (`engines/RepairEngine`):
- Mutates sandbox DOM (adds classes, attributes, listeners)
- Does not decide if repair succeeded—verification does that

## Boundary: Presentation vs Logic

**Presentation** (`components/`, `views/`):
- Renders UI based on props/context
- Dispatches actions on user interaction
- Never contains business rules

**Logic** (`engines/`, `context/`, `registry/`):
- Defines what repairs do
- Defines what verification checks
- Pure functions where possible

## Test ID Convention

Use `data-testid` for Playwright targeting:

```
data-testid="start-challenge"      # Main menu start button
data-testid="emergency-exit"       # Always-visible exit button
data-testid="challenge-sandbox"    # Sandbox container
data-testid="defect-{type}"        # Defective element (e.g., defect-invisible-focus)
data-testid="repair-{type}"        # Repair button (e.g., repair-invisible-focus)
data-testid="hint-button"          # Hint request button
data-testid="level-complete"       # Completion screen
data-testid="reset-button"         # Reset progress button
data-testid="reset-confirm"        # Reset confirmation button
```
