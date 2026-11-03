import type { AgentActivity } from "@/lib/plugin-slots";
import type { ChatMessage } from "@/types";

/**
 * What an agent is doing in a turn, as its face should show it: `writing` while
 * the answer's text streams in, `thinking` while it reasons, calls a tool or
 * has not said anything yet, and nothing once the turn has ended.
 *
 * Read from the last segment, because a turn alternates - it writes a line,
 * calls a tool, writes again - and the face follows what is happening now.
 */
export function turnActivity(
  message: Pick<ChatMessage, "isStreaming" | "parts" | "content">,
): AgentActivity | undefined {
  if (!message.isStreaming) return undefined;
  const last = message.parts?.at(-1);
  if (last) return last.type === "text" && last.content ? "writing" : "thinking";
  return message.content ? "writing" : "thinking";
}
