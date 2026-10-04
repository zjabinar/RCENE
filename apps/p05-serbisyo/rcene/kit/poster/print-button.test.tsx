import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrintButton } from "./print-button.tsx";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PrintButton", () => {
  it("prints the page and is never printed itself", () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    render(<PrintButton />);
    const button = screen.getByRole("button", { name: "Print" });
    expect(button.className).toContain("print:hidden");
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    fireEvent.click(button);
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("takes its own label", () => {
    render(<PrintButton label="Print the poster" variant="outline" />);
    expect(screen.getByRole("button", { name: "Print the poster" })).toBeTruthy();
  });
});
