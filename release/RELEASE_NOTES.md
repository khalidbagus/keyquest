# KeyQuest v1.0.0

The first public checkpoint of **KeyQuest: The Haunted Accessibility Lab**, an educational browser game built for the Kiroween 2026 Costume Contest category.

## Included

- One haunted checkout with four real accessibility defects and DOM-backed repairs.
- Repair Studio with explanations, code comparisons, deterministic verification, and completion summary.
- Progressive hints, browser-local progress restoration, reset confirmation, and Emergency Exit.
- Application loading/retry UI, challenge render-error recovery, reduced-motion support, and responsive styling.
- Professional README, real screenshots, original AI-generated promotional cover, MIT project licensing, and third-party notices.
- Preserved Kiro specifications, steering, hooks, agent instructions, and MCP configuration.
- CI configuration for lint, types, unit tests, build, and serial Chromium browser/accessibility tests; no deployment workflow.

## Verification

Publication review independently passed build, lint, 60 unit tests, and 78 Chromium browser tests at source baseline `5c0e8e4`. Typecheck, fresh lockfile installation, and production startup/retry smoke checks also passed during release preparation. Hosted CI status must be checked after publication; Firefox/WebKit are not claimed as a complete new passing matrix.

## Known limitations

Manual screen-reader, zoom/reflow, and focus-clipping checks are pending. Historical Firefox axe crashes, incomplete full WebKit validation, and parallel scan instability remain documented. A failed repair verification has no individual retry action; challenge reset clears progress. Escape from the restore dialog starts fresh.

Production dependency audit reported zero vulnerabilities; full audit reported seven moderate findings arising from a development-tool `minimatch` advisory. No forced dependency changes were applied.

This is a source release, not a hosted application or completed hackathon entry. The application URL and public YouTube demonstration are deferred. No full WCAG conformance or certification is claimed.
