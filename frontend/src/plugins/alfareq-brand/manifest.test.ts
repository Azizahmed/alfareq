import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { markModule } from "./gen-mark";
import { alfareqBrand } from "./manifest";

describe("the Alfareeq brand", () => {
  it("names the deployment Alfareeq, and الفريق in Arabic", () => {
    expect(alfareqBrand.brand?.appName).toBe("Alfareeq");
    expect(alfareqBrand.brand?.localizedNames?.ar).toBe("الفريق");
  });

  it("renames the product in copy, in the reader's spelling, and leaves the embed API alone", () => {
    const rewrite = alfareqBrand.rewriteMessages;
    const messages = { a: "Discover AgenticOS", b: "Set window.AgenticOSContext first" };
    expect(rewrite?.(messages, "ar")).toEqual({
      a: "Discover الفريق",
      b: "Set window.AgenticOSContext first",
    });
    expect(rewrite?.(messages, "en")?.a).toBe("Discover Alfareeq");
  });

  it("ships the mark and the logo generated from the SVGs beside it", () => {
    const read = (name: string) => readFileSync(resolve(__dirname, "assets", name), "utf8");
    const generated = readFileSync(resolve(__dirname, "mark.generated.ts"), "utf8");
    expect(generated).toBe(markModule(read("alfareq-mark.svg"), read("alfareq-wordmark.svg")));
  });

  it("hands the console the whole logo, about six and a half times as wide as it is tall", () => {
    expect(alfareqBrand.brand?.wordmark?.dataUri).toMatch(/^data:image\/svg\+xml,/);
    expect(alfareqBrand.brand?.wordmark?.aspectRatio).toBeCloseTo(6.48, 1);
  });
});
