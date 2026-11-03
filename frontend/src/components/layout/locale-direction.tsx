"use client";

import { useEffect, type ReactNode } from "react";
import { DirectionProvider } from "@radix-ui/react-direction";
import { useLocale } from "next-intl";

import { localeMeta, type Locale } from "@/lib/locales";

/**
 * The reading direction of the locale on screen, for everything below it.
 *
 * Two things the root layout's `<html dir>` cannot do on its own:
 *
 * - A language switch is a client navigation (`router.push(path, { locale })`),
 *   and the root layout sits above the `[locale]` segment, so it is kept as it
 *   was: switching to Arabic used to leave `<html dir="ltr" lang="en">` until a
 *   full reload. This layout does re-render with the locale, so it carries the
 *   new direction and language onto the document.
 * - Radix reads direction from its own provider, never from the document, so
 *   without one every menu, select and slider stays left to right under an
 *   RTL page - a dropdown aligned to the end opening on the wrong side.
 */
export function LocaleDirection({ children }: { children: ReactNode }) {
  const locale = useLocale() as Locale;
  const { dir } = localeMeta(locale);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dir;
  }, [locale, dir]);

  return <DirectionProvider dir={dir}>{children}</DirectionProvider>;
}
