import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const put = vi.fn();
const del = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    post: (...args: unknown[]) => post(...args),
    put: (...args: unknown[]) => put(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

const { LOOKUP_LIMIT, loadAvatar, resetStyle, saveStyle } = await import("./api");

const STYLE = { character: "malu", shape: null, colour: null, expression: "own" } as const;

describe("loadAvatar", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    post.mockReset();
  });

  it("asks once for every agent drawn in the same tick", async () => {
    post.mockResolvedValue({ styles: { a: STYLE }, states: { a: "failed" } });
    const asks = [loadAvatar("a"), loadAvatar("b"), loadAvatar("a")];
    await vi.runAllTimersAsync();

    expect(await Promise.all(asks)).toEqual([
      { style: STYLE, state: "failed" },
      { style: null, state: "idle" },
      { style: STYLE, state: "failed" },
    ]);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/plugins/fluffy-avatars/agents/lookup", {
      agent_ids: ["a", "b"],
    });
  });

  it("splits a page with more agents than one lookup may name", async () => {
    post.mockResolvedValue({ styles: {}, states: {} });
    const asks = Array.from({ length: LOOKUP_LIMIT + 1 }, (_, n) => loadAvatar(`agent-${n}`));
    await vi.runAllTimersAsync();
    await Promise.all(asks);

    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1]?.[1]).toEqual({ agent_ids: [`agent-${LOOKUP_LIMIT}`] });
  });

  it("fails every ask in a batch whose lookup failed", async () => {
    post.mockRejectedValue(new Error("502"));
    const ask = loadAvatar("a");
    const asserted = expect(ask).rejects.toThrow("502");
    await vi.runAllTimersAsync();
    await asserted;
  });
});

describe("saving and resetting", () => {
  it("puts the style and deletes it, at the agent's own address", async () => {
    put.mockResolvedValue({ style: STYLE });
    del.mockResolvedValue(undefined);

    expect(await saveStyle("a", STYLE)).toEqual({ style: STYLE });
    await resetStyle("a");

    expect(put).toHaveBeenCalledWith("/plugins/fluffy-avatars/agents/a", STYLE);
    expect(del).toHaveBeenCalledWith("/plugins/fluffy-avatars/agents/a");
  });
});
