import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SPOT_NAMES, SpotIllustration } from "./spot-illustration.tsx";

afterEach(cleanup);

describe("SpotIllustration", () => {
  it.each(SPOT_NAMES)("renders %s as a decorative drawing in token colours", (name) => {
    const { container } = render(<SpotIllustration name={name} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("data-spot")).toBe(name);
    expect(svg.querySelectorAll("path, rect, circle, ellipse").length).toBeGreaterThan(3);
    const paints = [...svg.querySelectorAll("[fill], [stroke]")].flatMap((el) => [el.getAttribute("fill"), el.getAttribute("stroke")]);
    for (const p of paints) if (p && p !== "none") expect(p).toMatch(/^var\(--/);
  });

  it("scales to size at 4:3", () => {
    const { container } = render(<SpotIllustration name="map" size={200} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("200");
    expect(svg.getAttribute("height")).toBe("150");
  });

  it("draws something different for every name", () => {
    const drawn = SPOT_NAMES.map((name) => {
      const { container, unmount } = render(<SpotIllustration name={name} />);
      const html = container.querySelector("g")!.innerHTML;
      unmount();
      return html;
    });
    expect(new Set(drawn).size).toBe(SPOT_NAMES.length);
  });
});
