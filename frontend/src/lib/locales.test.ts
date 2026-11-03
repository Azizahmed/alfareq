import { describe, expect, it, vi } from "vitest";

vi.mock("@/plugins/locales", () => ({
  PLUGIN_LOCALES: [
    {
      code: "ar",
      label: "العربية",
      flag: "🇸🇦",
      dir: "rtl",
      ogLocale: "ar_AR",
      dateLocale: "ar-u-nu-latn",
    },
  ],
  // English is listed to show it cannot be hidden: every catalog sits on it.
  HIDDEN_LOCALES: ["de", "en"],
}));

const { defaultLocale, localeMeta, locales } = await import("./locales");

describe("locales", () => {
  it("are the core three, then each plugin's, less the hidden ones, with English the default", () => {
    expect(locales).toEqual(["en", "pl", "ar"]);
    expect(defaultLocale).toBe("en");
  });

  it("keep a hidden locale's facts, for a catalog or a stored code that names it", () => {
    expect(localeMeta("de").label).toBe("Deutsch");
  });

  it("know which way each one is written", () => {
    expect(localeMeta("ar").dir).toBe("rtl");
    expect(localeMeta("de")).toMatchObject({ dir: "ltr", ogLocale: "de_DE", dateLocale: "de-DE" });
  });

  it("answer English's facts for a code that slipped past the type", () => {
    expect(localeMeta("xx" as "en")).toEqual(localeMeta("en"));
  });
});
