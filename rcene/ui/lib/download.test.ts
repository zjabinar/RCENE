import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadCsv, downloadText } from "./download.ts";

// jsdom has no object URLs; install stand-ins for these tests only.
const createObjectURL = vi.fn((_blob: Blob) => "blob:rcene/test");
const revokeObjectURL = vi.fn((_url: string) => {});

interface Click {
  download: string;
  href: string;
  attached: boolean;
}
let clicks: Click[];

/** jsdom's Blob has no .bytes()/.text(); FileReader works. Bytes, because decoding as text drops a BOM. */
function readBytes(blob: Blob): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve([...new Uint8Array(reader.result as ArrayBuffer)]);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

const BOM = String.fromCharCode(0xfeff);

beforeEach(() => {
  vi.useFakeTimers();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true, writable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true, writable: true });
  clicks = [];
  // Record the click instead of letting jsdom try to navigate.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    clicks.push({ download: this.download, href: this.href, attached: this.isConnected });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

describe("downloadCsv", () => {
  it("clicks a temporary <a download> for a CSV blob, then cleans up", async () => {
    const csv = `${BOM}Code,Amount\r\nHH-0001,1728.75`;
    downloadCsv("households.csv", csv);

    expect(clicks).toEqual([{ download: "households.csv", href: "blob:rcene/test", attached: true }]);
    expect(document.querySelector("a[download]")).toBeNull();

    // The object URL is revoked after the click, on a timer.
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:rcene/test");

    const blob = createObjectURL.mock.calls[0]![0];
    expect(blob.type).toBe("text/csv;charset=utf-8");
    vi.useRealTimers();
    const bytes = await readBytes(blob);
    expect(bytes.slice(0, 3)).toEqual([0xef, 0xbb, 0xbf]); // the BOM survives, UTF-8 encoded
    expect(bytes).toEqual([...new TextEncoder().encode(csv)]);
  });
});

describe("downloadText", () => {
  it("defaults to UTF-8 plain text and accepts another type", () => {
    downloadText("notes.txt", "Maupay nga aga");
    downloadText("report.json", "{}", "application/json");
    expect(clicks.map((c) => c.download)).toEqual(["notes.txt", "report.json"]);
    expect(createObjectURL.mock.calls.map(([blob]) => blob.type)).toEqual(["text/plain;charset=utf-8", "application/json"]);
  });
});
