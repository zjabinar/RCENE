import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SPOT_NAMES } from "../brand/spot-illustration.tsx";
import { IllustratedState } from "./illustrated-state.tsx";

afterEach(cleanup);

describe("IllustratedState", () => {
  it("renders the title, description and actions with a decorative illustration", () => {
    render(
      <IllustratedState
        spot="map"
        title="Pick a place on the map"
        description="Tap the map or search for a barangay."
        actions={<button type="button">Use my location</button>}
      />,
    );
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Pick a place on the map");
    expect(screen.getByText("Tap the map or search for a barangay.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Use my location" })).toBeTruthy();
    const svg = status.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(status.getAttribute("data-spot")).toBe("map");
  });

  it("draws every brand spot (SpotIllustration) with theme tokens only, sized per size", () => {
    for (const spot of SPOT_NAMES) {
      const { container, unmount } = render(<IllustratedState spot={spot} title={spot} />);
      const svg = container.querySelector("svg[data-slot='spot-illustration']")!;
      expect(svg.getAttribute("data-spot")).toBe(spot);
      expect(svg.getAttribute("width")).toBe("148");
      expect(svg.outerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
      unmount();
    }
    render(<IllustratedState spot="search" size="sm" title="No match" />);
    expect(document.querySelector("svg")?.getAttribute("width")).toBe("104");
  });

  it("uses role=alert for the error spot", () => {
    render(<IllustratedState spot="error" title="Could not load the list" />);
    expect(screen.getByRole("alert").textContent).toContain("Could not load the list");
  });
});
