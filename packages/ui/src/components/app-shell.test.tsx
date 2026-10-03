import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LayerMissingError, type LoadState } from "@rcene/data";
import { AppShell } from "./app-shell.tsx";
import { LoadGate } from "./states.tsx";
import { StatTile } from "./stat-tile.tsx";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // No dev server in tests: every /data/ request 404s, so the manifest is empty.
  vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function renderAt(path: string, element: ReactNode) {
  const router = createMemoryRouter([{ path: "*", element }], { initialEntries: [path] });
  await act(async () => root.render(<RouterProvider router={router} />));
}

describe("AppShell", () => {
  it("renders skip link, header, nav with aria-current, main and footer", async () => {
    await renderAt(
      "/sources",
      <AppShell
        title="Test app"
        tagline="Tagline"
        nav={[
          { to: "/", label: "Home", end: true },
          { to: "/sources", label: "Sources" },
        ]}
        showReset
      >
        <p>Body</p>
      </AppShell>,
    );
    const skip = host.querySelector("a[href='#main']")!;
    expect(skip.textContent).toBe("Skip to content");
    const main = host.querySelector("main#main")!;
    expect(main.getAttribute("tabindex")).toBe("-1");
    expect(main.textContent).toBe("Body");
    const current = host.querySelector("nav a[aria-current='page']")!;
    expect(current.textContent).toBe("Sources");
    expect(host.querySelector("[data-slot='lang-toggle']")!.getAttribute("aria-label")).toBe("Language");
    expect(host.querySelector("footer")!.textContent).toContain("CDRRMO");
    expect(host.querySelector("footer a[href='/sources']")).not.toBeNull();
    expect(host.textContent).toContain("Reset demo");
    expect(document.title).toBe("Test app");
    // Manifest is empty (fetch 404), so no sample-data badge.
    expect(host.querySelector("[data-slot='sample-data-badge']")).toBeNull();
  });

  it("uses the phone frame when width='phone'", async () => {
    await renderAt("/", <AppShell title="Phone" width="phone">x</AppShell>);
    expect(host.querySelector("main")!.className).toContain("max-w-md");
  });
});

describe("LoadGate", () => {
  const cases: [string, LoadState<number>, string][] = [
    ["loading", { status: "loading" }, "Loading…"],
    ["missing", { status: "missing", error: new LayerMissingError("hazard-flood") }, "not available"],
    ["error", { status: "error", error: new Error("boom") }, "Something went wrong."],
    ["ready", { status: "ready", data: 42 }, "value 42"],
  ];
  it.each(cases)("renders the %s state", async (_name, state, text) => {
    await act(async () => root.render(<LoadGate state={state}>{(n) => <span>value {n}</span>}</LoadGate>));
    expect(host.textContent).toContain(text);
  });
});

describe("StatTile", () => {
  it("shows the final number with countUp in a test environment", async () => {
    await act(async () => root.render(<StatTile label="Households" value={1234} countUp tone="warning" />));
    expect(host.querySelector("dt")!.textContent).toBe("Households");
    expect(host.querySelector("[data-slot='count-up'] [aria-hidden='true']")!.textContent).toBe("1,234");
    expect(host.querySelector("dt svg")).not.toBeNull();
  });
});
