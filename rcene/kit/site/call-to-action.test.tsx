import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CallToAction } from "./call-to-action.tsx";

afterEach(cleanup);

describe("CallToAction", () => {
  it("brand: a region named by its h2, with body and actions", () => {
    const { container } = render(
      <CallToAction title="Make your plan today" body="It takes two minutes." actions={<a href="/plan">Start my plan</a>} />,
    );
    const region = screen.getByRole("region", { name: "Make your plan today" });
    expect(region.getAttribute("data-tone")).toBe("brand");
    expect(screen.getByRole("heading", { level: 2 }).className).toContain("font-display");
    expect(region.textContent).toContain("It takes two minutes.");
    expect(screen.getByRole("link", { name: "Start my plan" })).toBeTruthy();
    expect(container.querySelector(".bg-brand")).toBeTruthy();
    for (const svg of container.querySelectorAll("svg")) expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  it("showcase: the neon surface with a glowing title", () => {
    const { container } = render(<CallToAction tone="showcase" title="See it live" actions={<button type="button">Open demo</button>} />);
    expect(container.querySelector("[data-surface='showcase']")).toBeTruthy();
    const h2 = screen.getByRole("heading", { level: 2, name: "See it live" });
    expect(h2.className).toContain("glow-text");
    expect(screen.getByRole("button", { name: "Open demo" })).toBeTruthy();
  });
});
