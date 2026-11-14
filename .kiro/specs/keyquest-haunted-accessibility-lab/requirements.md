# Requirements Document

## Introduction

KeyQuest: The Haunted Accessibility Lab is a browser-based educational experience that teaches web accessibility through interactive gameplay. Players navigate an intentionally inaccessible fictional checkout interface ("The Midnight Checkout"), discover accessibility failures, apply code-backed repairs, verify real behavioral improvements, and complete the journey.

The target audience includes frontend developers, UX designers, students, and teams learning web accessibility. The application uses React, TypeScript, and Vite for static deployment with no backend dependencies.

**Important Disclaimer**: This application contains an intentionally inaccessible sandbox for educational purposes. The sandbox defects are clearly labeled and isolated from the accessible app shell. This application does not claim full WCAG compliance due to the presence of intentional accessibility failures within the educational challenge area.

## Glossary

- **App_Shell**: The main application interface including navigation, menus, and UI chrome that surrounds the Challenge_Sandbox. The App_Shell is fully accessible.
- **Challenge_Sandbox**: An isolated, clearly labeled area containing intentional accessibility defects for educational purposes. Players interact with and repair defects within this sandbox.
- **Defect**: An intentional accessibility failure within the Challenge_Sandbox that players must discover and repair. The four defects are: Invisible_Focus, Mouse_Only_Activation, Missing_Accessible_Name, and Insufficient_Contrast.
- **Invisible_Focus**: A defect where interactive elements do not display visible focus indicators when focused via keyboard navigation.
- **Mouse_Only_Activation**: A defect where interactive elements can only be activated via mouse click, lacking keyboard activation support.
- **Missing_Accessible_Name**: A defect where interactive elements lack programmatically associated accessible names for assistive technologies.
- **Insufficient_Contrast**: A defect where text elements have a contrast ratio below WCAG AA requirements (4.5:1 for normal text, 3:1 for large text).
- **Repair**: A player-initiated action that applies a code-backed fix to a specific Defect, resulting in verifiable DOM, behavior, or style changes.
- **Verification**: The process of confirming that a Repair has successfully resolved a Defect through actual DOM inspection, computed style checks, or interaction behavior tests.
- **Progress_State**: The current state of player progress including discovered defects, applied repairs, and verification status, stored in localStorage.
- **Emergency_Exit**: A keyboard-accessible mechanism that allows players to immediately exit the Challenge_Sandbox and return to the App_Shell at any time.
- **Hint_System**: A mechanism that provides progressive guidance to players who are stuck discovering or repairing defects.
- **Level_Completion**: The state achieved when all four defects have been discovered, repaired, and verified.
- **Reduced_Motion_Mode**: A display mode that respects the user's prefers-reduced-motion system preference by disabling or reducing animations.

---

## Requirements

### Requirement 1: Application Loading

**User Story:** As a player, I want the application to load reliably and show clear loading states, so that I understand the application status and can begin playing without confusion.

#### Acceptance Criteria

1. WHEN the Application is first accessed, THE App_Shell SHALL display a loading indicator within 100ms of initial render.
2. WHILE assets are loading, THE App_Shell SHALL display a progress indicator showing loading status.
3. WHEN all required assets have loaded successfully, THE App_Shell SHALL transition to the main menu within 500ms.
4. IF an asset fails to load, THEN THE App_Shell SHALL display an error message describing the failure and provide a retry option.
5. THE Loading_Indicator SHALL be accessible to screen readers via aria-live announcements.

---

### Requirement 2: Challenge Sandbox Initialization

**User Story:** As a player, I want to enter the Midnight Checkout challenge with a clearly labeled broken sandbox, so that I understand I am entering an intentionally inaccessible area for learning purposes.

#### Acceptance Criteria

