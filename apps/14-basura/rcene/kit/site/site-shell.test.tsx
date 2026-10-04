import { act, type ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { common, extendStrings, useLangStore } from "@rcene/i18n";

import { SiteShell } from "./site-shell.tsx";

type IOCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;
const observers: { callback: IOCallback; targets: Element[] }[] = [];

class StubIntersectionObserver {
  callback: IOCallback;
  targets: Element[] = [];
  constructor(callback: IOCallback) {
    this.callback = callback;
    observers.push(this);
  }
  observe(el: Element) {
    this.targets.push(el);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
  vi.stubGlobal("ResizeObserver", NoopResizeObserver);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  act(() => useLangStore.setState({ lang: "en" }));
});

const NAV = [
  { to: "/", label: "Home" },
  { to: "/story", label: "Story" },
  { to: "#features", label: "Features" },
];

function renderAt(path: string, ui: ReactNode) {
  const router = createMemoryRouter([{ path: "*", element: ui }], { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe("SiteShell", () => {
  it("has a skip link to a focusable main, and marks the current page in the nav", () => {
    renderAt(
      "/story",
      <SiteShell title="Andam Catbalogan" nav={NAV}>
        <p>Page body</p>
      </SiteShell>,
    );
    const skip = screen.getByRole("link", { name: "Skip to content" });
    expect(skip.getAttribute("href")).toBe("#main");
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(main.getAttribute("tabindex")).toBe("-1");
    expect(main.textContent).toBe("Page body");

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Story" }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBeNull();
    // In-page anchors are plain links.
    expect(within(nav).getByRole("link", { name: "Features" }).getAttribute("href")).toBe("#features");
    expect(document.title).toBe("Andam Catbalogan");
  });

  it("moves focus to main from the skip link", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("scrollTo", vi.fn());
    renderAt("/", <SiteShell title="Site">body</SiteShell>);
    await user.click(screen.getByRole("link", { name: "Skip to content" }));
    expect(document.activeElement).toBe(screen.getByRole("main"));
  });

  it("turns the top bar solid once the page scrolls", () => {
    renderAt("/", <SiteShell title="Site">body</SiteShell>);
    const header = screen.getByRole("banner");
    expect(header.getAttribute("data-scrolled")).toBe("false");
    const io = observers.find((o) => o.targets.length === 1)!;
    act(() => io.callback([{ isIntersecting: false, target: io.targets[0] }]));
    expect(header.getAttribute("data-scrolled")).toBe("true");
    act(() => io.callback([{ isIntersecting: true, target: io.targets[0] }]));
    expect(header.getAttribute("data-scrolled")).toBe("false");
  });

  it("opens the phone menu with the nav, theme and language controls", async () => {
    const user = userEvent.setup();
    renderAt("/", <SiteShell title="Site" nav={NAV} actions={<button type="button">Open the app</button>}>body</SiteShell>);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog", { name: "Site" });
    const sheetNav = within(dialog).getByRole("navigation", { name: "Main" });
    expect(within(sheetNav).getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBe("page");
    expect(within(dialog).getByRole("button", { name: "Theme" })).toBeTruthy();
    expect(within(dialog).getByRole("combobox", { name: "Language" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Open the app" })).toBeTruthy();
    // Following a link closes the sheet.
    await user.click(within(sheetNav).getByRole("link", { name: "Story" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders the default footer with the disclaimer, a custom footer, or none", () => {
    const { unmount } = renderAt("/", <SiteShell title="Site">body</SiteShell>);
    expect(screen.getByRole("contentinfo").textContent).toContain("CDRRMO");
    unmount();
    const custom = renderAt("/", <SiteShell title="Site" footer={<footer>Custom</footer>}>body</SiteShell>);
    expect(screen.getByRole("contentinfo").textContent).toBe("Custom");
    custom.unmount();
    renderAt("/", <SiteShell title="Site" footer={null}>body</SiteShell>);
    expect(screen.queryByRole("contentinfo")).toBeNull();
  });

  it("provides the app's strings and follows the language", () => {
    const strings = extendStrings(common, {
      en: { "app.disclaimer": "Drill tool only." },
      war: { "app.disclaimer": "Para la ha drill." },
      fil: { "app.disclaimer": "Para lang sa drill." },
    });
    renderAt("/", <SiteShell title="Site" strings={strings} nav={NAV}>body</SiteShell>);
    expect(screen.getByRole("contentinfo").textContent).toContain("Drill tool only.");
    act(() => useLangStore.setState({ lang: "fil" }));
    expect(screen.getByRole("contentinfo").textContent).toContain("Para lang sa drill.");
    expect(screen.getByRole("navigation", { name: "Pangunahin" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Lumaktaw sa nilalaman" })).toBeTruthy();
  });

  it("leaves document.title alone with documentTitle={false}", () => {
    document.title = "Host page";
    renderAt("/", <SiteShell title="Embedded" documentTitle={false}>body</SiteShell>);
    expect(document.title).toBe("Host page");
  });

  it("works with smooth scrolling on (native scrolling under reduced motion)", () => {
    renderAt("/", <SiteShell title="Site" smooth>Smooth body</SiteShell>);
    expect(screen.getByRole("main").textContent).toBe("Smooth body");
  });
});
