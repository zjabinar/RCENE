import { act } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLangStore } from "@rcene/i18n";

import { ScrollyChapter } from "./scrolly-chapter.tsx";

type IOCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;
const instances: StubIntersectionObserver[] = [];

class StubIntersectionObserver {
  callback: IOCallback;
  targets: Element[] = [];
  options: IntersectionObserverInit | undefined;
  constructor(callback: IOCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
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
  /** Fire as if `index` crossed the middle band of the viewport. */
  enter(index: number) {
    act(() => this.callback([{ target: this.targets[index], isIntersecting: true, intersectionRatio: 1 }]));
  }
}

const STEPS = [
  { id: "a", title: "The river rises", body: <p>Body A</p> },
  { id: "b", title: "Barangays respond", body: <p>Body B</p> },
  { id: "c", title: "Everyone accounted for", body: <p>Body C</p> },
];

beforeEach(() => {
  instances.length = 0;
  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
  Element.prototype.scrollIntoView ??= function scrollIntoView() {};
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  act(() => useLangStore.setState({ lang: "en" }));
});

function setup(onStepChange = vi.fn()) {
  render(<ScrollyChapter steps={STEPS} visual={(i) => <p data-testid="visual">Visual {i}</p>} onStepChange={onStepChange} />);
  const cards = STEPS.map((s) => screen.getByRole("article", { name: s.title }));
  return { cards, onStepChange, observer: instances.at(-1)! };
}

describe("ScrollyChapter", () => {
  it("starts on the first step and observes every step card", () => {
    const { cards, observer } = setup();
    expect(screen.getByTestId("visual").textContent).toBe("Visual 0");
    expect(cards[0]!.getAttribute("aria-current")).toBe("step");
    expect(observer.targets).toEqual(cards);
    expect(observer.options?.rootMargin).toBe("-45% 0px -45% 0px");
    expect(observer.options?.root).toBeNull();
    expect(cards[0]!.closest("ol")!.getAttribute("aria-describedby")).toBeTruthy();
    expect(cards[1]!.textContent).toContain("Step 2 of 3");
  });

  it("switches the active step when the IntersectionObserver fires, and announces it politely", () => {
    const { cards, onStepChange, observer } = setup();
    observer.enter(1);
    expect(screen.getByTestId("visual").textContent).toBe("Visual 1");
    expect(cards[1]!.getAttribute("aria-current")).toBe("step");
    expect(cards[0]!.getAttribute("aria-current")).toBeNull();
    expect(onStepChange).toHaveBeenCalledWith(1);
    const status = document.querySelector("[aria-live='polite']")!;
    expect(status.textContent).toBe("Step 2 of 3: Barangays respond");

    // A step leaving the band does not change anything; the same step again does not re-notify.
    act(() => observer.callback([{ target: cards[1], isIntersecting: false, intersectionRatio: 0 }]));
    observer.enter(1);
    expect(onStepChange).toHaveBeenCalledTimes(1);
    observer.enter(2);
    expect(screen.getByTestId("visual").textContent).toBe("Visual 2");
    expect(onStepChange).toHaveBeenLastCalledWith(2);
  });

  it("settles on the right step after a scroll jump that skipped the middle band", async () => {
    vi.useFakeTimers();
    try {
      const { cards, onStepChange } = setup();
      // Cards 1 and 2 are above the line (55% of the viewport), card 3 below it.
      const tops = [-900, 100, 2000];
      cards.forEach((card, i) => {
        card.getBoundingClientRect = () => ({ top: tops[i]!, bottom: tops[i]! + 200 }) as DOMRect;
      });
      act(() => {
        window.dispatchEvent(new Event("scroll"));
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByTestId("visual").textContent).toBe("Visual 1");
      expect(onStepChange).toHaveBeenLastCalledWith(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("step cards are focusable and navigable with the arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    const { cards } = setup();
    expect(cards.every((card) => card.tabIndex === 0)).toBe(true);
    cards[0]!.focus();
    expect(document.activeElement).toBe(cards[0]);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(cards[1]);
    expect(screen.getByTestId("visual").textContent).toBe("Visual 1");
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(cards[2]);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(cards[2]);
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(cards[0]);
    expect(screen.getByTestId("visual").textContent).toBe("Visual 0");
  });

  it("the step dots jump to a step", async () => {
    const user = userEvent.setup();
    const { cards } = setup();
    const nav = screen.getByRole("navigation", { name: "Story steps" });
    expect(nav).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Go to step 3: Everyone accounted for" }));
    expect(document.activeElement).toBe(cards[2]);
    expect(screen.getByRole("button", { name: "Go to step 3: Everyone accounted for" }).getAttribute("aria-current")).toBe("step");
  });

  it("inside a scroll box: observes against the box and sizes the panel from `height`", () => {
    render(
      <div data-testid="box" style={{ overflowY: "auto", height: "30rem" }}>
        <ScrollyChapter steps={STEPS} visual={(i) => <p>Visual {i}</p>} height="30rem" />
      </div>,
    );
    const observer = instances.at(-1)!;
    expect(observer.options?.root).toBe(screen.getByTestId("box"));
    const chapter = screen.getByTestId("box").firstElementChild as HTMLElement;
    expect(chapter.style.getPropertyValue("--kit-scrolly-height")).toBe("30rem");
  });

  it("speaks Waray and Filipino", () => {
    act(() => useLangStore.setState({ lang: "fil" }));
    setup();
    expect(screen.getByRole("navigation", { name: "Mga hakbang ng kuwento" })).toBeTruthy();
    expect(screen.getByRole("article", { name: "Barangays respond" }).textContent).toContain("Hakbang 2 sa 3");
  });
});