1. WHEN the player selects "Start Challenge" from the main menu, THE App_Shell SHALL display the Challenge_Sandbox containing the Midnight Checkout interface.
2. THE Challenge_Sandbox SHALL display a visible disclaimer stating "This area contains intentional accessibility defects for educational purposes."
3. THE Challenge_Sandbox SHALL contain exactly four Defects: Invisible_Focus, Mouse_Only_Activation, Missing_Accessible_Name, and Insufficient_Contrast.
4. WHEN the Challenge_Sandbox initializes, THE App_Shell SHALL announce to screen readers that the player is entering an educational challenge area with intentional accessibility issues.
5. THE Challenge_Sandbox boundary SHALL be visually distinct from the App_Shell through clear visual demarcation.

---

### Requirement 3: Defect Discovery

**User Story:** As a player, I want to discover accessibility defects through interaction, so that I can learn to identify real-world accessibility issues.

#### Acceptance Criteria

1. WHEN the player interacts with an element containing a Defect, THE Challenge_Sandbox SHALL allow the Defect to be marked as discovered.
2. WHEN a Defect is discovered, THE App_Shell SHALL display a notification describing the accessibility issue found.
3. THE Discovery notification SHALL include the defect type, affected element, and educational context explaining why this is an accessibility barrier.
4. WHEN a Defect is discovered, THE Progress_State SHALL be updated to reflect the discovery.
5. THE Discovery mechanism SHALL not require the player to experience the full impact of the accessibility barrier to discover it.

---

### Requirement 4: Defect Repair - Invisible Focus

**User Story:** As a player, I want to repair the invisible focus defect, so that I learn how to implement proper focus indicators.

#### Acceptance Criteria

1. WHEN the player applies the Repair for Invisible_Focus, THE Challenge_Sandbox SHALL modify the DOM or computed styles to add visible focus indicators to the affected elements.
2. WHEN the Invisible_Focus Repair is applied, THE affected elements SHALL display a focus indicator with a minimum contrast ratio of 3:1 against adjacent colors when focused.
3. THE Invisible_Focus Repair SHALL persist in the DOM until the challenge is reset.
4. WHEN the Invisible_Focus Repair is applied, THE App_Shell SHALL display educational feedback explaining the CSS properties or DOM changes made.

---

### Requirement 5: Defect Repair - Mouse Only Activation

**User Story:** As a player, I want to repair the mouse-only activation defect, so that I learn how to implement keyboard-accessible interactions.

#### Acceptance Criteria

1. WHEN the player applies the Repair for Mouse_Only_Activation, THE Challenge_Sandbox SHALL modify the DOM or event handlers to enable keyboard activation via Enter or Space key.
2. WHEN the Mouse_Only_Activation Repair is applied, THE affected elements SHALL respond to both mouse click and keyboard activation identically.
3. THE Mouse_Only_Activation Repair SHALL persist in the DOM until the challenge is reset.
4. WHEN the Mouse_Only_Activation Repair is applied, THE App_Shell SHALL display educational feedback explaining the event handler changes made.

---

### Requirement 6: Defect Repair - Missing Accessible Name

**User Story:** As a player, I want to repair the missing accessible name defect, so that I learn how to provide programmatic labels for assistive technologies.

#### Acceptance Criteria

1. WHEN the player applies the Repair for Missing_Accessible_Name, THE Challenge_Sandbox SHALL modify the DOM to add an accessible name via aria-label, aria-labelledby, or visible label association.
2. WHEN the Missing_Accessible_Name Repair is applied, THE affected elements SHALL have a computed accessible name that is non-empty and descriptive.
3. THE Missing_Accessible_Name Repair SHALL persist in the DOM until the challenge is reset.
4. WHEN the Missing_Accessible_Name Repair is applied, THE App_Shell SHALL display educational feedback explaining the ARIA attribute or labeling technique used.

---

### Requirement 7: Defect Repair - Insufficient Contrast

**User Story:** As a player, I want to repair the insufficient contrast defect, so that I learn how to meet WCAG color contrast requirements.

#### Acceptance Criteria

