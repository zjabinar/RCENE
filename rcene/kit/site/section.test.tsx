import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Section } from "./section.tsx";

afterEach(cleanup);

describe("Section", () => {
  it("renders eyebrow, an h2 title that names the region, lead and content", () => {
    render(
      <Section id="how" eyebrow="How it works" title="Three steps to a plan" lead="It takes two minutes.">
        <p>Content</p>
      </Section>,
    );
    const region = screen.getByRole("region", { name: "Three steps to a plan" });
    expect(region.id).toBe("how");
    const h2 = screen.getByRole("heading", { level: 2, name: "Three steps to a plan" });
    expect(h2.className).toContain("font-display");
    expect(h2.className).toContain("text-display-3");
    expect(region.textContent).toContain("How it works");
    expect(region.textContent).toContain("It takes two minutes.");
    expect(region.textContent).toContain("Content");
  });

  it("centres the header and applies the tones", () => {
    const { container, unmount } = render(<Section title="Centered" align="center" tone="weave" />);
    const section = container.querySelector("section")!;
    expect(section.className).toContain("weave-bg");
    expect(section.querySelector("header")!.className).toContain("text-center");
    unmount();

    const muted = render(<Section title="Muted" tone="muted" />);
    expect(muted.container.querySelector("section")!.getAttribute("data-tone")).toBe("muted");
    muted.unmount();

    const showcase = render(<Section title="Neon" tone="showcase" eyebrow="Live" />);
    const surface = showcase.container.querySelector("[data-surface='showcase']")!;
    expect(surface).toBeTruthy();
    expect(surface.querySelector("section")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Neon" }).className).toContain("font-showcase");
  });

  it("without a title it is a plain section with just its content", () => {
    const { container } = render(
      <Section>
        <p>Only content</p>
      </Section>,
    );
    expect(container.querySelector("section")!.hasAttribute("aria-labelledby")).toBe(false);
    expect(container.querySelector("header")).toBeNull();
  });
});
