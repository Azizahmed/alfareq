import { describe, expect, it } from "vitest";

import { fix, offences } from "./check-rtl";

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

  it("fixes every class it refuses into the logical one, and leaves nothing to refuse", () => {
    const physical = `<div className="ml-2 -mr-4 pl-3 pr-[3px] left-0 -right-1 text-left text-right float-left rounded-l-md rounded-tr rounded-bl-lg border-l-2 border-r sm:ml-auto" />`;
    expect(fix(physical)).toBe(
      `<div className="ms-2 -me-4 ps-3 pe-[3px] start-0 -end-1 text-start text-end float-start rounded-s-md rounded-se rounded-es-lg border-s-2 border-e sm:ms-auto" />`,
    );
    expect(offences(fix(physical))).toEqual([]);
    expect(fix(fix(physical))).toBe(fix(physical));
  });

  it("never fixes an exempt line, centring, a locale tag or a selector", () => {
    const exempt = `// rtl-exempt: centred by the translate\n"left-[50%] translate-x-[-50%]"`;
    expect(fix(exempt)).toBe(exempt);
    const symmetric = `<div className="left-1/2 -translate-x-1/2 data-[side=left]:slide-in-from-left-2" lang="pl-PL" />`;
    expect(fix(symmetric)).toBe(symmetric);
  });
});
