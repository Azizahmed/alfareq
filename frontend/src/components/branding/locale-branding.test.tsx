import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BrandingProvider, useBranding } from "@/components/branding/branding-provider";
import { BUILT_IN_BRANDING } from "@/lib/branding";

import { LocaleBranding } from "./locale-branding";

const current = vi.hoisted(() => ({ locale: "ar" }));

vi.mock("next-intl", () => ({ useLocale: () => current.locale }));
// Core tests run with no plugins, so a brand plugin's two names are stood in for here.
vi.mock("@/lib/locales", () => ({ locales: ["en", "ar"] }));
vi.mock("@/lib/branding", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/branding")>()),
  builtInAppName: (locale: string | null) => (locale === "ar" ? "الفريق" : "Alfareq"),
}));

function Name() {
  return <span>{useBranding().appName}</span>;
}

function renderWith(appName: string) {
  return render(
    <BrandingProvider branding={{ ...BUILT_IN_BRANDING, appName }}>
      <LocaleBranding>
        <Name />
      </LocaleBranding>
    </BrandingProvider>,
  );
}

describe("LocaleBranding", () => {
  it("names the deployment in the language switched to, not the one first loaded", () => {
    current.locale = "ar";
    renderWith("Alfareq");
    expect(screen.getByText("الفريق")).toBeInTheDocument();
  });

  it("leaves a name an administrator set exactly as it is", () => {
    current.locale = "ar";
    renderWith("Acme Assist");
    expect(screen.getByText("Acme Assist")).toBeInTheDocument();
  });
});
