import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LangOverride } from "@rcene/i18n";
import { OgCard } from "./og-card.tsx";

afterEach(cleanup);

describe("OgCard", () => {
  it("renders the title, tagline, app chip and brand at 1200 x 630", () => {
    const { container } = render(<OgCard title="Pila" tagline="Take a number, watch the board." appId="07" />);
    expect(screen.getByRole("heading", { name: "Pila" })).toBeTruthy();
    expect(screen.getByText("Take a number, watch the board.")).toBeTruthy();
    expect(screen.getByText("App 07")).toBeTruthy();
    expect(screen.getByRole("img", { name: "RCENE" })).toBeTruthy();
    const card = container.querySelector("[data-slot='og-card']")!;
    expect(card.className).toContain("w-[1200px]");
    expect(card.className).toContain("h-[630px]");
  });

  it("omits the optional parts and sets long titles smaller", () => {
    const title = "Bantay Baha: flood watch for every barangay";
    render(<OgCard title={title} />);
    const heading = screen.getByRole("heading", { name: title });
    expect(heading.className).toContain("text-[60px]");
    expect(screen.queryByText(/^App /)).toBeNull();
  });

  it("translates its chrome", () => {
    render(
      <LangOverride lang="war">
        <OgCard title="Pila" appId="07" />
      </LangOverride>,
    );
    expect(screen.getByText("Syudad han Catbalogan")).toBeTruthy();
  });
});
