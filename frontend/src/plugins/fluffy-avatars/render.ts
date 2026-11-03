/**
 * A furry avatar as SVG markup: a body shape, a pair of eyes, and a state drawn
 * over them.
 *
 * Markup rather than JSX so one function serves the console, the studio's
 * previews and the preview sheet a test renders - and every value in it comes
 * from the tables in `catalog.ts`, never from a request, so injecting it is
 * injecting our own drawing.
 *
 * The fur is one SVG filter on one path, matched by eye against the plush in the
 * reference video: fine noise pushes the edge out into hairs with a faint halo of
 * loose fibres past it, and the surface takes ridged noise as tufts - combed by a
 * finer noise so their edges read as strands - laid in by soft light over a
 * radial gradient lit from the top left. The eyes are cream felt with a fine
 * grain and a soft shadow into the fur. Everything is drawn in a 100x100 box and
 * scales with the element.
 */
import {
  CHARACTERS,
  COLOURS,
  SHAPE_FACE,
  type AvatarState,
  type AvatarStyle,
  type Character,
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

function regular(sides: number, cx: number, cy: number, radius: number, start = -90): Point[] {
  return Array.from({ length: sides }, (_, k) => {
    const angle = (start + (360 / sides) * k) * (Math.PI / 180);
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
  // Flat on top and bottom, as the studio draws it; Vita turns it onto a corner.
  hexagon: { d: roundedPolygon(regular(6, 50, 52, 42, 0), 11), eyeY: 52, gap: 16 },
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

/** Cream felt, lit from the top left like the fur around it. */
const EYE_FILL = "#fbf6ec";
const EYE_SHADE = "#dcd2c0";

/** The tables above are drawn at this scale: big eyes are most of the character. */
const EYE_SCALE = 1.4;

/** The studio's eye-size slider: how far a style may shrink or grow the eyes. */
export const EYE_SIZE_MIN = 0.7;
export const EYE_SIZE_MAX = 1.6;

/**
 * An eye turned about its own centre. The turn sits on a wrapping group, not on
 * the eye: `.ff-eye` carries a CSS `transform-origin` for its blink, and a CSS
 * origin moves the pivot of a `transform` attribute on the same element - which
 * threw every slanted eye off the body.
 */
function turned(markup: string, rot: number | undefined, x: number, y: number): string {
  return rot ? `<g transform="rotate(${rot} ${x} ${y})">${markup}</g>` : markup;
}

function eyeMarkup(eye: Eye, cx: number, cy: number, size: number): string {
  const k = EYE_SCALE * size;
  if (eye.kind === "pill") {
    const x = cx + (eye.dx ?? 0) * k;
    const y = cy + (eye.dy ?? 0) * k;
    const [w, h] = [eye.w * k, eye.h * k];
    return turned(
      `<rect class="ff-eye" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${w / 2}" stroke="none"/>`,
      eye.rot,
      x,
      y,
    );
  }
  if (eye.kind === "line") {
    const y = cy + (eye.dy ?? 0) * k;
    const w = eye.w * k;
    return turned(
      `<rect class="ff-eye" x="${cx - w / 2}" y="${y - 3.2 * size}" width="${w}" height="${6.4 * size}" rx="${3.2 * size}" stroke="none"/>`,
      eye.rot,
      cx,
      y,
    );
  }
  const y = cy + (eye.dy ?? 0) * k + (eye.up ? 3 : -3);
  const half = (eye.w * k) / 2;
  const sweep = eye.up ? 1 : 0;
  return `<path class="ff-eye" d="M${cx - half} ${y}A${half} ${half * 0.85} 0 0 ${sweep} ${cx + half} ${y}" fill="none" stroke-width="${6 * size}" stroke-linecap="round"/>`;
}

/** A component transfer applying one linear curve to R, G and B. */
function grey(slope: number, intercept: number): string {
  return ["R", "G", "B"]
    .map((c) => `<feFunc${c} type="linear" slope="${slope}" intercept="${intercept}"/>`)
    .join("");
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
  /** Degrees the body is turned, for a character whose body sits on a corner. */
  turn?: number;
  /** The eyes' scale, 1 by default. */
  eyeSize?: number;
}

/** A stored style as something drawable: the character's body, or the shape in its colour. */
export function resolveStyle(style: AvatarStyle, fallbackColour: string): ResolvedAvatar {
  if (style.character) {
    const character: Character = CHARACTERS[style.character];
    return {
      shape: character.shape,
      colour: character.colour,
      face: style.expression === "own" ? character.face : style.expression,
      turn: character.turn,
      eyeSize: style.eye_size,
    };
  }
  return {
    shape: style.shape ?? "circle",
    colour: (style.colour === null ? undefined : COLOURS[style.colour]) ?? fallbackColour,
    face: style.expression === "own" ? SHAPE_FACE : style.expression,
    eyeSize: style.eye_size,
  };
}

/** The face a state draws, whatever the style's own one is. */
function stateFace(face: Face, state: AvatarState): Face {
  if (state === "thinking") return "curious";
  if (state === "notification") return "attentive";
  if (state === "failed") return "sad";
  return face;
}

function eyes(face: Face, state: AvatarState, shape: Shape, size: number): string {
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
  // Writing, the eyes drop to the page in its lower corner, where the pencil is.
  const [dx, dy] = state === "writing" ? [2.5, 5] : [0, 0];
  return (
    eyeMarkup(left, 50 - gap + dx, eyeY + dy, size) +
    eyeMarkup(right, 50 + gap + dx, eyeY + dy, size)
  );
}

function overlay(state: AvatarState, colour: string): string {
  if (state === "thinking") {
    const dot = shade(colour, -0.15);
    return `<g class="ff-thinking"><circle cx="70" cy="9" r="3.2" fill="${dot}"/><circle cx="80" cy="7" r="3.6" fill="${dot}"/><circle cx="90" cy="5" r="4" fill="${dot}"/></g>`;
  }
  if (state === "writing") {
    const ink = shade(colour, -0.35);
    return [
      // The line being written, drawn in by CSS and then started again.
      `<path class="ff-ink" d="M40 95q4-5 8 0t8 0t8 0t8 0" pathLength="100" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`,
      `<g class="ff-pencil"><g transform="rotate(35 84 82)">`,
      '<rect x="80" y="60" width="8.5" height="24" rx="1.6" fill="#ffc83d" stroke="#2b2b2b" stroke-width="1.3"/>',
      '<rect x="80" y="57" width="8.5" height="5" rx="1.6" fill="#ff8fa3" stroke="#2b2b2b" stroke-width="1.3"/>',
      '<path d="M80 84l4.25 8l4.25-8z" fill="#f3d9b1" stroke="#2b2b2b" stroke-width="1.3" stroke-linejoin="round"/>',
      '<path d="M83 89.6l1.25 2.4l1.25-2.4z" fill="#2b2b2b"/>',
      "</g></g>",
    ].join("");
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
  const eyeSize = Math.min(EYE_SIZE_MAX, Math.max(EYE_SIZE_MIN, avatar.eyeSize ?? 1));
  const disc = framed ? `<circle cx="50" cy="50" r="50" fill="${shade(base, 0.82)}"/>` : "";
  const turn = avatar.turn ? ` transform="rotate(${avatar.turn} 50 52)"` : "";
  return [
    `<svg class="ff" viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false" data-state="${state}">`,
    "<defs>",
    // Soft studio light from the top left: plush reads as evenly lit, not glossy.
    `<radialGradient id="${id}-g" cx="38%" cy="30%" r="75%">`,
    `<stop offset="0" stop-color="${shade(base, 0.24)}"/>`,
    `<stop offset="0.5" stop-color="${base}"/>`,
    `<stop offset="1" stop-color="${shade(base, -0.45)}"/>`,
    "</radialGradient>",
    `<linearGradient id="${id}-e" x1="0" y1="0" x2="0.6" y2="1">`,
    `<stop offset="0" stop-color="${EYE_FILL}"/><stop offset="1" stop-color="${EYE_SHADE}"/>`,
    "</linearGradient>",
    `<filter id="${id}-f" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">`,
    // The rim: fine, high-frequency noise pushes the edge out into hairs, and a
    // breath of blur keeps them hairs rather than pixels.
    '<feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="3" seed="3" result="hairs"/>',
    '<feDisplacementMap in="SourceGraphic" in2="hairs" scale="8" xChannelSelector="R" yChannelSelector="G" result="rim"/>',
    '<feGaussianBlur in="rim" stdDeviation="0.3" result="fur"/>',
    // A translucent halo of loose fibres just past the rim.
    '<feGaussianBlur in="rim" stdDeviation="1" result="halo"/>',
    '<feComponentTransfer in="halo" result="haze"><feFuncA type="linear" slope="0.4"/></feComponentTransfer>',
    // The surface: tufts (ridged noise, darker in the creases between them), then
    // fine hairs over the tufts - both greys, laid into the colour by soft light.
    '<feTurbulence type="turbulence" baseFrequency="0.42" numOctaves="2" seed="5" result="tufts"/>',
    '<feColorMatrix in="tufts" type="saturate" values="0" result="tuftGrey"/>',
    '<feTurbulence type="fractalNoise" baseFrequency="2.2 1.2" numOctaves="2" seed="9" result="grain"/>',
    // Combed by the hair noise, the tufts' edges become strands rather than blobs.
    '<feDisplacementMap in="tuftGrey" in2="grain" scale="5" xChannelSelector="R" yChannelSelector="G" result="combed"/>',
    `<feComponentTransfer in="combed" result="tuftTone">${grey(2.6, -0.3)}</feComponentTransfer>`,
    '<feBlend in="tuftTone" in2="fur" mode="soft-light" result="tufted"/>',
    '<feColorMatrix in="grain" type="saturate" values="0" result="grey"/>',
    `<feComponentTransfer in="grey" result="tone">${grey(1.1, -0.12)}</feComponentTransfer>`,
    '<feBlend in="tone" in2="tufted" mode="soft-light" result="plush"/>',
    '<feColorMatrix in="plush" type="saturate" values="1.25" result="rich"/>',
    '<feComposite in="rich" in2="fur" operator="in" result="body"/>',
    '<feMerge><feMergeNode in="haze"/><feMergeNode in="body"/></feMerge>',
    "</filter>",
    // Felt eyes: a fine grain in the cream, and a soft shadow into the fur beneath.
    `<filter id="${id}-s" x="-30%" y="-30%" width="160%" height="170%" color-interpolation-filters="sRGB">`,
    '<feTurbulence type="fractalNoise" baseFrequency="2.8" numOctaves="2" seed="7" result="felt"/>',
    '<feColorMatrix in="felt" type="saturate" values="0" result="feltGrey"/>',
    `<feComponentTransfer in="feltGrey" result="feltTone">${grey(0.6, 0.2)}</feComponentTransfer>`,
    '<feBlend in="feltTone" in2="SourceGraphic" mode="soft-light" result="felted"/>',
    '<feComposite in="felted" in2="SourceGraphic" operator="in" result="eyes"/>',
    `<feDropShadow in="SourceAlpha" dx="0.4" dy="1.1" stdDeviation="0.9" flood-color="${shade(base, -0.6)}" flood-opacity="0.55" result="shadow"/>`,
    '<feMerge><feMergeNode in="shadow"/><feMergeNode in="eyes"/></feMerge>',
    "</filter>",
    "</defs>",
    disc,
    `<g class="ff-body"><path d="${body.d}" fill="url(#${id}-g)" filter="url(#${id}-f)"${turn}/>`,
    `<g class="ff-eyes" filter="url(#${id}-s)" fill="url(#${id}-e)" stroke="url(#${id}-e)">${eyes(face, state, avatar.shape, eyeSize)}</g></g>`,
    overlay(state, base),
    "</svg>",
  ].join("");
}
