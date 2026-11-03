import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import enAvatars from "../fluffy-avatars/messages/en.json";
import arAvatars from "../fluffy-avatars/messages/ar.json";
import ar from "./messages/ar.json";

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [[path, value] as [string, string]] : leaves(value, path);
  });
}

function lookup(tree: Tree, path: string): string | Tree | undefined {
  return path
    .split(".")
    .reduce<string | Tree | undefined>(
      (node, key) => (typeof node === "object" ? node[key] : undefined),
      tree,
    );
}

/**
 * Arguments for one message, read off the message itself: a count for a
 * `plural` or `number`, a word for anything else, and a pass-through for each
 * rich-text tag. Branch text is Arabic, so `{word}` only ever matches an argument.
 */
function valuesFor(message: string): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [, name, kind] of message.matchAll(/\{\s*([A-Za-z_]\w*)\s*(?:,\s*(\w+))?/g)) {
    if (name === undefined) continue;
    values[name] = kind === "plural" || kind === "number" || kind === "selectordinal" ? 2 : "x";
  }
  for (const [, tag] of message.matchAll(/<(\w+)>/g)) {
    if (tag !== undefined) values[tag] = (chunks: unknown) => chunks;
  }
  return values;
}

const CATALOGS: [string, Tree, Tree][] = [
  ["the console", ar as Tree, en as Tree],
  ["the avatar studio", arAvatars as Tree, enAvatars as Tree],
];

describe.each(CATALOGS)("the Arabic catalog of %s", (_, arabic, english) => {
  const messages = leaves(arabic);

  it("translates only keys English has, and the same shape", () => {
    const strays = messages.filter(([path]) => typeof lookup(english, path) !== "string");
    expect(strays.map(([path]) => path)).toEqual([]);
  });

  it("translates every message English has, so no Arabic page falls back to English", () => {
    const untranslated = leaves(english)
      .map(([path]) => path)
      .filter((path) => typeof lookup(arabic, path) !== "string");
    expect(untranslated).toEqual([]);
  });

  it("renders every message under Arabic plural rules, without an ICU error", () => {
    const errors: string[] = [];
    const t = createTranslator({
      locale: "ar",
      messages: arabic as never,
      onError: (error) => errors.push(error.message),
    });
    for (const [path, message] of messages) {
      const values = valuesFor(message);
      const rendered = /<\w+>/.test(message)
        ? t.rich(path as never, values as never)
        : t(path as never, values as never);
      // An English source left empty on purpose (a blank template) stays empty.
      if (lookup(english, path) !== "") expect(rendered, path).toBeTruthy();
    }
    expect(errors).toEqual([]);
  });
});
