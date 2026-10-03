/**
 * Client-side downloads (no server, works offline): a Blob, an object URL and a
 * temporary <a download> that is clicked and removed.
 *
 *   downloadCsv("households.csv", toCsv(rows, columns, { bom: true }));
 *   downloadText("summary.txt", text);
 */

/** How long the object URL stays valid after the click. Some browsers start the download asynchronously. */
const REVOKE_AFTER_MS = 1000;

/** Saves `blob` as `filename`. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
  }
}

/** Saves `text` as `filename` (UTF-8 plain text unless `mime` says otherwise). */
export function downloadText(filename: string, text: string, mime = "text/plain;charset=utf-8"): void {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

/** Saves a CSV string (see `toCsv` in @rcene/data; pass `bom: true` there for Excel). */
export function downloadCsv(filename: string, csv: string): void {
  downloadText(filename, csv, "text/csv;charset=utf-8");
}
