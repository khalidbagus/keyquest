# KeyQuest Devpost draft

Draft copy for the existing Kiroween entry. Not a final submission. Application and video links are deliberately omitted; add only verified public URLs later.

## Project name

KeyQuest: The Haunted Accessibility Lab

## Elevator pitch

Lift the curse of inaccessible interfaces: discover, understand, repair, and verify real accessibility barriers in a haunted checkout.

## Category

Costume Contest

## Inspiration

A checkout can look polished while quietly excluding people. If focus disappears, a control responds only to clicks, an icon has no name, or a price is hard to read, a routine purchase becomes an obstacle. KeyQuest turns that everyday problem into a haunted repair mission. The frightening part is the barrier; progress comes from understanding and removing it.

## What it does

KeyQuest is a browser-based accessibility learning game for developers, designers, and students. Players enter the fictional Midnight Checkout and follow a practical loop: discover, understand, repair, verify, and escape.

The challenge includes invisible focus, mouse-only activation, a missing accessible name, and insufficient text contrast. Each can be discovered directly in the Repair Studio, so a learner does not have to experience the full barrier to participate. The studio explains its impact, compares broken and repaired code, applies a real DOM or style change, and displays verification evidence. Completion requires all four repairs to be verified.

Three progressive hints per defect, saved progress, restoration, reset confirmation, and an emergency exit support the journey. The application also includes loading/retry UI, challenge render-error recovery, responsive layouts, and reduced-motion support. It has one complete level, no backend, and no user accounts.

## How we built it

React 19 and TypeScript provide the client application, with Vite for development/builds and CSS Modules for styling. React Context and a reducer track game phases, discoveries, repairs, verification, and hints. A validated, versioned localStorage record preserves progress in the browser.

The application shell surrounds a clearly labeled Challenge Sandbox. RepairEngine updates actual event listeners, semantic attributes, and styles; VerificationEngine checks keyboard activation, naming attributes, computed focus styles, and contrast. These deterministic checks produce structured feedback instead of awarding progress for a button click alone. Saved repairs are reapplied when the challenge mounts. An error boundary remounts sandbox and studio together, while a real dynamic-import boundary supports game-module loading and failure recovery.

The haunted theme gives the repair work a purpose: an ordinary checkout becomes the cursed environment, the studio supplies the explanation, and verified improvements move the player toward escape. The theme supports the interaction rather than substituting for it.

## How Kiro was used

Kiro IDE was the primary development environment; the developer used Claude Opus 4.5. The project followed a requirements-first workflow, preserving its specification, design, implementation tasks, and steering instructions in the root `.kiro/` directory.

The requirements describe the player journey and acceptance criteria for actual DOM repairs, verified progress, persistence, and recovery. The design describes components, state models, repair/verification contracts, and validation strategy. The task breakdown ties implementation work to those requirements. Steering documents keep product scope, accessibility boundaries, visual direction, project structure, and quality expectations available during development.

Kiro supported core implementation, repair/verification work, state and recovery integration, testing, and engineering review. The repository also includes configured hooks for save-time linting, advisory accessibility review, and post-task typecheck/unit tests; a read-only accessibility-auditor definition; and Playwright MCP configuration. These files demonstrate configuration, not proof that every configured automation ran. Historical task checkboxes and planning assumptions are preserved rather than rewritten to manufacture a complete audit trail.

Additional ChatGPT/Codex assistance contributed review, hardening, validation, and publication preparation. Kiro is not claimed as the exclusive author. No Kiro Crew, Powers, or completed property-based testing campaign is claimed. React/Vite starter structure and open-source dependencies are disclosed in the repository notices.

## Challenges we ran into

The central engineering challenge was separating deliberately inaccessible teaching examples from a usable surrounding application. Discovery needed an accessible alternative, and verified progress needed to reflect actual interface changes. Restoring progress also required restoring DOM repairs, not just displaying saved badges.

Recovery introduced another challenge: sandbox and studio needed to remount together while keeping discoveries, repairs, and hints. Loading needed a real application-module boundary rather than an artificial delay. Cross-browser review exposed focus behavior differences and scan instability; focused corrections were verified without treating every browser failure as an external library defect.

## Accessibility methodology

The intentional sandbox is explicitly labeled. Tests inspect shell states separately, confirm selected intentional failures before repair, and exercise keyboard navigation, focus, startup, persistence, hints, reset, recovery, and completion. Vitest covers state and components; Playwright and axe-core provide browser and automated accessibility checks.

During publication review, 60 unit tests and 78 Chromium E2E tests passed, along with build and lint checks at the inspected source baseline. This is not a claim of universal accessibility or a complete cross-browser pass. The name verifier uses DOM heuristics; computed focus checks cannot prove all visual conditions. Automated scans can also contain incomplete checks.

## Accomplishments

- A complete four-defect educational loop with real interface repairs and observable evidence.
- Progressive hints and persistence that support exploration without requiring every barrier to be experienced.
- A coherent haunted checkout and repair-studio experience with recovery and reduced-motion controls.
- Inspectable Kiro specifications and workflow artifacts alongside implementation and meaningful browser tests.

## What we learned

Keeping discovery, applied repair, and verified progress separate makes the educational feedback more honest. Accessibility is behavioral as well as visual: a control must work from the keyboard and expose its purpose, not merely look repaired. Browser-specific focus behavior and incomplete scan results reinforced the need for precise evidence and manual review beyond an automated pass count.

## Known limitations

Manual NVDA/VoiceOver, comprehensive zoom/reflow, and focus-clipping checks remain pending. The prior engineering matrix reports a Firefox native crash during an axe scan and incomplete full WebKit results; focused regressions are separate evidence, not a substitute for a full passing matrix. Parallel scans have shown instability.

A failed repair verification currently lacks an individual retry control; resetting the challenge clears that state and progress. Escape from the restore dialog starts fresh. The v1.0 release does not claim full WCAG compliance or certification.

## What's next

Preserve v1.0 as a reproducible baseline, then prioritize manual accessibility validation and browser compatibility review. Later possibilities include visual refinements and additional educational scenarios. These are future plans, not features implemented during release preparation.

## Built with

Kiro IDE, React, TypeScript, Vite, CSS Modules, localStorage, Vitest, Testing Library, Playwright, axe-core.

## Submission links and status

- GitHub: add the verified public repository after approved publication; no unverified URL is supplied here.
- Application URL: deferred.
- YouTube demo: deferred.
- Existing draft editor: https://devpost.com/submit-to/31667-kiroween-2026/manage/submissions/1303156-keyquest-the-haunted-accessibility-lab/edit
- Preview observed in the editor: https://devpost.com/software/keyquest-the-haunted-accessibility-lab (not proof of public publication).
- Status: draft only, 2/5 steps complete at the last observation. Overview, pitch, story, four technology tags, category, Kiro explanation, disclosures, testing notes and cover thumbnail were saved. Personal entrant declarations/feedback and verified GitHub URL remain to be entered; application/video links are deferred. Optional gallery upload was not verified before browser disconnection. Do not press final Submit during this preparation.
