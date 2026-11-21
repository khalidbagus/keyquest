/**
 * Patch Registry (Pick-the-Patch Mini-Puzzle)
 * Provides 3 realistic code candidates per accessibility curse (1 true WCAG fix
 * and 2 plausible anti-patterns) plus each curse's custom apothecary potion artwork.
 * Patch labels are short player actions; exact code and WCAG detail are shown
 * behind "How this repair works".
 */

import type { DefectType, RoomId } from '../types';
import { ROOM_DEFECTS } from './roomsRegistry';

export interface PatchOption {
  id: string;
  /** Short player action, e.g. "Show a ring on keyboard focus". */
  label: string;
  code: string;
  isCorrect: boolean;
  /** One plain sentence explaining why a trap patch does not work. */
  failureDiagnosis: string;
  mascotReaction: string;
}

export interface CurseCatalogEntry {
  type: DefectType;
  name: string;
  curseAlias: string;
  /** Plain-language title shown in the room, e.g. "Buy Now hides keyboard focus". */
  roomTitle: string;
  /** One sentence describing what the player experiences. */
  symptom: string;
  /** What the verified repair changed, in the player's terms. */
  fixedSummary: string;
  /** What the player can do with the repaired control next. */
  nextAction: string;
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
    roomTitle: 'Add to Cart ignores the keyboard',
    symptom:
      'Tab reaches Add to Cart, but Enter and Space do nothing. Only a mouse or tap works.',
    fixedSummary: 'Enter and Space now press Add to Cart, and it is announced as a button.',
    nextAction: 'Press Enter on Add to Cart to put the candle in the order.',
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
        label: 'Show a pointer cursor',
        code: '<div tabindex="0" style="cursor: pointer" onMouseDown={addToCart}>',
        isCorrect: false,
        failureDiagnosis:
          'A pointer cursor and onMouseDown only help mouse users. Enter and Space still do nothing.',
        mascotReaction:
          'Ooh, that only helps mouse pointers — keyboard Enter & Space still bounce right off!',
      },
      {
        id: 'mouse-trap-tabindex',
        label: 'Skip it in the Tab order',
        code: '<div tabindex="-1" onClick={addToCart}>Add to Cart</div>',
        isCorrect: false,
        failureDiagnosis:
          'tabindex="-1" removes Add to Cart from the Tab order, so keyboard users cannot reach it at all.',
        mascotReaction:
          'Yikes! Hiding it from Tab traps shoppers out of the cart even worse!',
      },
      {
        id: 'mouse-fix',
        label: 'Make Enter and Space press it',
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
    roomTitle: 'Buy Now hides keyboard focus',
    symptom:
      'Tab lands on Buy Now, but nothing shows it. Keyboard shoppers lose their place.',
    fixedSummary: 'Buy Now now shows a 3px ring when it has keyboard focus.',
    nextAction: 'Press Buy Now to light the lantern.',
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
        label: 'Glow when the mouse hovers',
        code: '.buyButton:hover { box-shadow: 0 0 12px #fbbf24; }',
        isCorrect: false,
        failureDiagnosis:
          ':hover only reacts to a mouse pointer. Tab focus still shows nothing.',
        mascotReaction:
          'Careful! :hover never fires when navigating with the Tab key!',
      },
      {
        id: 'focus-fix',
        label: 'Show a ring on keyboard focus',
        code: '.keyquest-focus-repaired:focus-visible { outline: 3px solid #7dd3fc; outline-offset: 2px; }',
        isCorrect: true,
        failureDiagnosis: '',
        mascotReaction:
          'Boom! That glowing focus halo lights up the button crystal clear!',
      },
      {
        id: 'focus-trap-transparent',
        label: 'Add a see-through outline',
        code: '.buyButton:focus { outline: 2px solid transparent; }',
        isCorrect: false,
        failureDiagnosis:
          'A transparent outline is still invisible, so focus stays hidden.',
        mascotReaction:
          'Sneaky ghost ring! A transparent outline is still invisible to keyboard users!',
      },
    ],
  },
  {
    type: 'missing-accessible-name',
    name: 'Missing Accessible Name',
    curseAlias: 'Voiceless Cart Hex',
    roomTitle: 'The bag button has no name',
    symptom:
      'The bag icon button is announced only as “button”. Screen reader shoppers cannot tell what it does.',
    fixedSummary: 'The bag button is now announced as “View shopping cart, button”.',
    nextAction: 'Press the bag button to check what is in the order.',
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
        id: 'name-fix',
        label: 'Label it “View shopping cart”',
        code: '<button type="button" aria-label="View shopping cart">',
        isCorrect: true,
        failureDiagnosis: '',
        mascotReaction:
          'Loud and clear! Screen readers now announce "View shopping cart, button"!',
      },
      {
        id: 'name-trap-data',
        label: 'Add a data-label note',
        code: '<button type="button" data-label="View shopping cart">',
        isCorrect: false,
        failureDiagnosis:
          'Browsers ignore data-* attributes when naming controls, so the button is still nameless.',
        mascotReaction:
          'Hmm, screen readers can’t read custom data-* attributes — it still announces as blank!',
      },
      {
        id: 'name-trap-placeholder',
        label: 'Expose the empty icon span',
        code: '<button type="button"><span aria-hidden="false"></span></button>',
        isCorrect: false,
        failureDiagnosis:
          'An empty span has no text to read, so the button is still nameless.',
        mascotReaction:
          'Still silent! There has to be real descriptive text or an aria-label!',
      },
    ],
  },
  {
    type: 'insufficient-contrast',
    name: 'Insufficient Contrast',
    curseAlias: 'Shadow Ink Hex',
    roomTitle: 'The price is too faint to read',
    symptom:
      'The $13.99 price is dim gray on dark plum, about 2:1 contrast. Low-vision shoppers cannot read it.',
    fixedSummary: 'The price is now light gray with more than 10:1 contrast.',
    nextAction: 'Check the order total. The price is easy to read now.',
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
        label: 'Lighten the price a little',
        code: '.productPrice { color: #666666; /* ~2.7:1 — Still fails */ }',
        isCorrect: false,
        failureDiagnosis:
          '#666666 on the plum counter only reaches about 2.7:1, still below the 4.5:1 minimum.',
        mascotReaction:
          'Still way too murky! Even with cat eyes, ~2.7:1 fails WCAG AA!',
      },
      {
        id: 'contrast-fix',
        label: 'Brighten the price to light gray',
        code: '.productPrice { color: #e0e0e0; /* > 10:1 — WCAG AA Pass */ }',
        isCorrect: true,
        failureDiagnosis: '',
        mascotReaction:
          'Sparkling clear! That price pops off the counter with >10:1 contrast!',
      },
      {
        id: 'contrast-trap-shadow',
        label: 'Add a dark text shadow',
        code: '.productPrice { color: #555555; text-shadow: 0 1px 2px #000; }',
        isCorrect: false,
        failureDiagnosis:
          'A dark shadow behind dark text does not make the text itself any brighter.',
        mascotReaction:
          'Shadows on shadows! We need a bright, high-contrast foreground color!',
      },
    ],
  },
  {
    type: 'color-only-ingredients',
    name: 'Color-Only Ingredients',
    curseAlias: 'Faded Label Hex',
    roomTitle: 'The shelf shows colors only',
    symptom:
      'Each jar is a colored swatch with no name or symbol. The recipe names ingredients, so anyone who cannot tell these colors apart, or uses a screen reader, cannot pick the right jar.',
    fixedSummary: 'Every jar now shows its name and symbol, and the name is what screen readers announce.',
    nextAction: 'Add Moonpetal, Ember salt, and Glowcap to the cauldron, in that order.',
    wcagCriterion: 'WCAG 1.4.1 Use of Color',
    wcagCode: 'WCAG 1.4.1',
    wcagLevel: 'A',
    potionArtUrl: '/art/curse-name.png',
    targetElement: 'Ingredient jars on the pantry shelf (<button>)',
    description:
      'The ingredient buttons are told apart by color alone: each label and symbol is hidden, so the buttons have no visible text and no accessible name. WCAG 1.4.1 forbids color as the only way to convey information, and 4.1.2 requires a name.',
    brokenCode: '.jarLabel { display: none; } /* swatch color is the only cue */',
    repairedCode:
      '.keyquest-labels-repaired .jarLabel { display: inline-flex; } /* symbol + name, name is the button text */',
    defaultEducationalFeedback:
      'Repair applied: every jar shows a symbol and its name. The visible name is the button text, so it is also the accessible name (WCAG 2.5.3 Label in Name), and color is no longer the only cue (WCAG 1.4.1).',
    defaultVerificationEvidence:
      'Label check: every ingredient button has a visible label, and its accessible name contains that label.',
    testId: 'defect-color-only',
    repairTestId: 'repair-color-only',
    patches: [
      {
        id: 'color-trap-brighter',
        label: 'Make the colors brighter',
        code: '.jar { filter: saturate(1.8); }',
        isCorrect: false,
        failureDiagnosis:
          'Brighter colors are still colors only. Players who cannot tell them apart, and screen readers, still get no name.',
        mascotReaction: 'Shinier, but still nameless! A screen reader hears “button, button, button”.',
      },
      {
        id: 'color-trap-title',
        label: 'Add a tooltip on hover',
        code: '<button title="Moonpetal">',
        isCorrect: false,
        failureDiagnosis:
          'A title tooltip only appears on mouse hover. Touch and keyboard players never see it, and the jar still looks unlabeled.',
        mascotReaction: 'Hover-only hints vanish for keyboards and touchscreens!',
      },
      {
        id: 'color-fix',
        label: 'Show a name and symbol on each jar',
        code: '<button><span aria-hidden="true">☾</span> Moonpetal</button>',
        isCorrect: true,
        failureDiagnosis: '',
        mascotReaction: 'Now every jar says what it is, in words and symbols!',
      },
    ],
  },
] as const;

export function getCurseByType(type: DefectType): CurseCatalogEntry {
  return (
    CURSE_CATALOG.find((entry) => entry.type === type) ?? CURSE_CATALOG[0]!
  );
}

/** The curses of one room, in that room's canonical order. */
export function getRoomCurses(room: RoomId): CurseCatalogEntry[] {
  return ROOM_DEFECTS[room].map(getCurseByType);
}
