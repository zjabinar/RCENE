import { describe, expect, it } from "vitest";
import * as app from "@rcene/kit/app";
import * as brand from "@rcene/kit/brand";
import * as poster from "@rcene/kit/poster";
import * as site from "@rcene/kit/site";
import { ENTRIES, entriesOf, FAMILIES, tidySource, type Family } from "./registry.ts";

const KIT: Record<Family, Record<string, unknown>> = { app, site, poster, brand };

/** Public components: PascalCase runtime exports (constants are UPPER_CASE, hooks and helpers camelCase). */
function components(mod: Record<string, unknown>): string[] {
  return Object.entries(mod)
    .filter(([name, value]) => /^[A-Z][a-z]/.test(name) && (typeof value === "function" || (typeof value === "object" && value !== null && "$$typeof" in value)))
    .map(([name]) => name);
}

describe("gallery registry", () => {
  it.each(FAMILIES)("shows every %s component in an example", (family) => {
    const shown = new Set(entriesOf(family).flatMap((e) => e.meta.blocks));
    expect(components(KIT[family]).filter((name) => !shown.has(name))).toEqual([]);
  });

  it("names only blocks that exist", () => {
    for (const entry of ENTRIES) {
      for (const block of entry.meta.blocks) expect(KIT[entry.family], `${entry.family}/${entry.slug}: ${block}`).toHaveProperty(block);
    }
  });

  it("gives every example a title, an English summary, a unique slug and its source", () => {
    const ids = ENTRIES.map((e) => `${e.family}/${e.slug}`);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of ENTRIES) {
      expect(e.meta.title, e.slug).toBeTruthy();
      expect(e.meta.summary.en, e.slug).toBeTruthy();
      expect(e.source, e.slug).toContain("export function Example");
      expect(e.source, e.slug).not.toContain("export const meta");
    }
  });

  it("strips the gallery metadata from the copyable code", () => {
    const raw = [
      'import { useT } from "@rcene/i18n";',
      'import type { ExampleMeta } from "./registry.ts";',
      "",
      "export const meta: ExampleMeta = {",
      '  title: "X",',
      '  summary: { en: "Y" },',
      "  blocks: [],",
      "};",
      "",
      "export function Example() {",
      "  return null;",
      "}",
    ].join("\n");
    expect(tidySource(raw)).toBe('import { useT } from "@rcene/i18n";\n\nexport function Example() {\n  return null;\n}');
  });
});
