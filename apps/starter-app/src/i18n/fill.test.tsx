import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fill } from "./fill.tsx";

describe("fill", () => {
  it("puts nodes where the placeholders are and keeps the rest of the sentence", () => {
    const { container } = render(<p>{fill("11 open · newest {code}", { code: <strong>REC-0024</strong> })}</p>);
    expect(container.textContent).toBe("11 open · newest REC-0024");
    expect(container.querySelector("strong")?.textContent).toBe("REC-0024");
  });

  it("leaves unknown placeholders visible, like t() does", () => {
    const { container } = render(<p>{fill("{a} and {b}", { a: "one" })}</p>);
    expect(container.textContent).toBe("one and {b}");
  });
});
