import { describe, expect, it, vi } from "vitest";

/** The built-ins with a brand plugin installed; `branding.test.ts` holds them without one. */
vi.mock("@/plugins", () => ({
  PLUGINS: [
    {
      id: "brand",
      brand: {
        appName: "Alfareq",
        localizedNames: { ar: "الفريق" },
        logoDataUri: "data:image/svg+xml,mark",
        logoVersion: "abc123",
        wordmark: { dataUri: "data:image/svg+xml,logo", aspectRatio: 6.5 },
      },
    },
  ],
}));
const getLocale = vi.fn(async () => "ar");
vi.mock("next-intl/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-intl/server")>()),
  getLocale: () => getLocale(),
}));
const backendFetch = vi.fn();
vi.mock("@/lib/server-api", () => ({
  backendFetch: (...args: unknown[]) => backendFetch(...args),
}));

const branding = await import("./branding");
const { readBranding } = await import("./branding-server");

describe("a brand plugin", () => {
  it("replaces the built-in name and mark", () => {
    expect(branding.BUILT_IN_BRANDING.appName).toBe("Alfareq");
    expect(branding.BUILT_IN_LOGO_DATA_URI).toBe("data:image/svg+xml,mark");
    expect(branding.BUILT_IN_LOGO_VERSION).toBe("abc123");
  });

  it("is spelled in the page's language where it has a spelling for it", () => {
    expect(branding.resolveBranding(null, "ar").appName).toBe("الفريق");
    expect(branding.builtInAppName("pl")).toBe("Alfareq");
  });

  it("never wins over the name an administrator set", () => {
    const overrides = { app_name: "Acme AI" } as Parameters<typeof branding.resolveBranding>[0];
    expect(branding.resolveBranding(overrides, "ar").appName).toBe("Acme AI");
  });

  it("offers its whole logo only while the name and the logo are still its own", () => {
    const logo = { dataUri: "data:image/svg+xml,logo", aspectRatio: 6.5 };
    expect(branding.builtInWordmark({ appName: "Alfareq", logoUrl: null })).toEqual(logo);
    expect(branding.builtInWordmark({ appName: "الفريق", logoUrl: null })).toEqual(logo);
    expect(branding.builtInWordmark({ appName: "Acme AI", logoUrl: null })).toBeNull();
    expect(branding.builtInWordmark({ appName: "Alfareq", logoUrl: "/api/logo" })).toBeNull();
  });

  it("is resolved on the server in the request's locale, also when the API is down", async () => {
    backendFetch.mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect((await readBranding()).appName).toBe("الفريق");
    expect(getLocale).toHaveBeenCalled();
  });
});
