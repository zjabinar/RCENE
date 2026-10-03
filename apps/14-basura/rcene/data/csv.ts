/**
 * CSV export (RFC 4180) for tables an LGU officer wants in Excel.
 *
 *   const csv = toCsv(rows, [
 *     { key: "code", header: "Household" },
 *     { key: (r) => r.members.length, header: "Members" },
 *   ], { bom: true });
 *   downloadCsv("households.csv", csv);   // from @rcene/ui
 *
 * Numbers are written plainly (1728.75, no thousands separators or ₱) so a
 * spreadsheet reads them as numbers. Pass `bom: true` so Excel opens UTF-8
 * text (ñ, ₱, Waray names of places) correctly. Text that starts like a
 * formula (= + - @, tab, CR) gets a leading ' so a spreadsheet shows it
 * instead of running it (residents type free text); pass numbers as numbers.
 */

export interface CsvColumn<Row> {
  /** A property of the row, or a function that computes the cell. */
  key: keyof Row | ((row: Row) => unknown);
  header: string;
}

export interface CsvOptions {
  /** Prefix a UTF-8 byte-order mark so Excel detects UTF-8. Default false. */
  bom?: boolean;
  /** Line ending between records. Default "\r\n" (RFC 4180). */
  eol?: "\r\n" | "\n";
  /** Prefix text cells that start like a formula (= + - @ tab CR) with '. Default true. */
  formulaGuard?: boolean;
}

/** Text a spreadsheet would treat as a formula (CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

/** UTF-8 byte-order mark (U+FEFF). */
const BOM = String.fromCharCode(0xfeff);

const NEEDS_QUOTES = /[",\r\n]/;

/**
 * One cell: null/undefined and non-finite numbers → empty, booleans → true/false,
 * dates → ISO 8601, other objects → JSON. Text starting like a formula gets a
 * leading ' (unless `formulaGuard` is false). Quoted when it contains a comma, a
 * quote, CR or LF; inner quotes are doubled.
 */
export function csvField(value: unknown, { formulaGuard = true }: Pick<CsvOptions, "formulaGuard"> = {}): string {
  let text: string;
  if (value === null || value === undefined) text = "";
  else if (typeof value === "number") text = Number.isFinite(value) ? String(value) : "";
  else if (typeof value === "boolean") text = value ? "true" : "false";
  else if (value instanceof Date) text = Number.isNaN(value.getTime()) ? "" : value.toISOString();
  else if (typeof value === "object") text = JSON.stringify(value);
  else {
    text = String(value);
    if (formulaGuard && FORMULA_START.test(text)) text = `'${text}`;
  }
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** A header row plus one record per row, joined by `eol` (no trailing line break). */
export function toCsv<Row>(rows: readonly Row[], columns: readonly CsvColumn<Row>[], options: CsvOptions = {}): string {
  const eol = options.eol ?? "\r\n";
  const cell = { formulaGuard: options.formulaGuard ?? true };
  const lines = [columns.map((column) => csvField(column.header, cell)).join(",")];
  for (const row of rows) {
    lines.push(
      columns
        .map(({ key }) => csvField(typeof key === "function" ? key(row) : row[key], cell))
        .join(","),
    );
  }
  return (options.bom ? BOM : "") + lines.join(eol);
}
