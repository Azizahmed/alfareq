/**
 * Arabic, as a row of `LocaleMeta`.
 *
 * Plain data in a file of its own: `next.config.ts` reads the locale list, and
 * must not import the manifest's catalog loader to do it.
 *
 * `ar-u-nu-latn` keeps Western digits and the Gregorian calendar. Plain `ar-SA`
 * formats dates in the Umm al-Qura calendar, which is not what a run's
 * timestamp or an invoice date means, and Arabic-Indic digits beside the
 * Latin-digit ids, versions and costs the console prints are harder to read.
 */
export const ARABIC = {
  code: "ar",
  label: "العربية",
  flag: "🇸🇦",
  dir: "rtl",
  ogLocale: "ar_AR",
  dateLocale: "ar-u-nu-latn",
} as const;
