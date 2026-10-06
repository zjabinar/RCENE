import { useState } from "react";
import { act, cleanup, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWizard, Wizard, type WizardStep } from "./wizard.tsx";

afterEach(cleanup);

const STEPS: WizardStep[] = [
  { id: "household", title: "Household", description: "Who lives here (codes only)." },
  { id: "place", title: "Place" },
  { id: "review", title: "Review" },
];

function Harness({ canNext = true, onFinish }: { canNext?: boolean; onFinish?: () => void }) {
  const w = useWizard(STEPS.length);
  return (
    <Wizard steps={STEPS} current={w.current} onStepChange={w.goTo} canNext={canNext} onFinish={onFinish}>
      <p>Content of {STEPS[w.current]!.id}</p>
    </Wizard>
  );
}

describe("Wizard", () => {
  it("renders a stepper with aria-current on the current step", () => {
    render(<Harness />);
    const list = screen.getByRole("list", { name: "Progress" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]!.getAttribute("aria-current")).toBe("step");
    expect(items[1]!.getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Household" })).toBeTruthy();
    expect(screen.getByText("Step 1 of 3")).toBeTruthy();
    expect(screen.getByText("Who lives here (codes only).")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("moves focus to the new step's heading on Next and Back", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    // Not on mount.
    expect(document.activeElement).toBe(document.body);
    await user.click(screen.getByRole("button", { name: "Next" }));
    const heading = screen.getByRole("heading", { level: 2, name: "Place" });
    expect(document.activeElement).toBe(heading);
    expect(screen.getByText("Content of place")).toBeTruthy();

    const items = within(screen.getByRole("list", { name: "Progress" })).getAllByRole("listitem");
    expect(items[1]!.getAttribute("aria-current")).toBe("step");
    expect(items[0]!.textContent).toContain("(done)");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: "Household" }));
  });

  it("lets a finished step be revisited from the stepper", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: /Household \(done\)/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Household" })).toBeTruthy();
  });

  it("keeps Next inert with a reason when canNext is false", async () => {
    const user = userEvent.setup();
    render(<Harness canNext={false} />);
    const next = screen.getByRole("button", { name: "Next" });
    expect(next.getAttribute("aria-disabled")).toBe("true");
    const reason = screen.getByText("Fill in the required fields to continue.");
    expect(next.getAttribute("aria-describedby")).toBe(reason.id);
    await user.click(next);
    expect(screen.getByRole("heading", { level: 2, name: "Household" })).toBeTruthy();
  });

  it("shows Finish on the last step and calls onFinish", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<Harness onFinish={onFinish} />);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("is controlled: onStepChange receives the target index", async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    function Controlled() {
      const [i] = useState(1);
      return (
        <Wizard steps={STEPS} current={i} onStepChange={onStepChange}>
          <p>Body</p>
        </Wizard>
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onStepChange).toHaveBeenLastCalledWith(2);
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(onStepChange).toHaveBeenLastCalledWith(0);
  });
});

describe("useWizard", () => {
  it("clamps to the step range", () => {
    const { result } = renderHook(() => useWizard(3));
    expect(result.current.isFirst).toBe(true);
    act(() => result.current.back());
    expect(result.current.current).toBe(0);
    act(() => result.current.goTo(9));
    expect(result.current.current).toBe(2);
    expect(result.current.isLast).toBe(true);
    act(() => result.current.reset());
    expect(result.current.current).toBe(0);
  });
});
