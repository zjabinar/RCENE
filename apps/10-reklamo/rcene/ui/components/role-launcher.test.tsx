import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openRoleWindow, RoleLauncher, type RoleCard } from "./role-launcher.tsx";

const roles: RoleCard[] = [
  { id: "console", to: "/console", title: "CDRRMO console", summary: "Raise a warning.", width: "full" },
  { id: "resident", to: "/resident", title: "Resident", width: "phone" },
];

function renderLauncher() {
  const router = createMemoryRouter(
    [
      { path: "/", element: <RoleLauncher roles={roles} windowPrefix="p01-andam" /> },
      { path: "/console", element: <p>console view</p> },
    ],
    { initialEntries: ["/"] },
  );
  render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RoleLauncher", () => {
  it("renders one card per role with a heading, summary and two labelled links", () => {
    renderLauncher();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 2, name: "CDRRMO console" })).toBeTruthy();
    expect(screen.getByText("Raise a warning.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open CDRRMO console" }).getAttribute("href")).toBe("/console");
    const win = screen.getByRole("link", { name: "Open Resident in a new window" });
    expect(win.getAttribute("href")).toBe("/resident");
    expect(win.getAttribute("target")).toBe("p01-andam-resident");
  });

  it("opens a sized, named window and keeps the page when the popup opens", () => {
    const focus = vi.fn();
    const open = vi.fn(() => ({ focus }) as unknown as Window);
    vi.stubGlobal("open", open);
    renderLauncher();
    const link = screen.getByRole("link", { name: "Open Resident in a new window" });
    const notPrevented = fireEvent.click(link);
    expect(open).toHaveBeenCalledWith("/resident", "p01-andam-resident", "popup,width=420,height=860");
    expect(focus).toHaveBeenCalled();
    expect(notPrevented).toBe(false);
  });

  it("falls back to the plain link when the popup is blocked", () => {
    vi.stubGlobal("open", vi.fn(() => null));
    renderLauncher();
    const notPrevented = fireEvent.click(screen.getByRole("link", { name: "Open CDRRMO console in a new window" }));
    expect(notPrevented).toBe(true);
  });

  it("navigates in place with Open", async () => {
    renderLauncher();
    fireEvent.click(screen.getByRole("link", { name: "Open CDRRMO console" }));
    expect(await screen.findByText("console view")).toBeTruthy();
  });
});

describe("openRoleWindow", () => {
  it("sizes full-width roles larger than phone roles", () => {
    const open = vi.fn(() => ({ focus: vi.fn() }) as unknown as Window);
    vi.stubGlobal("open", open);
    expect(openRoleWindow("/board", "x-board", "full")).toBe(true);
    expect(open).toHaveBeenCalledWith("/board", "x-board", "popup,width=1440,height=900");
  });
});
