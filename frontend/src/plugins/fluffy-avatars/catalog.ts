/**
 * What an avatar can be: six characters, eleven shapes, sixteen expressions,
 * twelve colours and an eye size, previewed in seven states and five body transitions. The backend validates the same lists
 * (`backend/plugins/fluffy_avatars/schemas.py`), and `catalog.test.ts` holds the
 * two equal.
 */

export const SHAPES = [
  "circle",
  "pebble",
  "squircle",
  "capsule",
  "triangle",
  "hexagon",
  "cloud",
  "droplet",
  "square",
  "diamond",
  "pentagon",
] as const;
export type Shape = (typeof SHAPES)[number];

/** `own` is not a face of its own: it stands for the character's or the shape's default. */
export const EXPRESSIONS = [
  "own",
  "neutral",
  "attentive",
  "surprised",
  "excited",
  "happy",
  "laughing",
  "angry",
  "sad",
  "scared",
  "suspicious",
  "confused",
  "curious",
  "proud",
  "shy",
  "unimpressed",
  "sleepy",
] as const;
export type Expression = (typeof EXPRESSIONS)[number];
export type Face = Exclude<Expression, "own">;

/** What the agent is doing, drawn over the face. Not stored: the console decides it. */
export const STATES = [
  "idle",
  "wink",
  "wideEyes",
  "thinking",
  "notification",
  "asleep",
  "failed",
] as const;
export type AvatarState = (typeof STATES)[number];

/** Fur colours, by swatch index 0..11 - the index is what a style stores. */
export const COLOURS = [
  "#4a4a55",
  "#9a6440",
  "#e8383f",
  "#f2682a",
  "#f4c22b",
  "#36c26a",
  "#17b3a3",
  "#3b7be8",
  "#7b3fe4",
  "#e83f9a",
  "#8f8f99",
  "#d4d4dc",
] as const;

export interface Character {
  shape: Shape;
  colour: string;
  face: Face;
  /** Degrees to turn the body: Vita stands its hexagon on a corner. */
  turn?: number;
}

/** A character keeps its own colour; picking a shape instead is what tints. */
export const CHARACTERS = {
  nexo: { shape: "squircle", colour: "#f25a24", face: "angry" },
  vita: { shape: "hexagon", colour: "#36c26a", face: "suspicious", turn: 30 },
  cloe: { shape: "triangle", colour: "#ef3d8f", face: "proud" },
  malu: { shape: "circle", colour: "#7c3aed", face: "confused" },
  yoshi: { shape: "capsule", colour: "#ef3b3b", face: "unimpressed" },
  fred: { shape: "hexagon", colour: "#f6c12b", face: "surprised" },
} as const satisfies Record<string, Character>;
export type CharacterId = keyof typeof CHARACTERS;
export const CHARACTER_IDS = [
  "nexo",
  "vita",
  "cloe",
  "malu",
  "yoshi",
  "fred",
] as const satisfies readonly CharacterId[];

/** The face a bare shape wears when its style says `own`. */
export const SHAPE_FACE: Face = "neutral";

/** How the studio's portrait moves when its body changes. A preview, like the state: not stored. */
export const TRANSITIONS = ["flip", "pop", "warp", "dissolve", "cut"] as const;
export type Transition = (typeof TRANSITIONS)[number];

/** One agent's stored choices, as the plugin's API answers them. */
export interface AvatarStyle {
  character: CharacterId | null;
  shape: Shape | null;
  colour: number | null;
  expression: Expression;
  /** The eyes' scale; a style saved before the slider existed draws at 1. */
  eye_size?: number;
}
