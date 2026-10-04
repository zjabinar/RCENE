import type { ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { FeatureGrid } from "./feature-grid.tsx";

afterEach(cleanup);

const ITEMS = [
  { icon: <svg data-testid="icon-map" />, title: "Hazard map", description: "See every mapped zone.", href: "/map" },
  { title: "Go bag", description: "A checklist for your family.", href: "#go-bag" },
  { title: "Offline", description: "Works with Wi-Fi off." },
];

function renderInRouter(ui: ReactNode) {
  const router = createMemoryRouter([{ path: "*", element: ui }]);
  return render(<RouterProvider router={router} />);
}

describe("FeatureGrid", () => {
  it("renders one card per item with an h3 title and description", () => {
    renderInRouter(<FeatureGrid items={ITEMS} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[2]!).getByRole("heading", { level: 3, name: "Offline" })).toBeTruthy();
    expect(items[2]!.textContent).toContain("Works with Wi-Fi off.");
  });

  it("makes the whole card one link named by its title when href is set", () => {
    renderInRouter(<FeatureGrid items={ITEMS} />);
    const route = screen.getByRole("link", { name: "Hazard map" });
    expect(route.getAttribute("href")).toBe("/map");
    expect(route.className).toContain("after:absolute");
    expect(screen.getByRole("link", { name: "Go bag" }).getAttribute("href")).toBe("#go-bag");
    expect(screen.getAllByRole("link")).toHaveLength(2);
    // The icon tile is decorative.
    expect(screen.getByTestId("icon-map").closest("[aria-hidden='true']")).toBeTruthy();
  });

  it("works without a router when no card links to a route", () => {
    render(<FeatureGrid items={[ITEMS[2]!]} columns={2} headingLevel={4} />);
    expect(screen.getByRole("heading", { level: 4, name: "Offline" })).toBeTruthy();
    expect(screen.getByRole("list").className).toContain("sm:grid-cols-2");
  });
});
