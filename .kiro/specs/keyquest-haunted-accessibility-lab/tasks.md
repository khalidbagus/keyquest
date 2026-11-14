# Implementation Plan: KeyQuest - The Haunted Accessibility Lab

## Overview

This implementation plan follows a vertical slice approach: first building one complete end-to-end feature (Invisible Focus defect → repair → verification → test), then expanding to remaining defects, adding persistence, polish, and release readiness.

**Technology Stack**: React 18 + TypeScript + Vite + Playwright + axe-core

---

## MVP Milestone

Tasks 1-4 constitute the **Minimum Viable Product**:
- Project setup with accessible app shell
- All four accessibility defects implemented
- All four repair mechanisms with real DOM verification
- Level completion flow
- Emergency exit functionality
- Playwright tests for all verification logic

---

## Kill-Scope Plan (Priority Order - Cut First to Last)

If falling behind schedule, cut in this order:

1. **Cut First**: Task 7 (Visual Polish) - animations, theming, decorative elements
2. **Cut Second**: Task 6.2-6.3 (Stretch Goals) - additional levels, statistics, deep-dives
3. **Cut Third**: Task 5.3 (Hint System) - can ship with simpler hints or none
4. **Cut Fourth**: Task 5.2 (Progress Restore UI) - can auto-restore without dialog
5. **Never Cut**: Tasks 1-4 core, Task 5.1 (basic persistence), Task 6.1 (accessibility tests)

---

## Tasks

- [ ] 1. Project Setup and Accessible App Shell
  - [ ] 1.1 Initialize Vite + React + TypeScript project
    - Create new Vite project with React-TS template
    - Configure TypeScript strict mode
    - Set up CSS Modules
    - Add ESLint + Prettier with accessibility rules
    - Run `npm run build` to verify setup
    - _Requirements: 1.1, 1.2, 18.5_

  - [ ] 1.2 Create accessible App Shell structure
    - Create `AppShell` component with semantic HTML (`<header>`, `<main>`, `<nav>`)
    - Implement skip links to bypass navigation
    - Add logical heading hierarchy (h1 → h2 → h3)
    - Ensure all interactive elements have visible focus indicators (3:1 contrast)
    - Add `data-testid` attributes per design spec
    - Run Playwright with axe-core to verify zero violations on app shell
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 18.1_

  - [ ] 1.3 Implement Game State Machine with Context
    - Create `GameStateProvider` with useReducer for state management
    - Implement state types: `loading`, `menu`, `challenge`, `completion`, `error`
    - Create `GameContext` with dispatch and state access
    - Implement state transitions per design state diagram
    - Write unit tests for state reducer transitions
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 1.4 Create Main Menu view
    - Implement `MainMenuView` component with "Start Challenge" button
    - Ensure button is keyboard-accessible with visible focus
    - Add `data-testid="start-challenge"` attribute
    - Connect to game state to trigger challenge start
    - Write Playwright test: menu renders and button is clickable
    - _Requirements: 2.1, 14.2, 14.6, 18.1_

  - [ ] 1.5 Implement Emergency Exit controller
    - Create `EmergencyExitButton` component with fixed positioning in header
    - Add global Escape key listener
    - Implement exit logic that preserves progress and returns to menu
    - Ensure button has 44x44px minimum touch target
    - Add `data-testid="emergency-exit"` attribute
    - Write Playwright test: Escape key from any state returns to menu
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 18.1_

  - [ ]* 1.6 Write property test for Emergency Exit reachability
    - **Property 4: Emergency Exit Reachability**
    - Verify emergency exit is reachable within 5 Tab presses from any focusable element
    - **Validates: Requirements 13.1, 13.2, 13.3**

- [ ] 2. Checkpoint - App Shell Complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify axe-core reports zero accessibility violations on app shell

