import { describe, expect, it } from "vitest";
import { LANGS } from "@rcene/i18n";
import { strings } from "./i18n/strings.ts";
import { ROLES, roleForPath } from "./roles.ts";

describe("roles", () => {
  it("have unique ids and one-segment paths", () => {
    expect(new Set(ROLES.map((r) => r.id)).size).toBe(ROLES.length);
    expect(new Set(ROLES.map((r) => r.path)).size).toBe(ROLES.length);
    for (const r of ROLES) expect(r.path).toMatch(/^\/[a-z][a-z0-9-]*$/);
  });

  it("have a title and a summary in every language", () => {
    for (const lang of LANGS) {
      const table = strings[lang] as Record<string, string | undefined>;
      for (const r of ROLES) {
        expect(table[`role.${r.id}.title`], `${lang} ${r.id}`).toBeTruthy();
        expect(table[`role.${r.id}.summary`], `${lang} ${r.id}`).toBeTruthy();
      }
    }
  });

  it("finds the role of a route, including its sub-routes", () => {
    expect(roleForPath("/console")?.id).toBe("console");
    expect(roleForPath("/console/REC-0001")?.id).toBe("console");
    expect(roleForPath("/board")?.palette).toBe("malinaw");
    expect(roleForPath("/")).toBeNull();
    expect(roleForPath("/sources")).toBeNull();
  });
});
