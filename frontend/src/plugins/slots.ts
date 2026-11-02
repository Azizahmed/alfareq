/**
 * The components plugins put into the console's named places. A later entry
 * wins a slot an earlier one also fills.
 */
import type { PluginSlots } from "@/lib/plugin-slots";

import { fluffyAvatarSlots } from "./fluffy-avatars/slots";

export const PLUGIN_SLOTS: readonly PluginSlots[] = [fluffyAvatarSlots];
