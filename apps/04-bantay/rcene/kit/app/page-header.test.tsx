import type { ReactElement } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { PageHeader } from "./page-header.tsx";

afterEach(cleanup);

function renderAt(ui: ReactElement, path = "/") {
  const router = createMemoryRouter([{ path: "*", element: ui }], { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe("PageHeader", () => {
  it("renders the title as the h1 with eyebrow, description and actions", () => {
    renderAt(
      <PageHeader
        title="Evacuation centres"
        eyebrow="Operations"
        description="Capacity and status for every centre."
        actions={<button type="button">Add centre</button>}
      />,
    );
    const h1 = screen.getByRole("heading", { level: 1, name: "Evacuation centres" });
    expect(h1.className).toContain("font-display");
    expect(screen.getByText("Operations")).toBeTruthy();
    expect(screen.getByText("Capacity and status for every centre.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add centre" })).toBeTruthy();
  });

  it("renders breadcrumbs as a labelled nav with links and the current page", () => {
    renderAt(
      <PageHeader
        title="BRGY-07"
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Barangays", to: "/barangays" }, { label: "BRGY-07" }]}
      />,
      "/barangays/7",
    );
    const nav = screen.getByRole("navigation", { name: "You are here" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/", "/barangays"]);
    const current = nav.querySelector("[aria-current='page']");
    expect(current?.textContent).toBe("BRGY-07");
    expect(nav.querySelectorAll("li")).toHaveLength(3);
  });

  it("omits the breadcrumb nav when there are none", () => {
    renderAt(<PageHeader title="Home" />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
