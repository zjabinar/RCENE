import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { gsap } from "@rcene/ui/motion";

import { Hero } from "./hero.tsx";

/** matchMedia that reports the given reduced-motion setting (and light mode). */
function stubMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: /prefers-reduced-motion:\s*reduce/.test(query) ? reduce : false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
}

class StubIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Hero", () => {
  for (const variant of ["calm", "showcase"] as const) {
    it(`${variant}: the title is the page's h1 and names the section (reduced motion)`, () => {
      stubMotion(true);
      render(
        <Hero
          variant={variant}
          eyebrow="Catbalogan City"
          title="Know your hazard, plan your route"
          lead="Offline maps for every barangay."
          actions={<a href="#start">Start</a>}
          media={<img src="/x.png" alt="Map of the city" />}
        />,
      );
      const h1 = screen.getByRole("heading", { level: 1, name: "Know your hazard, plan your route" });
      expect(h1.textContent).toBe("Know your hazard, plan your route");
      expect(screen.getByRole("region", { name: "Know your hazard, plan your route" })).toBeTruthy();
      expect(screen.getByText("Offline maps for every barangay.")).toBeTruthy();
      expect(screen.getByRole("link", { name: "Start" })).toBeTruthy();
      expect(screen.getByRole("img", { name: "Map of the city" })).toBeTruthy();
      // Nothing was split or hidden.
      expect(h1.getAttribute("aria-label")).toBeNull();
      expect(h1.querySelector("[aria-hidden]")).toBeNull();
    });
  }

  it("calm uses the display face and a woven band; showcase the neon surface with a glow layer", () => {
    stubMotion(true);
    const { container, unmount } = render(<Hero title="Calm" />);
    expect(screen.getByRole("heading", { level: 1 }).className).toContain("font-display");
    expect(container.querySelector(".weave-band")?.getAttribute("aria-hidden")).toBe("true");
    unmount();

    const showcase = render(<Hero variant="showcase" title="Neon" />);
    expect(showcase.container.querySelector("[data-surface='showcase']")).toBeTruthy();
    const h1 = screen.getByRole("heading", { level: 1, name: "Neon" });
    expect(h1.className).toContain("font-showcase");
    expect(h1.className).toContain("text-display-1");
    expect(h1.className).toContain("bg-clip-text");
    const glow = showcase.container.querySelector("[data-hero-glow]")!;
    expect(glow.getAttribute("aria-hidden")).toBe("true");
    expect(glow.className).toContain("glow-text");
  });

  for (const variant of ["calm", "showcase"] as const) {
    it(`${variant}: with motion, the split title keeps its accessible name and is restored after the reveal`, () => {
      stubMotion(false);
      vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
      render(<Hero variant={variant} title="Ready together, Catbalogan" lead="Lead" />);
      const h1 = screen.getByRole("heading", { level: 1, name: "Ready together, Catbalogan" });
      // While split: SplitText labels the heading and hides the word pieces.
      const words = h1.querySelectorAll("[aria-hidden='true']");
      expect(words.length).toBe(3);
      expect(h1.getAttribute("aria-label")).toBe("Ready together, Catbalogan");
      if (variant === "showcase") expect(h1.hasAttribute("data-split")).toBe(true);

      // Jump to the end of every running animation: the split is reverted.
      gsap.globalTimeline.getChildren(true, true, false).forEach((tl) => tl.progress(1));
      expect(h1.querySelector("[aria-hidden]")).toBeNull();
      expect(h1.getAttribute("aria-label")).toBeNull();
      expect(h1.hasAttribute("data-split")).toBe(false);
      expect(h1.textContent).toBe("Ready together, Catbalogan");
      expect(screen.getByRole("heading", { level: 1, name: "Ready together, Catbalogan" })).toBe(h1);
    });
  }
});

describe("Hero title changes (motion on)", () => {
  const finish = () => gsap.globalTimeline.getChildren(true, true, false).forEach((tl) => tl.progress(1));

  for (const variant of ["calm", "showcase"] as const) {
    it(`${variant}: a node title is never split, and re-renders (same shape and new shape) stay in sync`, () => {
      stubMotion(false);
      vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
      const { rerender } = render(
        <Hero
          variant={variant}
          title={
            <>
              Know your <em>hazard</em>
            </>
          }
        />,
      );
      const h1 = () => screen.getByRole("heading", { level: 1 });
      expect(h1().querySelector("[aria-hidden]")).toBeNull();
      expect(h1().textContent).toBe("Know your hazard");
      finish();

      rerender(
        <Hero
          variant={variant}
          title={
            <>
              Know your <em>route</em>
            </>
          }
        />,
      );
      expect(h1().textContent).toBe("Know your route");
      expect(screen.getByRole("heading", { level: 1, name: "Know your route" })).toBeTruthy();

      // A different node shape, mid-animation and after it.
      expect(() =>
        rerender(
          <Hero
            variant={variant}
            title={
              <>
                <strong>Plan</strong> ahead, <em>together</em>
              </>
            }
          />,
        ),
      ).not.toThrow();
      expect(h1().textContent).toBe("Plan ahead, together");
      finish();
      expect(() => rerender(<Hero variant={variant} title={<span>Handa kita</span>} />)).not.toThrow();
      expect(h1().textContent).toBe("Handa kita");
    });

    it(`${variant}: a string title change (a language switch) remounts cleanly, after and during the reveal`, () => {
      stubMotion(false);
      vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
      const { rerender } = render(<Hero variant={variant} title="Ready together, Catbalogan" />);
      finish();
      rerender(<Hero variant={variant} title="Andam kita, Catbalogan" />);
      // The new title is split for its own reveal; its name is the new text.
      expect(screen.getByRole("heading", { level: 1, name: "Andam kita, Catbalogan" })).toBeTruthy();
      // Change again mid-reveal.
      expect(() => rerender(<Hero variant={variant} title="Handa tayo, Catbalogan" />)).not.toThrow();
      finish();
      const h1 = screen.getByRole("heading", { level: 1, name: "Handa tayo, Catbalogan" });
      expect(h1.textContent).toBe("Handa tayo, Catbalogan");
      expect(h1.querySelector("[aria-hidden]")).toBeNull();
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    });
  }
});
