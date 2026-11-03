import { describe, expect, it } from "vitest";

import type { MessagePart } from "@/types";

import { turnActivity } from "./turn-activity";

const part = (type: MessagePart["type"], content?: string): MessagePart => ({
  id: `${type}-${content ?? ""}`,
  type,
  content,
});

describe("turnActivity", () => {
  it("is nothing once the turn has ended", () => {
    expect(turnActivity({ isStreaming: false, content: "Done.", parts: [] })).toBeUndefined();
  });

  it("is thinking until the answer's first words arrive", () => {
    expect(turnActivity({ isStreaming: true, content: "" })).toBe("thinking");
    expect(turnActivity({ isStreaming: true, content: "", parts: [part("thinking", "Hmm")] })).toBe(
      "thinking",
    );
  });

  it("is writing while text streams, and thinking again when the turn calls a tool", () => {
    const writing = [part("thinking", "Hmm"), part("text", "Here is")];
    expect(turnActivity({ isStreaming: true, content: "Here is", parts: writing })).toBe("writing");
    expect(
      turnActivity({ isStreaming: true, content: "Here is", parts: [...writing, part("tool")] }),
    ).toBe("thinking");
  });

  it("reads the flat content where a turn carries no parts", () => {
    expect(turnActivity({ isStreaming: true, content: "Hi" })).toBe("writing");
  });
});
