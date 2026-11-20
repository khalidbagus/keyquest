/**
 * Mascot Registry
 * All 10 KeyQuest v2 Rive characters sharing the CharacterController
 * state machine and ViewModel contract (reducedMotion + 5 reaction triggers).
 */

export type MascotId =
  | 'pumpkin_ghost'
  | 'plague_doctor_ghost'
  | 'kawaii_devil_ghost'
  | 'ghost_bat_superhero'
  | 'midnight_black_cat_ghost'
  | 'dracula_ghost'
  | 'moonlit_mummy'
  | 'purple_ghost_reaper'
  | 'skeleton_ghost'
  | 'cute_zombie_ghost';

export type MascotTriggerName =
  | 'greet'
  | 'celebrate'
  | 'reactFailure'
  | 'requestAttention'
  | 'reset';

export interface MascotDefinition {
  id: MascotId;
  name: string;
  title: string;
  artboard: string;
  stateMachine: 'CharacterController';
  rivUrl: string;
  posterUrl: string;
  signatureAction: string;
  signatureDescription: string;
  accentColor: string;
  greetingLine: string;
  celebrationLine: string;
}

export const DEFAULT_COMPANION_ID: MascotId = 'pumpkin_ghost';
export const HINT_KEEPER_ID: MascotId = 'plague_doctor_ghost';

