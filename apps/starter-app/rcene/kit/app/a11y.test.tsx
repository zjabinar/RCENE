import { useEffect, type ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import axe from "axe-core";
import { useForm } from "react-hook-form";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Form } from "@rcene/ui/components/form";
import {
  BarangayField,
  BoardRotator,
  BoardShell,
  CapacityMeter,
  ChartCard,
  CheckboxField,
  ConsoleLayout,
  DataTable,
  IllustratedState,
  KpiRow,
  NumberField,
  PageHeader,
  QrDisplay,
  RadioField,
  SelectField,
  StatusTimeline,
  TextareaField,
  TextField,
  Wizard,
} from "./index.ts";

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", NoopResizeObserver);
  Element.prototype.scrollIntoView ??= function scrollIntoView() {};
});

afterAll(() => {
  vi.unstubAllGlobals();
});

afterEach(cleanup);

async function expectNoViolations(container: Element = document.body) {
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`)).toEqual([]);
}

function routed(ui: ReactElement, path = "/") {
  const router = createMemoryRouter([{ path: "*", element: ui }], { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

interface Row {
  code: string;
  capacity: number;
}

const COLUMNS: ColumnDef<Row>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "capacity", header: "Capacity", meta: { align: "end" } },
];

const ROWS: Row[] = Array.from({ length: 12 }, (_, i) => ({ code: `EC-${String(i + 1).padStart(4, "0")}`, capacity: i * 25 }));

function Fields() {
  const form = useForm<{ code: string; people?: number; kind: string; shelter: string; ok: boolean; notes: string; brgy: string }>({
    defaultValues: { code: "", kind: "", shelter: "", ok: false, notes: "", brgy: "" },
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})}>
        <TextField control={form.control} name="code" label="Code" description="Like HH-0001." required />
        <NumberField control={form.control} name="people" label="People" unit="people" />
        <SelectField
          control={form.control}
          name="kind"
          label="Hazard"
          options={[
            { value: "flood", label: "Flood" },
            { value: "landslide", label: "Landslide" },
          ]}
        />
        <RadioField
          control={form.control}
          name="shelter"
          label="Shelter"
          description="Where the household stays."
          required
          options={[
            { value: "school", label: "School" },
            { value: "chapel", label: "Chapel" },
          ]}
        />
        <CheckboxField control={form.control} name="ok" label="Checked" description="All codes, no names." />
        <TextareaField control={form.control} name="notes" label="Notes" maxLength={200} />
        <BarangayField control={form.control} name="brgy" label="Barangay" barangays={["Canlapwas", "Mercedes"]} />
      </form>
    </Form>
  );
}

describe("kit/app accessibility (axe)", () => {
  it("PageHeader", async () => {
    const { container } = routed(
      <main>
        <PageHeader
          title="Centres"
          eyebrow="Operations"
          description="All centres"
          breadcrumbs={[{ label: "Home", to: "/" }, { label: "Centres" }]}
          actions={<button type="button">Add</button>}
        />
      </main>,
    );
    await expectNoViolations(container);
  });

  it("ConsoleLayout", async () => {
    const { container } = routed(
      <main>
        <ConsoleLayout
          title="Console"
          nav={[
            { to: "/", label: "Overview", end: true },
            { to: "/queue", label: "Queue", badge: 3 },
          ]}
          aside={<p>Details</p>}
        >
          <h1>Overview</h1>
        </ConsoleLayout>
      </main>,
      "/queue",
    );
    await expectNoViolations(container);
  });

  it("ConsoleLayout with the menu sheet open", async () => {
    const user = userEvent.setup();
    routed(
      <main>
        <ConsoleLayout title="Console" nav={[{ to: "/", label: "Overview", end: true }]}>
          <h1>Overview</h1>
        </ConsoleLayout>
      </main>,
    );
    await user.click(screen.getByRole("button", { name: "Menu" }));
    await expectNoViolations(screen.getByRole("dialog"));
  });

  it("BoardShell and BoardRotator", async () => {
    const { container } = render(
      <main>
        <BoardShell title="Now serving" status={<span>A-012</span>} footer={<span>Sample data</span>}>
          <BoardRotator items={[<p key="1">Page one</p>, <p key="2">Page two</p>]} paused />
        </BoardShell>
      </main>,
    );
    await expectNoViolations(container);
  });

  it("KpiRow", async () => {
    const { container } = render(
      <main>
        <KpiRow
          label="Today"
          items={[
            { label: "Open", value: 4 },
            { label: "Full", value: 1, tone: "danger" },
            { label: "Evacuees", value: 820, hint: "Sample data" },
          ]}
        />
      </main>,
    );
    await expectNoViolations(container);
  });

  it("DataTable (search, sort, paging, activation, export)", async () => {
    const { container } = render(
      <main>
        <DataTable
          columns={COLUMNS}
          data={ROWS}
          caption="Centres"
          search
          pageSize={5}
          onRowActivate={() => {}}
          exportCsv={{ filename: "centres", columns: [{ key: "code", header: "Code" }] }}
        />
      </main>,
    );
    await expectNoViolations(container);
  });

  it("DataTable empty", async () => {
    const { container } = render(
      <main>
        <DataTable columns={COLUMNS} data={[]} caption="Centres" />
      </main>,
    );
    await expectNoViolations(container);
  });

  it("ChartCard in both views", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <main>
        <ChartCard
          title="Evacuees"
          caveat="Sample data."
          table={{ columns: ["Barangay", "Evacuees"], rows: [["BRGY-01", 12]] }}
        >
          <div>[chart]</div>
        </ChartCard>
      </main>,
    );
    await expectNoViolations(container);
    await user.click(screen.getByRole("radio", { name: "Table" }));
    await expectNoViolations(container);
  });

  it("Wizard (with Next unavailable)", async () => {
    const { container } = render(
      <main>
        <Wizard
          steps={[
            { id: "a", title: "Household" },
            { id: "b", title: "Place" },
            { id: "c", title: "Review" },
          ]}
          current={1}
          onStepChange={() => {}}
          canNext={false}
        >
          <p>Step body</p>
        </Wizard>
      </main>,
    );
    await expectNoViolations(container);
  });

  it("StatusTimeline, both orientations", async () => {
    const items = [
      { id: "1", label: "Filed", state: "done" as const, time: new Date(2026, 9, 7, 8) },
      { id: "2", label: "Review", state: "current" as const },
      { id: "3", label: "Repair", state: "blocked" as const, note: "Waiting for parts" },
      { id: "4", label: "Closed", state: "upcoming" as const },
    ];
    const { container } = render(
      <main>
        <StatusTimeline items={items} />
        <StatusTimeline items={items} orientation="horizontal" label="Request REC-0001" />
      </main>,
    );
    await expectNoViolations(container);
  });

  it("CapacityMeter in every state", async () => {
    const { container } = render(
      <main>
        <CapacityMeter value={10} max={100} label="Open court" />
        <CapacityMeter value={80} max={100} label="Gym" />
        <CapacityMeter value={100} max={100} label="Chapel" size="lg" />
        <CapacityMeter value={130} max={100} label="School" />
      </main>,
    );
    await expectNoViolations(container);
  });

  it("form fields", async () => {
    const { container } = render(
      <main>
        <Fields />
      </main>,
    );
    await expectNoViolations(container);
  });

  it("BarangayField with its list open", async () => {
    const user = userEvent.setup();
    render(
      <main>
        <Fields />
      </main>,
    );
    await user.click(screen.getByRole("combobox", { name: "Barangay" }));
    await expectNoViolations(await screen.findByRole("dialog"));
  });

  it("form fields with errors", async () => {
    function Invalid() {
      const form = useForm<{ code: string; shelter: string }>({ defaultValues: { code: "", shelter: "" } });
      useEffect(() => {
        form.setError("code", { message: "This is required." });
        form.setError("shelter", { message: "This is required." });
      }, [form]);
      return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(() => {})}>
            <TextField control={form.control} name="code" label="Code" required />
            <RadioField
              control={form.control}
              name="shelter"
              label="Shelter"
              required
              options={[{ value: "school", label: "School" }]}
            />
          </form>
        </Form>
      );
    }
    const { container } = render(
      <main>
        <Invalid />
      </main>,
    );
    await screen.findAllByRole("alert");
    await expectNoViolations(container);
  });

  it("QrDisplay", async () => {
    const { container } = render(
      <main>
        <QrDisplay value="REC-0001" label="Ticket REC-0001" download="ticket" />
      </main>,
    );
    await screen.findByRole("img");
    await expectNoViolations(container);
  });

  it("IllustratedState, every spot", async () => {
    const { container } = render(
      <main>
        {(["empty", "search", "offline", "done", "map"] as const).map((spot) => (
          <IllustratedState key={spot} spot={spot} title={`State ${spot}`} description="Description" />
        ))}
        <IllustratedState spot="error" title="Error" actions={<button type="button">Try again</button>} />
      </main>,
    );
    await expectNoViolations(container);
  });
});
