# KeyQuest: The Haunted Accessibility Lab

## Product Purpose

An educational browser game that teaches web accessibility by having players discover and repair real accessibility defects. Players learn by doing—fixing actual DOM/CSS issues and verifying improvements through computed style inspection.

## Target Audience

- Frontend developers learning accessibility
- UX designers building inclusive interfaces
- Students and bootcamp learners
- Teams onboarding to accessibility practices

## Core Gameplay Loop

1. Enter the Challenge Sandbox containing the "Midnight Checkout" UI
2. Discover four intentional accessibility defects through interaction
3. Apply repairs that modify actual DOM attributes and styles
4. Verify fixes via real computed style and behavior checks
5. Complete the level with educational feedback on WCAG criteria

## Costume Contest Positioning

This project is a **Kiroween Hackathon** entry for the Costume Contest category. The theme combines:
- Halloween/haunted aesthetic ("The Haunted Accessibility Lab")
- Educational value through gamified learning
- Technical demonstration of accessibility verification

## The Four Defects

| Defect | Problem | Repair | WCAG |
|--------|---------|--------|------|
| Invisible Focus | `outline: none` with no alternative | Add `:focus-visible` styles | 2.4.7 |
| Mouse-Only Activation | Click handler on div, no keyboard | Add keydown + role="button" | 2.1.1 |
| Missing Accessible Name | Icon button with no label | Add `aria-label` | 4.1.2 |
| Insufficient Contrast | #999 on white (2.85:1) | Change to #595959 (7:1) | 1.4.3 |

## MVP Scope

**Included:**
- Single level (Midnight Checkout)
- Four defects with discovery → repair → verify flow
- Progress persistence via localStorage
- Emergency exit (Escape key)
- Hint system with 3 progressive levels
- Level completion summary

**Excluded (Post-MVP):**
- Additional challenge levels
- Score/statistics tracking
- Leaderboards or social features
- User accounts or backend services
- Deep-dive educational content links
