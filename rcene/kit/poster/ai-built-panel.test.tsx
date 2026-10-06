import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AiBuiltPanel } from "./ai-built-panel.tsx";

afterEach(cleanup);

const tools = [
  { name: "Claude Code", role: "Wrote and tested the app from the brief" },
  { name: "Playwright", role: "Clicked through every screen and took screenshots" },
];

describe("AiBuiltPanel", () => {
  it("lists the tools, the process and the default disclosure", () => {
    render(<AiBuiltPanel tools={tools} steps={["Brief", "Plan", "Tests first", "Human review"]} />);
    expect(screen.getByRole("heading", { level: 3, name: "AI tools" })).toBeTruthy();
    const [toolList, stepList] = screen.getAllByRole("list");
    expect(within(toolList!).getAllByRole("listitem")).toHaveLength(2);
    expect(within(toolList!).getByText("Wrote and tested the app from the brief")).toBeTruthy();
    expect(stepList!.tagName).toBe("OL");
    expect(within(stepList!).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "1Brief",
      "2Plan",
      "3Tests first",
      "4Human review",
    ]);
    expect(screen.getByText(/pre-event-freeze tag/)).toBeTruthy();
  });

  it("uses the app's own disclosure and heading level, and skips empty steps", () => {
    render(<AiBuiltPanel tools={tools} disclosure="Built today: everything after pre-event-freeze." headingLevel={4} />);
    expect(screen.getByText("Built today: everything after pre-event-freeze.")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 4, name: "AI tools" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "How we worked" })).toBeNull();
  });
});
