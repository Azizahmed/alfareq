/**
 * Which locales exist, in one place both the app and the build config can read.
 *
 * `src/i18n.ts` pulls in `next-intl/server` and the whole English catalog, so
 * `next.config.ts` cannot import it to find out - which is how the moved-route
 * redirects came to hard-code `en|pl` and answer a German bookmark with a 404
 * while every other surface had been translated.
 *
 * A locale is one row of facts rather than a code plus four parallel tables
 * (label, flag, Open Graph tag, date tag) that each had to learn about a new
 * locale on its own. The rows a plugin adds come from `src/plugins/locales.ts`,
 * imported relatively because `next.config.ts` does not resolve the `@/` alias,
 * and so do the codes a plugin hides: those keep their row, so a catalog and a
 * `Locale` still type, but are neither offered nor routed.
 */
import { HIDDEN_LOCALES, PLUGIN_LOCALES } from "../plugins/locales";

export interface LocaleMeta {
  /** The URL prefix and the `lang` attribute. */
  code: string;
  /** The language's own name for itself, as the switcher lists it. */
  label: string;
  flag: string;
  /** Which way the language is written; `rtl` mirrors the whole console. */
  dir: "ltr" | "rtl";
  /** The Open Graph `og:locale` tag. */
  ogLocale: string;
  /** The BCP-47 tag dates and numbers are formatted with. */
  dateLocale: string;
}

const CORE_LOCALES = [
  { code: "en", label: "English", flag: "🇬🇧", dir: "ltr", ogLocale: "en_US", dateLocale: "en-US" },
  { code: "pl", label: "Polski", flag: "🇵🇱", dir: "ltr", ogLocale: "pl_PL", dateLocale: "pl-PL" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", dir: "ltr", ogLocale: "de_DE", dateLocale: "de-DE" },
] as const satisfies readonly LocaleMeta[];

const LOCALE_META = [...CORE_LOCALES, ...PLUGIN_LOCALES] as const;

export type Locale = (typeof LOCALE_META)[number]["code"];

export const defaultLocale: Locale = "en";

/** The locales the console offers and routes. English, the fallback under every catalog, cannot be hidden. */
export const locales: readonly Locale[] = LOCALE_META.map((meta) => meta.code).filter(
  (code) => code === defaultLocale || !HIDDEN_LOCALES.includes(code),
);

/** The facts about one locale. Total over `Locale`, so it never answers undefined. */
export function localeMeta(locale: Locale): LocaleMeta {
  return LOCALE_META.find((meta) => meta.code === locale) ?? CORE_LOCALES[0];
}
