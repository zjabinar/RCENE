/**
 * The app's golden paths in jsdom, through the real route table (AppShell included):
 * the launcher, a record moving to its next step, the resident lookup and the wizard
 * filing a new request. The browser-only bits (ResizeObserver for Recharts and the
 * popovers, scrollIntoView for cmdk, the barangays layer) are stubbed.
 */
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAiLog, useAiSettings, useAiStatusStore } from "@rcene/ai";
import { useLangStore } from "@rcene/i18n";
import { seedRecords } from "./domain/records.ts";
import { routes } from "./routes.tsx";
import { useRecords } from "./store.ts";

const BARANGAYS = {
  type: "FeatureCollection",
  features: [1, 2, 3].map((n) => ({
    type: "Feature",
    properties: { name: `Sample Barangay ${n}` },
    geometry: { type: "Polygon", coordinates: [[[124.88, 11.77], [124.89, 11.77], [124.89, 11.78], [124.88, 11.77]]] },
  })),
};

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
  vi.stubGlobal("scrollTo", vi.fn()); // <ScrollRestoration /> scrolls on navigation
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/barangays.geojson")) return json(BARANGAYS);
      if (url.endsWith("/manifest.json")) return json({ files: {} });
      return json({}, 404);
    }),
  );
  localStorage.clear();
  act(() => {
    useLangStore.setState({ lang: "en" });
    useRecords.setState({ records: seedRecords() });
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

// Whole pages with user-event: allow more than the 5 s default when the suite runs in parallel.
describe("the starter app", { timeout: 20_000 }, () => {
  it("offers the four roles on /", async () => {
    renderAt("/");
    expect(await screen.findByRole("heading", { level: 1, name: "Choose a role" })).toBeTruthy();
    for (const role of ["Office console", "Resident", "Public board", "Admin"]) {
      expect(screen.getByRole("link", { name: `Open ${role}` })).toBeTruthy();
    }
  });

  it("moves a record to its next step from its page", async () => {
    const user = userEvent.setup();
    renderAt("/console/REC-0001");
    expect(await screen.findByRole("heading", { level: 1, name: "REC-0001" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Move to Done" }));

    expect(useRecords.getState().records[0]?.status).toBe("done");
    expect(await screen.findByText("Completed")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Move to/ })).toBeNull();
  });

  it("opens a loosely typed code under its canonical address, and says when a code is unknown", async () => {
    const router = renderAt("/console/rec-1");
    expect(await screen.findByRole("heading", { level: 1, name: "REC-0001" })).toBeTruthy();
    expect(router.state.location.pathname).toBe("/console/REC-0001");

    await act(() => router.navigate("/console/REC-0099"));
    expect(screen.getByRole("heading", { level: 1, name: "No request REC-0099" })).toBeTruthy();
  });

  it("lets a resident look up a request by its code", async () => {
    const user = userEvent.setup();
    renderAt("/resident");
    await user.type(await screen.findByLabelText("Request code"), "rec 3");
    await user.click(screen.getByRole("button", { name: "Find" }));

    const card = screen.getByRole("article", { name: "REC-0003" });
    expect(within(card).getByText("Status: Done")).toBeTruthy();

    await user.clear(screen.getByLabelText("Request code"));
    await user.type(screen.getByLabelText("Request code"), "hello");
    await user.click(screen.getByRole("button", { name: "Find" }));
    expect(screen.getByRole("alert").textContent).toBe("Enter a code like REC-0001.");
  });

  it("files a new request through the wizard and opens it", async () => {
    const user = userEvent.setup();
    const router = renderAt("/console/new");

    // Step 1: the resident's words are optional; Next moves on.
    await user.click(await screen.findByRole("button", { name: /Next/ }));

    // Step 2: Next checks the step first.
    await user.click(await screen.findByRole("button", { name: /Next/ }));
    expect(await screen.findByText("This is required.")).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: /^Water/ }));
    await user.click(screen.getByRole("button", { name: /Next/ }));

    // Step 3: the barangay comes from the layer.
    await user.click(await screen.findByRole("combobox", { name: /Barangay/ }));
    await user.click(await screen.findByRole("option", { name: "Sample Barangay 2" }));
    await user.type(screen.getByRole("spinbutton", { name: /Households affected/ }), "12");
    await user.click(screen.getByRole("button", { name: /Next/ }));

    // Step 4: Finish stays unavailable until the details are confirmed.
    const finish = await screen.findByRole("button", { name: /File request/ });
    expect(finish.getAttribute("aria-disabled")).toBe("true");
    await user.click(screen.getByRole("checkbox", { name: /I read the details back/ }));
    await user.click(screen.getByRole("button", { name: /File request/ }));

    expect(router.state.location.pathname).toBe("/console/REC-0025");
    expect(useRecords.getState().records.at(-1)).toMatchObject({
      code: "REC-0025",
      category: "water",
      barangay: "Sample Barangay 2",
      households: 12,
      status: "received",
    });
  });

  it("triages a report with AI, applies the suggestion and files it with its provenance", async () => {
    const user = userEvent.setup();
    renderAt("/console/new");

    await user.click(await screen.findByRole("button", { name: "Fill a sample report" }));
    await user.click(screen.getByRole("button", { name: "Suggest with AI" }));
    const card = await screen.findByRole("region", { name: /AI triage/ });
    expect(within(card).getByText("Demo rules · offline")).toBeTruthy();
    expect(within(card).getByText(/a person reviews and confirms/)).toBeTruthy();

    await user.click(within(card).getByRole("button", { name: "Use this suggestion" }));
    // The suggestion lands on the next step, and can still be changed there.
    expect((await screen.findByRole("radio", { name: /^Water/ })).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(/AI suggested Water/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Next/ }));

    await user.click(await screen.findByRole("combobox", { name: /Barangay/ }));
    await user.click(await screen.findByRole("option", { name: "Sample Barangay 1" }));
    await user.type(screen.getByRole("spinbutton", { name: /Households affected/ }), "35");
    await user.click(screen.getByRole("button", { name: /Next/ }));
    await user.click(await screen.findByRole("checkbox", { name: /I read the details back/ }));
    await user.click(screen.getByRole("button", { name: /File request/ }));

    expect(useRecords.getState().records.at(-1)).toMatchObject({
      category: "water",
      priority: "urgent",
      triage: { category: "water", priority: "urgent", mode: "demo", decision: "accepted" },
    });
    expect(useAiLog.getState().entries[0]).toMatchObject({ task: "triage", mode: "demo" });
    expect(await screen.findByText(/The staff kept the suggestion/)).toBeTruthy();
  });

  it("drafts an SMS update on a record page and writes a briefing on the overview", async () => {
    const user = userEvent.setup();
    const router = renderAt("/console/REC-0002");
    await user.click(await screen.findByRole("button", { name: "Draft with AI" }));
    expect(await screen.findByText(/SMS \(\d+\/160\)/)).toBeTruthy();

    await act(() => router.navigate("/console"));
    await user.click(await screen.findByRole("button", { name: "Generate briefing" }));
    expect(await screen.findByRole("region", { name: /Barangay service requests this week/ })).toBeTruthy();
  });

  it.each([
    ["/admin", "Admin"],
    ["/admin/ai", "AI provider"],
    ["/admin/lab", "AI lab"],
    ["/admin/appearance", "Appearance"],
    ["/admin/data", "Demo data"],
    ["/demo", "Demo control"],
  ])("renders %s", async (path, title) => {
    renderAt(path);
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeTruthy();
  });

  it("runs an AI task in the lab", async () => {
    const user = userEvent.setup();
    renderAt("/admin/lab");
    await user.click(await screen.findByRole("button", { name: "Analyze with AI" }));
    expect(await screen.findByText("Show the validated JSON")).toBeTruthy();
  });
});
