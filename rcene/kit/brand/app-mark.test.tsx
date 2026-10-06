import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppMark } from "./app-mark.tsx";

afterEach(cleanup);

describe("AppMark", () => {
  it("is decorative by default", () => {
    const { container } = render(<AppMark />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("role")).toBeNull();
    expect(svg.getAttribute("width")).toBe("40");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("is a named image when given a label", () => {
    render(<AppMark label="Pila home" size={48} />);
    const img = screen.getByRole("img", { name: "Pila home" });
    expect(img.getAttribute("aria-hidden")).toBeNull();
    expect(img.getAttribute("height")).toBe("48");
  });

  it("draws the bold 3 x 3 weave below 28 px and the 4 x 4 weave with the sea above", () => {
    const { container } = render(
      <>
        <AppMark size={16} />
        <AppMark size={64} />
      </>,
    );
    const [small, full] = container.querySelectorAll("svg");
    expect(small!.getAttribute("data-detail")).toBe("small");
    expect(full!.getAttribute("data-detail")).toBe("full");
    // Strips use the weave tokens, never raw colours.
    const fills = [...full!.querySelectorAll("[fill]")].map((el) => el.getAttribute("fill")!);
    expect(fills.filter((f) => f !== "none").every((f) => f.startsWith("var(--"))).toBe(true);
  });

  it("gives each instance its own clip path", () => {
    const { container } = render(
      <>
        <AppMark />
        <AppMark />
      </>,
    );
    const ids = [...container.querySelectorAll("clipPath")].map((c) => c.id);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(container.querySelector(`[clip-path="url(#${id})"]`)).not.toBeNull();
  });
});
