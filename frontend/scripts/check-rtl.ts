/**
 * The console is written in logical properties, so a right-to-left locale mirrors it.
 *
 * `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`, `rounded-s`,
 * `border-s` follow `<html dir>`; `ml-`, `pl-`, `left-`, `text-left`,
 * `rounded-l` and `border-l` do not, and one of them is a margin on the wrong
 * side of every Arabic page. This refuses them in `src/`.
 *
 * Centring (`left-1/2` with a translate) is symmetric and allowed. Anything else
 * that is genuinely physical - a dialog centred with `left-[50%]`, a canvas
 * laid out in coordinates - takes `rtl-exempt: <reason>` on its line or the one
 * above, the same bargain `i18n-exempt` takes.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const FRONTEND = join(fileURLToPath(import.meta.url), "..", "..");
const SRC = join(FRONTEND, "src");

const B = String.raw`(?<![\w\-\[\]/.#$@])`;
const VAL = String.raw`(?=(?:\d|px\b|auto\b|full\b|\[|\(|screen\b))`;

/** Each physical utility, and the logical one to write instead. */
export const PHYSICAL: readonly [RegExp, string][] = [
  [new RegExp(`${B}-?ml-${VAL}`, "g"), "ms-"],
  [new RegExp(`${B}-?mr-${VAL}`, "g"), "me-"],
  [new RegExp(`${B}pl-${VAL}`, "g"), "ps-"],
  [new RegExp(`${B}pr-${VAL}`, "g"), "pe-"],
  [new RegExp(`${B}-?left-(?!1/2\\b)${VAL}`, "g"), "start-"],
  [new RegExp(`${B}-?right-(?!1/2\\b)${VAL}`, "g"), "end-"],
  [new RegExp(`${B}text-(?:left|right)\\b(?!-)`, "g"), "text-start / text-end"],
  [new RegExp(`${B}float-(?:left|right)\\b`, "g"), "float-start / float-end"],
  [new RegExp(`${B}rounded-(?:tl|tr|bl|br|l|r)(?=\\b|-)`, "g"), "rounded-ss/se/es/ee, rounded-s/e"],
  [new RegExp(`${B}border-(?:l|r)(?=\\b|-)`, "g"), "border-s / border-e"],
];

const EXEMPT = /rtl-exempt:\s*\S/;

export interface Offence {
  line: number;
  found: string;
  instead: string;
}

export function offences(text: string): Offence[] {
  const lines = text.split("\n");
  const found: Offence[] = [];
  lines.forEach((line, index) => {
    if (EXEMPT.test(line) || EXEMPT.test(lines[index - 1] ?? "")) return;
    for (const [pattern, instead] of PHYSICAL) {
      for (const match of line.matchAll(pattern)) {
        found.push({ line: index + 1, found: match[0], instead });
      }
    }
  });
  return found;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !name.endsWith(".generated.ts") ? [path] : [];
  });
}

function main(): number {
  const report = sourceFiles(SRC).flatMap((path) =>
    offences(readFileSync(path, "utf8")).map(
      ({ line, found, instead }) =>
        `${relative(FRONTEND, path)}:${line}  ${found.trim()}  → ${instead}`,
    ),
  );
  if (report.length === 0) {
    console.log("No physical direction classes in frontend/src.");
    return 0;
  }
  console.log(`${report.length} physical direction class(es); write the logical one instead:`);
  for (const line of report) console.log(`  ${line}`);
  return 1;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  process.exit(main());
}
