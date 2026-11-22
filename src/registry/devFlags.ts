/**
 * Development flags read from the page address.
 *
 * `?preview=courtyard` opens the Moonlit Courtyard before the full route exists.
 * `?built=clocktower` marks the Clocktower room as built for the session.
 * Both are read only when `import.meta.env.DEV` is true. Vite replaces that value
 * at build time, so a production build parses nothing and exposes no address that
 * activates either flag.
 */

import type { RoomId } from '../types';

export interface DevFlags {
  preview: 'courtyard' | null;
  built: ReadonlySet<RoomId>;
}

const BUILDABLE_ROOMS: readonly RoomId[] = ['clocktower'];

/** Pure parser for a query string such as `?preview=courtyard&built=clocktower`. */
export function readDevFlags(search: string): DevFlags {
  const params = new URLSearchParams(search);
  const preview = params.getAll('preview').includes('courtyard') ? 'courtyard' : null;
  const built = new Set<RoomId>();
  for (const value of params.getAll('built')) {
    const room = BUILDABLE_ROOMS.find((id) => id === value);
    if (room) built.add(room);
  }
  return { preview, built };
}

export const DEV_FLAGS: DevFlags = import.meta.env.DEV
  ? readDevFlags(typeof window === 'undefined' ? '' : window.location.search)
  : { preview: null, built: new Set<RoomId>() };
