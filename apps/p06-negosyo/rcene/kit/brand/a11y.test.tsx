import axe from "axe-core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LangOverride } from "@rcene/i18n";
import { Surface } from "../surface.tsx";
import { AppMark, OgCard, SPOT_NAMES, SpotIllustration, WEAVE_NAMES, WeavePattern, Wordmark } from "./index.ts";

afterEach(cleanup);

async function violations(container: HTMLElement) {
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

function Everything() {
  return (
    <main>
      <h1>Brand</h1>
      <header className="flex items-center gap-3">
        <AppMark />
        <AppMark label="Pila home" size={24} />
        <Wordmark />
        <Wordmark variant="compact" />
      </header>
      {WEAVE_NAMES.map((name) => (
        <section key={name} aria-label={name} className="relative h-32">
          <WeavePattern name={name} />
          <p className="relative bg-card">Text sits on a solid panel.</p>
        </section>
      ))}
      {SPOT_NAMES.map((name) => (
        <figure key={name}>
          <SpotIllustration name={name} />
          <figcaption>{name}</figcaption>
        </figure>
      ))}
      <OgCard title="Pila" tagline="Take a number, watch the board." appId="07" />
    </main>
  );
}

describe("brand blocks: axe", () => {
  it("has no violations (light)", async () => {
    const { container } = render(<Everything />);
    expect(await violations(container)).toEqual([]);
  });

  it("has no violations on a showcase surface, in Waray", async () => {
    const { container } = render(
      <LangOverride lang="war">
        <Surface variant="showcase">
          <Everything />
        </Surface>
      </LangOverride>,
    );
    expect(await violations(container)).toEqual([]);
  });
});
