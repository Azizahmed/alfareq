"use client";

import { useId, useMemo } from "react";

import { cn } from "@/lib/utils";

import type { AvatarState, AvatarStyle } from "./catalog";
import { fluffySvg, resolveStyle } from "./render";

/** The colour a bare shape takes when its style picks none: the console's violet. */
const DEFAULT_COLOUR = "#7b3fe4";

export interface FluffyFaceProps {
  style: AvatarStyle;
  state?: AvatarState;
  framed?: boolean;
  /** Move all the time rather than on hover, as an agent at work does. */
  animate?: boolean;
  className?: string;
}

/**
 * One furry avatar, sized by its container.
 *
 * Decorative, like the console's own generated face: it is always drawn beside
 * the name it stands for, so naming it again would be the name read twice.
 */
export function FluffyFace({
  style,
  state = "idle",
  framed = false,
  animate = false,
  className,
}: FluffyFaceProps) {
  // Filter and gradient ids are global to the document; React's id is unique per
  // instance but may hold characters a `url(#...)` reference does not survive.
  const id = `ff${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const markup = useMemo(
    () => fluffySvg(resolveStyle(style, DEFAULT_COLOUR), { id, state, framed }),
    [style, state, framed, id],
  );
  return (
    <span
      aria-hidden
      data-animate={animate || state === "thinking" ? "always" : "hover"}
      className={cn("ff-host block h-full w-full", className)}
      // Our own drawing: every value comes from the tables in `catalog.ts`.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
