import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { readTokenColor, useTokenColor } from "./token-color.ts";

const root = () => document.documentElement;

afterEach(() => {
  root().style.removeProperty("--primary");
  root().removeAttribute("data-mode");
});

describe("useTokenColor", () => {
  it("falls back when the token is not set", () => {
    expect(readTokenColor("--primary", "#123456")).toBe("#123456");
  });

  it("reads the token and follows a theme change on <html>", async () => {
    root().style.setProperty("--primary", "#0f6b66");
    const { result } = renderHook(() => useTokenColor("--primary", "#000000"));
    expect(result.current).toBe("#0f6b66");
    await act(async () => {
      root().style.setProperty("--primary", "#4fd1c5");
      root().setAttribute("data-mode", "dark");
      await Promise.resolve();
    });
    expect(result.current).toBe("#4fd1c5");
  });
});
