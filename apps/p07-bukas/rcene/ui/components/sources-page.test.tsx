import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SourceEntry } from "@rcene/data";

/**
 * Layers are fetched once per page load (a module-level cache), so each test
 * imports the page from a fresh module graph to see its own sources.json.
 */
async function load() {
  vi.resetModules();
  return import("./sources-page.tsx");
}

const shipped: SourceEntry[] = [
  { file: "boundary.geojson", title: "City boundary", attribution: "HDX / OCHA", tier: "open", license: "CC BY 4.0" },
  { file: "hazard-flood.geojson", title: "Flood zones", attribution: "CDRRMO, used with permission", tier: "permission" },
];

const extra: SourceEntry[] = [
  {
    file: "generated in the browser",
    title: "Synthetic households",
    attribution: "Generated with a fixed seed (createRng(7)); codes like HH-0001, no names.",
    tier: "synthetic",
  },
];

function serve(sources: SourceEntry[] | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      String(input) === "/data/sources.json" && sources
        ? new Response(JSON.stringify(sources), { status: 200, headers: { "content-type": "application/json" } })
        : new Response("", { status: 404 }),
    ),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SourcesPage", () => {
  it("lists sources.json, then the app's extra sources, then its section, then the disclaimer", async () => {
    serve(shipped);
    const { SourcesPage } = await load();
    render(
      <SourcesPage extra={extra}>
        <h2>About the synthetic data</h2>
      </SourcesPage>,
    );
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(3));

    const cards = screen.getAllByRole("article");
    expect(cards.map((card) => within(card).getByRole("heading").textContent)).toEqual([
      "City boundary",
      "Flood zones",
      "Synthetic households",
    ]);
    expect(cards[2]!.getAttribute("data-tier")).toBe("synthetic");
    expect(within(cards[2]!).getByText("Synthetic")).toBeTruthy();

    const page = document.querySelector("[data-slot='sources-page']")!;
    const text = page.textContent!;
    expect(text.indexOf("About the synthetic data")).toBeGreaterThan(text.indexOf("Synthetic households"));
    expect(text.indexOf("CDRRMO advisories")).toBeGreaterThan(text.indexOf("About the synthetic data"));
  });

  it("still lists the extra sources when sources.json is missing", async () => {
    serve(null);
    const { SourcesPage } = await load();
    render(<SourcesPage extra={extra} />);
    await waitFor(() => expect(document.querySelector("[data-slot='data-missing']")).not.toBeNull());
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Synthetic households" })).toBeTruthy();
  });

  it("shows the empty state only when there is nothing at all", async () => {
    serve([]);
    const { SourcesPage } = await load();
    render(<SourcesPage />);
    await waitFor(() => expect(document.querySelector("[data-slot='empty-state']")).not.toBeNull());
  });
});

describe("SourceCard", () => {
  it("renders one entry with its tier badge, license and link", async () => {
    const { SourceCard } = await load();
    render(<SourceCard entry={{ ...shipped[0]!, url: "https://data.humdata.org/dataset/x" }} />);
    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", { level: 2 }).textContent).toBe("City boundary");
    expect(card.textContent).toContain("Open data");
    expect(card.textContent).toContain("CC BY 4.0");
    expect(within(card).getByRole("link").getAttribute("href")).toBe("https://data.humdata.org/dataset/x");
  });
});
