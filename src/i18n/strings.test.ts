import { describe, expect, it } from "vitest";
import { FORBIDDEN_ANSWER_WORDS, LANGS } from "@rcene/i18n";
import { strings } from "./strings.ts";

/**
 * Keys whose text answers "what is the hazard here?": the shared status.* and level.* keys
 * (HazardStatusBadge and Legend show this app's overrides) and any app key under answer.*
 * or result.*. Put new hazard-answer strings under one of these prefixes.
 */
const ANSWER_KEY = /^(status|level|answer|result)\./;

describe("app strings", () => {
  it("never invents keys: every Waray and Filipino key exists in English", () => {
    for (const lang of ["war", "fil"] as const) {
      expect(Object.keys(strings[lang]).filter((k) => !(k in strings.en))).toEqual([]);
    }
  });

  it("never says 'safe' in a hazard answer, in any language", () => {
    for (const lang of LANGS) {
      for (const [key, text] of Object.entries(strings[lang])) {
        if (!ANSWER_KEY.test(key)) continue;
        for (const word of FORBIDDEN_ANSWER_WORDS) expect(String(text).toLowerCase(), `${lang} ${key}`).not.toContain(word);
      }
    }
  });
});
