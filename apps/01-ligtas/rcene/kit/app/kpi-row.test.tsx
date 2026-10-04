import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KpiRow } from "./kpi-row.tsx";

afterEach(cleanup);

describe("KpiRow", () => {
  it("renders one StatTile per item in a labelled list", () => {
    render(
      <KpiRow
        label="Today at a glance"
        columns={3}
        items={[
          { id: "open", label: "Open centres", value: 12 },
          { id: "people", label: "Evacuees", value: 1480, hint: "Sample data" },
          { id: "full", label: "Full centres", value: 2, tone: "danger" },
        ]}
      />,
    );
    const list = screen.getByRole("list", { name: "Today at a glance" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[1]!.textContent).toContain("1,480");
    expect(items[1]!.textContent).toContain("Sample data");
    expect(list.querySelectorAll("[data-slot='stat-tile']")).toHaveLength(3);
    expect(list.querySelector("[data-tone='danger']")).not.toBeNull();
    expect(list.className).toContain("lg:grid-cols-3");
  });

  it("uses four columns by default", () => {
    render(<KpiRow items={[{ label: "A", value: 1 }]} />);
    expect(screen.getByRole("list").className).toContain("lg:grid-cols-4");
  });
});
