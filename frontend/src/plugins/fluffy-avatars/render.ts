/**
 * A furry avatar as SVG markup: a body shape, a pair of eyes, and a state drawn
 * over them.
 *
 * Markup rather than JSX so one function serves the console, the studio's
 * previews and the preview sheet a test renders - and every value in it comes
 * from the tables in `catalog.ts`, never from a request, so injecting it is
 * injecting our own drawing.
 *
 * The fur is two SVG filters on one path: fractal noise displacing the edge (the
 * fuzz) and a finer noise blended into the fill (the strands), over a radial
 * gradient that lights the body from the top left. Everything is drawn in a
 * 100x100 box and scales with the element.
 */
import {
  CHARACTERS,
  COLOURS,
  SHAPE_FACE,
  type AvatarState,
  type AvatarStyle,
  type Face,
  type Shape,
} from "./catalog";

type Point = readonly [number, number];

/** A point `r` from `p` toward `q`, never past their midpoint. */
function toward(p: Point, q: Point, r: number): string {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const length = Math.hypot(dx, dy);
  const t = Math.min(r, length / 2) / length;
  return `${(p[0] + dx * t).toFixed(2)} ${(p[1] + dy * t).toFixed(2)}`;
}

/** A polygon whose corners are rounded with radius `r`. */
function roundedPolygon(points: readonly Point[], r: number): string {
  const n = points.length;
  let d = "";
  points.forEach((p, i) => {
    const previous = points[(i - 1 + n) % n] ?? p;
    const next = points[(i + 1) % n] ?? p;
    d += `${i === 0 ? "M" : "L"}${toward(p, previous, r)}Q${p[0]} ${p[1]} ${toward(p, next, r)}`;
  });
  return `${d}Z`;
}

function regular(sides: number, cx: number, cy: number, radius: number): Point[] {
  return Array.from({ length: sides }, (_, k) => {
    const angle = (-90 + (360 / sides) * k) * (Math.PI / 180);
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as const;
  });
}

/** Each shape's outline, and where its eyes sit: the centre line and the gap between them. */
const BODIES: Record<Shape, { d: string; eyeY: number; gap: number }> = {
  circle: { d: "M50 14a38 38 0 1 1 0 76a38 38 0 1 1 0-76Z", eyeY: 50, gap: 16 },
  pebble: {
    d: "M50 17C74 15 90 32 89 55C88 77 70 89 48 88C26 87 11 74 12 52C13 31 27 18 50 17Z",
    eyeY: 51,
    gap: 16,
  },
  squircle: {
    d: "M50 14C80 14 88 22 88 52C88 82 80 90 50 90C20 90 12 82 12 52C12 22 20 14 50 14Z",
    eyeY: 50,
    gap: 17,
  },
  capsule: { d: "M31 29H69A23 23 0 0 1 69 75H31A23 23 0 0 1 31 29Z", eyeY: 52, gap: 17 },
  triangle: {
    d: roundedPolygon(
      [
        [50, 12],
        [92, 86],
        [8, 86],
      ],
      17,
    ),
    eyeY: 64,
    gap: 14,
  },
  hexagon: { d: roundedPolygon(regular(6, 50, 52, 41), 11), eyeY: 52, gap: 16 },
  cloud: {
    d: "M27 82A15 15 0 0 1 15 56A17 17 0 0 1 33 35A19 19 0 0 1 68 31A17 17 0 0 1 86 54A15 15 0 0 1 74 82Z",
    eyeY: 58,
    gap: 16,
  },
  droplet: {
    d: "M50 10C61 27 84 43 84 62A34 34 0 0 1 16 62C16 43 39 27 50 10Z",
    eyeY: 63,
    gap: 15,
  },
  square: {
    d: roundedPolygon(
      [
        [15, 16],
        [85, 16],
        [85, 86],
        [15, 86],
      ],
      13,
    ),
    eyeY: 51,
    gap: 17,
  },
  diamond: {
    d: roundedPolygon(
      [
        [50, 8],
        [93, 52],
        [50, 96],
        [7, 52],
      ],
      15,
    ),
    eyeY: 52,
    gap: 14,
  },
  pentagon: { d: roundedPolygon(regular(5, 50, 55, 43), 12), eyeY: 57, gap: 16 },
};

/** One eye: a pill (rounded bar), an arc (a closed, smiling eye) or a lid line. */
type Eye =
  | { kind: "pill"; w: number; h: number; rot?: number; dx?: number; dy?: number }
  | { kind: "arc"; w: number; up: boolean; dy?: number }
  | { kind: "line"; w: number; rot?: number; dy?: number };

