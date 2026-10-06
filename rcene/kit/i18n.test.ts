import { describe, expect, it } from "vitest";
import { FORBIDDEN_ANSWER_WORDS, LANGS } from "@rcene/i18n";
import { appStrings } from "./app/strings.ts";
import { brandStrings } from "./brand/strings.ts";
import { kitStrings } from "./i18n.ts";
import { posterStrings } from "./poster/strings.ts";
import { siteStrings } from "./site/strings.ts";

const FAMILIES = { app: appStrings, site: siteStrings, poster: posterStrings, brand: brandStrings };
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe.each(Object.entries(FAMILIES))("kit strings: %s", (_family, table) => {
  it("names every key kit.*", () => {
    expect(Object.keys(table.en).filter((k) => !k.startsWith("kit."))).toEqual([]);
  });

  it("translates every key, never invents one, and keeps the {placeholders}", () => {
    for (const lang of ["war", "fil"] as const) {
      const local: Record<string, string> = table[lang];
      expect(Object.keys(local).filter((k) => !(k in table.en)), lang).toEqual([]);
      for (const [key, en] of Object.entries(table.en)) {
        expect(local[key], `${lang} ${key}`).toBeTruthy();
        expect(placeholders(local[key]!), `${lang} ${key}`).toEqual(placeholders(en));
      }
    }
  });
});

describe("kitStrings", () => {
  it("merges the families without one overwriting another", () => {
    const keys = Object.values(FAMILIES).flatMap((t) => Object.keys(t.en));
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(kitStrings.en).toHaveProperty([key]);
  });

  it("never says 'safe' in any language", () => {
    for (const lang of LANGS) {
      for (const table of Object.values(FAMILIES)) {
        for (const [key, text] of Object.entries(table[lang] as Record<string, string>)) {
          for (const word of FORBIDDEN_ANSWER_WORDS) expect(text.toLowerCase(), `${lang} ${key}`).not.toMatch(new RegExp(`\\b${word}\\b`));
        }
      }
    }
  });
});
