import { describe, expect, it } from "vitest";

import { offences } from "./check-rtl";

describe("check-rtl", () => {
  it("refuses a physical margin, padding, inset, alignment, radius and border", () => {
    const found = offences(
      `<div className="ml-2 -mr-4 pl-3 pr-[3px] left-0 -right-1 text-left rounded-l-md rounded-tr border-l-2 sm:ml-auto" />`,
    ).map((offence) => offence.found.trim());
    expect(found).toEqual(
      expect.arrayContaining([
        "ml-",
        "-mr-",
        "pl-",
        "pr-",
        "left-",
        "-right-",
        "text-left",
        "rounded-l",
        "rounded-tr",
        "border-l",
        "ml-",
      ]),
    );
    expect(found).toHaveLength(11);
  });

  it("passes logical classes, centring, locale tags and selectors", () => {
    expect(
      offences(
        `<div className="ms-2 pe-3 start-0 text-start left-1/2 -translate-x-1/2 data-[side=left]:slide-in-from-left-2" lang="pl-PL" />`,
      ),
    ).toEqual([]);
  });

  it("lets an exemption with a reason through, on its line or the one above", () => {
    expect(offences(`"left-[50%]" // rtl-exempt: centred by the translate`)).toEqual([]);
    expect(
      offences(`// rtl-exempt: centred by the translate\n"left-[50%] translate-x-[-50%]"`),
    ).toEqual([]);
    expect(offences(`// rtl-exempt:\n"left-[50%]"`)).toHaveLength(1);
  });
});
