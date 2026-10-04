import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useThemeStore } from "@rcene/ui/theme";

import { PosterPage, posterDimensions, usePosterSheet } from "./poster-page.tsx";

class ResizeObserverStub {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe() {
    this.callback([], this as unknown as ResizeObserver);
  }
  unobserve() {}
  disconnect() {}
}

function pageStyle(): HTMLStyleElement | null {
  return document.head.querySelector("style[data-rcene-poster-page]");
}

function SheetInfo() {
  const sheet = usePosterSheet();
  return <p>{`${sheet.size} ${sheet.orientation} ${sheet.widthMm}x${sheet.heightMm} zoom ${sheet.zoom.toFixed(3)}`}</p>;
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  useThemeStore.setState({ palette: null, mode: null });
});

describe("posterDimensions", () => {
  it("gives ISO sizes in mm for both orientations", () => {
    expect(posterDimensions("A3", "portrait")).toEqual({ widthMm: 297, heightMm: 420 });
    expect(posterDimensions("A3", "landscape")).toEqual({ widthMm: 420, heightMm: 297 });
    expect(posterDimensions("A2", "portrait")).toEqual({ widthMm: 420, heightMm: 594 });
  });
});

describe("PosterPage", () => {
  it("injects an A3 @page rule while mounted and removes it on unmount", () => {
    const { unmount } = render(
      <PosterPage title="Andam poster">
        <p>content</p>
      </PosterPage>,
    );
    const style = pageStyle();
    expect(style?.textContent).toContain("@page { size: 297mm 420mm; margin: 0; }");
    expect(style?.textContent).toContain("print-color-adjust: exact");
    unmount();
    expect(pageStyle()).toBeNull();
  });

  it("injects the A2 size and follows the toolbar's size and orientation switches", () => {
    const onChange = vi.fn();
    render(
      <PosterPage size="A2" onChange={onChange}>
        <SheetInfo />
      </PosterPage>,
    );
    expect(pageStyle()?.textContent).toContain("size: 420mm 594mm");
    expect(screen.getByText("A2 portrait 420x594 zoom 1.414")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Landscape" }));
    expect(pageStyle()?.textContent).toContain("size: 594mm 420mm");
    expect(onChange).toHaveBeenLastCalledWith({ size: "A2", orientation: "landscape" });

    fireEvent.click(screen.getByRole("button", { name: "A3" }));
    expect(screen.getByRole("button", { name: "A3" }).getAttribute("aria-pressed")).toBe("true");
    expect(pageStyle()?.textContent).toContain("size: 420mm 297mm");
    expect(document.head.querySelectorAll("style[data-rcene-poster-page]")).toHaveLength(1);
    expect(screen.getByText("A3 landscape 420x297 zoom 1.000")).toBeTruthy();
  });

  it("is a sheet of the exact physical size with a 12-column grid", () => {
    render(
      <PosterPage title="Andam poster">
        <p>content</p>
      </PosterPage>,
    );
    const sheet = screen.getByRole("article", { name: "Andam poster" });
    expect(sheet.style.width).toBe("297mm");
    expect(sheet.style.height).toBe("420mm");
    const canvas = sheet.querySelector<HTMLElement>("[data-poster-canvas]");
    expect(canvas?.style.gridTemplateColumns).toBe("repeat(12, minmax(0, 1fr))");
  });

  it("paints the sheet in the light variant of the current palette, or follows the screen", () => {
    useThemeStore.setState({ palette: "gabi", mode: "dark" });
    const { rerender } = render(<PosterPage title="Light">x</PosterPage>);
    let sheet = screen.getByRole("article", { name: "Light" });
    expect(sheet.getAttribute("data-palette")).toBe("gabi");
    expect(sheet.getAttribute("data-mode")).toBe("light");

    rerender(
      <PosterPage title="Light" printTone="screen">
        x
      </PosterPage>,
    );
    sheet = screen.getByRole("article", { name: "Light" });
    expect(sheet.hasAttribute("data-palette")).toBe(false);
    expect(sheet.hasAttribute("data-mode")).toBe(false);
  });

  it("scales the preview to the available width", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(561);
    render(<PosterPage title="Scaled">x</PosterPage>);
    const sheet = screen.getByRole("article", { name: "Scaled" });
    expect(sheet.style.transform).toMatch(/^scale\(0\.49\d+\)$/);
    expect(screen.getByText("Preview at 50%")).toBeTruthy();
  });

  it("prints with the title as the document title, and hides its toolbar in print", () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    document.title = "App";
    render(<PosterPage title="Andam poster A3">x</PosterPage>);
    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });
    expect(document.title).toBe("Andam poster A3");
    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });
    expect(document.title).toBe("App");

    const printButton = screen.getByRole("button", { name: "Print" });
    fireEvent.click(printButton);
    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("group", { name: "Poster tools" }).parentElement?.className).toContain("print:hidden");
  });

  it("warns when content runs past the edge of the sheet", async () => {
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(2000);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(1587);
    render(<PosterPage title="Too long">x</PosterPage>);
    expect(await screen.findByText(/runs past the edge of the sheet/)).toBeTruthy();
    expect(screen.getByText(/runs past the edge/).closest("[role=status]")).toBeTruthy();
  });

  it("can drop the toolbar", () => {
    render(
      <PosterPage toolbar={false} title="Bare">
        x
      </PosterPage>,
    );
    expect(screen.queryByRole("group", { name: "Poster tools" })).toBeNull();
    expect(screen.getByRole("article", { name: "Bare" })).toBeTruthy();
  });
});
