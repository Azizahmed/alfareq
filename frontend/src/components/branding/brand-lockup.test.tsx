import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BrandingProvider } from "@/components/branding/branding-provider";
import { BUILT_IN_BRANDING } from "@/lib/branding";

import { BrandLockup } from "./brand-lockup";

const plugin = vi.hoisted(() => ({
  wordmark: null as { dataUri: string; aspectRatio: number } | null,
}));
vi.mock("@/lib/branding", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/branding")>()),
  builtInWordmark: () => plugin.wordmark,
}));

function renderLockup() {
  return render(
    <BrandingProvider branding={BUILT_IN_BRANDING}>
      <BrandLockup markSize={20} />
    </BrandingProvider>,
  );
}

describe("BrandLockup", () => {
  it("draws the mark with the name written beside it", () => {
    plugin.wordmark = null;
    renderLockup();

    expect(screen.getByTestId("brand-glyph")).toBeInTheDocument();
    expect(screen.getByText(BUILT_IN_BRANDING.appName)).toBeInTheDocument();
  });

  it("draws a brand's whole logo in place of both, named for a screen reader", () => {
    plugin.wordmark = { dataUri: "data:image/svg+xml,logo", aspectRatio: 6.5 };
    renderLockup();

    const logo = screen.getByRole("img", { name: BUILT_IN_BRANDING.appName });
    expect(logo).toHaveStyle({ height: "20px", width: "130px" });
    expect(screen.queryByTestId("brand-glyph")).toBeNull();
  });
});
