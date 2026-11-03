import { describe, expect, it } from "vitest";

import { CHARACTER_IDS, SHAPES } from "./catalog";
import { colourForSlot, derivedStyle, hash } from "./derive";

describe("derivedStyle", () => {
  it("is stable for one handle and differs across handles", () => {
    expect(derivedStyle("support-copilot", null)).toEqual(derivedStyle("support-copilot", null));
    const faces = new Set(
      Array.from({ length: 40 }, (_, n) => JSON.stringify(derivedStyle(`agent-${n}`, null))),
    );
    expect(faces.size).toBeGreaterThan(20);
  });

  it("is a character or a shape, never both", () => {
    for (let n = 0; n < 60; n += 1) {
      const style = derivedStyle(`agent-${n}`, null);
      expect((style.character === null) !== (style.shape === null)).toBe(true);
      if (style.character) expect(CHARACTER_IDS).toContain(style.character);
      if (style.shape) expect(SHAPES).toContain(style.shape);
    }
  });

  it("wears the colour the agent menu picked", () => {
    for (let n = 0; n < 30; n += 1) {
      const style = derivedStyle(`agent-${n}`, 3);
      expect(style.character).toBeNull();
      expect(style.colour).toBe(colourForSlot(3));
    }
  });
});

describe("colourForSlot", () => {
  it("maps the ten menu slots onto distinct swatches", () => {
    expect(new Set(Array.from({ length: 10 }, (_, n) => colourForSlot(n + 1))).size).toBe(10);
  });
});

describe("hash", () => {
  it("is FNV-1a, unsigned", () => {
    expect(hash("")).toBe(0x811c9dc5);
    expect(hash("a")).toBe(0xe40c292c);
  });
});
