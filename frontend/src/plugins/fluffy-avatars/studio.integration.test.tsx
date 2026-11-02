import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api-client";

import { AgentFluffyFace } from "./agent-face";
import { AvatarStudioButton } from "./studio";

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// The console's English with this plugin's own strings over it, as `src/i18n.ts` serves them.
vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl")>();
  const messages = {
    ...(await import("../../../messages/en.json")).default,
    ...(await import("./messages/en.json")).default,
  };
  return {
    ...actual,
    useTranslations: (namespace?: string) =>
      actual.createTranslator({ locale: "en", messages, namespace: namespace as never }),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const PROPS = { agentId: "a1", name: "Support copilot", slug: "support-copilot", colorSlot: null };

describe("the avatar studio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.post).mockResolvedValue({ styles: {}, states: {} });
  });

  it("is not offered to somebody who may not edit the agent", () => {
    render(<AvatarStudioButton {...PROPS} canEdit={false} />, { wrapper });
    expect(screen.queryByRole("button", { name: "Design avatar" })).toBeNull();
  });

  it("saves the shape, colour and expression picked", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ style: {} });
    render(<AvatarStudioButton {...PROPS} canEdit />, { wrapper });

    await userEvent.click(screen.getByRole("button", { name: "Design avatar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Hexagon" }));
    await userEvent.click(screen.getByRole("button", { name: "Colour 6" }));
    await userEvent.click(screen.getByRole("button", { name: "Sleepy" }));
    await userEvent.click(screen.getByRole("button", { name: "Save avatar" }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/plugins/fluffy-avatars/agents/a1", {
        character: null,
        shape: "hexagon",
        colour: 5,
        expression: "sleepy",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("offers the default face back only once a style is stored", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      styles: { a1: { character: "malu", shape: null, colour: null, expression: "own" } },
      states: { a1: "idle" },
    });
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);
    render(<AvatarStudioButton {...PROPS} canEdit />, { wrapper });
    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Design avatar" }));
    expect(screen.getByRole("button", { name: "Malu" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Colour 1" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Back to the default face" }));

    await waitFor(() =>
      expect(apiClient.delete).toHaveBeenCalledWith("/plugins/fluffy-avatars/agents/a1"),
    );
  });
});

describe("the agent's face", () => {
  it("is drawn from the handle until a stored style arrives, then from the style", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      styles: { a1: { character: "fred", shape: null, colour: null, expression: "own" } },
      states: { a1: "notification" },
    });
    const { container } = render(
      <AgentFluffyFace agentId="a1" slug="support-copilot" framed={false} thinking />,
      {
        wrapper,
      },
    );

    expect(container.querySelector("svg.ff")).not.toBeNull();
    expect(container.querySelector('[data-animate="always"]')).not.toBeNull();
    await waitFor(() => expect(container.innerHTML).toContain("#f6c12b"));
  });

  it("shows what the agent is doing once it is not mid-turn", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ styles: {}, states: { a2: "notification" } });
    const { container } = render(
      <AgentFluffyFace agentId="a2" slug="support-copilot" framed={false} />,
      { wrapper },
    );

    await waitFor(() =>
      expect(container.querySelector('svg[data-state="notification"]')).not.toBeNull(),
    );
  });
});
