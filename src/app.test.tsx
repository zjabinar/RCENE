/**
 * The ported admin layer in jsdom, through the real route table (AppShell included):
 * the launcher links, every /admin page and /demo render, and the AI lab answers a
 * triage offline with the demo rules. Browser-only bits (ResizeObserver,
 * scrollIntoView, scrollTo) and the data fetches are stubbed.
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAiLog, useAiSettings, useAiStatusStore } from "@rcene/ai";
import { useLangStore } from "@rcene/i18n";
import { routes } from "./routes.tsx";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => (url.endsWith("/manifest.json") ? json({ files: {} }) : json({}, 404))),
  );
  localStorage.clear();
  act(() => {
    useLangStore.setState({ lang: "en" });
    // No relay in jsdom: the AI answers with the demo rules, without the demo pause.
    useAiSettings.setState({ provider: "auto", models: {}, fallback: true, demoDelayMs: 0 });
    useAiStatusStore.setState({ state: "unavailable", status: null });
    useAiLog.setState({ entries: [] });
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe("app", () => {
  it("links the launcher to demo control and the poster", async () => {
    renderAt("/");
    expect(await screen.findByRole("heading", { name: "Choose a role" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Demo control/ }).getAttribute("href")).toBe("/demo");
    expect(screen.getByRole("link", { name: /^Poster/ }).getAttribute("href")).toBe("/poster");
  });

  it.each([
    ["/admin", "Admin"],
    ["/admin/ai", "AI provider"],
    ["/admin/lab", "AI lab"],
    ["/admin/appearance", "Appearance"],
    ["/admin/data", "Demo data"],
    ["/demo", "Demo control"],
  ])("renders %s", async (path, heading) => {
    renderAt(path);
    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeTruthy();
  });

  it("triages a flood report offline in the AI lab", async () => {
    const user = userEvent.setup();
    renderAt("/admin/lab");
    await user.click(await screen.findByRole("button", { name: "Analyze with AI" }));
    // The demo rules read "Baha … nag-awas an suba" as a flood and mark it urgent.
    expect(await screen.findByText("flood · urgent")).toBeTruthy();
  });
});
