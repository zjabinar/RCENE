import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@rcene/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@rcene/ui")>()),
  downloadText: vi.fn(),
}));

import { downloadText } from "@rcene/ui";
import { PosterFigure } from "./poster-figure.tsx";

function Chart() {
  return (
    <svg viewBox="0 0 100 40" width="100" height="40" className="text-primary">
      <title>Households per barangay</title>
      <rect x="0" y="10" width="40" height="30" fill="currentColor" />
      <text x="50" y="20">BRGY-01</text>
    </svg>
  );
}

afterEach(() => {
  cleanup();
  vi.mocked(downloadText).mockClear();
});

describe("PosterFigure", () => {
  it("renders the title, caption and source with the figure", () => {
    render(
      <PosterFigure title="Households in risk zones" caption="Flood zones hold most households." source="CDRRMO 2024">
        <Chart />
      </PosterFigure>,
    );
    const figure = screen.getByRole("figure", { name: "Households in risk zones" });
    expect(figure.querySelector("figcaption")?.textContent).toContain("Flood zones hold most households.");
    expect(screen.getByText("Source: CDRRMO 2024")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Download SVG/ })).toBeNull();
  });

  it("downloads the figure's SVG through downloadText", () => {
    render(
      <PosterFigure title="Households in risk zones" downloadSvg="households">
        <Chart />
      </PosterFigure>,
    );
    const button = screen.getByRole("button", { name: "Download SVG: Households in risk zones" });
    expect(button.className).toContain("print:hidden");
    fireEvent.click(button);
    expect(downloadText).toHaveBeenCalledTimes(1);
    const [filename, text, mime] = vi.mocked(downloadText).mock.calls[0]!;
    expect(filename).toBe("households.svg");
    expect(mime).toBe("image/svg+xml;charset=utf-8");
    expect(text).toMatch(/^<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(text).toContain("BRGY-01");
    expect(text).not.toContain("text-primary");
  });

  it("shows the download button only once an <svg> is there", async () => {
    function Late({ ready }: { ready: boolean }) {
      return ready ? <Chart /> : <p>loading chart</p>;
    }
    const { rerender } = render(
      <PosterFigure title="Late chart" downloadSvg="late.svg">
        <Late ready={false} />
      </PosterFigure>,
    );
    expect(screen.queryByRole("button", { name: /Download SVG/ })).toBeNull();
    await act(async () => {
      rerender(
        <PosterFigure title="Late chart" downloadSvg="late.svg">
          <Late ready />
        </PosterFigure>,
      );
    });
    fireEvent.click(await screen.findByRole("button", { name: /Download SVG/ }));
    expect(vi.mocked(downloadText).mock.calls[0]?.[0]).toBe("late.svg");
  });
});
