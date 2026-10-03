// @vitest-environment node
import { describe, expect, it } from "vitest";
import { csvField, toCsv, type CsvColumn } from "./csv.ts";

interface Row {
  code: string;
  note: string | null;
  amount: number;
  urgent: boolean;
  when?: Date;
}

const columns: CsvColumn<Row>[] = [
  { key: "code", header: "Code" },
  { key: "note", header: "Note" },
  { key: "amount", header: "Amount (PHP)" },
  { key: "urgent", header: "Urgent" },
  { key: (r) => (r.when ? r.when : undefined), header: "When" },
];

describe("csvField", () => {
  it("leaves plain text alone and quotes only what needs it", () => {
    expect(csvField("HH-0001")).toBe("HH-0001");
    expect(csvField("Brgy. 1, Poblacion")).toBe('"Brgy. 1, Poblacion"');
    expect(csvField('a "quoted" word')).toBe('"a ""quoted"" word"');
    expect(csvField("line 1\nline 2")).toBe('"line 1\nline 2"');
    expect(csvField("cr\rhere")).toBe('"cr\rhere"');
  });

  it("writes numbers plainly and empties non-finite ones", () => {
    expect(csvField(1728.75)).toBe("1728.75");
    expect(csvField(0)).toBe("0");
    expect(csvField(-3)).toBe("-3");
    expect(csvField(Number.NaN)).toBe("");
    expect(csvField(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("handles booleans, null, undefined, dates and objects", () => {
    expect(csvField(true)).toBe("true");
    expect(csvField(false)).toBe("false");
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
    expect(csvField(new Date("2026-10-07T01:30:00Z"))).toBe("2026-10-07T01:30:00.000Z");
    expect(csvField(new Date("nope"))).toBe("");
    expect(csvField({ a: 1, b: "x" })).toBe('"{""a"":1,""b"":""x""}"');
  });
});

describe("toCsv", () => {
  const rows: Row[] = [
    { code: "HH-0001", note: "Near the river, ground floor", amount: 1728.75, urgent: true, when: new Date("2026-10-07T00:00:00Z") },
    { code: "HH-0002", note: null, amount: 0, urgent: false },
    { code: "HH-0003", note: 'Says "evacuate early"\r\nthen left', amount: 12, urgent: false },
  ];

  it("writes a header row and one CRLF-separated record per row (RFC 4180)", () => {
    expect(toCsv(rows, columns)).toBe(
      [
        "Code,Note,Amount (PHP),Urgent,When",
        'HH-0001,"Near the river, ground floor",1728.75,true,2026-10-07T00:00:00.000Z',
        "HH-0002,,0,false,",
        'HH-0003,"Says ""evacuate early""\r\nthen left",12,false,',
      ].join("\r\n"),
    );
  });

  it("supports LF line endings and an Excel BOM", () => {
    const csv = toCsv(rows.slice(1, 2), columns, { eol: "\n", bom: true });
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe("Code,Note,Amount (PHP),Urgent,When\nHH-0002,,0,false,");
  });

  it("quotes headers too and returns just the header for no rows", () => {
    expect(toCsv<Row>([], [{ key: "code", header: "Code, household" }])).toBe('"Code, household"');
  });
});
