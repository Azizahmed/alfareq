import type { FrontendPlugin, Messages } from "@/lib/plugins";

/** Furry character avatars for agents, and the studio that picks one. */
export const fluffyAvatars: FrontendPlugin = {
  id: "fluffy-avatars",
  messages: {
    en: async () => (await import("./messages/en.json")).default as Messages,
    ar: async () => (await import("./messages/ar.json")).default as Messages,
  },
};
