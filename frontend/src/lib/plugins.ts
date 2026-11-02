/**
 * What a frontend plugin may contribute, and the one place core reads it.
 *
 * A plugin lives under `src/plugins/<id>/` and is switched on by a line in one of
 * the lists beside it: `src/plugins/index.ts` (this manifest), `locales.ts` (the
 * locale rows `next.config.ts` has to see without importing React) and `slots.ts`
 * (components). Core never imports a plugin by name - it reads these lists - so a
 * deployment with no plugins is exactly the upstream console, and updating the
 * upstream code never touches a plugin's files.
 *
 * Everything here is data or a pure function. Components arrive through
 * `src/lib/plugin-slots.tsx`, which is the client half.
 */
import { PLUGINS } from "@/plugins";

export type Messages = { [key: string]: string | Messages };

/** The deployment's built-in identity, before an administrator overrides it. */
export interface PluginBrand {
  /** The name in the default locale, and in any locale `localizedNames` misses. */
  appName: string;
  /** The name per locale, for a product whose name is written differently. */
  localizedNames?: Partial<Record<string, string>>;
  /** The built-in mark, as a data URI: the sidebar, the sign-in header, the favicon. */
  logoDataUri?: string;
  /** Changes with the mark, so a browser holding the old favicon asks again. */
  logoVersion?: string;
}

export interface FrontendPlugin {
  /** Matches the folder name and the backend plugin's id. */
  id: string;
  /** The whole catalog for each locale this plugin adds, English underneath it. */
  catalogs?: Partial<Record<string, () => Promise<Messages>>>;
  /**
   * The plugin's own strings per locale, under namespaces of its own. `en` is
   * required for any it reads: it goes underneath every locale, as the console's
   * English does, and `scripts/check-i18n.ts` reads it as part of the catalog.
   */
  messages?: Partial<Record<string, () => Promise<Messages>>>;
  /**
   * Rewrites a finished catalog: the brand plugin replaces the product's name.
   * Runs after the English fallback is merged, in the order plugins are listed.
   */
  rewriteMessages?: (messages: Messages, locale: string) => Messages;
  brand?: PluginBrand;
}

/** The catalog a plugin ships for `locale`, or null when no plugin adds that locale. */
export async function pluginCatalog(locale: string): Promise<Messages | null> {
  for (const plugin of PLUGINS) {
    const load = plugin.catalogs?.[locale];
    if (load) return load();
  }
  return null;
}

/** Deep-merge `over` onto `base`; a string in `over` replaces whatever `base` held. */
export function mergeMessages(base: Messages, over: Messages): Messages {
  const merged: Messages = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const beneath = merged[key];
    merged[key] =
      typeof value === "object" && typeof beneath === "object"
        ? mergeMessages(beneath, value)
        : value;
  }
  return merged;
}

/** Every plugin's own strings in `locale`, merged in list order. */
export async function pluginMessages(locale: string): Promise<Messages> {
  let merged: Messages = {};
  for (const plugin of PLUGINS) {
    const load = plugin.messages?.[locale];
    if (load) merged = mergeMessages(merged, await load());
  }
  return merged;
}

/** Every plugin's rewrite, applied in list order. */
export function rewriteWithPlugins(messages: Messages, locale: string): Messages {
  return PLUGINS.reduce(
    (current, plugin) =>
      plugin.rewriteMessages ? plugin.rewriteMessages(current, locale) : current,
    messages,
  );
}

/** The last listed plugin that brands the deployment wins; null keeps upstream's. */
export function pluginBrand(): PluginBrand | null {
  return PLUGINS.findLast((plugin) => plugin.brand)?.brand ?? null;
}

/** The plugin brand's name for `locale`, falling back to its default name. */
export function brandNameFor(brand: PluginBrand, locale: string | null): string {
  return (locale && brand.localizedNames?.[locale]) || brand.appName;
}

/**
 * Replace a word in every string of a catalog, keys untouched.
 *
 * For a rename: the product's name is written into a few dozen sentences, and a
 * rewrite keeps them right however many upstream adds, where an overlay would
 * have to be re-copied every time one of those sentences changed.
 */
export function replaceInMessages(messages: Messages, from: RegExp, to: string): Messages {
  const out: Messages = {};
  for (const [key, value] of Object.entries(messages)) {
    out[key] =
      typeof value === "string" ? value.replace(from, to) : replaceInMessages(value, from, to);
  }
  return out;
}
