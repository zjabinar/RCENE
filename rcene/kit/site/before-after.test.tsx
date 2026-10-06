import { act } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLangStore } from "@rcene/i18n";

import { BeforeAfter } from "./before-after.tsx";

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", NoopResizeObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  act(() => useLangStore.setState({ lang: "en" }));
});

function setup(initial?: number) {
  const onChange = vi.fn();
  const view = render(
    <BeforeAfter
      before={<img src="/before.png" alt="Riverbank in 2019" />}
      after={<img src="/after.png" alt="Riverbank in 2024" />}
      beforeLabel="2019"
      afterLabel="2024"
      initial={initial}
      onChange={onChange}
      className="aspect-video"
    />,
  );
  const clip = () => (view.container.querySelector("[data-slot='before-after-before']") as HTMLElement).style.clipPath;
  return { onChange, clip, view };
}

describe("BeforeAfter", () => {
  it("names the slider after both labels and shows both labels and images", () => {
    const { clip } = setup();
    const slider = screen.getByRole("slider", { name: "Compare 2019 and 2024" });
    expect(slider.getAttribute("aria-valuenow")).toBe("50");
    expect(clip()).toBe("inset(0 50% 0 0)");
    expect(screen.getByText("2019")).toBeTruthy();
    expect(screen.getByText("2024")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Riverbank in 2019" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Riverbank in 2024" })).toBeTruthy();
    expect(screen.getByRole("figure")).toBeTruthy();
  });

  it("responds to the keyboard: arrows, Page Up/Down, Home and End", async () => {
    const user = userEvent.setup();
    const { clip, onChange } = setup(30);
    const slider = screen.getByRole("slider");
    expect(clip()).toBe("inset(0 70% 0 0)");
    slider.focus();
    await user.keyboard("{ArrowRight}");
    expect(slider.getAttribute("aria-valuenow")).toBe("31");
    expect(clip()).toBe("inset(0 69% 0 0)");
    expect(onChange).toHaveBeenLastCalledWith(31);
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(slider.getAttribute("aria-valuenow")).toBe("29");
    await user.keyboard("{PageUp}");
    expect(Number(slider.getAttribute("aria-valuenow"))).toBeGreaterThan(29);
    await user.keyboard("{End}");
    expect(slider.getAttribute("aria-valuenow")).toBe("100");
    expect(clip()).toBe("inset(0 0% 0 0)");
    await user.keyboard("{Home}");
    expect(slider.getAttribute("aria-valuenow")).toBe("0");
    expect(clip()).toBe("inset(0 100% 0 0)");
  });

  it("clamps the initial position", () => {
    const { clip } = setup(140);
    expect(screen.getByRole("slider").getAttribute("aria-valuenow")).toBe("100");
    expect(clip()).toBe("inset(0 0% 0 0)");
  });

  it("speaks Filipino", () => {
    act(() => useLangStore.setState({ lang: "fil" }));
    setup();
    expect(screen.getByRole("slider", { name: "Ihambing ang 2019 at 2024" })).toBeTruthy();
  });
});
