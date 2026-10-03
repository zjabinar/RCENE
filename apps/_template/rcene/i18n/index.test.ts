import { describe, expect, it } from "vitest";
import { HAZARDS, LEVELS } from "@rcene/data";
import { common, extendStrings, FORBIDDEN_ANSWER_WORDS, LANGS, translate } from "./index.ts";

describe("common strings", () => {
  it("has the same keys in every language (drafts may lag, but never invent keys)", () => {
    const en = Object.keys(common.en).sort();
    for (const lang of ["war", "fil"] as const) {
      const keys = Object.keys(common[lang]);
      expect(keys.filter((k) => !(k in common.en))).toEqual([]);
      expect(keys.sort()).toEqual(en);
    }
  });

  it("names every hazard and level", () => {
    for (const h of HAZARDS) expect(common.en).toHaveProperty(`hazard.${h}`);
    for (const l of LEVELS) expect(common.en).toHaveProperty(`level.${l}`);
  });

  it("never says 'safe' in a hazard answer, in any language", () => {
    for (const lang of LANGS) {
      for (const [key, text] of Object.entries(common[lang])) {
        if (!key.startsWith("status.")) continue;
        for (const word of FORBIDDEN_ANSWER_WORDS) expect(String(text).toLowerCase()).not.toContain(word);
      }
    }
  });
});

describe("translate", () => {
  const strings = extendStrings(common, {
    en: { "x.hello": "Hello {name}", "x.only": "English only" },
    war: { "x.hello": "Maupay {name}" },
  });

  it("interpolates variables", () => {
    expect(translate(strings, "war", "x.hello", { name: "Ana" })).toBe("Maupay Ana");
  });

  it("falls back to English when a translation is missing", () => {
    expect(translate(strings, "fil", "x.only")).toBe("English only");
  });

  it("keeps unknown placeholders visible rather than dropping them", () => {
    expect(translate(strings, "en", "x.hello")).toBe("Hello {name}");
  });

  it("still serves the common strings through an extended table", () => {
    expect(translate(strings, "en", "status.notInZone")).toBe("Not in a mapped risk zone");
  });
});
