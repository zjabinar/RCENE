import { act, type ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { common, extendStrings, StringsProvider, useLangStore } from "@rcene/i18n";

import { SiteFooter } from "./site-footer.tsx";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  act(() => useLangStore.setState({ lang: "en" }));
});

function renderInRouter(ui: ReactNode) {
  const router = createMemoryRouter([{ path: "*", element: ui }]);
  return render(<RouterProvider router={router} />);
}

const COLUMNS = [
  { title: "Explore", links: [{ to: "/map", label: "Hazard map" }, { to: "#story", label: "The story" }] },
  { title: "About", links: [{ to: "/sources", label: "Data sources" }, { to: "https://example.org", label: "RSCENE 2026" }] },
];

describe("SiteFooter", () => {
  it("renders brand, note, link columns as labelled navigation, the disclaimer and the sources link", () => {
    renderInRouter(<SiteFooter brand="Andam" note="Made in Catbalogan City." columns={COLUMNS} />);
    const footer = screen.getByRole("contentinfo");
    expect(footer.textContent).toContain("Andam");
    expect(footer.textContent).toContain("Made in Catbalogan City.");
    const explore = screen.getByRole("navigation", { name: "Explore" });
    expect(within(explore).getByRole("link", { name: "Hazard map" }).getAttribute("href")).toBe("/map");
    expect(within(explore).getByRole("link", { name: "The story" }).getAttribute("href")).toBe("#story");
    const about = screen.getByRole("navigation", { name: "About" });
    expect(within(about).getByRole("link", { name: "RSCENE 2026" }).getAttribute("href")).toBe("https://example.org");
    expect(footer.textContent).toContain("follow official CDRRMO advisories");
    const sources = screen.getAllByRole("link", { name: "Data sources" });
    expect(sources.some((a) => a.getAttribute("href") === "/sources")).toBe(true);
  });

  it("uses the app's disclaimer override", () => {
    const strings = extendStrings(common, {
      en: { "app.disclaimer": "Training tool for barangay drills." },
      war: { "app.disclaimer": "Para ha drill." },
      fil: { "app.disclaimer": "Para sa drill." },
    });
    renderInRouter(
      <StringsProvider value={strings}>
        <SiteFooter />
      </StringsProvider>,
    );
    expect(screen.getByRole("contentinfo").textContent).toContain("Training tool for barangay drills.");
  });

  it("Back to top scrolls up and moves focus to main", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    renderInRouter(
      <>
        <main id="main" tabIndex={-1}>
          Body
        </main>
        <SiteFooter />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Back to top" }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
    expect(document.activeElement).toBe(screen.getByRole("main"));
  });

  it("speaks Waray", () => {
    act(() => useLangStore.setState({ lang: "war" }));
    renderInRouter(<SiteFooter />);
    expect(screen.getByRole("button", { name: "Balik ha igbaw" })).toBeTruthy();
  });
});