export const MASCOT_ROSTER: readonly MascotDefinition[] = [
  {
    id: 'pumpkin_ghost',
    name: 'Pumpkin Ghost',
    title: 'Lantern Sprout',
    artboard: 'Pumpkin Ghost',
    stateMachine: 'CharacterController',
    rivUrl: '/rive/pumpkin_ghost.riv',
    posterUrl: '/rive/posters/pumpkin_ghost.png',
    signatureAction: 'Pumpkin Escape',
    signatureDescription: 'Launches straight out of its jack-o-lantern shell as the lid flies clear.',
    accentColor: '#fb923c',
    greetingLine: 'Peek-a-boo! Ready to banish the four curses haunting Midnight Checkout?',
    celebrationLine: 'Pop! That curse is toasted — Pumpkin Escape!',
  },
  {
    id: 'plague_doctor_ghost',
    name: 'Plague Doctor Ghost',
    title: 'Hint Keeper',
    artboard: 'Plague Doctor Ghost',
    stateMachine: 'CharacterController',
    rivUrl: '/rive/plague_doctor_ghost.riv',
    posterUrl: '/rive/posters/plague_doctor_ghost.png',
    signatureAction: 'Lantern Search',
    signatureDescription: 'Raises its glowing apothecary lantern to illuminate hidden WCAG barriers.',
    accentColor: '#fbbf24',
    greetingLine: 'My lantern reveals every hidden barrier. Ask for a hint whenever you wish.',
    celebrationLine: 'A clean diagnosis — the accessibility barrier has been cured!',
  },
  {
    id: 'kawaii_devil_ghost',
    name: 'Kawaii Devil Ghost',
    title: 'Mischief Imp',
    artboard: 'Kawaii Devil Ghost',
    stateMachine: 'CharacterController',
    rivUrl: '/rive/kawaii_devil_ghost.riv',
    posterUrl: '/rive/posters/kawaii_devil_ghost.png',
    signatureAction: 'Trident Flourish',
    signatureDescription: 'Sweeps its ruby trident across the stage with a mischievous wing flourish.',
    accentColor: '#f43f5e',
    greetingLine: 'Hehehe! Let’s poke at this cursed checkout until every bug confesses!',
    celebrationLine: 'Trident Flourish! Another inaccessible curse zapped!',
  },
  {
    id: 'ghost_bat_superhero',
    name: 'Ghost Bat Superhero',
    title: 'Keyboard Crusader',
    artboard: 'Ghost Bat Superhero',
    stateMachine: 'CharacterController',
    rivUrl: '/rive/ghost_bat_superhero.riv',
    posterUrl: '/rive/posters/ghost_bat_superhero.png',
    signatureAction: 'Cape-Powered Takeoff',
    signatureDescription: 'Snaps its violet bat-cape open and rockets upward in a heroic bank.',
    accentColor: '#a855f7',
    greetingLine: 'Citizen! Tab-key justice never sleeps. Let’s rescue this checkout!',
    celebrationLine: 'Up, up, and accessible! Cape-Powered Takeoff!',
  },
  {
    id: 'midnight_black_cat_ghost',
    name: 'Midnight Black Cat Ghost',
    title: 'Shadow Pouncer',
    artboard: 'Midnight Black Cat Ghost',
    stateMachine: 'CharacterController',
    rivUrl: '/rive/midnight_black_cat_ghost.riv',
    posterUrl: '/rive/posters/midnight_black_cat_ghost.png',
    signatureAction: 'Aerial Pounce',
    signatureDescription: 'Crouches, leaps into an aerial pounce, and curls its tail to brake cleanly.',
    accentColor: '#f472b6',
    greetingLine: 'Mrrrow! My night vision spots low-contrast curses from a mile away.',
    celebrationLine: 'Purr-fect landing! That accessibility bug never stood a chance!',
  },
  {
    id: 'dracula_ghost',
    name: 'Dracula Ghost',
    title: 'Count of Contrast',
    artboard: 'Dracula Ghost',
    stateMachine: 'CharacterController',
    rivUrl: '/rive/dracula_ghost.riv',
    posterUrl: '/rive/posters/dracula_ghost.png',
    signatureAction: 'Cape Vanish & Reveal',
    signatureDescription: 'Wraps into its crimson-lined cape, glides sideways, and bows dramatically.',
    accentColor: '#ec4899',
    greetingLine: 'Good evening! Even creatures of the night deserve 4.5:1 contrast!',
    celebrationLine: 'Magnificent! Behold the Cape Vanish and Reveal!',
  },
  {
    id: 'moonlit_mummy',
    name: 'Moonlit Mummy',
    title: 'Wrap Tactician',
    artboard: 'Moonlit Mummy',
    stateMachine: 'CharacterController',
    rivUrl: '/rive/moonlit_mummy.riv',
    posterUrl: '/rive/posters/moonlit_mummy.png',
    signatureAction: 'Unravel & Rewind',
    signatureDescription: 'Catches a loose bandage into a joyful tumble before rewinding neatly.',
    accentColor: '#fcd34d',
    greetingLine: 'Untangling broken DOM markup is my specialty — let’s unwrap these curses!',
    celebrationLine: 'All wrapped up! Unravel and Rewind complete!',
  },
  {
    id: 'purple_ghost_reaper',
    name: 'Purple Ghost Reaper',
    title: 'Bug Harvester',
    artboard: 'Purple Ghost Reaper',
    stateMachine: 'CharacterController',
    rivUrl: '/rive/purple_ghost_reaper.riv',
    posterUrl: '/rive/posters/purple_ghost_reaper.png',
    signatureAction: 'Scythe-Led Aerial Turn',
    signatureDescription: 'Lifts its crescent scythe and banks through trailing purple wisps.',
    accentColor: '#c084fc',
    greetingLine: 'I have come to harvest broken focus rings and unnamed buttons.',
    celebrationLine: 'Clean sweep! Another accessibility curse reaped!',
  },
  {
    id: 'skeleton_ghost',
    name: 'Skeleton Ghost',
    title: 'Semantic Bones',
    artboard: 'Skeleton Ghost',
    stateMachine: 'CharacterController',
    rivUrl: '/rive/skeleton_ghost.riv',
    posterUrl: '/rive/posters/skeleton_ghost.png',
    signatureAction: 'Two-Bone Juggle',
    signatureDescription: 'Tosses both bones sky-high, catches them cleanly, and raises a victory V.',
    accentColor: '#c4b5fd',
    greetingLine: 'Good semantic HTML is the skeleton of every accessible app!',
    celebrationLine: 'No bones about it — Two-Bone Juggle victory!',
  },
  {
    id: 'cute_zombie_ghost',
    name: 'Cute Zombie Ghost',
    title: 'Braaains & ARIA',
    artboard: 'Cute Zombie Ghost',
    stateMachine: 'CharacterController',
    rivUrl: '/rive/cute_zombie_ghost.riv',
    posterUrl: '/rive/posters/cute_zombie_ghost.png',
    signatureAction: 'Lurch into Flight',
    signatureDescription: 'Reaches both arms forward and glides in a wobbly, cheerful ghost flight.',
    accentColor: '#86efac',
    greetingLine: 'Braaains... and proper ARIA labels! Let’s revive this broken shop!',
    celebrationLine: 'It’s alive and accessible! Lurch into Flight!',
  },
] as const;

export function getMascotById(id: string | null | undefined): MascotDefinition {
  return (
    MASCOT_ROSTER.find((mascot) => mascot.id === id) ??
    MASCOT_ROSTER[0]!
  );
}

export function isMascotId(value: string): value is MascotId {
  return MASCOT_ROSTER.some((mascot) => mascot.id === value);
}
