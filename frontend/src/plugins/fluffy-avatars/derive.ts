/**
 * The face an agent wears before anybody opens the studio, from its handle.
 *
 * The handle rather than the id or the name, for the reason the console's own
 * generated face uses it: it is frozen at creation, so a rename does not hand an
 * agent somebody else's face, and it exists before the agent does - the create
 * dialog can draw it while somebody is still typing.
 */
import { CHARACTER_IDS, SHAPES, type AvatarStyle } from "./catalog";

/** The `n`th of a non-empty list, wrapping. */
function pick<T>(items: readonly [T, ...T[]], n: number): T {
  return items[n % items.length] ?? items[0];
}

/** Slot 1..10 to a swatch, in the agent menu's order of hues. */
const SLOT_COLOURS = [2, 3, 4, 5, 6, 7, 8, 9, 1, 0] as const;

/** FNV-1a: small, stable across runtimes, and spreads short handles well. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The console's colour slot (1..10, the agent menu's swatches) as one of the
 * plugin's twelve, skipping the two greys: a slot is a hue the owner chose.
 */
export function colourForSlot(slot: number): number {
  return pick(SLOT_COLOURS, slot - 1);
}

export function derivedStyle(slug: string, colorSlot: number | null | undefined): AvatarStyle {
  const h = hash(slug);
  // A third of agents get a named character, the rest a shape in a colour, so a
  // list of agents is a crowd of different creatures rather than six repeats.
  if (h % 3 === 0 && !colorSlot) {
    return {
      character: pick(CHARACTER_IDS, h >>> 2),
      shape: null,
      colour: null,
      expression: "own",
    };
  }
  return {
    character: null,
    shape: pick(SHAPES, h >>> 3),
    colour: colorSlot ? colourForSlot(colorSlot) : 2 + ((h >>> 7) % 8),
    expression: "own",
  };
}
