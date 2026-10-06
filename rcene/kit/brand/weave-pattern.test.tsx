import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WEAVE_NAMES } from "./geometry.ts";
import { WeavePattern } from "./weave-pattern.tsx";

afterEach(cleanup);

describe("WeavePattern", () => {
  it("gives every instance a unique pattern id that its fill references", () => {
    const { container } = render(
      <>
        <WeavePattern name="banig" />
        <WeavePattern name="banig" />
        <WeavePattern name="diamond" />
      </>,
    );
    const svgs = [...container.querySelectorAll("svg")];
    const ids = svgs.map((svg) => svg.querySelector("pattern")!.id);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    svgs.forEach((svg, i) => expect(svg.querySelector("rect[width='100%']")!.getAttribute("fill")).toBe(`url(#${ids[i]})`));
  });

  it.each(WEAVE_NAMES)("draws %s as a decorative, full-bleed texture", (name) => {
    const { container } = render(<WeavePattern name={name} opacity={0.4} scale={2} className="rounded-xl" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("data-weave")).toBe(name);
    expect(svg.style.opacity).toBe("0.4");
    expect(svg.getAttribute("class")).toContain("absolute");
    expect(svg.getAttribute("class")).toContain("rounded-xl");
    const pattern = svg.querySelector("pattern")!;
    expect(pattern.getAttribute("patternTransform")).toContain("scale(2)");
    expect(pattern.querySelectorAll("rect").length).toBeGreaterThan(3);
  });

  it("defaults to a quiet opacity", () => {
    const { container } = render(<WeavePattern name="tikog" />);
    expect(Number(container.querySelector("svg")!.style.opacity)).toBeLessThan(0.3);
  });
});
