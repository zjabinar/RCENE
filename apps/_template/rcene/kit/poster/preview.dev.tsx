import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../../src/index.css";
import { AiBuiltPanel, PosterFigure, PosterPage, PresenterMode, QrToApp, SixPanelPoster } from "./index.ts";

const params = new URLSearchParams(location.search);
const size = params.get("size") === "A2" ? "A2" : "A3";
const orientation = params.get("o") === "landscape" ? "landscape" : "portrait";

function Chart() {
  const bars = [42, 30, 18, 12, 8];
  return (
    <svg viewBox="0 0 320 160" width="320" height="160">
      {bars.map((v, i) => (
        <g key={i}>
          <rect x={10 + i * 62} y={150 - v * 3} width="44" height={v * 3} rx="4" fill="var(--chart-1)" />
          <text x={32 + i * 62} y={140 - v * 3} textAnchor="middle" fontSize="14" fill="currentColor">{v}%</text>
        </g>
      ))}
    </svg>
  );
}

function App() {
  return (
    <main id="main" tabIndex={-1} style={{ padding: 16, maxWidth: 1280, margin: "0 auto" }}>
      <PosterPage size={size} orientation={orientation} title="Andam poster">
        <SixPanelPoster
          title="Andam"
          subtitle="One warning, three windows: the CDRRMO console, the barangay board and every resident's phone."
          qr={<QrToApp url="http://192.168.1.20:5101/" size={150} />}
          footer={
            <>
              <span>RSCENE 2026 AI Vibe Coding Challenge · Catbalogan City</span>
              <span>Data: OCHA/HDX, CDRRMO (with permission), OpenStreetMap</span>
            </>
          }
          panels={{
            problem: (
              <>
                <p>When a typhoon warning goes up, residents ask one question: is my house in a risk zone?</p>
                <p>Most maps say nothing when they simply have no data, and silence reads as no risk.</p>
              </>
            ),
            picture: (
              <PosterFigure title="Households in mapped flood zones" caption="Share of BRGY-01 to BRGY-05 households, by barangay." source="CDRRMO flood map, 2024" downloadSvg="households">
                <Chart />
              </PosterFigure>
            ),
            different: (
              <ul className="list-disc ps-6">
                <li>Three truthful answers: in a zone, not in a zone, outside the data.</li>
                <li>Centers inside the hazard are never recommended.</li>
                <li>Live sync across roles with no server; Waray first.</li>
              </ul>
            ),
            ai: (
              <AiBuiltPanel
                tools={[
                  { name: "Claude Code", role: "Wrote and tested the app from its brief" },
                  { name: "Playwright", role: "Clicked through every screen at 390 and 1280 px" },
                ]}
                steps={["Brief and plan", "Domain tests first", "Build requirement by requirement", "Human review of every commit"]}
              />
            ),
            data: params.has("long") ? <p>{"Long text. ".repeat(200)}</p> : <p>Barangay boundaries (OCHA/HDX), CDRRMO/CPDCO risk maps used with LGU permission, OpenStreetMap facilities.</p>,
            impact: (
              <ul className="list-disc ps-6">
                <li>Official evacuation-center registry</li>
                <li>SMS and push alerts</li>
                <li>Every barangay hall on the board</li>
              </ul>
            ),
          }}
        />
      </PosterPage>
      <PresenterMode
        steps={[
          { id: "a", caption: "A resident checks BRGY-01", seconds: 20 },
          { id: "b", caption: "The CDRRMO raises a warning", seconds: 30 },
          { id: "c", caption: "The board updates live", seconds: 30 },
        ]}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