- [ ] 3. Vertical Slice: Invisible Focus Defect (End-to-End)
  - [ ] 3.1 Create Challenge Sandbox container
    - Create `ChallengeSandbox` component with `role="region"` and aria-label
    - Add visible disclaimer: "This area contains intentional accessibility defects for educational purposes"
    - Add visual boundary styling distinct from app shell
    - Add `data-testid="challenge-sandbox"` attribute
    - Announce sandbox entry to screen readers via aria-live
    - Write Playwright test: sandbox renders with disclaimer visible
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 18.2_

  - [ ] 3.2 Implement Midnight Checkout UI scaffold
    - Create `MidnightCheckout` component with product display, quantity, cart elements
    - Add placeholder elements for all four defect locations
    - Include "Buy Now" button placeholder for Invisible Focus defect
    - Style as a checkout interface (product image, price, quantity, buttons)
    - _Requirements: 2.1, 2.3_

  - [ ] 3.3 Implement Invisible Focus defect
    - Create `DefectiveBuyButton` component with intentionally hidden focus (`outline: none`)
    - Add `data-testid="defect-invisible-focus"` attribute
    - Ensure element is focusable via Tab but shows no visual indicator
    - Document defect in code comments for educational context
    - Write Playwright test: verify element is focusable but has `outline: none`
    - _Requirements: 2.3, 18.2, 18.3_

  - [ ] 3.4 Create Defect Registry
    - Create `DefectRegistry` module with defect definitions per design spec
    - Define `DefectDefinition` interface with type, selector, description, wcagCriteria
    - Initialize registry with Invisible Focus defect
    - Export defect lookup and state tracking functions
    - Write unit tests for registry operations
    - _Requirements: 2.3, Correctness Property 5_

  - [ ] 3.5 Implement discovery mechanism
    - Create `useDefectDiscovery` hook for tracking defect interactions
    - Implement discovery trigger when player focuses the defective element
    - Update defect state to `discovered: true` with timestamp
    - Write unit test for discovery state transition
    - _Requirements: 3.1, 3.4_

  - [ ] 3.6 Create notification system for discoveries
    - Create `NotificationSystem` component with aria-live region
    - Implement `DiscoveryNotification` with defect type, element info, educational context
    - Display notification when defect is discovered
    - Ensure notifications are announced to screen readers
    - Write Playwright test: notification appears and contains expected content
    - _Requirements: 3.2, 3.3, 3.5_

  - [ ] 3.7 Create Repair Studio UI
    - Create `RepairStudio` component showing defect cards
    - Create `RepairCard` component with discovery status, repair button, verification status
    - Add `data-testid="repair-invisible-focus"` to repair button
    - Display educational feedback area for post-repair explanations
    - Wire up to game state for status tracking
    - _Requirements: 4.4, 18.1_

  - [ ] 3.8 Implement RepairEngine for Invisible Focus
    - Create `RepairEngine` class with `applyRepair(defectType)` method
    - Implement `repairInvisibleFocus()` that adds `keyquest-focus-repaired` class
    - Create CSS with `.keyquest-focus-repaired:focus-visible` styles (3px outline, #005fcc)
    - Store original styles for potential reset
    - Write unit test: applying repair adds expected class
    - _Requirements: 4.1, 4.2, 4.3, 18.3_

  - [ ] 3.9 Implement VerificationEngine for Focus Indicator
    - Create `VerificationEngine` class with `verifyFocusIndicator(element)` method
    - Focus element programmatically and read `getComputedStyle()` for outline/box-shadow
    - Return `VerificationResult` with pass/fail and detailed breakdown
    - Write unit test with JSDOM: verification detects presence/absence of outline
    - _Requirements: 8.1, 8.2, 8.6_

  - [ ]* 3.10 Write property test for Focus Indicator Visibility
    - **Property 8: Focus Indicator Visibility Verification**
    - Verify that after repair, getComputedStyle returns visible focus styles when focused
    - **Validates: Requirements 4.1, 4.2, 8.2**

  - [ ] 3.11 Connect repair flow end-to-end
    - Wire RepairStudio repair button to RepairEngine
    - After repair, automatically trigger VerificationEngine
    - Update game state with verification result
    - Display educational feedback from design spec
    - Write Playwright test: full repair flow from button click to verification pass
    - _Requirements: 4.1, 4.4, 8.1_

  - [ ] 3.12 Write independent Playwright verification test
    - Create `tests/verification-focus.spec.ts`
    - Test before repair: element focused has `outline: none`
    - Test after repair: element focused has visible outline
    - Use only DOM inspection, no game internal access
    - _Requirements: 8.7, 18.4_

- [ ] 4. Checkpoint - Vertical Slice Complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify one complete defect → repair → verify flow works end-to-end

- [ ] 5. Remaining Three Defects
  - [ ] 5.1 Implement Mouse-Only Activation defect
    - Create `DefectiveAddButton` as `<div>` with onClick but no keyboard handlers
    - Element should NOT respond to Enter/Space keys
    - Add `data-testid="defect-mouse-only"` attribute
    - Add `tabindex="0"` so element is focusable but not activatable via keyboard
    - Write Playwright test: verify click works but keyboard does not
    - _Requirements: 2.3, 18.2_

  - [ ] 5.2 Implement Mouse-Only Activation repair
    - Add `repairMouseOnlyActivation()` to RepairEngine
    - Add keydown listener for Enter/Space that triggers click()
    - Add `role="button"` and ensure `tabindex="0"` present
    - Add `data-testid="repair-mouse-only"` to repair button
    - Write unit test: after repair, synthetic keydown triggers click handler
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 18.3_

  - [ ] 5.3 Implement VerificationEngine for Keyboard Activation
    - Add `verifyKeyboardActivation(element)` method
    - Dispatch synthetic Enter keydown event and check if click handler fires
    - Return verification result with enterKeyWorks, spaceKeyWorks booleans
    - Write Playwright test: independent verification of keyboard activation
    - _Requirements: 8.1, 8.3, 8.7_

  - [ ]* 5.4 Write property test for Keyboard Activation Equivalence
    - **Property 7: Keyboard Activation Equivalence**
    - Verify Enter, Space, and click all trigger identical behavior after repair
    - **Validates: Requirements 5.1, 5.2**

  - [ ] 5.5 Implement Missing Accessible Name defect
    - Create `DefectiveCartIcon` button with only an SVG icon, no text or aria-label
    - Ensure element has no accessible name (aria-label, aria-labelledby, title, textContent)
    - Add `data-testid="defect-missing-name"` attribute
    - Write Playwright test: verify aria-label is null/empty
    - _Requirements: 2.3, 18.2_

  - [ ] 5.6 Implement Missing Accessible Name repair
    - Add `repairMissingAccessibleName()` to RepairEngine
    - Add `aria-label="View shopping cart"` to element
    - Add `data-testid="repair-missing-name"` to repair button
    - Write unit test: after repair, element has non-empty aria-label
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 18.3_

  - [ ] 5.7 Implement VerificationEngine for Accessible Name
    - Add `verifyAccessibleName(element)` method
    - Check aria-label, aria-labelledby, title, textContent for computed name
    - Return verification result with computedName and nameSource
    - Write Playwright test: independent verification of accessible name
    - _Requirements: 8.1, 8.4, 8.7_

  - [ ]* 5.8 Write property test for Accessible Name Non-Empty
    - **Property 9: Accessible Name Non-Empty**
    - Verify that after repair, computed accessible name is non-empty string
    - **Validates: Requirements 6.1, 6.2, 8.4**

  - [ ] 5.9 Implement Insufficient Contrast defect
    - Create `DefectivePriceText` with color `#999999` on white background (~2.85:1 ratio)
    - Add `data-testid="defect-low-contrast"` attribute
    - Write Playwright test: verify computed color is `#999999` or equivalent
    - _Requirements: 2.3, 18.2_

  - [ ] 5.10 Implement Insufficient Contrast repair
    - Add `repairInsufficientContrast()` to RepairEngine
    - Change element color to `#595959` (7:1 ratio against white)
    - Store original color in `data-original-color` attribute
    - Add `data-testid="repair-low-contrast"` to repair button
    - Write unit test: after repair, color style is updated
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 18.3_

  - [ ] 5.11 Implement VerificationEngine for Contrast Ratio
    - Add `verifyContrastRatio(element)` method
    - Get computed foreground and background colors
    - Implement contrast ratio calculation per WCAG algorithm
    - Check against 4.5:1 for normal text, 3:1 for large text
    - Write Playwright test: independent verification of contrast ratio
    - _Requirements: 8.1, 8.5, 8.7_

  - [ ]* 5.12 Write property test for Contrast Ratio Threshold
    - **Property 10: Contrast Ratio Threshold**
    - Verify computed contrast ratio meets 4.5:1 (or 3:1 for large text) after repair
    - **Validates: Requirements 7.1, 7.2, 8.5**

  - [ ] 5.13 Update Defect Registry with all defects
    - Add Mouse-Only Activation, Missing Accessible Name, Insufficient Contrast to registry
    - Update Repair Studio to display all four defect cards
    - Wire all repairs to RepairEngine and VerificationEngine
    - Write integration test: all four defects discoverable and repairable
    - _Requirements: 2.3, Correctness Property 5_

  - [ ]* 5.14 Write property test for Defect Count Invariant
    - **Property 5: Defect Count Invariant**
    - Verify total (unrepaired + repaired) defects always equals exactly 4
    - **Validates: Requirements 2.3**

- [ ] 6. Checkpoint - All Defects Complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all four defects work independently and together

- [ ] 7. Level Completion Flow
  - [ ] 7.1 Implement completion detection
    - Track verification status for all four defects in game state
    - Detect when all four are verified as passed
    - Dispatch `COMPLETE_LEVEL` action to trigger transition
    - Write unit test: completion triggers when all four verified
    - _Requirements: 9.1_

  - [ ] 7.2 Create Level Completion view
    - Create `CompletionView` component with success message
    - Display summary of all four repaired defects with explanations
    - List accessibility concepts learned (WCAG criteria)
    - Add aria-live announcement for screen readers
    - Add `data-testid="level-complete"` attribute
    - Write Playwright test: completion screen renders with all defect summaries
    - _Requirements: 9.2, 9.3, 9.4, 18.1_

  - [ ] 7.3 Add completion navigation options
    - Add "Replay Level" button that resets and restarts challenge
    - Add "Return to Menu" button
    - Ensure buttons are keyboard-accessible
    - Write Playwright test: navigation buttons work correctly
    - _Requirements: 9.5_

- [ ] 8. Checkpoint - Core Game Complete
  - Ensure all tests pass, ask the user if questions arise.
  - Full game loop: menu → challenge → all repairs → completion → menu

- [ ] 9. Persistence System
  - [ ] 9.1 Create StorageAdapter
    - Implement `StorageAdapter` class with availability check
    - Implement `saveProgress()`, `loadProgress()`, `clearProgress()` methods
    - Use localStorage key `keyquest-progress-v1` with schema versioning
    - Handle quota exceeded and storage disabled gracefully
    - Write unit tests for all storage operations
    - _Requirements: 12.1, 12.6_

  - [ ] 9.2 Implement auto-save with debouncing
    - Create `useAutoSave` hook that saves progress on state changes
    - Debounce saves to 500ms to avoid excessive writes
    - Save on defect discovery, repair application, verification
    - Write integration test: progress state saved within 1 second of change
    - _Requirements: 12.1, Correctness Property 3_

  - [ ] 9.3 Implement progress restoration
    - On app load, check for existing progress in localStorage
    - If found, show dialog: "Restore previous session?" with Restore/Start Fresh options
    - On restore, reapply all repairs to DOM and restore game state
    - On start fresh, clear localStorage and begin new session
    - Write Playwright test: restoration flow works correctly
    - _Requirements: 12.2, 12.3, 12.4, 12.5_

  - [ ]* 9.4 Write property test for Progress State Consistency
    - **Property 3: Progress State Round-Trip Consistency**
    - Verify save → restore → reapply produces equivalent DOM state
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.5**

  - [ ] 9.5 Implement storage unavailable fallback
    - Display persistent banner when localStorage unavailable
    - Continue game without persistence functionality
    - Ensure all other features work without storage
    - Write Playwright test: game functions when localStorage blocked
    - _Requirements: 12.6_

- [ ] 10. Checkpoint - Persistence Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Reset and Progress Management
  - [ ] 11.1 Implement reset functionality
    - Add reset option to main menu and challenge view
    - Create confirmation dialog with keyboard-accessible buttons
    - Ensure dialog is focus-trapped
    - Add `data-testid="reset-button"` and `data-testid="reset-confirm"` attributes
    - Write Playwright test: reset flow with confirmation
    - _Requirements: 11.1, 11.2, 11.6, 18.1_

  - [ ] 11.2 Implement DOM reset
    - Restore all four defects to unrepaired state
    - Remove repair classes, attributes, and event listeners
    - Clear progress from localStorage
    - Return to challenge start state
    - Write integration test: DOM state matches initial state after reset
    - _Requirements: 11.3, 11.4, 11.5_

  - [ ]* 11.3 Write property test for Repair Persistence
    - **Property 1: Repair Persistence Across Re-renders**
    - Verify repairs persist through re-renders until explicit reset
    - **Validates: Requirements 4.3, 5.3, 6.3, 7.3**

- [ ] 12. Hint System
  - [ ] 12.1 Create HintDefinition data
    - Define 3 levels of hints for each defect type per design spec
    - Level 1: General guidance
    - Level 2: Specific direction
    - Level 3: Direct answer
    - Store in hint registry module
    - _Requirements: 10.3, 10.4_

  - [ ] 12.2 Implement Hint Panel UI
    - Create `HintPanel` component with hint button
    - Ensure button is always visible and keyboard-accessible
    - Add `data-testid="hint-button"` attribute
    - Display hint text when requested
    - Announce hints to screen readers via aria-live
    - Write Playwright test: hint button accessible and functional
    - _Requirements: 10.1, 10.2, 10.5, 18.1_

  - [ ] 12.3 Implement progressive hint system
    - Track hint level per defect in game state
    - Show contextual hint based on current progress (undiscovered vs discovered vs repair attempted)
    - Increment hint level with each request (max level 3)
    - Track hint usage in progress state without penalizing completion
    - Write unit test: hint progression logic
    - _Requirements: 10.2, 10.3, 10.4, 10.6_

  - [ ]* 12.4 Write property test for Hint Progression
    - **Property 6: Hint Progression**
    - Verify hint level increases monotonically from 0 to 3, stays at 3 thereafter
    - **Validates: Requirements 10.3, 10.4**

- [ ] 13. Checkpoint - Full Feature Set
  - Ensure all tests pass, ask the user if questions arise.
  - All requirements 1-13 implemented

- [ ] 14. Error Handling
  - [ ] 14.1 Implement Error Boundary
    - Create `ErrorBoundary` component wrapping ChallengeSandbox
    - Capture errors and preserve progress state before displaying error
    - Display user-friendly error message with recovery options
    - Ensure error UI is accessible with proper ARIA roles
    - Write integration test: error boundary catches errors and preserves progress
    - _Requirements: 17.1, 17.2, 17.4_

  - [ ] 14.2 Add recovery options
    - Provide "Retry" option to re-render failed component
    - Provide "Reset Sandbox" to clear sandbox but keep progress
    - Provide "Return to Menu" to exit safely
    - Focus management after error recovery
    - Write Playwright test: recovery options function correctly
    - _Requirements: 17.3, 17.5_

  - [ ] 14.3 Implement loading error handling
    - Display error message if assets fail to load
    - Provide retry button
    - Write Playwright test: retry after load failure
    - _Requirements: 1.4_

- [ ] 15. Accessibility Enhancements
  - [ ] 15.1 Implement Loading States
    - Add loading indicator within 100ms of initial render
    - Show progress indicator during asset loading
    - Transition to main menu within 500ms of load complete
    - Make loading indicator accessible via aria-live
    - Write Playwright test: loading states render and transition
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [ ] 15.2 Implement Reduced Motion support
    - Create `usePrefersReducedMotion` hook
    - Add CSS media query for `prefers-reduced-motion: reduce`
    - Disable animations when system preference set
    - Add manual toggle in settings (persisted to localStorage)
    - Ensure no critical info conveyed only through animation
    - Write Playwright test: animations disabled when preference set
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ] 15.3 Implement Audio Independence
    - Ensure no audio required for any gameplay
    - If optional audio added, provide visual equivalents
    - Add mute toggle persisted across sessions
    - Write verification: all flows completable without audio
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [ ] 16. Comprehensive Accessibility Testing
  - [ ] 16.1 Run axe-core on all app shell views
    - Test main menu
    - Test challenge view (excluding sandbox)
    - Test completion view
    - All must pass with zero violations
    - _Requirements: 14.1_

  - [ ] 16.2 Verify sandbox has expected defects before repair
    - Run axe-core on sandbox only
    - Confirm color-contrast violation present
    - Confirm button-name violation present
    - _Requirements: 2.3, 8.7_

  - [ ] 16.3 Verify sandbox passes axe after all repairs
    - Apply all four repairs
    - Run axe-core on sandbox
    - Confirm zero violations
    - _Requirements: 8.7_

  - [ ]* 16.4 Write property test for Verification Accuracy
    - **Property 2: Verification Reflects Actual DOM State**
    - Verify passing verification implies DOM contains expected attributes/styles
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [ ] 17. Checkpoint - All Features Complete
  - Ensure all tests pass, ask the user if questions arise.
  - All 18 requirements implemented and tested

