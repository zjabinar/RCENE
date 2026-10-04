import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useLangStore } from "@rcene/i18n";
import { CapacityMeter, capacityState } from "./capacity-meter.tsx";

afterEach(() => {
  cleanup();
  act(() => useLangStore.setState({ lang: "en" }));
});

function meter() {
  return screen.getByRole("meter");
}

function stateText() {
  return document.querySelector("[data-slot='capacity-state']")?.textContent;
}

describe("capacityState", () => {
  it("uses 0.75 and 1 as default thresholds", () => {
    expect(capacityState(0, 100)).toBe("open");
    expect(capacityState(74, 100)).toBe("open");
    expect(capacityState(75, 100)).toBe("nearlyFull");
    expect(capacityState(100, 100)).toBe("full");
    expect(capacityState(101, 100)).toBe("over");
    expect(capacityState(3, 0)).toBe("over");
    expect(capacityState(0, 0)).toBe("open");
    expect(capacityState(50, 100, { warn: 0.5, full: 0.9 })).toBe("nearlyFull");
    expect(capacityState(90, 100, { warn: 0.5, full: 0.9 })).toBe("full");
  });
});

describe("CapacityMeter", () => {
  it("is a labelled meter with value, range and value text", () => {
    render(<CapacityMeter value={40} max={100} label="Covered court BRGY-07" />);
    const m = meter();
    expect(m.getAttribute("aria-valuemin")).toBe("0");
    expect(m.getAttribute("aria-valuemax")).toBe("100");
    expect(m.getAttribute("aria-valuenow")).toBe("40");
    expect(m.getAttribute("aria-valuetext")).toBe("40 of 100 — Open");
    expect(screen.getByRole("meter", { name: "Covered court BRGY-07" })).toBe(m);
    expect(stateText()).toBe("Open");
    expect(screen.getByText("60 left")).toBeTruthy();
  });

  it("says nearly full and full in words, with an icon", () => {
    const { rerender } = render(<CapacityMeter value={80} max={100} label="Gym" />);
    expect(meter().getAttribute("aria-valuetext")).toBe("80 of 100 — Nearly full");
    expect(stateText()).toBe("Nearly full");
    expect(document.querySelector("[data-slot='capacity-state'] svg")?.getAttribute("aria-hidden")).toBe("true");
    rerender(<CapacityMeter value={100} max={100} label="Gym" />);
    expect(meter().getAttribute("aria-valuetext")).toBe("100 of 100 — Full");
    expect(stateText()).toBe("Full");
    expect(screen.getByText("0 left")).toBeTruthy();
  });

  it("handles a value over the maximum", () => {
    render(<CapacityMeter value={1300} max={1000} label="School" />);
    const m = meter();
    expect(m.getAttribute("aria-valuenow")).toBe("1000");
    expect(m.getAttribute("aria-valuetext")).toBe("1,300 of 1,000 — Over capacity");
    expect(stateText()).toBe("Over capacity");
    expect(screen.getByText("300 over")).toBeTruthy();
    expect(document.querySelector("[data-slot='capacity-meter']")?.getAttribute("data-state")).toBe("over");
    expect((m.firstElementChild as HTMLElement).style.width).toBe("100%");
  });

  it("can hide the numbers and follows the language", () => {
    act(() => useLangStore.setState({ lang: "fil" }));
    render(<CapacityMeter value={9} max={10} label="Kama" showNumbers={false} />);
    expect(meter().getAttribute("aria-valuetext")).toBe("9 sa 10 — Halos puno na");
    expect(screen.queryByText(/bakante/)).toBeNull();
  });
});
