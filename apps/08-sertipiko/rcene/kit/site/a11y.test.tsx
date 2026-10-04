import axe from "axe-core";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MapIcon, ShieldIcon, WifiOffIcon } from "lucide-react";

import { BeforeAfter } from "./before-after.tsx";
import { CallToAction } from "./call-to-action.tsx";
import { FeatureGrid } from "./feature-grid.tsx";
import { Hero } from "./hero.tsx";
import { ScrollyChapter } from "./scrolly-chapter.tsx";
import { Section } from "./section.tsx";
import { SiteFooter } from "./site-footer.tsx";
import { SiteShell } from "./site-shell.tsx";
import { StatBand } from "./stat-band.tsx";
import { StoryTimeline } from "./story-timeline.tsx";
import { WeaveDivider } from "./weave-divider.tsx";

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

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

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", ObserverStub);
  vi.stubGlobal("ResizeObserver", ObserverStub);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
  Element.prototype.scrollIntoView ??= function scrollIntoView() {};
  stubMotion(true);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function violations(container: Element) {
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html.slice(0, 160)) }));
}

function renderInRouter(ui: ReactNode) {
  const router = createMemoryRouter([{ path: "*", element: ui }], { initialEntries: ["/"] });
  return render(<RouterProvider router={router} />);
}

const FEATURES = [
  { icon: <MapIcon />, title: "Hazard map", description: "Every mapped zone, offline.", href: "/map" },
  { icon: <ShieldIcon />, title: "Go bag", description: "A checklist for your family.", href: "#go-bag" },
  { icon: <WifiOffIcon />, title: "Offline", description: "Works with Wi-Fi off." },
];

const STEPS = [
  { id: "a", title: "The river rises", body: <p>Rain upstream raises the river.</p> },
  { id: "b", title: "Barangays respond", body: <p>Teams check each zone.</p> },
];

const TIMELINE = [
  { id: "1", date: "1987", title: "The first flood map", body: <p>Drawn by hand.</p> },
  { id: "2", date: "2026", title: "Maps in every pocket", icon: <MapIcon /> },
];

function Page({ variant }: { variant: "calm" | "showcase" }) {
  return (
    <SiteShell
      title="Andam Catbalogan"
      brand={<ShieldIcon aria-hidden="true" />}
      nav={[
        { to: "/", label: "Home" },
        { to: "/story", label: "Story" },
        { to: "#features", label: "Features" },
      ]}
      actions={<a href="/app">Open the app</a>}
    >
      <Hero
        variant={variant}
        eyebrow="Catbalogan City"
        title="Know your hazard, plan your route"
        lead="Offline maps for every barangay."
        actions={<a href="#features">See how</a>}
        media={<img src="/hero.png" alt="Map of Catbalogan" />}
      />
      <WeaveDivider variant="diamond" />
      <Section id="features" eyebrow="What it does" title="Built for the barangay" lead="Three tools." tone="weave">
        <FeatureGrid items={FEATURES} />
      </Section>
      <Section title="In numbers" tone="muted">
        <StatBand items={[{ value: 57, label: "Barangays" }, { value: 87.5, label: "Checked", suffix: "%" }]} />
      </Section>
      <Section title="The story" tone="showcase">
        <ScrollyChapter steps={STEPS} visual={(i) => <p>Map for step {i + 1}</p>} />
      </Section>
      <Section title="Then and now">
        <BeforeAfter
          before={<img src="/a.png" alt="Riverbank in 2019" />}
          after={<img src="/b.png" alt="Riverbank in 2024" />}
          beforeLabel="2019"
          afterLabel="2024"
        />
      </Section>
      <Section title="Through the years" tone="default">
        <StoryTimeline items={TIMELINE} />
      </Section>
      <WeaveDivider variant="wave" />
      <CallToAction title="Make your plan today" body="It takes two minutes." actions={<a href="/plan">Start my plan</a>} />
      <CallToAction tone="showcase" title="See it live" actions={<a href="/demo">Open the demo</a>} />
    </SiteShell>
  );
}

describe("site blocks: axe", () => {
  for (const variant of ["calm", "showcase"] as const) {
    it(`a whole page with every block (${variant} hero, reduced motion)`, async () => {
      const { container } = renderInRouter(<Page variant={variant} />);
      expect(await violations(container)).toEqual([]);
    });
  }

  it("a whole page while the hero title is split (motion on)", async () => {
    stubMotion(false);
    const { container } = renderInRouter(<Page variant="showcase" />);
    expect(screen.getByRole("heading", { level: 1 }).getAttribute("aria-label")).toBe("Know your hazard, plan your route");
    expect(await violations(container)).toEqual([]);
  });

  it("the phone menu sheet", async () => {
    const user = userEvent.setup();
    renderInRouter(<Page variant="calm" />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog");
    expect(await violations(dialog)).toEqual([]);
  });

  it("a footer with link columns", async () => {
    const { container } = renderInRouter(
      <SiteFooter
        brand="Andam"
        note="Made in Catbalogan City."
        columns={[
          { title: "Explore", links: [{ to: "/map", label: "Hazard map" }] },
          { title: "About", links: [{ to: "/sources", label: "Data sources" }] },
        ]}
      />,
    );
    expect(await violations(container)).toEqual([]);
  });

  it("blocks on their own, outside a page", async () => {
    const { container } = render(
      <div>
        <FeatureGrid items={[FEATURES[2]!]} columns={2} />
        <StatBand items={[{ value: 3, label: "Rooms" }]} tone="brand" />
        <StoryTimeline items={TIMELINE} label="Milestones" />
        <WeaveDivider />
      </div>,
    );
    expect(await violations(container)).toEqual([]);
  });
});