- [ ] 18. Visual Polish [OPTIONAL]
  - [ ] 18.1 [OPTIONAL] Add Halloween/haunted theming
    - Create spooky color palette
    - Add decorative elements (respecting reduced motion)
    - Style the Midnight Checkout as an abandoned/haunted shop
    - _Non-functional enhancement_

  - [ ] 18.2 [OPTIONAL] Add transition animations
    - Smooth transitions between game states
    - Notification enter/exit animations
    - Repair success celebration
    - All disabled when reduced motion preferred
    - _Non-functional enhancement_

  - [ ] 18.3 [OPTIONAL] Responsive design polish
    - Ensure layout works on mobile viewports
    - Touch target sizes verified (44x44px minimum)
    - _Requirements: 13.6_

- [ ] 19. Stretch Goals [OPTIONAL]
  - [ ] 19.1 [OPTIONAL] Add performance statistics
    - Track completion time
    - Track hint usage per defect
    - Display on completion screen
    - _Stretch Goal S2_

  - [ ] 19.2 [OPTIONAL] Add "Learn More" links
    - Link each defect to WCAG criteria documentation
    - Include code examples
    - _Stretch Goal S3_

  - [ ] 19.3 [OPTIONAL] Add additional levels
    - Design second challenge level with different defects
    - Implement level selection UI
    - _Stretch Goal S1_

