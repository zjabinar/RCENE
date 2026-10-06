import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WeaveDivider } from "./weave-divider.tsx";

afterEach(cleanup);

describe("WeaveDivider", () => {
  for (const variant of ["band", "wave", "diamond"] as const) {
    it(`${variant}: decorative, drawn in the weave tokens`, () => {
      const { container } = render(<WeaveDivider variant={variant} className="my-8" />);
      const root = container.firstElementChild!;
      expect(root.getAttribute("aria-hidden")).toBe("true");
      expect(root.getAttribute("data-variant")).toBe(variant);
      expect(root.className).toContain("my-8");
      const pattern = container.querySelector("pattern")!;
      expect(container.querySelector("rect[fill]")!.getAttribute("fill")).toBe(`url(#${pattern.id})`);
      const classes = [...pattern.querySelectorAll("[class]")].map((el) => el.getAttribute("class")).join(" ");
      expect(classes).toMatch(/weave-1/);
      expect(classes).toMatch(/weave-2/);
      expect(classes).toMatch(/weave-3/);
      // No raw colours in the drawing.
      expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i);
    });
  }

  it("gives each instance its own pattern id", () => {
    const { container } = render(
      <>
        <WeaveDivider />
        <WeaveDivider />
      </>,
    );
    const ids = [...container.querySelectorAll("pattern")].map((p) => p.id);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});
