// @vitest-environment node
/**
 * Unit tests for the brand asset script's helpers (the full run is
 * `node scripts/brand-assets.mjs`, which needs a browser).
 * RCENE_BRAND_NO_MAIN=1 makes the import side-effect free.
 */
import { beforeAll, describe, expect, it } from "vitest";

let brand;
let smoke;

beforeAll(async () => {
  process.env.RCENE_BRAND_NO_MAIN = "1";
  process.env.RCENE_SMOKE_NO_MAIN = "1";
  brand = await import("./brand-assets.mjs");
  smoke = await import("./smoke.mjs");
});

/** width x height RGBA rows from a pixel function. */
function image(width, height, pixel) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(width * 4);
    for (let x = 0; x < width; x++) row.set(pixel(x, y), x * 4);
    rows.push(row);
  }
  return { width, height, channels: 4, rows };
}

describe("encodePng", () => {
  it("round-trips an opaque image as RGB", () => {
    const img = image(23, 17, (x, y) => [x * 10, y * 12, (x * y) % 256, 255]);
    const decoded = smoke.decodePng(brand.encodePng(img));
    expect(decoded.channels).toBe(3);
    expect(decoded.width).toBe(23);
    for (let y = 0; y < 17; y++) {
      for (let x = 0; x < 23; x++) expect([...decoded.rows[y].subarray(x * 3, x * 3 + 3)]).toEqual([x * 10, y * 12, (x * y) % 256]);
    }
  });

  it("keeps alpha when the image has transparent pixels", () => {
    const img = image(8, 8, (x, y) => [200, 100, 50, x + y > 7 ? 255 : 0]);
    const decoded = smoke.decodePng(brand.encodePng(img));
    expect(decoded.channels).toBe(4);
    expect(decoded.rows[0][3]).toBe(0);
    expect(decoded.rows[7][7 * 4 + 3]).toBe(255);
  });
});

describe("sources", () => {
  it("draws the favicon in the habi palette, with no theme variables", () => {
    const svg = brand.faviconSvg();
    for (const hex of ["#0f6b66", "#a0703f", "#5b3a8c", "#f7f2e8"]) expect(svg).toContain(hex);
    expect(svg).not.toContain("var(--");
    expect(svg.length).toBeLessThan(4000);
  });

  it("zooms the maskable icon out to its safe zone", () => {
    expect(brand.maskableSvg()).toContain('viewBox="-4 -4 72 72"');
  });

  it("uses project.json for an app's card and a generic card for the template", () => {
    expect(brand.ogContent({ id: "07", slug: "07-pila", title: "Pila", tagline: "Queue" }, false)).toEqual({ title: "Pila", tagline: "Queue", appId: "07" });
    expect(brand.ogContent({ id: "00", slug: "_template", title: "RCENE template" }, false).appId).toBeUndefined();
    expect(brand.ogContent({ id: "07", slug: "07-pila", title: "Pila" }, true).title).not.toBe("Pila");
  });

  it("escapes the title and tagline in the card", () => {
    const html = brand.ogHtml({ title: "A <b> & co", tagline: 'say "hi"', appId: "P1" });
    expect(html).toContain("A &lt;b&gt; &amp; co");
    expect(html).toContain("say &quot;hi&quot;");
    expect(html).toContain("App P1");
  });
});
