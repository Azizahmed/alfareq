import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CHARACTER_IDS, CHARACTERS, COLOURS, EXPRESSIONS, SHAPES } from "./catalog";

/** The backend validates a stored style against its own copy of these lists. */
const SCHEMAS = readFileSync(
  resolve(__dirname, "../../../../backend/plugins/fluffy_avatars/schemas.py"),
  "utf8",
);

function literal(name: string): string[] {
  const body = SCHEMAS.match(new RegExp(`${name} = Literal\\[([^\\]]*)\\]`))?.[1] ?? "";
  return [...body.matchAll(/"([a-z]+)"/g)].map((match) => match[1] ?? "");
}

describe("the catalog", () => {
  it("is the backend's, list for list", () => {
    expect(literal("Character")).toEqual([...CHARACTER_IDS]);
    expect(literal("Shape")).toEqual([...SHAPES]);
    expect(literal("Expression")).toEqual([...EXPRESSIONS]);
    expect(SCHEMAS).toContain(`le=${COLOURS.length - 1}`);
  });

  it("names every character it lists", () => {
    expect(Object.keys(CHARACTERS)).toEqual([...CHARACTER_IDS]);
  });
});
