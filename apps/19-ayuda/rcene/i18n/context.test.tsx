import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { common, extendStrings, StringsProvider, useAppStrings, useLangStore, useT } from "./index.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  act(() => useLangStore.setState({ lang: "en" }));
});

/** What a shared component does: print a common key from the app's table. */
function Disclaimer() {
  const t = useT(useAppStrings());
  return <p>{t("app.disclaimer")}</p>;
}

const appStrings = extendStrings(common, {
  en: { "app.disclaimer": "Demo only. Follow CDRRMO advisories.", "x.extra": "Extra" },
  fil: { "app.disclaimer": "Demo lamang. Sundin ang abiso ng CDRRMO." },
});

describe("StringsProvider / useAppStrings", () => {
  it("defaults to common outside a provider", () => {
    act(() => root.render(<Disclaimer />));
    expect(host.textContent).toBe(common.en["app.disclaimer"]);
  });

  it("serves the app's override of a common key, per language", () => {
    act(() =>
      root.render(
        <StringsProvider value={appStrings}>
          <Disclaimer />
        </StringsProvider>,
      ),
    );
    expect(host.textContent).toBe("Demo only. Follow CDRRMO advisories.");
    act(() => useLangStore.setState({ lang: "fil" }));
    expect(host.textContent).toBe("Demo lamang. Sundin ang abiso ng CDRRMO.");
    // Not overridden in Waray: the common Waray text stays (extendStrings merges per language).
    act(() => useLangStore.setState({ lang: "war" }));
    expect(host.textContent).toBe(common.war["app.disclaimer"]);
  });
});
