import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AccountLocale } from "@/components/layout/account-locale";
import { localeMeta, locales } from "@/lib/locales";
import { useAuthStore } from "@/stores";

// The shared setup stands in an empty plugin list for the console's own tests;
// this one is about the list Alfareq actually ships.
vi.unmock("@/plugins/locales");

const replace = vi.hoisted(() => vi.fn());
vi.mock("next-intl", () => ({ useLocale: () => "en" }));
vi.mock("@/lib/locale-navigation", () => ({
  usePathname: () => "/agents",
  useRouter: () => ({ replace }),
}));

describe("the languages Alfareq offers", () => {
  it("are English and Arabic: Polish and German are neither offered nor routed", () => {
    expect(locales).toEqual(["en", "ar"]);
  });

  it("keeps a hidden language's row, so its catalog and a stored code still resolve", () => {
    expect(localeMeta("pl").label).toBe("Polski");
    expect(localeMeta("de").label).toBe("Deutsch");
  });

  it("leaves an account that chose Polish before on the page it is on", () => {
    useAuthStore.setState({
      user: {
        id: "u-1",
        email: "ada@example.com",
        is_active: true,
        created_at: "2026-11-03T00:00:00Z",
        locale: "pl",
      },
    });
    render(<AccountLocale />);
    expect(replace).not.toHaveBeenCalled();
  });
});