- [ ] 20. Release Readiness
  - [ ] 20.1 Final test suite run
    - Run all unit tests
    - Run all integration tests
    - Run all Playwright E2E tests
    - Run all axe-core accessibility tests
    - Generate coverage report
    - _Requirements: 18.4_

  - [ ] 20.2 Production build verification
    - Run `npm run build`
    - Verify static output works without backend
    - Test built assets in clean environment
    - Verify all data-testid attributes present in production build
    - _Requirements: 18.5_

  - [ ] 20.3 Create README documentation
    - Document how to run the app
    - Document how to run tests
    - Document the intentional accessibility defects
    - Include accessibility disclaimer
    - _Documentation_

- [ ] 21. Final Checkpoint - Release Ready
  - Ensure all tests pass, ask the user if questions arise.
  - Application ready for deployment

---

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task includes explicit test requirements that must pass before completion
- Checkpoints (Tasks 2, 4, 6, 8, 10, 13, 17, 21) are validation gates
- Tasks in [OPTIONAL] sections (18, 19) can be skipped entirely if behind schedule
- All `data-testid` attributes are required for Playwright test targeting
- Property tests validate correctness properties from the design document

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5"] },
    { "id": 3, "tasks": ["1.6", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.4"] },
    { "id": 5, "tasks": ["3.3", "3.5", "3.6"] },
    { "id": 6, "tasks": ["3.7", "3.8"] },
    { "id": 7, "tasks": ["3.9", "3.10"] },
    { "id": 8, "tasks": ["3.11"] },
    { "id": 9, "tasks": ["3.12"] },
    { "id": 10, "tasks": ["5.1", "5.5", "5.9"] },
    { "id": 11, "tasks": ["5.2", "5.6", "5.10"] },
    { "id": 12, "tasks": ["5.3", "5.7", "5.11"] },
    { "id": 13, "tasks": ["5.4", "5.8", "5.12"] },
    { "id": 14, "tasks": ["5.13"] },
    { "id": 15, "tasks": ["5.14", "7.1"] },
    { "id": 16, "tasks": ["7.2"] },
    { "id": 17, "tasks": ["7.3"] },
    { "id": 18, "tasks": ["9.1"] },
    { "id": 19, "tasks": ["9.2"] },
    { "id": 20, "tasks": ["9.3", "9.5"] },
    { "id": 21, "tasks": ["9.4"] },
    { "id": 22, "tasks": ["11.1"] },
    { "id": 23, "tasks": ["11.2"] },
    { "id": 24, "tasks": ["11.3"] },
    { "id": 25, "tasks": ["12.1"] },
    { "id": 26, "tasks": ["12.2"] },
    { "id": 27, "tasks": ["12.3"] },
    { "id": 28, "tasks": ["12.4"] },
    { "id": 29, "tasks": ["14.1", "14.3", "15.1"] },
    { "id": 30, "tasks": ["14.2", "15.2", "15.3"] },
    { "id": 31, "tasks": ["16.1", "16.2"] },
    { "id": 32, "tasks": ["16.3", "16.4"] },
    { "id": 33, "tasks": ["18.1", "18.2", "18.3"] },
    { "id": 34, "tasks": ["19.1", "19.2", "19.3"] },
    { "id": 35, "tasks": ["20.1"] },
    { "id": 36, "tasks": ["20.2"] },
    { "id": 37, "tasks": ["20.3"] }
  ]
}
```
