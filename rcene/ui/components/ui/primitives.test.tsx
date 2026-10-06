import { act } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { useLangStore } from "@rcene/i18n";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible.tsx";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.tsx";

// jsdom lacks these browser APIs; cmdk and floating-ui use them.
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

afterEach(() => {
  cleanup();
  act(() => useLangStore.setState({ lang: "en" }));
});

describe("Accordion", () => {
  it("opens an item from its trigger and marks it expanded", async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="flood">
          <AccordionTrigger>What does "in a mapped risk zone" mean?</AccordionTrigger>
          <AccordionContent>The point is inside a mapped flood zone.</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const trigger = screen.getByRole("button", { name: /mapped risk zone/ });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await user.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("The point is inside a mapped flood zone.")).toBeTruthy();
    expect(document.querySelector("[data-slot='accordion-item']")).not.toBeNull();
  });
});

describe("Collapsible", () => {
  it("toggles its content", async () => {
    const user = userEvent.setup();
    render(
      <Collapsible>
        <CollapsibleTrigger>More</CollapsibleTrigger>
        <CollapsibleContent>Details</CollapsibleContent>
      </Collapsible>,
    );
    expect(screen.queryByText("Details")).toBeNull();
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByText("Details")).toBeTruthy();
  });
});

describe("AlertDialog", () => {
  function Confirm() {
    return (
      <AlertDialog>
        <AlertDialogTrigger>Reset</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the demo?</AlertDialogTitle>
            <AlertDialogDescription>Every saved record is cleared.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel />
            <AlertDialogAction variant="destructive" />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  it("has translated default button labels and focuses Cancel", async () => {
    const user = userEvent.setup();
    render(<Confirm />);
    await user.click(screen.getByRole("button", { name: "Reset" }));
    const dialog = screen.getByRole("alertdialog", { name: "Reset the demo?" });
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    expect(within(dialog).getByRole("button", { name: "Confirm" }).getAttribute("data-slot")).toBe("alert-dialog-action");
    expect(document.activeElement).toBe(cancel);
    await user.click(cancel);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("uses Filipino labels when Filipino is picked", async () => {
    act(() => useLangStore.setState({ lang: "fil" }));
    const user = userEvent.setup();
    render(<Confirm />);
    await user.click(screen.getByRole("button", { name: "Reset" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "Kanselahin" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Kumpirmahin" })).toBeTruthy();
  });
});

describe("Popover", () => {
  it("opens its content from the trigger", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Filters</PopoverTrigger>
        <PopoverContent>Barangay filter</PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByText("Barangay filter").closest("[data-slot='popover-content']")).not.toBeNull();
  });
});

describe("Command", () => {
  function Menu() {
    return (
      <Command>
        <CommandInput placeholder="Type a barangay…" />
        <CommandList>
          <CommandEmpty />
          <CommandGroup heading="Barangays">
            <CommandItem value="Poblacion 1">Poblacion 1</CommandItem>
            <CommandItem value="Mercedes">Mercedes</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem value="Export CSV">
              Export CSV <CommandShortcut>⌘E</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
  }

  it("filters items as you type and shows the translated empty text", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    const input = screen.getByRole("combobox", { name: "Search" });
    expect(screen.getByRole("listbox", { name: "Suggestions" })).toBeTruthy();
    expect(screen.getAllByRole("option")).toHaveLength(3);

    await user.type(input, "merc");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Mercedes"]);

    await user.clear(input);
    await user.type(input, "zzzz");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("No results found.")).toBeTruthy();
  });

  it("runs onSelect from the keyboard", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem onSelect={onSelect}>Mercedes</CommandItem>
        </CommandList>
      </Command>,
    );
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("Mercedes");
  });

  it("CommandDialog is a named dialog with the menu inside", () => {
    render(
      <CommandDialog open>
        <CommandInput />
        <CommandList>
          <CommandItem>Mercedes</CommandItem>
        </CommandList>
      </CommandDialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Search" });
    expect(within(dialog).getByRole("combobox", { name: "Search" })).toBeTruthy();
    expect(within(dialog).getByRole("option", { name: "Mercedes" })).toBeTruthy();
  });
});
