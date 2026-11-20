# Design System (v2 Twilight-Plum Apothecary)

## Typography

Use a friendly storybook display stack for primary titles with system UI sans-serif for crisp body copy and monospace for WCAG code snippets:

```css
--font-display: 'Fredoka', 'Trebuchet MS', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
--font-mono: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
```

**Scale:**
| Role | Size | Weight |
|------|------|--------|
| h1 | 2rem | 700 |
| h2 | 1.5rem | 700 |
| h3 | 1.25rem | 700 |
| Body | 1rem | 400 |
| Small | 0.875rem | 400 |

Line height: 1.5 for body text, 1.2 for headings.

## Colors

**Core Twilight-Plum Apothecary Palette (WCAG 2.1 AA Verified):**
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#181124` | App nocturnal plum canvas |
| `--color-bg-deep` | `#110c1b` | Deep inset surfaces, code blocks, header/footer |
| `--color-surface` | `#231936` | Cards, panels, solid Midnight Checkout counter |
| `--color-surface-elevated` | `#2e2147` | Hover & selected surfaces, Costume Locker cards |
| `--color-primary` | `#c93050` | Primary actions, Buy Now CTA (≥ 4.7:1 with `#ffffff`) |
| `--color-secondary` | `#322252` | Secondary actions, Discover, Hint controls |
| `--color-border` | `#4b386e` | Storybook card framing |
| `--color-text` | `#f7f0fc` | Primary text (> 14:1 on `#231936`) |
| `--color-text-muted` | `#c8badf` | Secondary text (> 7.4:1 on `#231936`) |
| `--color-success` | `#4ade80` | Verified repairs, purified curses |
| `--color-warning` | `#fbbf24` | Lantern gold accents, hints, cautions |
| `--color-error` | `#dc2626` | Emergency exit, error states (4.8:1 with `#ffffff`) |
| `--surface-stage-bg` | `#ece0f7` | Lit moonlit medallion behind dark-outlined Rive mascots |

**Focus indicator:** `#7dd3fc` (≥ 8:1 against dark plum surfaces, 3px solid, 2px offset).

All text colors in the App Shell must meet WCAG AA contrast against their background.

## Spacing

Use 4px base unit (`--space-1` through `--space-10`).

## Interactive Elements

- Minimum touch target: 44×44px
- Border radius: 6px for buttons, 12px for cards, 18px for hero/sandbox containers
- Focus outline: 3px solid `#7dd3fc`, 2px offset

## Animation & Rive Mascot Policy

**Allowed:**
- UI transitions under 200ms for hover/focus states
- Decorative Rive mascot performances (`idle`, `greet`, `celebrate`, `reactFailure`, `requestAttention`, `reset`) rendered on `<canvas aria-hidden="true">` with paired `aria-live="polite"` text parity

**Not allowed:**
- Parallax or scroll-triggered effects
- Motion that conveys critical information without text parity
- Unstoppable animations that ignore reduced motion

**Reduced motion behavior:**
- Respects both `prefers-reduced-motion: reduce` and the persistent manual footer toggle (`ReducedMotionProvider`)
- Immediately sets `viewModelInstance.boolean('reducedMotion').value = true` on all mounted Rive mascots, switching them to static `reducedIdle` / `reducedSuccess` / `reducedFailure` poses and suppressing `Lantern Search` motion
- Disables CSS animations/transitions via `[data-reduced-motion='true']`

## Responsive Behavior

**Breakpoints:**
| Name | Width |
|------|-------|
| Mobile | < 640px |
| Tablet | 640px – 960px |
| Desktop | > 960px |

**Layout rules:**
- Single column on mobile; split hero + 2-column command deck + side-by-side sandbox & repair studio on desktop
- Max content width: 1240px, centered
- Maintain 44px touch targets and zero horizontal overflow at 375×667, 768×1024, and 1024×600

## Sandbox Visual Distinction

The Challenge Sandbox must remain visually distinct:
- Dashed lantern-gold border transitioning to solid emerald once all 4 curses are purified
- Solid background colors (`#140d21` sandbox container, `#231936` Midnight Checkout card) with NO CSS gradients behind text so `axe-core` and `VerificationEngine` evaluate contrast deterministically
- Visible disclaimer banner above the checkout
- Accessible **Ghost Vision** gadget toolbar situated outside/above the sandbox boundary
