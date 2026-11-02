"use client";

import type { AgentFaceSlotProps } from "@/lib/plugin-slots";

import { derivedStyle } from "./derive";
import { FluffyFace } from "./fluffy-face";
import { useAvatarStyle } from "./use-avatar-style";

/**
 * The `agent-face` slot: the agent's furry avatar wherever the console draws one.
 *
 * Its stored style once the lookup answers, and the face its handle derives
 * until then - the same face the agent had before anybody opened the studio, so
 * a page never flashes a placeholder.
 */
export function AgentFluffyFace({
  agentId,
  slug,
  colorSlot,
  thinking,
  framed,
  className,
}: AgentFaceSlotProps) {
  const stored = useAvatarStyle(agentId).data;
  return (
    <FluffyFace
      style={stored ?? derivedStyle(slug, colorSlot)}
      state={thinking ? "thinking" : "idle"}
      framed={framed}
      className={className}
    />
  );
}