1. WHEN the player applies the Repair for Insufficient_Contrast, THE Challenge_Sandbox SHALL modify the computed styles to achieve a contrast ratio of at least 4.5:1 for normal text or 3:1 for large text.
2. WHEN the Insufficient_Contrast Repair is applied, THE affected text elements SHALL have measurably improved contrast ratios in computed styles.
3. THE Insufficient_Contrast Repair SHALL persist in the DOM until the challenge is reset.
4. WHEN the Insufficient_Contrast Repair is applied, THE App_Shell SHALL display educational feedback explaining the color values changed and the resulting contrast ratio.

---

### Requirement 8: Repair Verification

**User Story:** As a player, I want repairs to be verified through real DOM and behavior checks, so that I can trust the verification reflects actual accessibility improvements.

#### Acceptance Criteria

1. WHEN a Repair is applied, THE App_Shell SHALL perform verification by inspecting actual DOM attributes, computed styles, or interaction behavior.
2. THE Verification for Invisible_Focus SHALL confirm that focus styles are present in computed styles when the element receives focus.
3. THE Verification for Mouse_Only_Activation SHALL confirm that keyboard events trigger the expected behavior on the affected elements.
4. THE Verification for Missing_Accessible_Name SHALL confirm that the element's computed accessible name is non-empty via accessibility tree inspection.
5. THE Verification for Insufficient_Contrast SHALL confirm that the computed foreground and background colors meet the required contrast ratio.
6. IF Verification fails, THEN THE App_Shell SHALL display a message explaining why the repair was insufficient and what additional changes are needed.
7. THE Verification logic SHALL be independently testable via browser automation tools such as Playwright or Cypress.

---

### Requirement 9: Level Completion

**User Story:** As a player, I want clear feedback when I complete the level, so that I feel accomplished and understand what I learned.

#### Acceptance Criteria

1. WHEN all four Defects have been discovered, repaired, and verified, THE App_Shell SHALL transition to a Level_Completion state.
2. WHEN Level_Completion is achieved, THE App_Shell SHALL display a success screen summarizing the accessibility concepts learned.
3. THE Level_Completion screen SHALL list each repaired defect with a brief explanation of the accessibility principle applied.
4. WHEN Level_Completion is achieved, THE App_Shell SHALL announce the completion to screen readers via aria-live.
5. THE Level_Completion screen SHALL provide options to replay the level or return to the main menu.

---

### Requirement 10: Hint System

**User Story:** As a player, I want access to hints when I'm stuck, so that I can continue learning without excessive frustration.

#### Acceptance Criteria

1. THE App_Shell SHALL provide a hint button that is always visible and keyboard-accessible during the challenge.
2. WHEN the player activates the hint button, THE Hint_System SHALL display a contextual hint based on the player's current progress.
3. THE Hint_System SHALL provide progressive hints, starting with general guidance and becoming more specific with each request.
4. THE Hint_System SHALL have at least three levels of hint specificity for each Defect.
5. WHEN a hint is displayed, THE App_Shell SHALL announce the hint content to screen readers.
6. THE Hint_System SHALL track hint usage in Progress_State without penalizing the player's completion status.

---

### Requirement 11: Progress Reset

**User Story:** As a player, I want to reset my progress, so that I can replay the challenge from the beginning or recover from an unwanted state.

#### Acceptance Criteria

1. THE App_Shell SHALL provide a reset option accessible from both the main menu and during the challenge.
2. WHEN the player activates the reset option, THE App_Shell SHALL display a confirmation dialog before proceeding.
3. WHEN reset is confirmed, THE App_Shell SHALL restore all four Defects to their unrepaired state in the DOM.
4. WHEN reset is confirmed, THE Progress_State SHALL be cleared from localStorage.
5. WHEN reset is complete, THE App_Shell SHALL return the player to the challenge start state.
6. THE Reset confirmation dialog SHALL be keyboard-accessible and focus-trapped.

---

### Requirement 12: Progress Persistence

**User Story:** As a player, I want my progress saved automatically, so that I can continue where I left off if I close the browser.

#### Acceptance Criteria

