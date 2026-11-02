import { afterEach, describe, expect, it } from "vitest";

import { fromEnd, inlineSign, isRtl, towardStart } from "./direction";

function element(dir: "ltr" | "rtl"): HTMLElement {
  const node = document.createElement("div");
  node.dir = dir;
  node.style.direction = dir;
  document.body.append(node);
  return node;
}

const BOUNDS = { left: 100, right: 500 } as DOMRect;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("direction maths", () => {
  it("reads left to right as English does", () => {
    const ltr = element("ltr");
    expect(isRtl(ltr)).toBe(false);
    expect(inlineSign(ltr)).toBe(1);
    expect(towardStart(ltr)).toBe("ArrowLeft");
    expect(fromEnd(BOUNDS, 450, ltr)).toBe(50);
  });

  it("mirrors right to left, as Arabic does", () => {
    const rtl = element("rtl");
    expect(isRtl(rtl)).toBe(true);
    expect(inlineSign(rtl)).toBe(-1);
    expect(towardStart(rtl)).toBe("ArrowRight");
    expect(fromEnd(BOUNDS, 150, rtl)).toBe(50);
  });
});
