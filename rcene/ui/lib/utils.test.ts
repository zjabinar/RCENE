import { describe, expect, it } from "vitest";
import { cn } from "./utils.ts";

describe("cn", () => {
  it("keeps the RCENE type scale next to a text colour", () => {
    expect(cn("text-display-1 text-foreground")).toBe("text-display-1 text-foreground");
    expect(cn("text-board-2", "text-primary-foreground")).toBe("text-board-2 text-primary-foreground");
  });

  it("lets a later size or shadow override an earlier one", () => {
    expect(cn("text-display-1", "text-display-3")).toBe("text-display-3");
    expect(cn("text-sm", "text-board-1")).toBe("text-board-1");
    expect(cn("shadow-sm", "shadow-raised")).toBe("shadow-raised");
    expect(cn("ease-in", "ease-weave")).toBe("ease-weave");
  });

  it("keeps the display font next to a font weight", () => {
    expect(cn("font-display font-semibold")).toBe("font-display font-semibold");
    expect(cn("font-sans", "font-showcase")).toBe("font-showcase");
  });
});
