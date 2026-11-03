"use client";

import { useMemo, type ReactNode } from "react";
import { useLocale } from "next-intl";

import { BrandingProvider, useBranding } from "@/components/branding/branding-provider";
import { builtInAppName } from "@/lib/branding";
import { locales } from "@/lib/locales";

/**
 * The deployment's name in the language on screen.
 *
 * The root layout resolves the name once, for the locale of the first request,
 * and sits above the `[locale]` segment - so after a language switch, which is
 * a client navigation, a brand plugin's name stayed in the old language
 * (`Alfareq` on an Arabic page that should say `الفريق`). This sits inside the
 * segment and re-renders with the locale. Only the built-in name is swapped: a
 * name an administrator set in the settings is the same in every language.
 */
export function LocaleBranding({ children }: { children: ReactNode }) {
  const branding = useBranding();
  const locale = useLocale();
  const value = useMemo(() => {
    const builtIn = locales.some((code) => builtInAppName(code) === branding.appName);
    return builtIn ? { ...branding, appName: builtInAppName(locale) } : branding;
  }, [branding, locale]);
  return <BrandingProvider branding={value}>{children}</BrandingProvider>;
}