/** The two eyes for a face, left then right. */
const FACES: Record<Face, readonly [Eye, Eye]> = {
  neutral: [
    { kind: "pill", w: 7, h: 13 },
    { kind: "pill", w: 7, h: 13 },
  ],
  attentive: [
    { kind: "pill", w: 9, h: 17 },
    { kind: "pill", w: 9, h: 17 },
  ],
  surprised: [
    { kind: "pill", w: 11, h: 14 },
    { kind: "pill", w: 11, h: 14 },
  ],
  excited: [
    { kind: "pill", w: 9, h: 19, dy: -3 },
    { kind: "pill", w: 9, h: 19, dy: -3 },
  ],
  happy: [
    { kind: "arc", w: 12, up: true },
    { kind: "arc", w: 12, up: true },
  ],
  laughing: [
    { kind: "arc", w: 14, up: true, dy: -1 },
    { kind: "arc", w: 14, up: true, dy: -1 },
  ],
  angry: [
    { kind: "pill", w: 8, h: 14, rot: -32 },
    { kind: "pill", w: 8, h: 14, rot: 32 },
  ],
  sad: [
    { kind: "pill", w: 7, h: 12, rot: 26, dy: 3 },
    { kind: "pill", w: 7, h: 12, rot: -26, dy: 3 },
  ],
  scared: [
    { kind: "pill", w: 12, h: 19, dx: 2 },
    { kind: "pill", w: 12, h: 19, dx: -2 },
  ],
  suspicious: [
    { kind: "pill", w: 8, h: 9, dx: 4 },
    { kind: "line", w: 12, dy: -1 },
  ],
  confused: [
    { kind: "pill", w: 9, h: 16 },
    { kind: "pill", w: 6, h: 8, dy: 3 },
  ],
  curious: [
    { kind: "pill", w: 8, h: 15, dx: 3, dy: -3 },
    { kind: "pill", w: 8, h: 15, dx: 3, dy: -3 },
  ],
  proud: [
    { kind: "line", w: 12, rot: 10, dy: -1 },
    { kind: "line", w: 12, rot: -10, dy: -1 },
  ],
  shy: [
    { kind: "pill", w: 6, h: 9, dx: -2, dy: 4 },
    { kind: "pill", w: 6, h: 9, dx: -2, dy: 4 },
  ],
  unimpressed: [
    { kind: "line", w: 13, dy: 1 },
    { kind: "line", w: 13, dy: 1 },
  ],
  sleepy: [
    { kind: "pill", w: 6, h: 6, dy: 4 },
    { kind: "pill", w: 6, h: 6, dy: 4 },
  ],
};

const EYE_FILL = "#fbf7ee";

/** The tables above are drawn at this scale: big eyes are most of the character. */
const EYE_SCALE = 1.4;

function eyeMarkup(eye: Eye, cx: number, cy: number): string {
  const k = EYE_SCALE;
  if (eye.kind === "pill") {
    const x = cx + (eye.dx ?? 0) * k;
    const y = cy + (eye.dy ?? 0) * k;
    const [w, h] = [eye.w * k, eye.h * k];
    return `<rect class="ff-eye" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${w / 2}" fill="${EYE_FILL}" transform="rotate(${eye.rot ?? 0} ${x} ${y})"/>`;
  }
  if (eye.kind === "line") {
    const y = cy + (eye.dy ?? 0) * k;
    const w = eye.w * k;
    return `<rect class="ff-eye" x="${cx - w / 2}" y="${y - 3.2}" width="${w}" height="6.4" rx="3.2" fill="${EYE_FILL}" transform="rotate(${eye.rot ?? 0} ${cx} ${y})"/>`;
  }
  const y = cy + (eye.dy ?? 0) * k + (eye.up ? 3 : -3);
  const half = (eye.w * k) / 2;
  const sweep = eye.up ? 1 : 0;
  return `<path class="ff-eye" d="M${cx - half} ${y}A${half} ${half * 0.85} 0 0 ${sweep} ${cx + half} ${y}" fill="none" stroke="${EYE_FILL}" stroke-width="6" stroke-linecap="round"/>`;
}

