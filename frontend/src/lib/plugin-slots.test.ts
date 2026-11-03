import { describe, expect, it } from "vitest";

import { pluginSlot, type AgentFaceSlotProps, type PluginSlots } from "./plugin-slots";

const First = (_: AgentFaceSlotProps) => null;
const Second = (_: AgentFaceSlotProps) => null;

describe("pluginSlot", () => {
  it("is empty when no plugin fills the slot - the console draws its own", () => {
    expect(pluginSlot("agent-face")).toBeNull();
    expect(pluginSlot("agent-avatar-tools", [{ "agent-face": First }])).toBeNull();
  });

  it("is the last listed plugin's component when several fill it", () => {
    const slots: PluginSlots[] = [{ "agent-face": First }, {}, { "agent-face": Second }];
    expect(pluginSlot("agent-face", slots)).toBe(Second);
  });
});
