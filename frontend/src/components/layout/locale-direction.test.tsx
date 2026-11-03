import { useDirection } from "@radix-ui/react-direction";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocaleDirection } from "./locale-direction";

const current = vi.hoisted(() => ({ locale: "en" }));

vi.mock("next-intl", () => ({ useLocale: () => current.locale }));
// Core tests run with no plugin locales, so the right-to-left one is stood in for here.
vi.mock("@/lib/locales", () => ({
  localeMeta: (locale: string) => ({ dir: locale === "ar" ? "rtl" : "ltr" }),
}));

function RadixReads() {
  return <span>{useDirection()}</span>;
}

describe("LocaleDirection", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("dir");
    document.documentElement.removeAttribute("lang");
  });

  it("carries a switched locale onto the document and into Radix, without a reload", () => {
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
    const { rerender } = render(
      <LocaleDirection>
        <RadixReads />
      </LocaleDirection>,
    );
    expect(screen.getByText("ltr")).toBeInTheDocument();

    current.locale = "ar";
    rerender(
      <LocaleDirection>
        <RadixReads />
      </LocaleDirection>,
    );

    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
    expect(screen.getByText("rtl")).toBeInTheDocument();
  });

  it("turns the document back to left to right when the locale returns", () => {
    current.locale = "en";
    document.documentElement.dir = "rtl";
    render(
      <LocaleDirection>
        <RadixReads />
      </LocaleDirection>,
    );

    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");
  });
});
