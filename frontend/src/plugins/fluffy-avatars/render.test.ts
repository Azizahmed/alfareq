import { describe, expect, it } from "vitest";

import { CHARACTER_IDS, EXPRESSIONS, SHAPES, STATES } from "./catalog";
import { fluffySvg, resolveStyle, shade } from "./render";

const BASE = { character: null, shape: null, colour: null, expression: "own" } as const;

describe("resolveStyle", () => {
  it("draws a character in its own body and colour, with its own face for `own`", () => {
    expect(resolveStyle({ ...BASE, character: "nexo" }, "#000000")).toEqual({
      shape: "squircle",
      colour: "#f25a24",
      face: "angry",
    });
    expect(resolveStyle({ ...BASE, character: "nexo", expression: "happy" }, "#000000").face).toBe(
      "happy",
    );
  });

  it("tints a shape with its swatch, or the fallback when it has none", () => {
    expect(resolveStyle({ ...BASE, shape: "cloud", colour: 5 }, "#000000")).toEqual({
      shape: "cloud",
      colour: "#36c26a",
      face: "neutral",
    });
    expect(resolveStyle({ ...BASE, shape: "cloud" }, "#123456").colour).toBe("#123456");
    expect(resolveStyle({ ...BASE, colour: 99 }, "#123456")).toMatchObject({
      shape: "circle",
      colour: "#123456",
    });
  });
});

describe("fluffySvg", () => {
  const svg = (state: (typeof STATES)[number], framed = false) =>
    fluffySvg({ shape: "circle", colour: "#7c3aed", face: "neutral" }, { id: "t", state, framed });

  it("draws every character, shape and expression with two eyes", () => {
    const styles = [
      ...CHARACTER_IDS.map((character) => ({ ...BASE, character })),
      ...SHAPES.map((shape) => ({ ...BASE, shape, colour: 3 })),
      ...EXPRESSIONS.map((expression) => ({ ...BASE, character: "malu" as const, expression })),
    ];
    for (const style of styles) {
      const markup = fluffySvg(resolveStyle(style, "#7c3aed"), { id: "x" });
      expect(markup.match(/class="ff-eye"/g)).toHaveLength(2);
      expect(markup).toContain('filter="url(#x-f)"');
    }
  });

  it("scopes its filter and gradient to the id it is given", () => {
    expect(svg("idle")).toContain('<radialGradient id="t-g"');
    expect(svg("idle")).toContain('<filter id="t-f"');
  });

  it("draws each state over the face", () => {
    expect(svg("thinking")).toContain('class="ff-thinking"');
    expect(svg("notification")).toContain('class="ff-ping"');
    expect(svg("asleep")).toContain('class="ff-zzz"');
    expect(svg("wink")).toMatch(/height="6.4"/);
    expect(svg("wideEyes")).toContain('height="29.4"');
    expect(svg("failed")).not.toContain("#7c3aed");
    expect(svg("idle")).not.toMatch(/ff-thinking|ff-ping|ff-zzz/);
  });

  it("puts a soft disc behind a framed face only", () => {
    expect(svg("idle", true)).toContain('<circle cx="50" cy="50" r="50"');
    expect(svg("idle")).not.toContain('r="50"');
  });
});

describe("shade", () => {
  it("mixes toward white and toward black", () => {
    expect(shade("#808080", 1)).toBe("#ffffff");
    expect(shade("#808080", -1)).toBe("#000000");
    expect(shade("#808080", 0)).toBe("#808080");
  });
});
