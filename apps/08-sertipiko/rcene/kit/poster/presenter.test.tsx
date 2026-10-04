import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PresenterMode, PresenterNotes, presenterKeyAction, type PresenterStep } from "./presenter.tsx";
import { formatClock, NOTES_ORIGIN, usePresenterStore } from "./presenter-store.ts";

const steps: PresenterStep[] = [
  { id: "open", caption: "A resident checks a barangay", route: "/", notes: "Say what was pre-built.", seconds: 20 },
  { id: "warn", caption: "The CDRRMO raises a warning", route: "/console", notes: "Point at the board.", seconds: 30 },
  { id: "board", caption: "The board updates live", route: "/board" },
];

const STORAGE_KEY = "rcene:presenter";
const INITIAL = usePresenterStore.getState();

function press(key: string, target: Element = document.body) {
  act(() => {
    fireEvent.keyDown(target, { key });
  });
}

/** What another window's write looks like to this one: localStorage changes, then a storage event. */
function writeFromAnotherWindow(patch: Record<string, unknown>) {
  const { go: _go, toggleTimer: _toggle, resetTimer: _reset, ...state } = usePresenterStore.getState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { ...state, ...patch }, version: 1 }));
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, storageArea: localStorage }));
  });
}

function persisted(): { index: number; running: boolean } {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").state;
}

