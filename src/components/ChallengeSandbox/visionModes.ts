/** Ghost Vision lenses offered above each room's sandbox. */

import type { GhostVisionMode } from '../MidnightCheckout/MidnightCheckout';

export interface VisionModeDefinition {
  id: GhostVisionMode;
  label: string;
  hint: string;
}

export const CHECKOUT_VISION_MODES: readonly VisionModeDefinition[] = [
  { id: 'normal', label: 'Normal', hint: 'Explore with Tab, Enter, Space, mouse, or touch.' },
  {
    id: 'xray',
    label: 'Screen Reader X-Ray',
    hint: 'Shows what assistive technology hears for each control.',
  },
  { id: 'contrast', label: 'Focus & Contrast', hint: 'Shows contrast ratios and hidden focus rings.' },
];

export const PANTRY_VISION_MODES: readonly VisionModeDefinition[] = [
  { id: 'normal', label: 'Normal', hint: 'Explore with Tab, Enter, Space, mouse, or touch.' },
  {
    id: 'xray',
    label: 'Screen Reader X-Ray',
    hint: 'Shows the name assistive technology hears for each jar.',
  },
  {
    id: 'grayscale',
    label: 'Grayscale',
    hint: 'Shows the shelf without color, the way some players see it.',
  },
];
