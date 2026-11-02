import {
  brandNameFor,
  replaceInMessages,
  type FrontendPlugin,
  type PluginBrand,
} from "@/lib/plugins";

import { MARK_DATA_URI, MARK_VERSION } from "./mark.generated";

const brand: PluginBrand = {
  appName: "Alfareq",
  localizedNames: { ar: "الفريق" },
  logoDataUri: MARK_DATA_URI,
  logoVersion: MARK_VERSION,
};

/**
 * Whole words only: `window.AgenticOSContext` is the embed's API, which a
 * customer's page already sets, and renaming it in the copy that documents it
 * would document a global the widget never reads.
 */
const UPSTREAM_NAME = /\bAgenticOS\b/g;

/**
 * The deployment is Alfareq - الفريق in Arabic.
 *
 * Built-ins only: the name and mark a fresh deployment shows, and the product's
 * name inside the console's sentences. `/admin/settings` still overrides the
 * name and the logo, as it does upstream.
 */
export const alfareqBrand: FrontendPlugin = {
  id: "alfareq-brand",
  brand,
  rewriteMessages: (messages, locale) =>
    replaceInMessages(messages, UPSTREAM_NAME, brandNameFor(brand, locale)),
};
