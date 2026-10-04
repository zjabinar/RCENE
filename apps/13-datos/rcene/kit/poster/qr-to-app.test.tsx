import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { QrToApp, qrSvg } from "./qr-to-app.tsx";

afterEach(cleanup);

describe("qrSvg", () => {
  it("makes a black-on-white SVG hidden from assistive technology", () => {
    const svg = qrSvg("http://192.168.1.20:5101/");
    expect(svg).toMatch(/^<svg aria-hidden="true" focusable="false" xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toContain('stroke="#000000"');
  });

  it("keeps a 4-module white quiet zone and rounds only its outer corners", () => {
    const svg = qrSvg("http://192.168.1.20:5101/")!;
    // Version 2 (25 modules) + 4 modules of quiet zone on each side.
    expect(svg).toContain('viewBox="0 0 33 33"');
    expect(svg).toContain('<rect width="33" height="33" rx="1.5" fill="#ffffff"/>');
    // The first dark module starts 4 modules in.
    expect(svg).toMatch(/stroke="#000000" d="M4 4\.5h7/);
  });

  it("returns null when the text cannot fit a QR code", () => {
    expect(qrSvg("x".repeat(5000))).toBeNull();
  });
});

describe("QrToApp", () => {
  it("renders a named QR image, the label and the address as text", () => {
    render(<QrToApp url="https://rcene.example/andam/" size="40mm" />);
    const image = screen.getByRole("img", { name: "QR code that opens https://rcene.example/andam/" });
    expect(image.querySelector("svg")).toBeTruthy();
    expect(image.className).not.toMatch(/rounded|overflow-hidden/);
    expect(image.style.width).toBe("40mm");
    expect(screen.getByText("Scan to open the app")).toBeTruthy();
    expect(screen.getByText("rcene.example/andam")).toBeTruthy();
  });

  it("takes its own label and a pixel size", () => {
    render(<QrToApp url="http://192.168.1.20:5101" label="Try it on your phone" size={120} />);
    expect(screen.getByText("Try it on your phone")).toBeTruthy();
    expect(screen.getByRole("img").style.width).toBe("120px");
    expect(screen.getByText("192.168.1.20:5101")).toBeTruthy();
  });
});
