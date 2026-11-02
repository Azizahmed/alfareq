/** What this plugin puts into the console's named places (`src/lib/plugin-slots.ts`). */
import type { PluginSlots } from "@/lib/plugin-slots";

import { AgentFluffyFace } from "./agent-face";
import { AvatarStudioButton } from "./studio";

export const fluffyAvatarSlots: PluginSlots = {
  "agent-face": AgentFluffyFace,
  "agent-avatar-tools": AvatarStudioButton,
};