beforeEach(() => {
  localStorage.clear();
  usePresenterStore.setState(INITIAL, true);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("presenterKeyAction", () => {
  it("leaves keys to inputs, sliders, dialogs and buttons (Space)", () => {
    const input = document.createElement("input");
    const button = document.createElement("button");
    const slider = document.createElement("div");
    slider.setAttribute("role", "slider");
    document.body.append(input, button, slider);
    const event = (key: string, target: Element) => {
      const e = new KeyboardEvent("keydown", { key, bubbles: true });
      Object.defineProperty(e, "target", { value: target });
      return presenterKeyAction(e);
    };
    expect(event("ArrowRight", document.body)).toBe("next");
    expect(event("ArrowRight", input)).toBeNull();
    expect(event("ArrowLeft", slider)).toBeNull();
    expect(event(" ", button)).toBeNull();
    expect(event("ArrowRight", button)).toBe("next");
    expect(event(" ", document.body)).toBe("next");
    input.remove();
    button.remove();
    slider.remove();
  });
});

describe("PresenterMode", () => {
  it("shows the step and caption, and moves with → Space PageDown / ← PageUp", () => {
    const onNavigate = vi.fn();
    render(<PresenterMode steps={steps} onNavigate={onNavigate} />);
    const bar = screen.getByRole("region", { name: "Presenter" });
    expect(bar.textContent).toContain("Step 1 of 3");
    expect(bar.textContent).toContain("A resident checks a barangay");
    expect(onNavigate).not.toHaveBeenCalled();

    press("ArrowRight");
    expect(bar.textContent).toContain("Step 2 of 3");
    expect(bar.textContent).toContain("The CDRRMO raises a warning");
    expect(onNavigate).toHaveBeenLastCalledWith("/console");

    press(" ");
    expect(bar.textContent).toContain("Step 3 of 3");
    press("PageDown");
    expect(bar.textContent).toContain("Step 3 of 3");

    press("ArrowLeft");
    expect(bar.textContent).toContain("Step 2 of 3");
    press("PageUp");
    expect(bar.textContent).toContain("Step 1 of 3");
    expect(onNavigate).toHaveBeenLastCalledWith("/");
  });

  it("works with the buttons and announces step changes politely", () => {
    render(<PresenterMode steps={steps} onNavigate={() => {}} />);
    const live = document.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(live?.textContent).toBe("Step 2 of 3: The CDRRMO raises a warning");
    fireEvent.click(screen.getByRole("button", { name: "Previous step" }));
    expect(live?.textContent).toBe("Step 1 of 3: A resident checks a barangay");
    fireEvent.click(screen.getByRole("button", { name: "Previous step" }));
    expect(usePresenterStore.getState().index).toBe(0);
  });

  it("ignores keys while typing in an input, a textarea or contenteditable", () => {
    render(
      <>
        <input aria-label="Search" />
        <textarea aria-label="Note" />
        <div contentEditable aria-label="Editor" role="textbox" suppressContentEditableWarning>
          text
        </div>
        <PresenterMode steps={steps} />
      </>,
    );
    press("ArrowRight", screen.getByRole("textbox", { name: "Search" }));
    press(" ", screen.getByRole("textbox", { name: "Note" }));
    press("t", screen.getByRole("textbox", { name: "Editor" }));
    expect(usePresenterStore.getState().index).toBe(0);
    expect(usePresenterStore.getState().running).toBe(false);
    expect(screen.getByRole("region", { name: "Presenter" }).textContent).toContain("Step 1 of 3");
  });

  it("starts and pauses the timer with T and counts the step down", () => {
    vi.useFakeTimers({ now: new Date("2026-10-07T09:00:00Z") });
    render(<PresenterMode steps={steps} />);
    const elapsed = () => screen.getByTestId("presenter-elapsed").textContent;
    expect(elapsed()).toBe("0:00");
    expect(screen.getByRole("timer", { name: "Elapsed time" }).textContent).toContain("/ 0:50");

    press("t");
    expect(usePresenterStore.getState().running).toBe(true);
    act(() => {
      vi.advanceTimersByTime(12_000);
    });
    expect(elapsed()).toBe("0:12");
    expect(screen.getByText("0:08 left")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText("0:02 over")).toBeTruthy();

    press("T");
    expect(usePresenterStore.getState().running).toBe(false);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(elapsed()).toBe("0:22");
    expect(screen.getByRole("button", { name: "Start timer" })).toBeTruthy();
  });

  it("hides with Esc, then only P works until the bar is back", () => {
    const onOpenChange = vi.fn();
    render(<PresenterMode steps={steps} onOpenChange={onOpenChange} />);
    press("Escape");
    expect(screen.queryByRole("region", { name: "Presenter" })).toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    press("ArrowRight");
    expect(usePresenterStore.getState().index).toBe(0);

    press("p");
    expect(screen.getByRole("region", { name: "Presenter" })).toBeTruthy();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    press("P");
    expect(screen.queryByRole("region", { name: "Presenter" })).toBeNull();
  });

  it("can be controlled with open / onOpenChange", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<PresenterMode steps={steps} open={false} onOpenChange={onOpenChange} />);
    expect(screen.queryByRole("region", { name: "Presenter" })).toBeNull();
    press("p");
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("region", { name: "Presenter" })).toBeNull();
    rerender(<PresenterMode steps={steps} open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide presenter bar" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("keeps the step in the synced store and follows changes from other windows", () => {
    const onNavigate = vi.fn();
    render(<PresenterMode steps={steps} onNavigate={onNavigate} />);
    press("ArrowRight");
    expect(persisted().index).toBe(1);

    // The notes window moves to step 3: this window (the stage) follows and navigates.
    const { nonce } = usePresenterStore.getState();
    writeFromAnotherWindow({ index: 2, nonce: nonce + 1, origin: NOTES_ORIGIN });
    expect(screen.getByRole("region", { name: "Presenter" }).textContent).toContain("The board updates live");
    expect(onNavigate).toHaveBeenLastCalledWith("/board");

    // Another app window moves back: this window shows it but does not navigate.
    writeFromAnotherWindow({ index: 0, nonce: nonce + 2, origin: "another-window", stage: "another-window" });
    expect(screen.getByRole("region", { name: "Presenter" }).textContent).toContain("Step 1 of 3");
    expect(onNavigate).toHaveBeenCalledTimes(2);
  });

  it("navigates with react-router when inside a router and no onNavigate is given", () => {
    function Where() {
      return <p data-testid="where">{useLocation().pathname}</p>;
    }
    const router = createMemoryRouter(
      [
        {
          path: "*",
          element: (
            <>
              <Where />
              <PresenterMode steps={steps} />
            </>
          ),
        },
      ],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);
    press("ArrowRight");
    expect(screen.getByTestId("where").textContent).toBe("/console");
    press("ArrowRight");
    expect(screen.getByTestId("where").textContent).toBe("/board");
  });

  it("renders nothing without steps", () => {
    const { container } = render(<PresenterMode steps={[]} />);
    expect(container.querySelector("[data-slot=presenter-bar]")).toBeNull();
  });
});

describe("PresenterNotes", () => {
  it("shows the notes and the next step, and drives the shared step", () => {
    render(<PresenterNotes steps={steps} />);
    expect(screen.getByRole("heading", { level: 1, name: "Step 1 of 3" })).toBeTruthy();
    expect(screen.getByText("Say what was pre-built.")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Up next" }).textContent).toContain("The CDRRMO raises a warning");

    press("ArrowRight");
    expect(usePresenterStore.getState()).toMatchObject({ index: 1, origin: NOTES_ORIGIN });
    expect(screen.getByText("Point at the board.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByText("No notes for this step.")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Up next" }).textContent).toContain("End of the demo");
  });

  it("follows the bar's window through the store", () => {
    render(<PresenterNotes steps={steps} />);
    writeFromAnotherWindow({ index: 1, nonce: 1, origin: "app-window", stage: "app-window" });
    expect(screen.getByRole("heading", { level: 1, name: "Step 2 of 3" })).toBeTruthy();
    expect(screen.getByText("Point at the board.")).toBeTruthy();
  });
});

describe("formatClock", () => {
  it("formats m:ss and h:mm:ss", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65_400)).toBe("1:05");
    expect(formatClock(3_726_000)).toBe("1:02:06");
  });
});
