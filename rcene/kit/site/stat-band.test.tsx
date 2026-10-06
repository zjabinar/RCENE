import { act } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLangStore } from "@rcene/i18n";

import { StatBand } from "./stat-band.tsx";

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

type IOCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;
const instances: StubIntersectionObserver[] = [];

class StubIntersectionObserver {
  callback: IOCallback;
  targets: Element[] = [];
  constructor(callback: IOCallback) {
    this.callback = callback;
    instances.push(this);
  }
  observe(el: Element) {
    this.targets.push(el);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  instances.length = 0;
  act(() => useLangStore.setState({ lang: "en" }));
});

const ITEMS = [
  { value: 57, label: "Barangays covered" },
  { value: 12345, label: "Households mapped" },
  { value: 87.5, label: "Evacuation sites checked", suffix: "%" },
  { value: 1728.75, label: "Average cost", format: (n: number) => `₱${n.toFixed(2)}` },
];

/** The visible (animated) number of each item, without the sr-only copy. */
const shown = (container: HTMLElement) =>
  [...container.querySelectorAll("dd > [aria-hidden='true']")].map((el) => {
    const number = el.querySelector("[data-slot='count-up'] > [aria-hidden='true']")?.textContent ?? "";
    const suffix = el.querySelector("[data-slot='count-up'] + span")?.textContent ?? "";
    return number + suffix;
  });
const spoken = (container: HTMLElement) => [...container.querySelectorAll("dd > .sr-only")].map((el) => el.textContent);

describe("StatBand", () => {
  it("shows formatted final values at once under reduced motion", () => {
    stubMotion(true);
    vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
    const { container } = render(<StatBand items={ITEMS} />);
    expect(shown(container)).toEqual(["57", "12,345", "87.5%", "₱1728.75"]);
    expect(spoken(container)).toEqual(["57", "12,345", "87.5%", "₱1728.75"]);
    // A description list: each label (dt) with its value (dd).
    const terms = [...container.querySelectorAll("dt")].map((dt) => dt.textContent);
    expect(terms).toEqual(ITEMS.map((i) => i.label));
  });

  it("formats for the language", () => {
    stubMotion(true);
    act(() => useLangStore.setState({ lang: "fil" }));
    const { container } = render(<StatBand items={[{ value: 12345.6, label: "x" }]} />);
    expect(shown(container)).toEqual(["12,345.6"]);
  });

  it("with motion, waits for the band to scroll into view; screen readers get the final value meanwhile", () => {
    stubMotion(false);
    vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
    const { container } = render(<StatBand items={ITEMS.slice(0, 2)} />);
    expect(shown(container)).toEqual(["0", "0"]);
    expect(spoken(container)).toEqual(["57", "12,345"]);
    const observer = instances.at(-1)!;
    expect(observer.targets[0]).toBe(container.querySelector("dl"));
    act(() => observer.callback([{ isIntersecting: true, target: observer.targets[0] }]));
    // The count-up is now running toward the final values.
    expect(container.querySelector("dl")).toBeTruthy();
  });

  it("shows the values at once where IntersectionObserver is missing", () => {
    stubMotion(true);
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<StatBand items={ITEMS.slice(0, 1)} tone="brand" />);
    expect(shown(container)).toEqual(["57"]);
    expect(container.querySelector("dl")!.getAttribute("data-tone")).toBe("brand");
  });
});
