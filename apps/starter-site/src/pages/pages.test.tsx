/**
 * Every route, rendered from the fixture files in data/fixtures (served by a
 * stubbed fetch, like /data/ in the browser): the numbers come from the
 * layers, and each page passes axe (contrast is checked by the smoke test in
 * a real browser, in light and dark).
 */
import axe from "axe-core";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StringsProvider } from "@rcene/i18n";
import type { BarangayCollection, FacilityCollection } from "@rcene/data";
import { strings } from "@/i18n/strings.ts";
import { routes } from "@/routes.tsx";

// Vitest runs from the app folder.
const FIXTURES = path.resolve(process.cwd(), "data/fixtures");
const fixture = <T,>(file: string): T => JSON.parse(readFileSync(path.join(FIXTURES, file), "utf8")) as T;

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

function serveFixtures() {
  const files = Object.fromEntries(readdirSync(FIXTURES).filter((f) => f.endsWith(".json") || f.endsWith(".geojson")).map((f) => [f, "fixture"]));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/data/manifest.json") return json({ files });
      const file = path.join(FIXTURES, url.replace(/^\/data\//, ""));
      return url.startsWith("/data/") && existsSync(file) ? new Response(readFileSync(file, "utf8"), { status: 200 }) : new Response("", { status: 404 });
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", ObserverStub);
  vi.stubGlobal("ResizeObserver", ObserverStub);
  // Reduced motion: every animation shows its final state at once.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: /prefers-reduced-motion:\s*reduce/.test(query),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
  // jsdom has no WebGL: the story map shows its fallback message.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  Element.prototype.scrollIntoView ??= function scrollIntoView() {};
  serveFixtures();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <StringsProvider value={strings}>
      <RouterProvider router={router} />
    </StringsProvider>,
  );
}

async function violations(container: Element) {
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html.slice(0, 120)) }));
}

describe("site pages", () => {
  it("home: the stat band counts the layers", async () => {
    const barangays = fixture<BarangayCollection>("barangays.geojson").features.length;
    const facilities = fixture<FacilityCollection>("facilities.geojson").features.length;
    renderRoute("/");
    const stats = await waitFor(() => {
      const dl = document.querySelector('[data-slot="stat-band"]');
      expect(dl).not.toBeNull();
      return dl as HTMLElement;
    });
    expect(within(stats).getByText("barangays on the map").nextElementSibling?.textContent).toContain(String(barangays));
    expect(within(stats).getByText("facilities mapped by OpenStreetMap volunteers").nextElementSibling?.textContent).toContain(
      String(facilities),
    );
    expect(within(stats).getByText("of the city's land is in a mapped flood zone")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "One city, woven from open data" })).toBeTruthy();
  });

  it("story: one step per layer, a chart with its table", async () => {
    renderRoute("/story");
    // A placeholder step shows while the layers load; the real steps replace it.
    const steps = await waitFor(() => {
      const found = screen.getAllByRole("article");
      expect(found).toHaveLength(5);
      return found;
    });
    expect(steps.map((s) => s.querySelector("h3")?.textContent)).toEqual([
      expect.stringMatching(/^\d+ barangays, one city$/),
      expect.stringMatching(/^\d+ places people rely on$/),
      expect.stringMatching(/^\d+(\.\d)?% of the land is in a mapped flood zone$/),
      expect.stringMatching(/^\d+ of \d+ facilities stand in a mapped flood zone$/),
      "Along the coast: storm surge",
    ]);
    const table = screen.getByRole("table", { name: "Share of the city's land in a mapped zone" });
    expect(within(table).getAllByRole("rowheader").map((c) => c.textContent)).toEqual([
      "Flood",
      "Landslide",
      "Storm surge",
      "Ground shaking",
      "Liquefaction",
    ]);
  });

  it.each(["/", "/story", "/about", "/poster", "/sources", "/presenter"])("%s has no axe violations", async (path) => {
    const { container } = renderRoute(path);
    await screen.findByRole("heading", { level: 1 });
    // Let the layers arrive so the whole page is checked, not its loading state.
    await waitFor(() => expect(screen.queryByText(/^(Loading…|Counting the map layers…)$/)).toBeNull());
    expect(await violations(container)).toEqual([]);
  });

  it("presenter: the notes window shows the first demo step", async () => {
    renderRoute("/presenter");
    expect(await screen.findByRole("heading", { level: 1, name: "Step 1 of 5" })).toBeTruthy();
    expect(screen.getByText("Catbalogan's open data, on one calm page")).toBeTruthy();
  });
});
