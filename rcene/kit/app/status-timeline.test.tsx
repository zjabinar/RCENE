import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useLangStore } from "@rcene/i18n";
import { StatusTimeline, type StatusTimelineItem } from "./status-timeline.tsx";

afterEach(() => {
  cleanup();
  act(() => useLangStore.setState({ lang: "en" }));
});

const ITEMS: StatusTimelineItem[] = [
  { id: "filed", label: "Report filed", state: "done", time: new Date(2026, 9, 7, 8, 15) },
  { id: "review", label: "Under review", state: "current", time: "2026-10-07T09:30:00", note: "Assigned to desk 2" },
  { id: "fix", label: "Repair crew", state: "blocked", time: "Day 2" },
  { id: "closed", label: "Closed", state: "upcoming" },
];

describe("StatusTimeline", () => {
  it("renders an ordered list with a state word for every item and aria-current on the current one", () => {
    render(<StatusTimeline items={ITEMS} />);
    const list = screen.getByRole("list", { name: "Status timeline" });
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items.map((li) => li.getAttribute("aria-current"))).toEqual([null, "step", null, null]);
    expect(items[0]!.textContent).toContain("Done");
    expect(items[1]!.textContent).toContain("In progress");
    expect(items[2]!.textContent).toContain("Blocked");
    expect(items[3]!.textContent).toContain("Upcoming");
    expect(items[1]!.textContent).toContain("Assigned to desk 2");
    // Icons are decorative; the state is in words.
    expect(items[0]!.querySelector("svg")?.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("formats Date and ISO times in a <time> and shows other text as is", () => {
    render(<StatusTimeline items={ITEMS} />);
    const times = document.querySelectorAll("time");
    expect(times).toHaveLength(2);
    expect(times[0]!.getAttribute("dateTime")).toBe(new Date(2026, 9, 7, 8, 15).toISOString());
    expect(times[0]!.textContent).toMatch(/8:15/);
    expect(times[1]!.getAttribute("dateTime")).toBe("2026-10-07T09:30:00");
    expect(screen.getByText("Day 2").tagName).toBe("SPAN");
  });

  it("supports a horizontal layout and translated state words", () => {
    act(() => useLangStore.setState({ lang: "fil" }));
    render(<StatusTimeline items={ITEMS} orientation="horizontal" label="Request" />);
    const list = screen.getByRole("list", { name: "Request" });
    expect(list.getAttribute("data-orientation")).toBe("horizontal");
    expect(list.className).toContain("sm:flex-row");
    expect(list.textContent).toContain("Tapos na");
  });
});