1. WHEN a Defect is discovered or repaired, THE App_Shell SHALL save the Progress_State to localStorage within 1 second.
2. WHEN the Application loads with existing Progress_State in localStorage, THE App_Shell SHALL offer to restore the previous session.
3. WHEN the player chooses to restore, THE Challenge_Sandbox SHALL restore all previously applied Repairs to the DOM.
4. WHEN the player chooses to start fresh, THE App_Shell SHALL clear the existing Progress_State and begin a new session.
5. THE Progress_State SHALL include: discovered defects, applied repairs, verification status, and hint usage count for each defect.
6. IF localStorage is unavailable, THEN THE App_Shell SHALL continue functioning without persistence and display a notice that progress will not be saved.

---

### Requirement 13: Emergency Exit and Bypass

**User Story:** As a player, I want an emergency exit that is always available via keyboard, so that I am never trapped in the challenge sandbox.

#### Acceptance Criteria

1. THE App_Shell SHALL provide an Emergency_Exit button that is visible and keyboard-accessible at all times during the challenge.
2. WHEN the player activates the Emergency_Exit via keyboard (Escape key) or button activation, THE App_Shell SHALL immediately return to the main menu.
3. THE Emergency_Exit SHALL function regardless of the current state of the Challenge_Sandbox or any defects.
4. THE Emergency_Exit SHALL be announced in the challenge introduction so players know it exists.
5. WHEN Emergency_Exit is activated, THE Progress_State SHALL be preserved so the player can return later.
6. THE Emergency_Exit button SHALL have a minimum touch target size of 44x44 CSS pixels.

---

### Requirement 14: App Shell Accessibility

**User Story:** As a player using assistive technology, I want the app shell to be fully accessible, so that I can navigate and use all features outside the intentional challenge area.

#### Acceptance Criteria

1. THE App_Shell SHALL meet WCAG 2.1 Level AA success criteria for all content outside the Challenge_Sandbox.
2. THE App_Shell SHALL support full keyboard navigation for all interactive elements.
3. THE App_Shell SHALL provide visible focus indicators with a minimum contrast ratio of 3:1 for all focusable elements.
4. THE App_Shell SHALL use semantic HTML elements (nav, main, button, heading hierarchy) appropriately.
5. THE App_Shell SHALL provide skip links to bypass navigation and reach main content.
6. THE App_Shell SHALL ensure all interactive elements have accessible names.
7. THE App_Shell SHALL maintain a logical focus order that follows visual layout.

---

### Requirement 15: Reduced Motion Support

**User Story:** As a player with vestibular disorders or motion sensitivity, I want animations to respect my system preferences, so that I can use the application comfortably.

#### Acceptance Criteria

1. WHEN the user's system has prefers-reduced-motion set to reduce, THE App_Shell SHALL disable or minimize all non-essential animations.
2. WHILE Reduced_Motion_Mode is active, THE App_Shell SHALL use instant transitions instead of animated transitions.
3. WHILE Reduced_Motion_Mode is active, THE Challenge_Sandbox SHALL disable decorative animations while preserving functional state changes.
4. THE App_Shell SHALL not require animation to convey critical information or game state.
5. THE App_Shell SHALL provide a manual toggle for reduced motion in addition to respecting system preferences.

---

### Requirement 16: Audio Independence

**User Story:** As a player who cannot hear or prefers not to use audio, I want all gameplay to be completable without sound, so that audio is never a barrier to learning.

#### Acceptance Criteria

1. THE App_Shell SHALL not require audio to discover, repair, or verify any Defect.
2. THE App_Shell SHALL not require audio to navigate menus, access hints, or complete the level.
3. IF optional audio cues are implemented, THEN THE App_Shell SHALL provide equivalent visual feedback for all audio cues.
4. THE App_Shell SHALL provide a mute toggle that persists across sessions.

---

### Requirement 17: Error Handling

**User Story:** As a player, I want the application to handle errors gracefully, so that I can recover from unexpected issues without losing progress.

#### Acceptance Criteria

1. IF a JavaScript error occurs during gameplay, THEN THE App_Shell SHALL catch the error and display a user-friendly error message.
2. IF an error occurs, THEN THE App_Shell SHALL preserve the current Progress_State before displaying the error.
3. WHEN an error is displayed, THE App_Shell SHALL provide options to retry the current action or return to a safe state.
4. THE Error messages SHALL be accessible, with appropriate ARIA roles and focus management.
5. IF the Challenge_Sandbox enters an invalid state, THEN THE App_Shell SHALL offer to reset the sandbox while preserving overall progress where possible.

