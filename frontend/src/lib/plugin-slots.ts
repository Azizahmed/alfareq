/**
 * Named places in the console a plugin may fill with its own component.
 *
 * A slot is a contract: its props are what core promises to pass, so a plugin
 * written against them keeps working across upstream updates for as long as the
 * slot exists. Added one at a time, when a plugin needs one - a slot nobody fills
 * is an interface nobody has tested.
 *
 * Read at module scope by the component that owns the place, so filling a slot
 * costs no hook and no render: `const Face = pluginSlot("agent-face") ?? Default`.
 */
import type { ComponentType } from "react";

import { PLUGIN_SLOTS } from "@/plugins/slots";

/** The generated face an agent wears when it has no uploaded picture. */
export interface AgentFaceSlotProps {
  agentId: string;
  /** Frozen at creation, so a face drawn from it survives a rename. */
  slug: string;
  /** The colour slot (1..10) the agent's menu picks; null derives one. */
  colorSlot?: number | null;
  /** True while a turn is in flight. */
  thinking?: boolean;
  /** False where the console draws the face without a disc behind it (chat). */
  framed: boolean;
  className?: string;
}

/**
 * Controls beside the agent's portrait in its page header - where the console
 * offers its own upload. Rendered on the page, not inside a menu, so a dialog
 * the control opens outlives the click that opened it.
 */
export interface AgentAvatarToolsSlotProps {
  agentId: string;
  /** The agent's display name, for a preview that shows the portrait beside it. */
  name: string;
  slug: string;
  colorSlot: number | null;
  /** Whether the caller may edit this agent; the slot must not offer edits otherwise. */
  canEdit: boolean;
}

export interface SlotProps {
  "agent-face": AgentFaceSlotProps;
  "agent-avatar-tools": AgentAvatarToolsSlotProps;
}

export type PluginSlots = { [K in keyof SlotProps]?: ComponentType<SlotProps[K]> };

/** The component filling `name`, the last listed plugin winning; null when none does. */
export function pluginSlot<K extends keyof SlotProps>(
  name: K,
  slots: readonly PluginSlots[] = PLUGIN_SLOTS,
): ComponentType<SlotProps[K]> | null {
  return slots.findLast((entry) => entry[name])?.[name] ?? null;
}
