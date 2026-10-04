import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { themeBootScript } from "./boot.ts";
import { THEME_STORAGE_KEY } from "./palettes.ts";
import { useThemeStore } from "./store.ts";
import { mergeOverrides } from "./store.ts";
import { resolveTheme, ThemeOverrideScope, useThemeOverride, useThemeSync } from "./sync.ts";
import { ThemeMenu } from "./theme-menu.tsx";

const root = () => document.documentElement;

function stubSystemDark(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: dark && query.includes("dark"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function runBoot(defaults?: Parameters<typeof themeBootScript>[0]) {
  new Function(themeBootScript(defaults))();
}

function resetRoot() {
  for (const name of ["data-palette", "data-mode", "data-surface", "data-default-palette", "data-default-mode"]) root().removeAttribute(name);
  root().classList.remove("dark");
}

beforeEach(() => {
  localStorage.clear();
  resetRoot();
  stubSystemDark(false);
  useThemeStore.setState({ palette: null, mode: null });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("themeBootScript", () => {
  it("uses habi and the device setting when nothing is stored", () => {
    runBoot();
    expect(root().dataset.palette).toBe("habi");
    expect(root().dataset.mode).toBe("light");
    expect(root().classList.contains("dark")).toBe(false);
  });

  it("follows a dark device", () => {
    stubSystemDark(true);
    runBoot();
    expect(root().dataset.mode).toBe("dark");
    expect(root().classList.contains("dark")).toBe(true);
  });

  it("applies the stored choice before the app's defaults", () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ state: { palette: "gabi", mode: "dark" }, version: 1 }));
    runBoot({ palette: "dagat", mode: "light" });
    expect(root().dataset.palette).toBe("gabi");
    expect(root().dataset.mode).toBe("dark");
    expect(root().dataset.defaultPalette).toBe("dagat");
  });

  it("falls back to the app's defaults for missing, unknown or corrupt values", () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ state: { palette: "neon", mode: null }, version: 1 }));
    runBoot({ palette: "fiesta", mode: "dark" });
    expect([root().dataset.palette, root().dataset.mode]).toEqual(["fiesta", "dark"]);
    localStorage.setItem(THEME_STORAGE_KEY, "{not json");
    runBoot({ palette: "malinaw", mode: "light" });
    expect([root().dataset.palette, root().dataset.mode]).toEqual(["malinaw", "light"]);
  });

  it("ignores invalid defaults", () => {
    runBoot({ palette: "nope" as never, mode: "dusk" as never });
    expect([root().dataset.palette, root().dataset.defaultMode]).toEqual(["habi", "system"]);
  });
});

describe("resolveTheme", () => {
  const defaults = { palette: "dagat", mode: "system" } as const;
  it("prefers the view's override, then the user's choice, then the defaults", () => {
    expect(resolveTheme({ palette: null, mode: null }, null, defaults, false)).toEqual({ palette: "dagat", mode: "light", surface: null });
    expect(resolveTheme({ palette: "fiesta", mode: "dark" }, null, defaults, false)).toEqual({ palette: "fiesta", mode: "dark", surface: null });
    expect(resolveTheme({ palette: "fiesta", mode: "dark" }, { palette: "malinaw" }, defaults, false)).toEqual({ palette: "malinaw", mode: "dark", surface: null });
  });
  it("resolves system against the device and turns a showcase surface into gabi dark", () => {
    expect(resolveTheme({ palette: null, mode: null }, null, defaults, true).mode).toBe("dark");
    expect(resolveTheme({ palette: "habi", mode: "light" }, { surface: "showcase" }, defaults, false)).toEqual({ palette: "gabi", mode: "dark", surface: "showcase" });
  });
});

function Synced({ override }: { override?: Parameters<typeof useThemeOverride>[0] }) {
  useThemeSync();
  useThemeOverride(override);
  return <ThemeMenu />;
}

describe("ThemeMenu and useThemeSync", () => {
  it("changes mode and palette, persists them and applies them to <html>", async () => {
    const user = userEvent.setup();
    render(<Synced />);
    expect(root().dataset.palette).toBe("habi");

    await user.click(screen.getByRole("button", { name: "Theme" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Dark" }));
    expect(useThemeStore.getState().mode).toBe("dark");
    expect(root().dataset.mode).toBe("dark");
    expect(root().classList.contains("dark")).toBe(true);

    await user.click(screen.getByRole("button", { name: "Theme" }));
    await user.click(await screen.findByRole("menuitemradio", { name: /Fiesta/ }));
    expect(root().dataset.palette).toBe("fiesta");
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? "{}").state).toMatchObject({ palette: "fiesta", mode: "dark" });
  });

  it("lets a view force its colours without touching the choice, and restores them on unmount", async () => {
    const user = userEvent.setup();
    useThemeStore.setState({ palette: "habi", mode: "light" });
    const { unmount } = render(<Synced override={{ palette: "malinaw", mode: "dark" }} />);
    expect([root().dataset.palette, root().dataset.mode]).toEqual(["malinaw", "dark"]);
    await user.click(screen.getByRole("button", { name: "Theme" }));
    expect(await screen.findByText("This view sets its own colours.")).toBeTruthy();
    expect(useThemeStore.getState()).toMatchObject({ palette: "habi", mode: "light" });
    unmount();
    act(() => {
      render(<Synced />);
    });
    expect([root().dataset.palette, root().dataset.mode]).toEqual(["habi", "light"]);
  });

  it("merges nested overrides field by field, the deeper one winning, whatever the mount order", () => {
    function Page() {
      useThemeOverride({ palette: "malinaw" });
      return null;
    }
    function Shell({ page }: { page: boolean }) {
      useThemeSync();
      useThemeOverride({ mode: "dark", palette: "dagat" });
      return <ThemeOverrideScope>{page && <Page />}</ThemeOverrideScope>;
    }
    // Direct load: the page's effect runs before the shell's.
    const { unmount } = render(<Shell page />);
    expect([root().dataset.palette, root().dataset.mode]).toEqual(["malinaw", "dark"]);
    unmount();
    // Client-side navigation: the shell is already there when the page mounts.
    const second = render(<Shell page={false} />);
    expect([root().dataset.palette, root().dataset.mode]).toEqual(["dagat", "dark"]);
    second.rerender(<Shell page />);
    expect([root().dataset.palette, root().dataset.mode]).toEqual(["malinaw", "dark"]);
  });

  it("mergeOverrides keeps registration order between equal depths", () => {
    expect(mergeOverrides([])).toBeNull();
    expect(
      mergeOverrides([
        { id: "b", depth: 0, seq: 2, value: { palette: "fiesta" } },
        { id: "a", depth: 0, seq: 1, value: { palette: "habi", mode: "light" } },
        { id: "c", depth: 1, seq: 0, value: { surface: "showcase" } },
      ]),
    ).toEqual({ palette: "fiesta", mode: "light", surface: "showcase" });
  });

  it("marks a showcase view on <html>", () => {
    render(<Synced override={{ surface: "showcase" }} />);
    expect(root().dataset.surface).toBe("showcase");
    expect([root().dataset.palette, root().dataset.mode]).toEqual(["gabi", "dark"]);
  });
});
