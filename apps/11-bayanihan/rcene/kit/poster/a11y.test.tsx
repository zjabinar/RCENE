import axe from "axe-core";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiBuiltPanel } from "./ai-built-panel.tsx";
import { PosterFigure } from "./poster-figure.tsx";
import { PosterPage } from "./poster-page.tsx";
import { PresenterMode, PresenterNotes, type PresenterStep } from "./presenter.tsx";
import { usePresenterStore } from "./presenter-store.ts";
import { PrintButton } from "./print-button.tsx";
import { QrToApp } from "./qr-to-app.tsx";
import { SixPanelPoster } from "./six-panel-poster.tsx";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

async function violations(container: HTMLElement) {
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) }));
}

const steps: PresenterStep[] = [
  { id: "a", caption: "A resident checks BRGY-01", notes: "Say what was pre-built.", seconds: 20 },
  { id: "b", caption: "The board updates live", seconds: 40 },
];

function Chart() {
  return (
    <svg viewBox="0 0 100 40" role="img" aria-label="Households per barangay">
      <rect x="0" y="10" width="40" height="30" fill="currentColor" />
    </svg>
  );
}

const INITIAL = usePresenterStore.getState();

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  localStorage.clear();
  usePresenterStore.setState(INITIAL, true);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("poster kit accessibility (axe)", () => {
  it("PosterPage with a SixPanelPoster, figure, AI panel and QR code", async () => {
    const { container } = render(
      <main>
        <PosterPage title="Andam poster">
          <SixPanelPoster
            title="Andam"
            subtitle="Early warning for Catbalogan"
            qr={<QrToApp url="http://192.168.1.20:5101/" />}
            footer={<span>RSCENE 2026 · Catbalogan City</span>}
            panels={{
              problem: <p>Residents cannot tell a mapped hazard from missing data.</p>,
              picture: (
                <PosterFigure title="Households in risk zones" caption="Most are in flood zones." source="CDRRMO" downloadSvg="households">
                  <Chart />
                </PosterFigure>
              ),
              different: (
                <ul>
                  <li>Three truthful answers</li>
                  <li>Waray first</li>
                </ul>
              ),
              ai: <AiBuiltPanel tools={[{ name: "Claude Code", role: "Wrote the app" }]} steps={["Brief", "Plan", "Build"]} />,
              data: <p>OCHA boundaries, CDRRMO risk maps, OpenStreetMap.</p>,
              impact: <p>Every barangay hall on the board.</p>,
            }}
          />
        </PosterPage>
      </main>,
    );
    expect(await violations(container)).toEqual([]);
  });

  it("PresenterMode bar, shown and after a step change", async () => {
    const { container } = render(
      <main>
        <p>App content</p>
        <PresenterMode steps={steps} />
      </main>,
    );
    expect(await violations(container)).toEqual([]);
    act(() => {
      fireEvent.keyDown(document.body, { key: "ArrowRight" });
    });
    expect(await violations(container)).toEqual([]);
  });

  it("PresenterNotes window", async () => {
    const { container } = render(
      <main>
        <PresenterNotes steps={steps} />
      </main>,
    );
    expect(await violations(container)).toEqual([]);
  });

  it("PrintButton", async () => {
    const { container } = render(<PrintButton />);
    expect(await violations(container)).toEqual([]);
  });
});
