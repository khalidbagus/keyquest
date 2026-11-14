# Design System

## Typography

Use system font stack for performance and familiarity:

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
```

**Scale:**
| Role | Size | Weight |
|------|------|--------|
| h1 | 2rem | 700 |
| h2 | 1.5rem | 600 |
| h3 | 1.25rem | 600 |
| Body | 1rem | 400 |
| Small | 0.875rem | 400 |

Line height: 1.5 for body text, 1.2 for headings.

## Colors

**Core Palette:**
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | #1a1a2e | App background (dark theme) |
| `--color-surface` | #16213e | Cards, panels |
| `--color-primary` | #e94560 | Primary actions, highlights |
| `--color-secondary` | #0f3460 | Secondary elements |
| `--color-text` | #eaeaea | Body text |
| `--color-text-muted` | #a0a0a0 | Secondary text (ensure 4.5:1) |
| `--color-success` | #4ade80 | Verified repairs |
| `--color-warning` | #fbbf24 | Hints, cautions |
| `--color-error` | #f87171 | Errors, unrepaired |

**Focus indicator:** `#005fcc` (3:1 against dark backgrounds)

All text colors must meet WCAG AA contrast against their background.

## Spacing

Use 4px base unit:

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |

## Interactive Elements

- Minimum touch target: 44×44px
- Button padding: `--space-2` vertical, `--space-4` horizontal
- Border radius: 4px for buttons, 8px for cards
- Focus outline: 3px solid, 2px offset

## Animation Limits

**Allowed:**
- Transitions under 200ms for hover/focus states
- Fade in/out for notifications (respect reduced motion)

**Not allowed:**
- Continuous animations
- Parallax or scroll-triggered effects
- Motion that conveys critical information

**Reduced motion behavior:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Responsive Behavior

**Breakpoints:**
| Name | Width |
|------|-------|
| Mobile | < 640px |
| Tablet | 640px – 1024px |
| Desktop | > 1024px |

**Layout rules:**
- Single column on mobile
- Side-by-side sandbox + repair studio on tablet+
- Max content width: 1200px, centered
- Maintain 44px touch targets at all sizes

## Tone and Voice

- **Educational, not condescending** — Explain why, not just what
- **Encouraging** — Celebrate repairs, don't punish mistakes
- **Concise** — Short sentences, clear labels
- **Spooky-fun** — Light Halloween theming without being scary

**Example copy:**
- ✓ "You found a ghost! This button has no visible focus indicator."
- ✗ "Error: Focus indicator missing. This is a WCAG 2.4.7 violation."

## Sandbox Visual Distinction

The Challenge Sandbox must be visually distinct:
- Dashed or glowing border
- Slightly different background tone
- Visible disclaimer text above
- "Haunted" aesthetic (cobwebs, fog) if adding polish
