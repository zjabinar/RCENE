import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LangOverride } from "@rcene/i18n";
import { Wordmark } from "./wordmark.tsx";

afterEach(cleanup);

describe("Wordmark", () => {
  it("is one image named RCENE (full variant, the default)", () => {
    const { container } = render(<Wordmark />);
    const img = screen.getByRole("img", { name: "RCENE" });
    expect(img.getAttribute("data-variant")).toBe("full");
    expect(img.textContent).toContain("Catbalogan City");
    // The pin and the text inside are hidden: the name is the only thing announced.
    for (const svg of container.querySelectorAll("svg")) expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  it("compact shows the mark and the name only", () => {
    render(<Wordmark variant="compact" className="text-4xl" />);
    const img = screen.getByRole("img", { name: "RCENE" });
    expect(img.textContent).toBe("RCENE");
    expect(img.className).toContain("text-4xl");
    expect(img.className).not.toContain("text-2xl");
  });

  it("keeps the brand name and translates the place line", () => {
    render(
      <LangOverride lang="fil">
        <Wordmark />
      </LangOverride>,
    );
    const img = screen.getByRole("img", { name: "RCENE" });
    expect(img.textContent).toContain("Lungsod ng Catbalogan");
  });
});
