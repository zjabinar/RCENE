import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FORBIDDEN_ANSWER_WORDS } from "@rcene/i18n";
import { BaseMap } from "./BaseMap.tsx";
import { Legend } from "./Legend.tsx";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // jsdom has no WebGL; also keeps useLayer's fetch from hitting the network.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("BaseMap", () => {
  it("shows an alert instead of the map when WebGL2 is unavailable", () => {
    act(() => root.render(<BaseMap onClick={() => {}} />));
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toMatch(/WebGL2/);
  });
});

describe("Legend", () => {
  it("labels every swatch with text, titles by hazard, and never says safe", () => {
    act(() => root.render(<Legend hazard="flood" />));
    const text = container.textContent ?? "";
    expect(container.querySelector("section p")?.textContent).toBe("Flood");
    for (const label of ["Low", "Moderate", "High", "Very high", "Not in a mapped risk zone", "Outside data coverage"]) {
      expect(text).toContain(label);
    }
    for (const word of FORBIDDEN_ANSWER_WORDS) expect(text.toLowerCase()).not.toContain(word);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(6);
  });

  it("can list a subset of levels without the state rows", () => {
    act(() => root.render(<Legend levels={["high", "veryHigh"]} showStates={false} />));
    expect(container.querySelector("section p")?.textContent).toBe("Legend");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });
});
