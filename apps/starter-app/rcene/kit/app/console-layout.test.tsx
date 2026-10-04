import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { ConsoleLayout, type ConsoleNavItem } from "./console-layout.tsx";

afterEach(cleanup);

const NAV: ConsoleNavItem[] = [
  { to: "/console", label: "Overview", end: true },
  { to: "/console/queue", label: "Queue", badge: 12 },
  { to: "/console/reports", label: "Reports" },
];

function renderAt(path: string, aside?: boolean) {
  const element = (
    <ConsoleLayout nav={NAV} title="Operator console" aside={aside ? <p>Selected: REC-0001</p> : undefined}>
      <p>Main content</p>
    </ConsoleLayout>
  );
  const router = createMemoryRouter([{ path: "*", element }], { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe("ConsoleLayout", () => {
  it("marks the active section with aria-current and shows badges", () => {
    renderAt("/console/queue");
    const nav = screen.getByRole("navigation", { name: "Operator console" });
    const active = within(nav).getByRole("link", { name: /Queue/ });
    expect(active.getAttribute("aria-current")).toBe("page");
    expect(active.textContent).toContain("12");
    expect(within(nav).getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByText("Main content")).toBeTruthy();
  });

  it("opens the nav in a sheet from the labelled Menu button and closes it on navigation", async () => {
    const user = userEvent.setup();
    renderAt("/console");
    const menu = screen.getByRole("button", { name: "Menu" });
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    await user.click(menu);
    const dialog = screen.getByRole("dialog", { name: "Operator console" });
    const link = within(dialog).getByRole("link", { name: "Reports" });
    await user.click(link);
    expect(screen.queryByRole("dialog")).toBeNull();
    const navs = screen.getAllByRole("navigation", { name: "Operator console" });
    expect(within(navs[0]!).getByRole("link", { name: "Reports" }).getAttribute("aria-current")).toBe("page");
  });

  it("renders the aside as a labelled complementary region", () => {
    renderAt("/console", true);
    const aside = screen.getByRole("complementary", { name: "Side panel" });
    expect(aside.textContent).toBe("Selected: REC-0001");
  });
});
