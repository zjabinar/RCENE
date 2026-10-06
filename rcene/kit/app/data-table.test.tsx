import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadCsv } from "@rcene/ui";
import { DataTable } from "./data-table.tsx";

vi.mock("@rcene/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@rcene/ui")>()),
  downloadCsv: vi.fn(),
}));

interface Centre {
  code: string;
  barangay: string;
  capacity: number;
  note: string;
}

const COLUMNS: ColumnDef<Centre>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "barangay", header: "Barangay" },
  { accessorKey: "capacity", header: "Capacity", meta: { align: "end" } },
  { accessorKey: "note", header: "Note", enableSorting: false },
];

const ROWS: Centre[] = [
  { code: "EC-0003", barangay: "Cañaveral", capacity: 120, note: "=SUM(A1)" },
  { code: "EC-0001", barangay: "Mercedes", capacity: 300, note: "" },
  { code: "EC-0002", barangay: "Guinsorongan", capacity: 80, note: "Ramp" },
];

function many(n: number): Centre[] {
  return Array.from({ length: n }, (_, i) => ({
    code: `EC-${String(i + 1).padStart(4, "0")}`,
    barangay: `BRGY-${String(i + 1).padStart(2, "0")}`,
    capacity: (i + 1) * 10,
    note: "",
  }));
}

function bodyCodes() {
  const body = document.querySelector("tbody")!;
  return within(body)
    .getAllByRole("row")
    .map((row) => row.querySelector("td")?.textContent);
}

beforeEach(() => {
  vi.mocked(downloadCsv).mockClear();
});

afterEach(cleanup);

describe("DataTable", () => {
  it("has a caption and sorts by header buttons with aria-sort", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLUMNS} data={ROWS} caption="Evacuation centres" />);
    const table = screen.getByRole("table", { name: "Evacuation centres" });
    expect(table.querySelector("caption")?.textContent).toBe("Evacuation centres");
    expect(bodyCodes()).toEqual(["EC-0003", "EC-0001", "EC-0002"]);

    const codeHeader = screen.getByRole("columnheader", { name: /Code/ });
    expect(codeHeader.getAttribute("aria-sort")).toBeNull();
    await user.click(within(codeHeader).getByRole("button"));
    expect(codeHeader.getAttribute("aria-sort")).toBe("ascending");
    expect(bodyCodes()).toEqual(["EC-0001", "EC-0002", "EC-0003"]);
    await user.click(within(codeHeader).getByRole("button"));
    expect(codeHeader.getAttribute("aria-sort")).toBe("descending");
    expect(bodyCodes()).toEqual(["EC-0003", "EC-0002", "EC-0001"]);

    // Numbers sort ascending first too.
    const capacity = screen.getByRole("columnheader", { name: /Capacity/ });
    await user.click(within(capacity).getByRole("button"));
    expect(capacity.getAttribute("aria-sort")).toBe("ascending");
    expect(codeHeader.getAttribute("aria-sort")).toBeNull();
    expect(bodyCodes()).toEqual(["EC-0002", "EC-0003", "EC-0001"]);

    // A column without sorting has no button.
    const note = screen.getByRole("columnheader", { name: "Note" });
    expect(within(note).queryByRole("button")).toBeNull();
  });

  it("filters with the search box (accents ignored) and shows a no-match state", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLUMNS} data={ROWS} caption="Centres" search />);
    const search = screen.getByRole("searchbox", { name: "Search the table" });
    await user.type(search, "canaveral");
    expect(bodyCodes()).toEqual(["EC-0003"]);
    expect(screen.getByText("Showing 1–1 of 1")).toBeTruthy();

    await user.clear(search);
    await user.type(search, "zzz");
    expect(screen.getByText("No rows match “zzz”.")).toBeTruthy();
    await user.click(screen.getAllByRole("button", { name: "Clear search" }).at(-1)!);
    expect(bodyCodes()).toHaveLength(3);
  });

  it("limits the search to the given columns", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLUMNS} data={ROWS} caption="Centres" search={{ columns: ["code"] }} />);
    await user.type(screen.getByRole("searchbox"), "mercedes");
    expect(screen.getByText("No rows match “mercedes”.")).toBeTruthy();
  });

  it("paginates with Page n of N and previous / next", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLUMNS} data={many(25)} caption="Centres" pageSize={10} />);
    expect(screen.getByText("Page 1 of 3")).toBeTruthy();
    expect(screen.getByText("Showing 1–10 of 25")).toBeTruthy();
    const prev = screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement;
    const next = screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    await user.click(next);
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
    expect(bodyCodes()[0]).toBe("EC-0011");
    await user.click(next);
    expect(screen.getByText("Showing 21–25 of 25")).toBeTruthy();
    expect(next.disabled).toBe(true);
  });

  it("activates a row by click and by Enter", async () => {
    const user = userEvent.setup();
    const onRowActivate = vi.fn();
    render(<DataTable columns={COLUMNS} data={ROWS} caption="Centres" onRowActivate={onRowActivate} />);
    const rows = within(document.querySelector("tbody")!).getAllByRole("row");
    await user.click(rows[1]!);
    expect(onRowActivate).toHaveBeenLastCalledWith(ROWS[1]);
    rows[2]!.focus();
    await user.keyboard("{Enter}");
    expect(onRowActivate).toHaveBeenLastCalledWith(ROWS[2]);
    expect(rows[0]!.getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("table").getAttribute("aria-describedby")).toBeTruthy();
  });

  it("exports the filtered rows as a formula-safe CSV", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={COLUMNS}
        data={ROWS}
        caption="Centres"
        search
        exportCsv={{
          filename: "centres",
          columns: [
            { key: "code", header: "Code" },
            { key: "capacity", header: "Capacity" },
            { key: "note", header: "Note" },
          ],
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [name, csv] = vi.mocked(downloadCsv).mock.calls[0]!;
    expect(name).toBe("centres.csv");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Code,Capacity,Note");
    expect(csv).toContain("EC-0003,120,'=SUM(A1)");
    expect(csv).not.toMatch(/,=SUM/);

    await user.type(screen.getByRole("searchbox"), "ramp");
    await user.click(screen.getByRole("button", { name: "Download CSV" }));
    const [, filtered] = vi.mocked(downloadCsv).mock.calls[1]!;
    expect(filtered.replace(/^\uFEFF/, "").split("\r\n")).toEqual(["Code,Capacity,Note", "EC-0002,80,Ramp"]);
  });

  it("shows an empty state, or the one passed in", () => {
    const { rerender } = render(<DataTable columns={COLUMNS} data={[]} caption="Centres" />);
    expect(screen.getByText("No rows to show yet.")).toBeTruthy();
    rerender(<DataTable columns={COLUMNS} data={[]} caption="Centres" empty={<p>No centres opened.</p>} />);
    expect(screen.getByText("No centres opened.")).toBeTruthy();
  });
});
