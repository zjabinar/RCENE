import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { IllustratedState, type IllustrationSpot } from "./illustrated-state.tsx";

afterEach(cleanup);

const SPOTS: IllustrationSpot[] = ["empty", "search", "offline", "error", "done", "map"];

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

  it("draws every spot with theme tokens only", () => {
    for (const spot of SPOTS) {
      const { container, unmount } = render(<IllustratedState spot={spot} title={spot} />);
      const svg = container.querySelector("svg")!;
      expect(svg.children.length).toBeGreaterThan(2);
      expect(svg.outerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
      unmount();
    }
  });

  it("uses role=alert for the error spot", () => {
    render(<IllustratedState spot="error" title="Could not load the list" />);
    expect(screen.getByRole("alert").textContent).toContain("Could not load the list");
  });
});
