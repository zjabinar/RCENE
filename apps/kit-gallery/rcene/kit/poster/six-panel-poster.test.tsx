import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLangStore } from "@rcene/i18n";

import { PosterPage } from "./poster-page.tsx";
import { SixPanelPoster } from "./six-panel-poster.tsx";

const panels = {
  problem: <p>Residents cannot tell a mapped hazard from missing data.</p>,
  picture: <p>three windows mid-warning</p>,
  different: <p>Three truthful answers.</p>,
  ai: <p>Claude Code from the brief.</p>,
  data: <p>CDRRMO risk maps, OSM.</p>,
  impact: <p>Every barangay hall on the board.</p>,
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useLangStore.setState({ lang: "en" });
});

describe("SixPanelPoster", () => {
  it("renders the title band and six labelled, numbered regions in reading order", () => {
    render(
      <PosterPage title="Andam poster">
        <SixPanelPoster
          title="Andam"
          subtitle="Early warning for Catbalogan"
          panels={panels}
          footer={<span>RSCENE 2026</span>}
          qr={<span>QR here</span>}
        />
      </PosterPage>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Andam" })).toBeTruthy();
    expect(screen.getByText("Early warning for Catbalogan")).toBeTruthy();
    expect(screen.getByText("QR here")).toBeTruthy();
    expect(screen.getByText("RSCENE 2026").closest("footer")).toBeTruthy();

    const regions = screen.getAllByRole("region");
    expect(regions.map((r) => r.getAttribute("data-panel"))).toEqual([
      "problem",
      "picture",
      "different",
      "ai",
      "data",
      "impact",
    ]);
    const names = [
      "The problem",
      "The app in one picture",
      "What's different",
      "How AI built it",
      "Data",
      "Impact",
    ];
    names.forEach((name, i) => {
      const region = screen.getByRole("region", { name });
      expect(region).toBe(regions[i]);
      expect(within(region).getByRole("heading", { level: 2, name })).toBeTruthy();
    });
    expect(within(screen.getByRole("region", { name: "Impact" })).getByText("Every barangay hall on the board.")).toBeTruthy();
  });

  it("places the panels for portrait and for landscape", () => {
    const { rerender } = render(
      <PosterPage>
        <SixPanelPoster title="Andam" panels={panels} />
      </PosterPage>,
    );
    const picture = () => screen.getByRole("region", { name: "The app in one picture" });
    expect(picture().style.gridColumn).toBe("6 / 13");
    expect(picture().style.gridRow).toBe("2 / 4");

    rerender(
      <PosterPage orientation="landscape">
        <SixPanelPoster title="Andam" panels={panels} />
      </PosterPage>,
    );
    expect(picture().style.gridColumn).toBe("4 / 10");
    expect(screen.getByRole("region", { name: "How AI built it" }).style.gridRow).toBe("2 / 4");
  });

  it("translates the panel headings", () => {
    useLangStore.setState({ lang: "fil" });
    render(<SixPanelPoster title="Andam" panels={panels} />);
    expect(screen.getByRole("region", { name: "Ang problema" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Paano ito binuo ng AI" })).toBeTruthy();
  });
});