/** Mix a `#rrggbb` toward white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return `#${channels
    .map((c) => Math.round(c + (target - c) * t))
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Halfway to grey, for an agent whose last run failed. */
function desaturate(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const grey = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
  return `#${[r, g, b]
    .map((c) => Math.round(c + (grey - c) * 0.6))
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

export interface ResolvedAvatar {
  shape: Shape;
  colour: string;
  face: Face;
}

/** A stored style as something drawable: the character's body, or the shape in its colour. */
export function resolveStyle(style: AvatarStyle, fallbackColour: string): ResolvedAvatar {
  if (style.character) {
    const character = CHARACTERS[style.character];
    return {
      shape: character.shape,
      colour: character.colour,
      face: style.expression === "own" ? character.face : style.expression,
    };
  }
  return {
    shape: style.shape ?? "circle",
    colour: (style.colour === null ? undefined : COLOURS[style.colour]) ?? fallbackColour,
    face: style.expression === "own" ? SHAPE_FACE : style.expression,
  };
}

/** The face a state draws, whatever the style's own one is. */
function stateFace(face: Face, state: AvatarState): Face {
  if (state === "thinking") return "curious";
  if (state === "notification") return "attentive";
  if (state === "failed") return "sad";
  return face;
}

function eyes(face: Face, state: AvatarState, shape: Shape): string {
  const { eyeY, gap } = BODIES[shape];
  let [left, right] = FACES[face];
  if (state === "wideEyes") {
    left = { kind: "pill", w: 12, h: 21 };
    right = { kind: "pill", w: 12, h: 21 };
  }
  if (state === "asleep") {
    left = { kind: "arc", w: 12, up: false };
    right = { kind: "arc", w: 12, up: false };
  }
  if (state === "wink") right = { kind: "line", w: 12, rot: -8 };
  return eyeMarkup(left, 50 - gap, eyeY) + eyeMarkup(right, 50 + gap, eyeY);
}

function overlay(state: AvatarState, colour: string): string {
  if (state === "thinking") {
    const dot = shade(colour, -0.15);
    return `<g class="ff-thinking"><circle cx="70" cy="9" r="3.2" fill="${dot}"/><circle cx="80" cy="7" r="3.6" fill="${dot}"/><circle cx="90" cy="5" r="4" fill="${dot}"/></g>`;
  }
  if (state === "notification") {
    return `<circle class="ff-ping" cx="82" cy="20" r="8.5" fill="#2f8cff" stroke="#ffffff" stroke-width="3"/>`;
  }
  if (state === "asleep") {
    const z = shade(colour, -0.1);
    return `<g class="ff-zzz" fill="none" stroke="${z}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M72 14h7l-7 8h7"/><path d="M83 4h5l-5 6h5"/></g>`;
  }
  return "";
}

export interface FluffyOptions {
  /** Unique within the page: filter and gradient ids are document-global. */
  id: string;
  state?: AvatarState;
  /** A soft disc behind the body, where the console frames avatars in a circle. */
  framed?: boolean;
}

/** The whole avatar, as an `<svg>` string sized by its container. */
export function fluffySvg(
  avatar: ResolvedAvatar,
  { id, state = "idle", framed = false }: FluffyOptions,
): string {
  const base = state === "failed" ? desaturate(avatar.colour) : avatar.colour;
  const face = stateFace(avatar.face, state);
  const body = BODIES[avatar.shape];
  const disc = framed ? `<circle cx="50" cy="50" r="50" fill="${shade(base, 0.82)}"/>` : "";
  return [
    `<svg class="ff" viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false" data-state="${state}">`,
    "<defs>",
    `<radialGradient id="${id}-g" cx="36%" cy="28%" r="78%">`,
    `<stop offset="0" stop-color="${shade(base, 0.38)}"/>`,
    `<stop offset="0.5" stop-color="${base}"/>`,
    `<stop offset="1" stop-color="${shade(base, -0.38)}"/>`,
    "</radialGradient>",
    `<filter id="${id}-f" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">`,
    '<feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="2" seed="4" result="edge"/>',
    '<feDisplacementMap in="SourceGraphic" in2="edge" scale="7" xChannelSelector="R" yChannelSelector="G" result="body"/>',
    '<feTurbulence type="fractalNoise" baseFrequency="1.1 1.6" numOctaves="3" seed="9" result="grain"/>',
    '<feColorMatrix in="grain" type="saturate" values="0" result="grey"/>',
    '<feComposite in="grey" in2="body" operator="in" result="strands"/>',
    '<feBlend in="strands" in2="body" mode="overlay" result="furry"/>',
    '<feComposite in="furry" in2="body" operator="in"/>',
    "</filter>",
    "</defs>",
    disc,
    `<g class="ff-body"><path d="${body.d}" fill="url(#${id}-g)" filter="url(#${id}-f)"/>`,
    `<g class="ff-eyes">${eyes(face, state, avatar.shape)}</g></g>`,
    overlay(state, base),
    "</svg>",
  ].join("");
}
