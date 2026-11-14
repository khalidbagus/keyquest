# Accessibility Guidelines

## Two Zones: Shell vs Sandbox

**App Shell** — Must meet WCAG 2.1 AA:
- All navigation, menus, hints, notifications, completion screens
- Run axe-core on shell; zero violations allowed

**Challenge Sandbox** — Intentionally broken (labeled):
- Contains four defects for educational purposes
- Clearly marked with visible disclaimer
- Announced to screen readers on entry
- Excluded from axe-core shell tests

## Semantic HTML

Use native elements for their intended purpose:
- `<button>` for actions, not `<div onClick>`
- `<nav>` for navigation regions
- `<main>` for primary content
- `<header>`, `<footer>` for landmarks
- Proper heading hierarchy: h1 → h2 → h3 (no skipping)

## Keyboard Navigation

All interactive elements in the app shell must be:
- Focusable via Tab key
- Activatable via Enter or Space (as appropriate)
- Operable without a mouse

Implement skip links to bypass navigation and reach main content.

## Focus Management

- **Visible focus indicators**: 3:1 contrast minimum against adjacent colors
- Use `:focus-visible` for keyboard-only focus styles
- Never use `outline: none` without an alternative indicator
- Manage focus on route changes—move focus to main content or heading
- Trap focus in modals until dismissed

## Emergency Exit

- Always-visible button with `data-testid="emergency-exit"`
- Escape key listener at document level
- Reachable within 5 Tab presses from any focusable element
- 44×44px minimum touch target

## Reduced Motion

Respect `prefers-reduced-motion: reduce`:
- Disable decorative animations
- Use instant transitions instead of animated ones
- Provide manual toggle in addition to system preference
- Never convey critical information only through animation

## Contrast Requirements

| Text Type | Minimum Ratio |
|-----------|---------------|
| Normal text (<18pt) | 4.5:1 |
| Large text (≥18pt or ≥14pt bold) | 3:1 |
| Focus indicators | 3:1 against adjacent colors |

## Sandbox Containment

Intentional defects must:
- Stay inside `[data-testid="challenge-sandbox"]`
- Have a visible disclaimer above them
- Be announced to screen readers on sandbox entry
- Never break app shell accessibility

The four defects are teaching tools, not bugs:
1. `defect-invisible-focus` — Missing focus indicator
2. `defect-mouse-only` — No keyboard activation
3. `defect-missing-name` — No accessible name
4. `defect-low-contrast` — Insufficient text contrast

## Screen Reader Announcements

Use aria-live regions for:
- Defect discovery notifications
- Repair success feedback
- Hint content display
- Level completion announcement

Prefer `aria-live="polite"` unless urgent.

## Testing

- Run `@axe-core/playwright` on app shell (exclude sandbox)
- Verify sandbox has expected violations before repair
- Verify sandbox passes axe after all repairs applied
- Manual testing with keyboard-only navigation
