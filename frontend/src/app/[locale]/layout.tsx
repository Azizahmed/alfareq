import { DesktopAccessBridge } from "@/components/desktop/desktop-access-bridge";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { LocaleBranding } from "@/components/branding/locale-branding";
import { LocaleDirection } from "@/components/layout/locale-direction";
import { CookieBanner } from "@/components/legal/cookie-banner";
import { locales, type Locale } from "@/i18n";
import { ogLocale, SITE, siteOrigin } from "@/lib/seo";

import { Providers } from "../providers";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = locales.includes(locale as Locale)
    ? (locale as Locale)
    : SITE.defaultLocale;
  const origin = siteOrigin();

  return {
    alternates: {
      // x-default points to the canonical default-locale tree.
      languages: {
        ...Object.fromEntries(SITE.locales.map((l) => [l, `${origin}/${l}`])),
        "x-default": `${origin}/${SITE.defaultLocale}`,
      },
    },
    openGraph: {
      locale: ogLocale(safeLocale),
      alternateLocale: SITE.locales.filter((l) => l !== safeLocale).map((l) => ogLocale(l)),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();
  const t = await getTranslations("common");

  return (
    <Providers>
      <NextIntlClientProvider messages={messages}>
        <LocaleDirection>
          <LocaleBranding>
            <a href="#main" className="skip-link">
              {t("skipToContent")}
            </a>
            {children}
            <DesktopAccessBridge />
            <CookieBanner />
          </LocaleBranding>
        </LocaleDirection>
      </NextIntlClientProvider>
    </Providers>
  );
}