---

### Requirement 18: Browser Test Support

**User Story:** As a developer, I want the application to support automated browser testing, so that verification logic can be independently validated.

#### Acceptance Criteria

1. THE App_Shell SHALL expose data-testid attributes on key interactive elements for test automation targeting.
2. THE Challenge_Sandbox SHALL expose data-testid attributes on all elements containing Defects.
3. THE Repair mechanisms SHALL produce DOM changes that are detectable via standard DOM APIs.
4. THE Verification logic SHALL be implementable as independent Playwright or Cypress tests without requiring application-internal access.
5. THE App_Shell SHALL not use techniques that prevent automated testing (e.g., Canvas-only rendering for interactive elements).

---

## Stretch Goals (Post-MVP)

The following requirements are explicitly identified as stretch goals and are not part of the minimum viable product:

### Stretch Goal S1: Additional Levels

**User Story:** As a returning player, I want additional accessibility challenges beyond the Midnight Checkout, so that I can continue learning new concepts.

#### Acceptance Criteria

1. THE App_Shell SHOULD support multiple Challenge levels beyond the Midnight Checkout.
2. WHEN additional levels are available, THE main menu SHOULD display level selection.

---

### Stretch Goal S2: Score and Statistics

**User Story:** As a player, I want to see statistics about my performance, so that I can track my learning progress.

#### Acceptance Criteria

1. THE App_Shell SHOULD track completion time and hint usage for each session.
2. WHEN Level_Completion is achieved, THE success screen SHOULD display optional performance statistics.

---

### Stretch Goal S3: Educational Deep-Dives

**User Story:** As a player wanting to learn more, I want access to detailed educational content about each accessibility concept.

#### Acceptance Criteria

1. THE App_Shell SHOULD provide optional "Learn More" links for each Defect type.
2. THE educational content SHOULD include WCAG success criteria references and code examples.

---

## Correctness Properties

The following properties can be verified through automated testing:

### Property 1: Repair Persistence
FOR ALL applied Repairs, THE DOM state after repair SHALL remain consistent across re-renders until reset is invoked.

### Property 2: Verification Accuracy
FOR ALL Verification results, THE result SHALL match the actual DOM state—a passing verification implies the DOM contains the expected accessible attributes, styles, or behaviors.

### Property 3: Progress State Consistency
FOR ALL Progress_State saves and restores, restoring Progress_State and re-applying Repairs SHALL produce a DOM state equivalent to the state when the Progress_State was saved.

### Property 4: Emergency Exit Availability
FOR ALL states within the Challenge_Sandbox, THE Emergency_Exit SHALL be keyboard-reachable and functional within 3 Tab key presses from any focusable element.

### Property 5: Defect Count Invariant
FOR ALL Challenge_Sandbox states, THE total count of (unrepaired defects + repaired defects) SHALL equal exactly four.

---

## Accessibility Disclaimer

This application is an educational tool that intentionally contains accessibility defects within a clearly labeled Challenge_Sandbox for teaching purposes. The defects are:

1. **Invisible Focus** - Focus indicators are intentionally hidden
2. **Mouse-Only Activation** - Keyboard activation is intentionally disabled
3. **Missing Accessible Name** - Programmatic labels are intentionally omitted
4. **Insufficient Contrast** - Color contrast intentionally fails WCAG requirements

These defects exist solely within the Challenge_Sandbox boundary and are intended to be discovered and repaired by the player as part of the learning experience.

**The App Shell, menus, navigation, and all UI outside the Challenge_Sandbox are designed to meet WCAG 2.1 Level AA accessibility standards.**

Players using assistive technologies should be aware that the Challenge_Sandbox area will present accessibility barriers that are resolved through gameplay. An Emergency Exit is always available via the Escape key to leave the challenge area at any time.
