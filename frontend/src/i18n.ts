import { getRequestConfig } from "next-intl/server";

import { locales, defaultLocale, localeMeta, type Locale } from "./lib/locales";
import {
  mergeMessages,
  pluginCatalog,
  pluginMessages,
  rewriteWithPlugins,
  type Messages,
} from "./lib/plugins";

import en from "../messages/en.json";

// Imported and re-exported rather than declared here: `next.config.ts` needs the
// same list and cannot import this file, which drags in next-intl and the whole
// English catalog. Fifty modules import these from `@/i18n`, so the name stays.
export { locales, defaultLocale, type Locale };

/**
 * One locale's catalog, with English underneath it.
 *
 * English is the source language: every string in the product is written there
 * first, and a translation arrives later or not at all. Without a fallback that gap
 * is a hard failure - `next-intl` renders the key itself and reports an error for a
 * message the locale is missing - so shipping a feature in English would break the
 * Polish UI until somebody translated it, which is exactly the wrong incentive.
 *
 * Merged rather than duplicated. A locale's catalog holds the strings that have
 * actually been translated and nothing else, so there is no second copy of nine
 * hundred English sentences to keep in step - and `frontend/scripts/check-i18n.ts`
 * only has to hold one catalog complete.
 */
async function withEnglishUnderneath(messages: Messages, locale: string): Promise<Messages> {
  // A plugin's own strings ride along at both levels: its English under every
  // locale like the console's, and its translation over the locale's catalog.
  const english = mergeMessages(en as Messages, await pluginMessages("en"));
  if (locale === "en") return english;
  return mergeMessages(english, mergeMessages(messages, await pluginMessages(locale)));
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  // A plugin's locale ships its catalog in the plugin's folder; the core three
  // live in `messages/`. Either way English goes underneath, and then every
  // plugin's rewrite runs over the finished catalog.
  const messages =
    (await pluginCatalog(locale)) ??
    ((await import(`../messages/${locale}.json`)).default as Messages);
  return {
    locale,
    messages: rewriteWithPlugins(await withEnglishUnderneath(messages, locale), locale),
  };
});

export function getLocaleLabel(locale: Locale): string {
  return localeMeta(locale).label;
}

export function getLocaleFlag(locale: Locale): string {
  return localeMeta(locale).flag;
}
