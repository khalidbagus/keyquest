/**
 * Patch Registry (Pick-the-Patch Mini-Puzzle)
 * Provides 3 realistic code candidates per accessibility curse (1 true WCAG fix
 * and 2 plausible anti-patterns) plus each curse's custom apothecary potion artwork.
 */

import type { DefectType } from '../types';

export interface PatchOption {
  id: string;
  label: string;
  code: string;
  isCorrect: boolean;
  failureDiagnosis: string;
  mascotReaction: string;
}

export interface CurseCatalogEntry {
  type: DefectType;
  name: string;
  curseAlias: string;
  wcagCriterion: string;
  wcagCode: string;
  wcagLevel: 'A' | 'AA';
  potionArtUrl: string;
  targetElement: string;
  description: string;
  brokenCode: string;
  repairedCode: string;
  defaultEducationalFeedback: string;
  defaultVerificationEvidence: string;
  testId: string;
  repairTestId: string;
  patches: readonly PatchOption[];
}

export const CURSE_CATALOG: readonly CurseCatalogEntry[] = [
  {
    type: 'mouse-only-activation',
    name: 'Mouse-Only Activation',
    curseAlias: 'Chained Keycap Hex',
    wcagCriterion: 'WCAG 2.1.1 Keyboard',
    wcagCode: 'WCAG 2.1.1',
    wcagLevel: 'A',
    potionArtUrl: '/art/curse-keyboard.png',
    targetElement: '"Add to Cart" control (<div>)',
    description:
      'The "Add to Cart" element can only be clicked with a mouse. Keyboard users can focus it with Tab, but pressing Enter or Space does nothing.',
    brokenCode: '<div tabindex="0" onClick={addToCart}>Add to Cart</div>',
    repairedCode:
      '<div role="button" tabindex="0" onKeyDown={onEnterOrSpace}>Add to Cart</div>',
    defaultEducationalFeedback:
      'Repair applied: Added keyboard event handlers for Enter and Space keys, matching native button behavior, and added role="button" for assistive technologies. This meets WCAG 2.1.1 (Keyboard).',
    defaultVerificationEvidence:
      'DOM Check: role="button" present; synthetic Enter & Space keydown events trigger activation.',
    testId: 'defect-mouse-only',
    repairTestId: 'repair-mouse-only',
    patches: [
      {
        id: 'mouse-trap-cursor',
        label: 'Add cursor: pointer & onMouseDown',
        code: '<div tabindex="0" style="cursor: pointer" onMouseDown={addToCart}>',
        isCorrect: false,
        failureDiagnosis:
          'Verification failed: CSS cursor styles and onMouseDown still ignore keyboard Enter and Space events, and expose no button role.',
        mascotReaction:
          'Ooh, that only helps mouse pointers — keyboard Enter & Space still bounce right off!',
      },
      {
        id: 'mouse-trap-tabindex',
        label: 'Set tabindex="-1" to skip it',
        code: '<div tabindex="-1" onClick={addToCart}>Add to Cart</div>',
        isCorrect: false,
        failureDiagnosis:
          'Verification failed: tabindex="-1" removes the control from the Tab order completely, locking keyboard users out of adding items.',
        mascotReaction:
          'Yikes! Hiding it from Tab traps shoppers out of the cart even worse!',
      },
      {
        id: 'mouse-fix',
        label: 'Add role="button" + Enter/Space handler',
        code: '<div role="button" tabindex="0" onKeyDown={onEnterOrSpace}>',
        isCorrect: true,
        failureDiagnosis: '',
        mascotReaction:
          'Yes! Enter and Space activate it just like a real native button!',
      },
    ],
  },
  {
    type: 'invisible-focus',
    name: 'Invisible Focus',
    curseAlias: 'Vanishing Halo Hex',
    wcagCriterion: 'WCAG 2.4.7 Focus Visible',
    wcagCode: 'WCAG 2.4.7',
    wcagLevel: 'AA',
    potionArtUrl: '/art/curse-focus.png',
    targetElement: '"Buy Now" button (<button>)',
    description:
      'The "Buy Now" button has outline: none with no replacement focus indicator. Sighted keyboard users cannot see when focus lands on it.',
    brokenCode: '.buyButton { outline: none; }',
    repairedCode:
      '.keyquest-focus-repaired:focus-visible { outline: 3px solid #7dd3fc; outline-offset: 2px; }',
    defaultEducationalFeedback:
      'Repair applied: Added a visible focus indicator using the :focus-visible pseudo-class. The 3px high-contrast outline provides well over 3:1 contrast against adjacent colors, meeting WCAG 2.4.7 (Focus Visible).',
    defaultVerificationEvidence:
      'Computed Style Check: outlineStyle is "solid", outlineWidth is "3px" (> 0px) when focused.',
    testId: 'defect-invisible-focus',
    repairTestId: 'repair-invisible-focus',
    patches: [
      {
        id: 'focus-trap-hover',
        label: 'Style :hover glow only',
        code: '.buyButton:hover { box-shadow: 0 0 12px #fbbf24; }',
        isCorrect: false,
        failureDiagnosis:
          'Verification failed: :hover only responds to a mouse pointer. When focused via Tab, computed outlineStyle is still "none".',
        mascotReaction:
          'Careful! :hover never fires when navigating with the Tab key!',
      },
      {
        id: 'focus-trap-transparent',
        label: 'Use outline: 2px solid transparent',
        code: '.buyButton:focus { outline: 2px solid transparent; }',
        isCorrect: false,
        failureDiagnosis:
          'Verification failed: A transparent outline is invisible on standard displays and fails WCAG 2.4.7 Focus Visible.',
        mascotReaction:
          'Sneaky ghost ring! A transparent outline is still invisible to keyboard users!',
      },
      {
        id: 'focus-fix',
        label: 'Restore high-contrast :focus-visible outline',
        code: '.keyquest-focus-repaired:focus-visible { outline: 3px solid #7dd3fc; outline-offset: 2px; }',
        isCorrect: true,
        failureDiagnosis: '',
        mascotReaction:
          'Boom! That glowing focus halo lights up the button crystal clear!',
      },
    ],
  },
  {
    type: 'missing-accessible-name',
    name: 'Missing Accessible Name',
    curseAlias: 'Voiceless Cart Hex',
    wcagCriterion: 'WCAG 4.1.2 Name, Role, Value',
    wcagCode: 'WCAG 4.1.2',
    wcagLevel: 'A',
    potionArtUrl: '/art/curse-name.png',
    targetElement: 'Cart icon button (<button>)',
    description:
      'The shopping cart icon button contains only an icon with aria-hidden="true" and no accessible label. Screen readers announce it simply as an unlabelled "button".',
    brokenCode: '<button type="button"><svg aria-hidden="true" /></button>',
    repairedCode:
      '<button type="button" aria-label="View shopping cart"><svg aria-hidden="true" /></button>',
    defaultEducationalFeedback:
      'Repair applied: Added aria-label="View shopping cart" to provide a programmatic accessible name. Screen readers now announce its purpose clearly, meeting WCAG 4.1.2 (Name, Role, Value).',
    defaultVerificationEvidence:
      'Accessibility Tree Check: computedName is "View shopping cart" via aria-label.',
    testId: 'defect-missing-name',
    repairTestId: 'repair-missing-name',
    patches: [
      {
        id: 'name-trap-data',
        label: 'Add data-label="Cart" attribute',
        code: '<button type="button" data-label="View shopping cart">',
        isCorrect: false,
        failureDiagnosis:
          'Verification failed: Custom data-* attributes are ignored by the browser Accessibility Tree — computedName remains empty.',
        mascotReaction:
          'Hmm, screen readers can’t read custom data-* attributes — it still announces as blank!',
      },
      {
        id: 'name-trap-placeholder',
        label: 'Add aria-hidden="false" on empty span',
        code: '<button type="button"><span aria-hidden="false"></span></button>',
        isCorrect: false,
        failureDiagnosis:
          'Verification failed: Exposing an empty icon element provides no readable text for screen readers or voice control.',
        mascotReaction:
          'Still silent! There has to be real descriptive text or an aria-label!',
      },
      {
        id: 'name-fix',
        label: 'Add aria-label="View shopping cart"',
        code: '<button type="button" aria-label="View shopping cart">',
        isCorrect: true,
        failureDiagnosis: '',
        mascotReaction:
          'Loud and clear! Screen readers now announce "View shopping cart, button"!',
      },
    ],
  },
  {
    type: 'insufficient-contrast',
    name: 'Insufficient Contrast',
    curseAlias: 'Shadow Ink Hex',
    wcagCriterion: 'WCAG 1.4.3 Contrast (Minimum)',
    wcagCode: 'WCAG 1.4.3',
    wcagLevel: 'AA',
    potionArtUrl: '/art/curse-contrast.png',
    targetElement: '"$13.99" price text (<p>)',
    description:
      'The product price uses dim low-contrast gray (#555555 on dark plum #231936, ~2.0:1 ratio), making it difficult to read for people with low vision.',
    brokenCode: '.productPrice { color: #555555; /* ~2.0:1 — Fails AA */ }',
    repairedCode:
      '.productPrice { color: #e0e0e0; /* > 10:1 — Passes AA & AAA */ }',
    defaultEducationalFeedback:
      'Repair applied: Changed text color from low-contrast gray to high-contrast #e0e0e0. WCAG 1.4.3 requires at least 4.5:1 for normal text and 3:1 for large text. The new color exceeds both requirements.',
    defaultVerificationEvidence:
      'Computed Luminance Check: foreground rgb(224, 224, 224) passes WCAG AA contrast threshold.',
    testId: 'defect-low-contrast',
    repairTestId: 'repair-low-contrast',
    patches: [
      {
        id: 'contrast-trap-dim',
        label: 'Nudge slightly lighter (#666666)',
        code: '.productPrice { color: #666666; /* ~2.7:1 — Still fails */ }',
        isCorrect: false,
        failureDiagnosis:
          'Verification failed: #666666 against #231936 only reaches ~2.7:1 luminance contrast — still below WCAG AA.',
        mascotReaction:
          'Still way too murky! Even with cat eyes, ~2.7:1 fails WCAG AA!',
      },
      {
        id: 'contrast-trap-shadow',
        label: 'Add subtle dark text-shadow only',
        code: '.productPrice { color: #555555; text-shadow: 0 1px 2px #000; }',
        isCorrect: false,
        failureDiagnosis:
          'Verification failed: A dark shadow behind dark text does not raise foreground-to-background luminance contrast.',
        mascotReaction:
          'Shadows on shadows! We need a bright, high-contrast foreground color!',
      },
      {
        id: 'contrast-fix',
        label: 'Switch to crisp luminous #e0e0e0',
        code: '.productPrice { color: #e0e0e0; /* > 10:1 — WCAG AA Pass */ }',
        isCorrect: true,
        failureDiagnosis: '',
        mascotReaction:
          'Sparkling clear! That price pops off the counter with >10:1 contrast!',
      },
    ],
  },
] as const;

export function getCurseByType(type: DefectType): CurseCatalogEntry {
  return (
    CURSE_CATALOG.find((entry) => entry.type === type) ?? CURSE_CATALOG[0]!
  );
}
