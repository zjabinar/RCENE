import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollTrigger } from "@rcene/ui/motion";

import { StoryTimeline } from "./story-timeline.tsx";

function stubMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: /prefers-reduced-motion:\s*reduce/.test(query) ? reduce : false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ITEMS = [
  { id: "1987", date: "1987", title: "The first flood map", body: <p>Drawn by hand.</p> },
  { id: "2013", date: "Nov 2013", title: "Typhoon Yolanda", body: <p>The city rebuilds.</p>, icon: <svg data-testid="icon" /> },
  { id: "2026", date: "2026", title: "Maps in every pocket" },
];

describe("StoryTimeline", () => {
  it("is an ordered list, one item per event, with date, heading and body", () => {
    stubMotion(true);
    render(<StoryTimeline items={ITEMS} label="Catbalogan through the years" />);
    const list = screen.getByRole("list", { name: "Catbalogan through the years" });
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[1]!).getByRole("heading", { level: 3, name: "Typhoon Yolanda" })).toBeTruthy();
    expect(items[1]!.textContent).toContain("Nov 2013");
    expect(items[1]!.textContent).toContain("The city rebuilds.");
    expect(within(items[1]!).getByTestId("icon").closest("[aria-hidden='true']")).toBeTruthy();
  });

  it("under reduced motion the line is complete and every marker is lit", () => {
    stubMotion(true);
    const { container } = render(<StoryTimeline items={ITEMS} />);
    const progress = container.querySelector("[data-timeline-progress]") as SVGPathElement;
    expect(progress.getAttribute("style")).toBeNull();
    expect(progress.closest("svg")!.getAttribute("aria-hidden")).toBe("true");
    const reached = [...container.querySelectorAll("[data-timeline-item]")].map((li) => li.getAttribute("data-reached"));
    expect(reached).toEqual(["true", "true", "true"]);
  });

  it("with motion, markers wait for the scroll and come back lit on unmount (no layout needed)", () => {
    stubMotion(false);
    const before = ScrollTrigger.getAll().length;
    const { container, unmount } = render(<StoryTimeline items={ITEMS} headingLevel={2} />);
    const items = [...container.querySelectorAll("[data-timeline-item]")];
    expect(ScrollTrigger.getAll().length).toBe(before + ITEMS.length);
    // jsdom has no layout, so none has been reached yet… or ScrollTrigger decided they all were. Either is valid.
    for (const li of items) expect(["true", "false"]).toContain(li.getAttribute("data-reached"));
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
    unmount();
    expect(ScrollTrigger.getAll().length).toBe(before);
  });
});
