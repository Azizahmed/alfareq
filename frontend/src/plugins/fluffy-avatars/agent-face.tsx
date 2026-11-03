"use client";

import type { AgentFaceSlotProps } from "@/lib/plugin-slots";

import { derivedStyle } from "./derive";
import { FluffyFace } from "./fluffy-face";
import { useAgentAvatar } from "./use-avatar-style";

/**
 * The `agent-face` slot: the agent's furry avatar wherever the console draws one.
 *
 * Its stored style once the lookup answers, and the face its handle derives
 * until then - the same face the agent had before anybody opened the studio, so
 * a page never flashes a placeholder. It follows the agent: thinking while a
 * turn is in flight, and otherwise what the lookup says - asleep when it is not
 * published, a dot when a run waits on somebody, downcast when its last run failed.
 */
export function AgentFluffyFace({
  agentId,
  slug,
  colorSlot,
  thinking,
  framed,
  className,
}: AgentFaceSlotProps) {
  const avatar = useAgentAvatar(agentId).data;
  return (
    <FluffyFace
      style={avatar?.style ?? derivedStyle(slug, colorSlot)}
      state={thinking ? "thinking" : (avatar?.state ?? "idle")}
      framed={framed}
      className={className}
    />
  );
}
