import { describe, expect, it, vi } from "vitest";

import type { FrontendPlugin } from "./plugins";

/**
 * The manifest list as a deployment would write it: one plugin adding a locale
 * and its own strings, one rewriting every catalog, one branding the deployment
 * after another already did - so "the last brand wins" has something to beat.
 */
const { listed } = vi.hoisted(() => {
  const listed: FrontendPlugin[] = [
    {
      id: "lang",
      catalogs: { xx: async () => ({ nav: { home: "Hjem" } }) },
      messages: {
        en: async () => ({ widget: { title: "Widget", nested: { a: "A" } } }),
        xx: async () => ({ widget: { title: "Vidget" } }),
      },
    },
    { id: "early-brand", brand: { appName: "Early" } },
    {
      id: "brand",
      brand: { appName: "Alfareq", localizedNames: { ar: "الفريق" } },
      rewriteMessages: (messages) => ({ ...messages, rewritten: "yes" }),
    },
    { id: "more", messages: { en: async () => ({ widget: { nested: { b: "B" } } }) } },
  ];
  return { listed };
});
vi.mock("@/plugins", () => ({ PLUGINS: listed }));

const {
  brandNameFor,
  mergeMessages,
  pluginBrand,
  pluginCatalog,
  pluginMessages,
  replaceInMessages,
  rewriteWithPlugins,
} = await import("./plugins");

describe("plugin catalogs and strings", () => {
  it("answers the catalog of a locale a plugin adds, and null for any other", async () => {
    expect(await pluginCatalog("xx")).toEqual({ nav: { home: "Hjem" } });
    expect(await pluginCatalog("de")).toBeNull();
  });

  it("merges every plugin's own strings for a locale, deeply and in list order", async () => {
    expect(await pluginMessages("en")).toEqual({
      widget: { title: "Widget", nested: { a: "A", b: "B" } },
    });
    expect(await pluginMessages("xx")).toEqual({ widget: { title: "Vidget" } });
    expect(await pluginMessages("pl")).toEqual({});
  });

  it("lays a string over a namespace and a namespace over a string", () => {
    expect(
      mergeMessages({ a: { b: "1", c: "2" }, d: "x" }, { a: { b: "3" }, d: { e: "y" } }),
    ).toEqual({ a: { b: "3", c: "2" }, d: { e: "y" } });
  });

  it("runs every rewrite over the finished catalog", () => {
    expect(rewriteWithPlugins({ a: "b" }, "en")).toEqual({ a: "b", rewritten: "yes" });
  });
});

describe("the brand", () => {
  it("is the last listed plugin's that brands the deployment", () => {
    expect(pluginBrand()?.appName).toBe("Alfareq");
  });

  it("is spelled per locale where the plugin says, and its default elsewhere", () => {
    const brand = { appName: "Alfareq", localizedNames: { ar: "الفريق" } };
    expect(brandNameFor(brand, "ar")).toBe("الفريق");
    expect(brandNameFor(brand, "de")).toBe("Alfareq");
    expect(brandNameFor(brand, null)).toBe("Alfareq");
    expect(brandNameFor({ appName: "Plain" }, "ar")).toBe("Plain");
  });

  it("replaces a word in every string, never in a key", () => {
    expect(
      replaceInMessages(
        { AgenticOS: "Open AgenticOS", deep: { x: "AgenticOSContext stays" } },
        /\bAgenticOS\b/g,
        "Alfareq",
      ),
    ).toEqual({ AgenticOS: "Open Alfareq", deep: { x: "AgenticOSContext stays" } });
  });
});
