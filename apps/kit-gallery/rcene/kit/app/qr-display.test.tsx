import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadText } from "@rcene/ui";
import { QrDisplay } from "./qr-display.tsx";

vi.mock("@rcene/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@rcene/ui")>()),
  downloadText: vi.fn(),
  downloadBlob: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(downloadText).mockClear();
});

afterEach(cleanup);

describe("QrDisplay", () => {
  it("renders an SVG QR code inside a labelled figure", async () => {
    render(<QrDisplay value="REC-0001" label="Ticket REC-0001" />);
    expect(screen.getByText("Making the QR code…")).toBeTruthy();
    const img = await screen.findByRole("img", { name: "QR code: Ticket REC-0001" });
    const svg = img.querySelector("svg")!;
    expect(svg).not.toBeNull();
    expect(svg.getAttribute("viewBox")).toMatch(/^0 0 \d+ \d+$/);
    expect(svg.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(img.style.width).toBe("192px");
    const figure = img.closest("figure")!;
    expect(figure.querySelector("figcaption")?.textContent).toBe("Ticket REC-0001");
    // No download buttons unless asked.
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("redraws when the value changes", async () => {
    const { rerender } = render(<QrDisplay value="A" label="Code" />);
    const first = (await screen.findByRole("img")).innerHTML;
    rerender(<QrDisplay value="https://example.invalid/ticket/REC-0002" label="Code" />);
    await vi.waitFor(() => expect(screen.getByRole("img").innerHTML).not.toBe(first));
  });

  it("downloads the SVG under the given name", async () => {
    const user = userEvent.setup();
    render(<QrDisplay value="REC-0003" label="Ticket" download="ticket-REC-0003.png" size={160} />);
    await screen.findByRole("img");
    expect(screen.getByRole("button", { name: "Download PNG" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Download SVG" }));
    expect(downloadText).toHaveBeenCalledTimes(1);
    const [name, text, mime] = vi.mocked(downloadText).mock.calls[0]!;
    expect(name).toBe("ticket-REC-0003.svg");
    expect(text).toMatch(/^<svg/);
    expect(mime).toContain("image/svg+xml");
  });
});
