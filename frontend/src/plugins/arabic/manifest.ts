import type { FrontendPlugin, Messages } from "@/lib/plugins";

/**
 * Arabic, written right to left.
 *
 * The catalog holds what has been translated and nothing else; `src/i18n.ts`
 * merges English underneath it, so a string added upstream renders in English
 * until it is translated here rather than as its key.
 */
export const arabic: FrontendPlugin = {
  id: "arabic",
  catalogs: {
    ar: async () => (await import("./messages/ar.json")).default as Messages,
  },
};
