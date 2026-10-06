import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ChartCard } from "./chart-card.tsx";

afterEach(cleanup);

const TABLE = {
  columns: ["Barangay", "Evacuees", "Share"],
  rows: [
    ["BRGY-01", 1250, 0.25],
    ["BRGY-02", 640, 0.5],
  ] as (string | number)[][],
};

function chart() {
  return <div data-testid="chart">[bar chart]</div>;
}

describe("ChartCard", () => {
  it("shows the chart and keeps the table in the page for screen readers", () => {
    render(
      <ChartCard title="Evacuees by barangay" description="Last 24 hours" caveat="Sample data." table={TABLE}>
        {chart()}
      </ChartCard>,
    );
    expect(screen.getByRole("region", { name: "Evacuees by barangay" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Evacuees by barangay" })).toBeTruthy();
    expect(screen.getByTestId("chart")).toBeTruthy();
    const table = screen.getByRole("table", { name: "Evacuees by barangay" });
    expect(table.parentElement!.className).toContain("sr-only");
    const cells = within(table).getAllByRole("row")[1]!;
    expect(cells.textContent).toContain("1,250");
    expect(within(table).getAllByRole("rowheader")[0]!.textContent).toBe("BRGY-01");
    expect(screen.getByText("Note")).toBeTruthy();
    expect(screen.getByText("Sample data.")).toBeTruthy();
  });

  it("switches to the table and back with the toggle, by keyboard too", async () => {
    const user = userEvent.setup();
    render(
      <ChartCard title="Evacuees" table={TABLE}>
        {chart()}
      </ChartCard>,
    );
    const group = screen.getByRole("radiogroup", { name: "Show as" });
    const chartToggle = within(group).getByRole("radio", { name: "Chart" });
    const tableToggle = within(group).getByRole("radio", { name: "Table" });
    expect(chartToggle.getAttribute("aria-checked")).toBe("true");

    await user.click(tableToggle);
    expect(tableToggle.getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByTestId("chart")).toBeNull();
    expect(screen.getByRole("table").parentElement!.className).not.toContain("sr-only");

    tableToggle.focus();
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(chartToggle);
    await user.keyboard(" ");
    expect(chartToggle.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("chart")).toBeTruthy();
  });

  it("starts on the table when asked and never deselects both", async () => {
    const user = userEvent.setup();
    render(
      <ChartCard title="Evacuees" table={TABLE} defaultView="table" headingLevel={3}>
        {chart()}
      </ChartCard>,
    );
    expect(screen.getByRole("heading", { level: 3 })).toBeTruthy();
    expect(screen.queryByTestId("chart")).toBeNull();
    const tableToggle = screen.getByRole("radio", { name: "Table" });
    await user.click(tableToggle);
    expect(tableToggle.getAttribute("aria-checked")).toBe("true");
  });
});
