import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FORBIDDEN_ANSWER_WORDS, useLangStore } from "@rcene/i18n";
import { HazardStatusBadge, HazardStatusList } from "./hazard-status.tsx";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  act(() => useLangStore.setState({ lang: "en" }));
});

describe("HazardStatusBadge", () => {
  it("shows hazard name, level phrase and an icon for inZone", () => {
    act(() => root.render(<HazardStatusBadge hazard="flood" status={{ kind: "inZone", level: "veryHigh" }} />));
    const badge = host.querySelector("[data-slot='hazard-status-badge']")!;
    expect(badge.textContent).toContain("Flood");
    expect(badge.textContent).toContain("In a mapped risk zone — Very high");
    expect(badge.querySelector("svg")).not.toBeNull();
    expect(badge.className).toContain("bg-level-veryHigh");
  });

  it("uses neutral slate (not green) for notInZone and dashed gray for outsideCoverage", () => {
    act(() =>
      root.render(
        <>
          <HazardStatusBadge hazard="landslide" status={{ kind: "notInZone" }} />
          <HazardStatusBadge hazard="stormSurge" status={{ kind: "outsideCoverage" }} />
        </>,
      ),
    );
    const [notIn, outside] = host.querySelectorAll("[data-slot='hazard-status-badge']");
    expect(notIn!.textContent).toContain("Not in a mapped risk zone");
    expect(notIn!.className).toContain("status-not-in-zone");
    expect(notIn!.className).not.toMatch(/green|emerald/);
    expect(outside!.textContent).toContain("Outside data coverage");
    expect(outside!.className).toContain("border-dashed");
  });

  it("translates and never says 'safe' in any language", () => {
    for (const lang of ["en", "war", "fil"] as const) {
      act(() => useLangStore.setState({ lang }));
      act(() =>
        root.render(
          <HazardStatusList
            status={{ flood: { kind: "inZone", level: "low" }, landslide: { kind: "notInZone" }, liquefaction: { kind: "outsideCoverage" } }}
          />,
        ),
      );
      const text = host.textContent!.toLowerCase();
      for (const word of FORBIDDEN_ANSWER_WORDS) expect(text).not.toContain(word);
    }
    expect(host.textContent).toContain("Baha");
  });
});

describe("HazardStatusList", () => {
  it("renders badges in HAZARDS order plus a line per missing hazard", () => {
    act(() =>
      root.render(
        <HazardStatusList
          status={{ liquefaction: { kind: "notInZone" }, flood: { kind: "inZone", level: "high" } }}
          missing={["landslide"]}
        />,
      ),
    );
    const items = [...host.querySelectorAll("[data-slot='hazard-status-item']")];
    expect(items.map((li) => li.firstElementChild!.getAttribute("data-hazard"))).toEqual([
      "flood",
      "landslide",
      "liquefaction",
    ]);
    expect(items[1]!.textContent).toContain("This data layer is not available yet.");
  });

  it("respects a custom order", () => {
    act(() =>
      root.render(
        <HazardStatusList
          order={["stormSurge", "flood"]}
          status={{ flood: { kind: "notInZone" }, stormSurge: { kind: "outsideCoverage" }, landslide: { kind: "notInZone" } }}
        />,
      ),
    );
    const hazards = [...host.querySelectorAll("[data-slot='hazard-status-badge']")].map((b) => b.getAttribute("data-hazard"));
    expect(hazards).toEqual(["stormSurge", "flood"]);
  });
});
