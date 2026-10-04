import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { translate, useLangStore } from "@rcene/i18n";
import { Form } from "@rcene/ui/components/form";
import { kitStrings } from "../i18n.ts";
import {
  BarangayField,
  CheckboxField,
  NumberField,
  RadioField,
  SelectField,
  TextareaField,
  TextField,
} from "./form-fields.tsx";
import { kitZodErrors, useKitZodErrors } from "./zod-errors.ts";

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", NoopResizeObserver);
  Element.prototype.scrollIntoView ??= function scrollIntoView() {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
});

afterAll(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  cleanup();
  act(() => useLangStore.setState({ lang: "en" }));
});

const schema = z.object({
  code: z.string().min(1),
  people: z.int().min(1).max(500),
  kind: z.enum(["flood", "landslide"]),
  shelter: z.enum(["school", "chapel"]),
  consent: z.boolean().refine((v) => v, { error: "Please confirm." }),
  notes: z.string().max(20).optional(),
  barangay: z.string().min(1),
});

type Values = z.output<typeof schema>;

function Harness({ onSubmit }: { onSubmit: (v: Values) => void }) {
  const errors = useKitZodErrors();
  const form = useForm({
    resolver: zodResolver(schema, { error: errors.map }),
    defaultValues: { code: "", consent: false, notes: "", barangay: "" },
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <TextField control={form.control} name="code" label="Household code" description="Like HH-0001." required />
        <NumberField control={form.control} name="people" label="People" unit="people" required min={1} />
        <SelectField
          control={form.control}
          name="kind"
          label="Hazard"
          required
          options={[
            { value: "flood", label: "Flood" },
            { value: "landslide", label: "Landslide" },
          ]}
        />
        <RadioField
          control={form.control}
          name="shelter"
          label="Shelter"
          required
          options={[
            { value: "school", label: "School", hint: "BRGY-01" },
            { value: "chapel", label: "Chapel" },
          ]}
        />
        <CheckboxField control={form.control} name="consent" label="I checked the codes" required />
        <TextareaField control={form.control} name="notes" label="Notes" maxLength={20} />
        <BarangayField
          control={form.control}
          name="barangay"
          label="Barangay"
          required
          barangays={["Canlapwas", "Guinsorongan", "Mercedes"]}
        />
        <button type="submit">Save</button>
      </form>
    </Form>
  );
}

describe("form fields", () => {
  it("label every control, say (required) in words and link the description", () => {
    render(<Harness onSubmit={() => {}} />);
    const code = screen.getByRole("textbox", { name: "Household code (required)" });
    const description = screen.getByText("Like HH-0001.");
    expect(code.getAttribute("aria-describedby")).toBe(description.id);
    expect(code.getAttribute("aria-required")).toBe("true");
    expect(screen.getByRole("spinbutton", { name: "People (required)" }).getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Hazard (required)" }).textContent).toContain("Choose…");
    expect(screen.getByRole("radiogroup", { name: "Shelter (required)" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "I checked the codes (required)" })).toBeTruthy();
    const notes = screen.getByRole("textbox", { name: "Notes" });
    expect(notes.getAttribute("aria-required")).toBeNull();
    expect(screen.getByText("0 of 20 characters")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Barangay (required)" }).textContent).toContain("Choose a barangay");
    expect(screen.getAllByText("(required)")).toHaveLength(6);
  });

  it("show translated errors on submit, wired with aria-invalid and aria-describedby", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();

    const code = screen.getByRole("textbox", { name: "Household code (required)" });
    expect(code.getAttribute("aria-invalid")).toBe("true");
    const alerts = screen.getAllByRole("alert");
    expect(alerts.map((a) => a.textContent)).toEqual([
      "This is required.",
      "This is required.",
      "This is required.",
      "This is required.",
      "Please confirm.",
      "This is required.",
    ]);
    expect(code.getAttribute("aria-describedby")?.split(" ")).toContain(alerts[0]!.id);
  });

  it("collect typed values: numbers as numbers, choices from select, radio, checkbox and barangay search", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await user.type(screen.getByRole("textbox", { name: /Household code/ }), "HH-0042");

    const people = screen.getByRole("spinbutton", { name: /People/ });
    await user.type(people, "0");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Enter 1 or more.")).toBeTruthy();
    await user.clear(people);
    await user.type(people, "2.5");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Enter a whole number.")).toBeTruthy();
    await user.clear(people);
    await user.type(people, "12");

    await user.click(screen.getByRole("combobox", { name: /Hazard/ }));
    await user.click(await screen.findByRole("option", { name: "Landslide" }));
    expect(screen.getByRole("combobox", { name: /Hazard/ }).textContent).toContain("Landslide");

    await user.click(screen.getByRole("radio", { name: /Chapel/ }));
    await user.click(screen.getByRole("checkbox", { name: /I checked/ }));
    await user.type(screen.getByRole("textbox", { name: "Notes" }), "Ramp");
    expect(screen.getByText("4 of 20 characters")).toBeTruthy();

    const brgy = screen.getByRole("combobox", { name: /Barangay/ });
    await user.click(brgy);
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("combobox"), "merc");
    await user.click(within(dialog).getByRole("option", { name: /Mercedes/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(brgy.textContent).toContain("Mercedes");

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      code: "HH-0042",
      people: 12,
      kind: "landslide",
      shelter: "chapel",
      consent: true,
      notes: "Ramp",
      barangay: "Mercedes",
    });
  });

  it("follow the language for the required text and messages", async () => {
    act(() => useLangStore.setState({ lang: "fil" }));
    const user = userEvent.setup();
    render(<Harness onSubmit={() => {}} />);
    expect(screen.getAllByText("(kailangan)").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getAllByText("Kailangan ito.").length).toBeGreaterThan(0);
  });
});

describe("kitZodErrors", () => {
  const en = kitZodErrors((key, vars) => translate(kitStrings, "en", key, vars));
  const message = (schema: z.ZodType, value: unknown) =>
    schema.safeParse(value, { error: en.map }).error?.issues[0]?.message;

  it("maps the common zod 4 issues to kit strings", () => {
    expect(message(z.string(), undefined)).toBe("This is required.");
    expect(message(z.string().min(1), "")).toBe("This is required.");
    expect(message(z.string().min(3), "ab")).toBe("Use at least 3 characters.");
    expect(message(z.string().max(5), "abcdef")).toBe("Use at most 5 characters.");
    expect(message(z.number(), Number.NaN)).toBe("Enter a number.");
    expect(message(z.number(), "abc")).toBe("Enter a number.");
    expect(message(z.int(), 2.5)).toBe("Enter a whole number.");
    expect(message(z.number().min(10), 2)).toBe("Enter 10 or more.");
    expect(message(z.number().max(10), 20)).toBe("Enter 10 or less.");
    expect(message(z.number().gt(0), 0)).toBe("Enter a number above 0.");
    expect(message(z.number().lt(5), 5)).toBe("Enter a number below 5.");
    expect(message(z.number().multipleOf(5), 3)).toBe("Use steps of 5.");
    expect(message(z.email(), "x")).toBe("Enter a valid email address.");
    expect(message(z.string().regex(/^HH-\d{4}$/), "x")).toBe("Check the format.");
    expect(message(z.enum(["a", "b"]), "c")).toBe("Choose one of the options.");
    expect(message(z.array(z.string()).min(2), ["a"])).toBe("Choose at least 2.");
    expect(message(z.array(z.string()).max(1), ["a", "b"])).toBe("Choose at most 1.");
  });

  it("lets a message in the schema win", () => {
    expect(message(z.string().min(1, "Code please."), "")).toBe("Code please.");
  });

  it("offers message helpers and translates them", () => {
    expect(en.required()).toBe("This is required.");
    expect(en.tooShort(4)).toBe("Use at least 4 characters.");
    expect(en.tooLong(80)).toBe("Use at most 80 characters.");
    expect(en.invalidNumber()).toBe("Enter a number.");
    expect(en.min(1)).toBe("Enter 1 or more.");
    expect(en.max(9)).toBe("Enter 9 or less.");
    expect(en.choose()).toBe("Choose one of the options.");
    const fil = kitZodErrors((key, vars) => translate(kitStrings, "fil", key, vars));
    expect(fil.required()).toBe("Kailangan ito.");
    expect(z.string().min(1).safeParse("", { error: fil.map }).error?.issues[0]?.message).toBe("Kailangan ito.");
  });
});
