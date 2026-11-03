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
}));

const { defaultLocale, localeMeta, locales } = await import("./locales");

describe("locales", () => {
  it("are the core three, then each plugin's, with English the default", () => {
    expect(locales).toEqual(["en", "pl", "de", "ar"]);
    expect(defaultLocale).toBe("en");
  });

  it("know which way each one is written", () => {
    expect(localeMeta("ar").dir).toBe("rtl");
    expect(localeMeta("de")).toMatchObject({ dir: "ltr", ogLocale: "de_DE", dateLocale: "de-DE" });
  });

  it("answer English's facts for a code that slipped past the type", () => {
    expect(localeMeta("xx" as "en")).toEqual(localeMeta("en"));
  });
});
