"use client";

import type { AgentFaceSlotProps } from "@/lib/plugin-slots";

import type { AvatarState } from "./catalog";
import { derivedStyle } from "./derive";
import { FluffyFace } from "./fluffy-face";
import { useAgentAvatar } from "./use-avatar-style";

/**
 * What the face shows: what the agent is doing right now, before anything the
 * lookup knows about it - asleep when it is not published, a dot when a run
 * waits on somebody, downcast when its last run failed.
 */
export function faceState(
  {
    thinking,
    activity,
    attention,
  }: Pick<AgentFaceSlotProps, "thinking" | "activity" | "attention">,
  stored: AvatarState | undefined,
): AvatarState {
  if (activity === "writing") return "writing";
  if (activity === "thinking" || thinking) return "thinking";
  if (attention) return "notification";
  return stored ?? "idle";
}

/**
 * The `agent-face` slot: the agent's furry avatar wherever the console draws one.
 *
 * Its stored style once the lookup answers, and the face its handle derives
 * until then - the same face the agent had before anybody opened the studio, so
 * a page never flashes a placeholder. It follows the agent through a turn -
 * thinking, then writing as the answer streams in - greets the person where a
 * conversation opens on it, and lights up on a notification nobody has read.
 */
export function AgentFluffyFace({
  agentId,
  slug,
  colorSlot,
  thinking,
  activity,
  attention,
  framed,
  className,
}: AgentFaceSlotProps) {
  const avatar = useAgentAvatar(agentId).data;
  return (
    <FluffyFace
      style={avatar?.style ?? derivedStyle(slug, colorSlot)}
      state={faceState({ thinking, activity, attention }, avatar?.state)}
      greet={activity === "greeting"}
      framed={framed}
      className={className}
    />
  );
}
