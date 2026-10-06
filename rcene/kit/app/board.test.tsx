import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoardRotator, BoardShell } from "./board.tsx";

/** matchMedia that reports the reduced-motion setting we want (jsdom has none). */
function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && /prefers-reduced-motion:\s*reduce/.test(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 7, 9, 0, 30));
  stubReducedMotion(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const PAGES = [<p key="a">Centres A–F</p>, <p key="b">Centres G–M</p>, <p key="c">Centres N–Z</p>];

function pageText() {
  return document.querySelector("[data-slot='board-page']")?.textContent;
}

describe("BoardShell", () => {
  it("shows the title, a live clock and a polite status region", () => {
    render(
      <BoardShell title="Now serving" status={<span>Window 2: A-012</span>} footer={<span>Sample data</span>}>
        <p>Queue</p>
      </BoardShell>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Now serving" })).toBeTruthy();
    const time = document.querySelector("time")!;
    expect(time.getAttribute("dateTime")).toBe(new Date(2026, 9, 7, 9, 0, 30).toISOString());
    expect(time.textContent).toMatch(/9:00/);
    const status = document.querySelector("[data-slot='board-status']")!;
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toBe("Window 2: A-012");
    // Only the status line is live.
    expect(document.querySelectorAll("[aria-live='polite']")).toHaveLength(1);
    expect(screen.getByText("Sample data")).toBeTruthy();
  });

  it("updates the clock on the minute", () => {
    render(
      <BoardShell title="Board">
        <p>Body</p>
      </BoardShell>,
    );
    const time = document.querySelector("time")!;
    expect(time.textContent).toMatch(/9:00/);
    act(() => vi.advanceTimersByTime(30_000));
    expect(time.textContent).toMatch(/9:01/);
    act(() => vi.advanceTimersByTime(60_000));
    expect(time.textContent).toMatch(/9:02/);
  });

  it("can hide the clock", () => {
    render(
      <BoardShell title="Board" clock={false}>
        <p>Body</p>
      </BoardShell>,
    );
    expect(document.querySelector("time")).toBeNull();
  });
});

describe("BoardRotator", () => {
  it("pages through items on a timer with a visible page count", () => {
    render(<BoardRotator items={PAGES} intervalMs={1000} />);
    expect(screen.getByText("Page 1 of 3")).toBeTruthy();
    expect(pageText()).toBe("Centres A–F");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
    expect(pageText()).toBe("Centres G–M");
    act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(1000));
    expect(pageText()).toBe("Centres A–F");
  });

  it("stops on Pause and resumes on Play", () => {
    render(<BoardRotator items={PAGES} intervalMs={1000} />);
    const pause = screen.getByRole("button", { name: "Pause" });
    fireEvent.click(pause);
    // Focus leaves the rotator, so only the Pause choice holds it.
    fireEvent.blur(pause, { relatedTarget: document.body });
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("Page 1 of 3")).toBeTruthy();
    expect(screen.getByText("Paused")).toBeTruthy();
    const play = screen.getByRole("button", { name: "Play" });
    fireEvent.click(play);
    fireEvent.blur(play, { relatedTarget: document.body });
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
  });

  it("holds while hovered or focused, and while `paused`", () => {
    const { rerender } = render(<BoardRotator items={PAGES} intervalMs={1000} />);
    const region = screen.getByRole("region", { name: "Board pages" });
    fireEvent.pointerEnter(region);
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("Page 1 of 3")).toBeTruthy();
    fireEvent.pointerLeave(region);
    fireEvent.focus(screen.getByRole("button", { name: "Next page" }));
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("Page 1 of 3")).toBeTruthy();
    fireEvent.blur(screen.getByRole("button", { name: "Next page" }), { relatedTarget: document.body });
    rerender(<BoardRotator items={PAGES} intervalMs={1000} paused />);
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("Page 1 of 3")).toBeTruthy();
  });

  it("starts paused under reduced motion, and the page region is then polite", () => {
    stubReducedMotion(true);
    render(<BoardRotator items={PAGES} intervalMs={1000} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("Page 1 of 3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
    expect(document.querySelector("[data-slot='board-page']")?.getAttribute("aria-live")).toBe("polite");
  });

  it("can start on Pause with defaultPaused", () => {
    render(<BoardRotator items={PAGES} intervalMs={1000} defaultPaused />);
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("Page 1 of 3")).toBeTruthy();
    const play = screen.getByRole("button", { name: "Play" });
    fireEvent.click(play);
    fireEvent.blur(play, { relatedTarget: document.body });
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
  });

  it("rotates after an explicit Play even while focus stays on the button", () => {
    render(<BoardRotator items={PAGES} intervalMs={1000} defaultPaused />);
    const region = screen.getByRole("region", { name: "Board pages" });
    const play = screen.getByRole("button", { name: "Play" });
    fireEvent.pointerEnter(region);
    fireEvent.focus(play);
    fireEvent.click(play);
    expect(screen.getByRole("button", { name: "Pause" })).toBe(play);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("Page 3 of 3")).toBeTruthy();
    // Pause holds again, and hover/focus hold once more until the next Play.
    fireEvent.click(play);
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("Page 3 of 3")).toBeTruthy();
  });

  it("rotates under reduced motion once the viewer presses Play, focus or not", () => {
    stubReducedMotion(true);
    render(<BoardRotator items={PAGES} intervalMs={1000} />);
    const play = screen.getByRole("button", { name: "Play" });
    fireEvent.focus(play);
    fireEvent.click(play);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
  });

  it("moves with Previous and Next", () => {
    render(<BoardRotator items={PAGES} intervalMs={1000} paused />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(pageText()).toBe("Centres G–M");
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(pageText()).toBe("Centres N–Z");
  });

  it("renders a single item without controls", () => {
    render(<BoardRotator items={[<p key="x">Only page</p>]} />);
    expect(pageText()).toBe("Only page");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
