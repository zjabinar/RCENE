# RSCENE 2026 AI Vibe Coding Challenge — Project Proposals

Thirty candidate projects for the four-hour solo build on **October 7, 2026** at Tandaya Hall, Catbalogan City — 20 focused single-feature apps and 10 integrated platforms — with recommended shortlists, data-provenance rules, tech stack, and prep plan.

- **Event theme:** *The Living Tapestry: Weaving the Threads of Innovation and Heritage*
- **Deliverables:** functional web app · project poster · live demonstration
- **Rubric:** AI use 20% · Innovation 20% · Functionality 20% · UX/UI 15% · Relevance & impact 15% · Poster & presentation 10%
- **Constraints:** solo · React + TypeScript · local-only demo · prepared repo allowed · no runtime AI API in the app

Sources reviewed: `VibeCoding_Challenge.txt` and the event poster; the LGU Portal Pro codebase and its gap-analysis/audit documents (`C:\lgu_portal`); the Region VIII GIS archive (`D:\lgu_portal - GIS`); the GPDSS / Project HABAGAT codebase and research documents (`D:\monica`).

## Decisions

| Date | Decision |
|---|---|
| 2026-10-02 | Build **P1 Andam Catbalogan**. Its PRD lives at `docs/PRD.md`. |
| 2026-10-02 | The entry is **fully independent of GPDSS and Project HABAGAT**. Nothing from `D:\monica` is used — no code, outputs, data, or findings, including its island-barangay list and roadmap gaps. The GPDSS review below stays only as a record of what was examined. P4 Isla Link is set aside because it rests on GPDSS findings. |
| 2026-10-02 | Data: 🟢 open data first. The user holds permission for some 🟡 datasets; the PRD records exactly which ones. |
| 2026-10-02 | Topic format (self-chosen or announced on the day) is unconfirmed. Plan for self-chosen, and keep the scaffold generic enough to pivot. |

---

## What the review found

### GIS data — a real edge, once provenance is checked

The archive holds 15 GB covering Region VIII: 6 provinces, 143 municipalities, and 4,390 barangays. Its deepest detail is for **Catbalogan City** (57 barangays), the host city, and **Motiong** (30 barangays, pre-clipped).

> Not every layer is free to show in public. Check **Data provenance & permissions** below before using any of it.

**Ready now** (small WGS84 GeoJSON that loads straight into a browser map):

| Dataset | Path (under `D:\lgu_portal - GIS\data\region8\`) |
|---|---|
| Catbalogan barangays (57) + city boundary | `administrative_boundaries\catbalogan_barangays.geojson`, `catbalogan_city_boundary.geojson` |
| Critical facilities: 953 hospitals, 3,611 schools, 155 police, 50 fire | `critical_facilities\*.geojson` |
| Motiong full stack: boundary, barangays, schools, hospitals, slope, land cover, inundation, storm surge SSA1–4 | `motiong_extracted\` |
| Active fault and liquefaction (Motiong) | `phivolcs\Motiong\aft_vectorized.geojson`, `liq_vectorized.geojson` |
| 143 municipal centroids | `..\r8_municipality_coordinates.json` |

**Needs conversion before the event** (too heavy, or in the wrong projection):
- Catbalogan CPDCO shapefiles (UTM 51N): exposure × hazard risk maps, heritage and scenic overlay zones, eco-tourism and heritage KML points
- Project NOAH flood 5/25/100-yr, landslide, and storm surge (6.2 GB, unsimplified)
- NAMRIA land cover 2010/2015/2020, coastal resources 2015/2020, and sea-level-rise inundation 0.5–4.5 m
- Calbayog DSM/DTM GeoTIFFs, which are the only real elevation data in the archive

### LGU Portal Pro — reuse the knowledge, not the code

LGU Portal Pro is a 60-app Django + PostGIS platform, live for Motiong, with Catbalogan as its reference LGU. Its frontend is server-rendered (OneUI + Alpine/htmx), so no code transfers to a React build, and lifting code would undercut the "built in four hours" premise anyway. What transfers is **domain depth**: barangay operations, eBOSS permitting, Region-8 DRRM/GIS, revenue, environment, and Waray-language support.

> `C:\lgu_portal` contains credential files (environment files and Firebase service-account keys). Never copy anything from it into this repository.

### Documented needs — real problems, not invented ones

The portal's own gap analyses and audits record these unmet needs:
- no digital queue or appointment system
- no public complaint form or business-violation lookup
- an "Am I Safe?" hazard check that answered *safe* for every location
- risk scores with no explanation and no scenario simulation
- vulnerable populations missing from risk models
- no evacuation routing
- a waste-schedule lookup that returned nothing
- no Waray/Filipino localisation
- hazard data locked in technical formats
- field work that must survive without signal

### GPDSS / Project HABAGAT — useful, but not yours alone to publish

`D:\monica` holds **GPDSS** (Geospatial Predictive Decision Support System), a Django + PostGIS system that profiles hazard risk for Catbalogan's 57 barangays. It uses Random Forest / Gradient Boosting models with SHAP explanations, an eight-preset scenario engine, and an LLM assistant.

**Whose it is.** GPDSS is **Anna Monica C. Paculaba's DIT dissertation** (University of the Cordilleras). **Project HABAGAT** — SSU, April–October 2027, with LGU Catbalogan as partner — is a separate institutional proposal, with Paculaba as project leader and Zaldy A. Jabiñar as member. Her dissertation evaluation and a Springer LNCS manuscript are still pending.

**What it adds that the other sources don't:**
- CBMS **barangay-level aggregates** for 2013 (the pre-Haiyan baseline), 2022 and 2024: housing materials, age structure by sex, and SDG service indicators (water, sanitation, electricity, internet, tenure, safety). It holds no household or person-level data.
- A 57 × 6 hazard matrix: flood, landslide, storm surge, ground shaking, liquefaction, tsunami.
- 35 historical incidents (2013–2024), 95 earthquakes, 11 tropical cyclones, and 11 years of daily weather.
- **11 island barangays in three clusters**; 31 of 57 barangays are coastal.
- Research insight: dense coastal and poblacion barangays and riverine barangays in the Catbalogan River basin are the most vulnerable; upland barangays are mainly landslide-exposed.
- Poverty and food-insecurity fields are empty, so poverty-based features have no data behind them.

**What its own roadmap lists as missing.** These are good competition seeds, and building them from scratch is your own work:
- a plain-language answer to "why is my barangay at risk?"
- geocoded digital incident reporting (only 35 incidents are on record)
- an offline PWA for field officers
- geo-targeted, multilingual alerts
- saving and sharing scenarios
- maritime connectivity for island barangays
- evacuation-capacity and shelter mapping

CSWDO, the social welfare office, appears nowhere in it.

**What not to use without her consent:**
- the code
- the model outputs: risk levels, SHAP values, risk snapshots, metrics
- `journal_outputs\`
- anything derived from the above

Two reasons. Showing them first in a public competition could count as prior publication. And the risk labels are a weighted index, not validated ground truth, so presenting them to residents as "AI predictions" would overstate them.

### Data provenance & permissions

| Tier | Meaning | Sources |
|---|---|---|
| 🟢 Open | Use with attribution | HDX/OCHA admin boundaries (57 Catbalogan barangays) · OpenStreetMap facilities (ODbL, "© OpenStreetMap contributors") · UP Project NOAH flood, landslide and storm-surge maps (confirm the license on the download page) · Geoportal Philippines public downloads (confirm which files came from there) · PSA published statistics · PHIVOLCS public earthquake bulletins · PAGASA public tropical-cyclone lists |
| 🟡 Permission | Gathered by others under agreements; use only with the owner's OK | CBMS barangay aggregates (LGU-CBMS office) · CDRRMO risk overlays and evacuation-center lists · CPDCO heritage and eco-tourism KML and photos · NAMRIA RDAB layers and IfSAR DSM/DTM ("Terms of Agreement") · PAGASA station daily data · PHIVOLCS KMZ hazard overlays obtained under the MOU |
| 🔴 Don't use | Off-limits for a public demo | GPDSS model outputs, SHAP values, metrics, `journal_outputs\` · PHIVOLCS WMS links and token URL (the MOU forbids sharing them) · any credential file (`.env`, `gemini_api_key.txt`, Firebase keys) · any user, chat or audit table |

Rules that apply whatever the tier:
- **Barangay-level figures only.** Publish rates rather than raw counts, and suppress any cell under 5. Small island barangays make small counts identifying.
- **Credit every source** on a data-sources page and on the poster.
- **🟢 data must be enough to ship.** 🟡 data is an upgrade if permission arrives in time, never a dependency.

---

## The 20 proposals at a glance

| # | Project | Domain | Primary user | 4-h feasibility | Signature visual |
|---|---|---|---|---|---|
| 1 | **Ligtas Ba Ako?** | Hazard | Citizen / tourist | High | Map fly-to + animated risk card |
| 2 | **Tubig** | Hazard | Planner / public | Low–Med | 3D terrain with rising water |
| 3 | **Likas** | Evacuation | Citizen + staff | High | Live capacity board |
| 4 | **Bantay Barangay** | Risk analytics | MDRRMO | Med–High | Explainable choropleth, live re-rank |
| 5 | **Sakuna Sim** | Drills | MDRRMO | Medium | Scrubbable typhoon timeline |
| 6 | **Damage Snap** | Field operations | Responders | Medium | Offline sync + heatmap |
| 7 | **Pila** | Queueing | Citizen + staff | High | Split-flap "Now Serving" board |
| 8 | **Sertipiko** | Barangay services | Citizen | High | Status timeline + QR stamp |
| 9 | **Negosyo Navigator** | Business permits | Applicant | High | Wizard + animated fee breakdown |
| 10 | **Reklamo** | Consumer protection | Citizen | High | Tracking stepper + complaint map |
| 11 | **Bayanihan Budget** | Participation | Resident | High | Budget fill + results race |
| 12 | **Proyekto Watch** | Transparency | Citizen | High | Before/after wipe, progress rings |
| 13 | **Bukas Datos** | Open data | Public | Med–High | Scrollytelling pinned map |
| 14 | **Basura Alert** | Waste | Resident | High | Segregation drag-and-drop game |
| 15 | **Bakhaw Watch** | Coastal environment | Public / planner | Medium | Swipe-compare 2015 vs 2020 |
| 16 | **Libot Catbalogan** | Heritage & tourism | Tourist | High | Self-drawing heritage trail |
| 17 | **Banig** | Heritage craft | Public | Med–Low | Woven 3D gallery + pattern maker |
| 18 | **Kalinga** | Social protection × DRRM | Barangay / tanod | High | Pulsing priority households |
| 19 | **Ayuda Tracker** | Relief operations | Volunteers | High | QR scan + live tallies |
| 20 | **Sumat** | Access & inclusion | Citizen | High | Three-language accessible service guide |

**★AI** marks proposals where an optional AI feature that runs **in the browser, offline, with no API key** (Transformers.js) would strengthen the 20% AI criterion without changing the no-API decision.

---

## A — Disaster resilience & hazard intelligence

### 1. Ligtas Ba Ako? — address-level "Am I safe?" check
- **Problem:** Hazard data exists, but residents and tourists can't check whether a place is in a flood zone. The need is proven, and so is the need for an answer that can be trusted.
- **What it does:** Tap the map or search a barangay to get a plain-language hazard card (flood 5/25/100-yr, landslide, storm surge, liquefaction), the nearest evacuation center and hospital with distances, and a "what to do now" checklist, in Waray, Filipino, or English.
- **MVP:** Turf point-in-polygon lookup · animated risk card · nearest-facility search · language toggle
- **Wow:** MapLibre fly-to with GSAP staggered hazard chips and a severity gauge
- **Stack:** core + MapLibre, Turf, GSAP
- **Data:** Catbalogan barangays · NOAH layers (pre-simplified) · critical facilities

### 2. Tubig — 3D flood & sea-level-rise simulator
- **Problem:** Inundation and surge polygons are abstract to non-specialists, so councils plan without feeling the scale.
- **What it does:** 3D coastal terrain with a water-level slider (0.5→4.5 m sea-level rise; SSA1–4 storm surge). Exposed facilities and barangays light up and tally live.
- **MVP:** Terrain · water plane and slider · exposed-facility counter · three preset scenarios
- **Wow:** R3F terrain with an animated water surface; GSAP camera moves between scenarios
- **Stack:** core + three, @react-three/fiber, @react-three/drei, GSAP
- **Data:** NAMRIA inundation and surge. Real elevation exists **only for Calbayog**. Catbalogan needs a heightmap baked in advance or public DEM tiles, which depend on the internet.
- **Risk:** The three.js showpiece, and the proposal most likely to blow the clock. Attempt it only if the heightmap is baked before October 7.

### 3. Likas — evacuation center finder & live capacity board
- **Problem:** No geocoded evacuation list and no routing; residents can't tell which center still has room.
- **What it does:** Finds the nearest open center, with a capacity bar and a what-to-bring list. A staff console updates headcounts, and a public board shows every center filling.
- **MVP:** Center map and nearest search · capacity update form · status board synced across windows with BroadcastChannel
- **Wow:** Motion layout reorder as centers fill; GSAP count-ups
- **Stack:** core + MapLibre, Turf, Motion, GSAP
- **Data:** Schools from critical facilities (common PH evacuation sites) with seeded capacities

### 4. Bantay Barangay — explainable barangay risk dashboard
- **Problem:** Risk scores are a hand-tuned average, so decision-makers can't see *why* a barangay ranks high.
- **What it does:** A choropleth of all 57 barangays. Clicking one shows exactly which hazards apply and how many schools and health stations are exposed, and weight sliders re-rank the barangays live.
- **MVP:** Choropleth · breakdown panel · live weight sliders · export ranked list
- **Wow:** Animated breakdown bars; Motion re-rank list
- **Stack:** core + MapLibre, Turf (offline precompute), Recharts or ECharts, Motion
- **Data:** Barangay × hazard × facility exposure, **precomputed before the event** into one JSON file

### 5. Sakuna Sim — typhoon scenario tabletop
- **Problem:** There is no scenario simulation, and drills run on paper.
- **What it does:** Pick a surge level and flood return period to see affected barangays, exposed schools and hospitals, and which evacuation centers would overflow, with a T-24h → landfall → recovery stepper.
- **MVP:** Scenario picker · affected overlay · impact tallies · timeline stepper
- **Wow:** Scrubbable GSAP timeline
- **Stack:** core + MapLibre, Turf, GSAP

### 6. Damage Snap — offline-first rapid damage assessment ★AI
- **Problem:** Field assessment must work without signal, and paper forms get re-encoded later.
- **What it does:** An installable PWA that captures a geotagged photo, damage category, and households affected. Entries queue offline and sync later, and a dashboard aggregates them by barangay.
- **MVP:** GPS capture form · offline queue · aggregate map and tally
- **Wow:** Animated sync state; deck.gl heatmap
- **★AI:** In-browser photo classification suggests a damage severity
- **Stack:** core + vite-plugin-pwa, MapLibre, deck.gl
- **Risk:** PWA and offline behaviour are fiddly. Rehearse the offline toggle.

## B — Service delivery

### 7. Pila — digital queue & appointments
- **Problem:** No appointments or digital queue, and the existing walk-in queue screen was broken.
- **What it does:** Citizens book a slot or take a QR ticket. A big-screen "Now Serving" display runs alongside a counter console with "call next".
- **MVP:** Ticket and booking · display · counter console · wait estimate
- **Wow:** GSAP split-flap number flip, with three windows synced live
- **Stack:** core + qrcode, GSAP, BroadcastChannel
- **Note:** The most universally understood demo, and also the idea other teams are most likely to build.

### 8. Sertipiko — barangay certificate request & tracker
- **Problem:** Residents can't see where a request stands, and fees are paid at the hall on claim.
- **What it does:** Online requests for clearance, indigency, and residency; a status timeline; a printable certificate; a QR verification page.
- **Wow:** Timeline progress; GSAP "stamp" effect
- **Stack:** core + qrcode, GSAP
- **Note:** Lower innovation, since LGU Portal Pro already does this. Pick it only with a sharp new angle.

### 9. Negosyo Navigator — business-permit wizard & fee estimator
- **Problem:** Applicants learn which clearances, documents, and fees apply only at the counter.
- **What it does:** Five questions (type, location, size) produce a personalised requirements checklist, an estimated fee breakdown, the steps and timeline, and a zoning check on the map.
- **MVP:** Branching wizard · fee estimate · printable checklist · zoning check
- **Wow:** Motion step transitions; animated fee breakdown
- **Stack:** core + Motion, MapLibre, Turf
- **Edge:** Deep eBOSS experience. Re-enter its fee rules as config; don't copy code.

### 10. Reklamo — public complaints & business-violation lookup ★AI
- **Problem:** Only staff can file complaints against businesses, and citizens can't check a business's violations or permit status.
- **What it does:** A public complaint form with photo evidence that issues a tracking number, a status page, a business lookup, and a complaint cluster map.
- **★AI:** In-browser auto-categorisation of complaint text
- **Stack:** core + MapLibre, Motion

## C — Transparency & participation

### 11. Bayanihan Budget — participatory budgeting
- **What it does:** Proposed barangay projects are pinned on a map with their costs. Residents allocate a virtual budget and vote, and results animate live.
- **Wow:** Budget "bucket" fill; results race chart
- **Stack:** core + MapLibre, GSAP, Recharts

### 12. Proyekto Watch — infrastructure project tracker
- **What it does:** A map of projects showing budget, % complete, and contractor, with a before/after photo slider and a citizen issue flag.
- **Wow:** GSAP before/after wipe; progress rings
- **Stack:** core + MapLibre, GSAP

### 13. Bukas Datos — scrollytelling open-data story
- **Problem:** Authoritative data is locked in technical formats.
- **What it does:** A "Catbalogan in Data" scroll story covering land-cover change 2010→2020, who lives in hazard zones, and facility coverage. The map changes as you scroll.
- **Wow:** Lenis + GSAP ScrollTrigger pinned map. The most "designed" option, and it doubles as the poster.
- **Stack:** core + GSAP, Lenis, MapLibre
- **Prep:** Write the chapter copy and simplify the land-cover data before the event.

## D — Environment

### 14. Basura Alert — waste collection & segregation guide
- **Problem:** The existing "today's collection" lookup returned nothing every day, and the public facility list hid a real MRF.
- **What it does:** Pick your barangay to see pickup days, a next-pickup countdown, and the nearest MRF on a map, plus a drag-and-drop "where does this go?" segregation game.
- **Stack:** core + Motion, MapLibre

### 15. Bakhaw Watch — mangrove & coastal change explorer
- **What it does:** A swipe-compare map of coastal resources in 2015 vs 2020, with per-barangay gain and loss and a "mangroves vs storm surge" explainer.
- **Stack:** core + MapLibre, GSAP
- **Data:** NAMRIA coastal 2015/2020 (needs simplification)

## E — Heritage & tourism (the event theme)

### 16. Libot Catbalogan — heritage & eco-tourism trail
- **Problem:** Tourism runs manually or through foreign platforms, and tourists can't check hazards at a destination.
- **What it does:** Interactive story cards for Catbalogan's eco-tourism and heritage sites, curated walking trails, and a hazard-aware "safe to visit" badge on each site.
- **MVP:** Site map and story cards · trail route · hazard badge · shareable trail
- **Wow:** GSAP self-drawing trail line; a scroll story per site
- **Stack:** core + MapLibre, Turf, GSAP, Lenis
- **Data:** Catbalogan eco-tourism and heritage KML points · CPDCO heritage and scenic overlay zones · hazards
- **Edge:** Answers the RSCENE 2026 theme directly, joining heritage to innovation through the hazard layer.

### 17. Banig — woven-heritage virtual gallery
- **What it does:** A gallery of Samar craft heritage (Basey banig weaving) where stories are "woven" together, plus an interactive banig pattern maker that exports a shareable image.
- **Wow:** three.js woven-strand transitions; generative pattern art
- **Stack:** core + three, @react-three/fiber, GSAP, Canvas API
- **Risk:** Photos and stories must be gathered beforehand. The strongest theme match, with the weakest civic-impact story.

## F — Social protection & barangay

### 18. Kalinga — vulnerable-resident evacuation priority
- **Problem:** Risk is modelled as purely physical. Seniors, PWDs, pregnant women, and solo parents in hazard zones must be moved first, but they sit in separate registries.
- **What it does:** Overlays vulnerable households on hazard zones, generates a ranked priority evacuation list, assigns it to tanods, and lets them check people off as they're moved.
- **MVP:** Household layer and hazard overlay · ranked list · assignment and check-off · summary
- **Wow:** The map pulses on priority households; a Motion list re-sorts as people are moved
- **Stack:** core + MapLibre, Turf, Motion
- **Data:** **Synthetic households only, never real residents.** The schema follows LGU Portal Pro's senior, PWD, and solo-parent registries. With LGU permission, barangay-level CBMS aggregates (age structure, housing materials) can drive the barangay ranking; households stay synthetic either way.
- **Edge:** The strongest human-impact pitch.

### 19. Ayuda Tracker — QR relief distribution
- **Problem:** Relief claims are tracked on paper, so double-claims and gaps go unnoticed.
- **What it does:** Households get QR codes. Volunteers scan with a webcam, duplicate claims are blocked, and a dashboard reports by barangay and evacuation center.
- **Stack:** core + qrcode, html5-qrcode, Recharts
- **Risk:** Test webcam scanning on the actual demo laptop.

## G — Access & inclusion

### 20. Sumat — multilingual citizen service guide ★AI
- **Problem:** No Waray/Filipino/English localisation, which is a government mandate, and public forms lack accessibility basics.
- **What it does:** A plain-language search ("I need a cedula") returns the matching Citizen's Charter service with its steps, requirements, office, fee, and processing time. It's available in three languages, meets WCAG AA, and has a large-text, read-aloud mode (Web Speech API).
- **★AI:** In-browser semantic search, so everyday phrasing finds the right service
- **Stack:** core + fuse.js, Motion

---

## Shortlist — recommendation

| Rank | Proposal | Why |
|---|---|---|
| **1** | **Ligtas Ba Ako? (#1)** | Highest feasibility × relevance. A documented need, answered with host-city data no other team will have. Clear two-minute demo. |
| **2** | **Libot Catbalogan (#16)** | Directly answers the event theme. Real Catbalogan heritage data and a beautiful poster, kept practical by the hazard badge. |
| **3** | **Kalinga (#18)** | The strongest impact story. Combines social-protection and DRRM domain depth. |
| Wild card | **Tubig (#2)** | Only if three.js must be the star, and only with a heightmap baked in advance. |

**All three shortlisted proposals share one data foundation**: Catbalogan barangays, hazards, and facilities. Preparing it once keeps every option open, so the final pick can wait until the data is ready.

---

## Integrated platforms (P1–P10)

Proposals #1–#20 each solve one problem. These ten group related services into one platform: a shared data spine, several role-based views, and a single workflow that runs across them. A platform shows "clear workflows and user interfaces" — the competition's own wording for the app deliverable — better than a single screen can. It also carries more risk.

**Five rules make a platform four-hour feasible:**
1. **One spine.** Every module reads and writes the same store (Zustand), keyed by barangay. Modules are views of it, not separate apps.
2. **No more than three core modules.** Everything else is *stretch*, and gets built only if the core is working by T+2:00.
3. **The demo is one workflow across roles** — for example CDRRMO → resident → evacuation-center staff. Any module that doesn't appear in that workflow is cut.
4. **The spine exists before the event.** Data conversion, the store shape and the map component are ready on October 7; the four hours go to the modules.
5. **The first core module stands alone.** If time runs out, it is still a complete single-feature entry. The platform degrades into one of #1–#20 instead of failing.

### At a glance

| # | Platform | Groups | Roles in the demo | Data | 4-h feasibility | Originality |
|---|---|---|---|---|---|---|
| P1 | **Andam Catbalogan** | #1 #3 #4 #5 | CDRRMO · resident · evacuation staff | 🟢 | Med–High | Medium |
| P2 | **Bayanihan Response** | #6 #19 + incident reporting | Resident · CDRRMO · relief volunteer · public | 🟢 + synthetic | Medium | Medium |
| P3 | **Kalinga Catbalogan** | #18 + vulnerability profile + referrals | CSWDO · BDRRMC · tanod/BHW | 🟡 or synthetic | Med–High | High |
| P4 | **Isla Link** | new (+ #3 #19) | Island barangay · CDRRMO / port | 🟢 + synthetic | High | Very high |
| P5 | **Serbisyo Catbalogan** | #7 #8 #20 | Resident · frontline staff · display board | 🟢 | High | Low–Med |
| P6 | **Negosyo Catbalogan** | #7 #9 #10 | Applicant · BPLO · public | 🟢 | Med–High | High |
| P7 | **Bukas Catbalogan** | #11 #12 #13 | Resident · planning office | 🟢 + synthetic | Medium | Medium |
| P8 | **Libot Catbalogan+** | #16 #17 + enterprise directory | Visitor · local enterprise | 🟡 or own photos | Medium | High (theme) |
| P9 | **Luntian Catbalogan** | #2 #14 #15 | Resident · ENRO / planner | 🟢 / 🟡 | Medium | Medium |
| P10 | **Barangay 360** | #4 #8 #12 + barangay profile | Punong Barangay · resident | 🟡 or synthetic | Med–High | Medium |

### P1. Andam Catbalogan — community preparedness platform
- **Groups:** #1 Ligtas Ba Ako?, #3 Likas, #4 Bantay Barangay, #5 Sakuna Sim
- **Workflow:**
  1. CDRRMO raises a scenario ("Signal No. 3, storm surge SSA2").
  2. Affected barangays and evacuation centers light up.
  3. A resident checks their location and gets their nearest open center.
  4. Center staff update headcounts, and the public board fills live.
- **Core:** hazard lookup (resident) · scenario switch (CDRRMO) · evacuation finder + capacity board
- **Stretch:** plain-language barangay risk explainer ("why is my barangay at risk?")
- **Spine:** barangay × hazard matrix, facilities, active scenario state, shared across windows with BroadcastChannel
- **Data:** 🟢 HDX boundaries, UP NOAH hazards, OSM schools and health facilities · 🟡 CDRRMO evacuation-center list if permitted
- **Signature:** three synced windows — the CDRRMO console, a resident's phone view, the public board
- **Why it scores:** it answers documented gaps from both the LGU portal (the "Am I Safe?" failure, no routing) and GPDSS (plain-language explanations, evacuation capacity)
- **Note:** this sits closest to HABAGAT's territory. Tell Paculaba before you build it.

### P2. Bayanihan Response — report-to-relief lifecycle
- **Groups:** #6 Damage Snap, #19 Ayuda Tracker, plus geocoded incident reporting and relief transparency
- **Workflow:**
  1. A resident or field officer files a geotagged report, which works offline.
  2. The CDRRMO triage board verifies and assigns it.
  3. Relief is distributed by QR, with a duplicate guard.
  4. A public dashboard shows what reached which barangay.
- **Core:** report form with offline queue · triage board · QR distribution
- **Stretch:** public transparency view
- **Spine:** incidents, synthetic household QR codes, and distributions, all keyed by barangay
- **Data:** 🟢 boundaries; synthetic households and reports
- **Why it scores:** GPDSS has only 35 incidents on record in 12 years and its roadmap asks for exactly this workflow; the LGU portal flags offline field work

### P3. Kalinga Catbalogan — vulnerability-aware social protection
- **Groups:** #18 Kalinga, a barangay vulnerability profile, and program referrals
- **Workflow:**
  1. The CSWDO or BDRRMC sees barangays ranked by vulnerability: light-material housing in surge zones, seniors, young children.
  2. It generates a pre-emptive evacuation priority list.
  3. Tanods and BHWs check households off as they move.
  4. Families are referred to programs.
- **Core:** vulnerability profile and ranking · priority list with check-off
- **Stretch:** program referral directory
- **Spine:** barangay profile (age structure, housing materials, services) × hazards; a synthetic household registry
- **Data:** 🟡 CBMS barangay aggregates with LGU permission · 🟢 synthetic fallback shaped like CBMS · suppress cells under 5
- **Signature:** a housing-materials time-lapse from 2013 (pre-Haiyan) to 2022 to 2024
- **Why it scores:** CSWDO appears nowhere in GPDSS, and the LGU portal's own gap list says risk is modelled as purely physical

### P4. Isla Link — island-barangay connectivity & resilience
- **Groups:** new; borrows from #3 and #19
- **Workflow:**
  1. Each island barangay posts its daily status and needs: water, rice, medicine, patients needing transport.
  2. The mainland CDRRMO or port office watches a needs board.
  3. A sea-travel advisory follows the tropical-cyclone signal.
  4. A boat or relief run is dispatched and logged.
- **Core:** island-cluster map with status board · needs requests · sea-travel advisory
- **Stretch:** boat dispatch log
- **Spine:** the 11 island barangays in three clusters, needs, advisories
- **Data:** 🟢 boundaries; PAGASA public cyclone signals; synthetic needs and trips
- **Signature:** island clusters pulse by urgency, and a sea lane draws itself when a trip is dispatched
- **Why it scores:** GPDSS found these barangays spatially isolated and lists maritime connectivity as unbuilt future work. No other team is likely to think of it, and it is unmistakably Catbalogan.

### P5. Serbisyo Catbalogan — one-stop citizen services
- **Groups:** #7 Pila, #8 Sertipiko, #20 Sumat
- **Workflow:**
  1. A resident finds a service by describing it in Waray, Filipino or English.
  2. They submit a request and get a queue ticket or appointment.
  3. They track its status.
  4. They claim it with QR verification. Staff use a console with a "Now Serving" board.
- **Core:** service finder · request + ticket · staff console with display board
- **Stretch:** QR verification page
- **Data:** 🟢 the Citizen's Charter (a public document)
- **Why it scores:** the most universally understood workflow; the Waray interface is the differentiator

### P6. Negosyo Catbalogan — hazard-aware business hub
- **Groups:** #9 Negosyo Navigator, #10 Reklamo, #7 Pila
- **Workflow:**
  1. A prospective owner answers the wizard and gets requirements plus a fee estimate.
  2. They drop a pin for the business location and get a hazard and zoning check: "this lot is in a storm-surge zone — here's what that means."
  3. They book an appointment.
  4. The public sees a business registry with complaint lookup.
- **Core:** wizard + fee estimate · location hazard check · appointment booking
- **Stretch:** public registry and complaints
- **Data:** 🟢 NOAH hazards and boundaries; fee rules re-entered as config from your eBOSS knowledge
- **Why it scores:** it joins your two deepest domains, eBOSS and DRRM, into something neither system does today: risk-aware business siting

### P7. Bukas Catbalogan — transparency & participation
- **Groups:** #11 Bayanihan Budget, #12 Proyekto Watch, #13 Bukas Datos
- **Workflow:**
  1. A scroll story explains the city's data.
  2. A projects map shows what is being built.
  3. Residents allocate a virtual budget and vote.
  4. They leave feedback.
- **Core:** scroll story · projects map · budget vote
- **Stretch:** feedback
- **Data:** 🟢 public Full Disclosure Policy documents; synthetic projects · 🟡 CEEPUO project photos
- **Why it scores:** the most visually designed option, and the story section doubles as the poster

### P8. Libot Catbalogan+ — heritage, tourism & local economy
- **Groups:** #16 Libot, #17 Banig, plus a local-enterprise directory and travel advisory
- **Workflow:**
  1. A visitor explores the heritage story map and builds a trail.
  2. They get a "safe to visit today" advisory.
  3. They find local guides and pasalubong shops.
  4. They make a banig-pattern souvenir card to share.
- **Core:** heritage story map + trail · hazard advisory · enterprise directory
- **Stretch:** banig pattern maker
- **Data:** 🟡 CPDCO heritage and eco-tourism KML and photos · 🟢 OSM points of interest, NOAH hazards, your own photos
- **Why it scores:** it hits the event theme dead-centre — *Weaving the Threads of Innovation and Heritage*

### P9. Luntian Catbalogan — environment & climate action
- **Groups:** #2 Tubig (2D version), #14 Basura Alert, #15 Bakhaw Watch
- **Workflow:**
  1. Residents check waste schedules and play the segregation game.
  2. They report environmental violations.
  3. Planners view mangrove change and sea-level-rise exposure by barangay.
- **Core:** waste schedule + game · violation report · sea-level-rise exposure view
- **Stretch:** mangrove change
- **Data:** 🟢 NOAH storm surge · 🟡 NAMRIA coastal resources and sea-level-rise inundation (check for public Geoportal equivalents)

### P10. Barangay 360 — barangay officials' cockpit
- **Groups:** #4, #8, #12, plus a barangay profile
- **Workflow:**
  1. A Punong Barangay opens their barangay and sees its profile: population, age structure, housing and services trends from 2022 to 2024.
  2. They see hazard exposure, open requests and projects.
  3. They post an announcement, which residents see on their side.
- **Core:** profile + trends · hazard exposure · announcements
- **Stretch:** requests and projects
- **Data:** 🟡 CBMS aggregates with permission · 🟢 synthetic fallback
- **Why it scores:** turns each of the 57 barangays' data into one screen; GPDSS has a public "Know-Your-Barangay" page but nothing for barangay officials

### Platform shortlist

| Rank | Platform | Why |
|---|---|---|
| **1** | **P1 Andam Catbalogan** | It turns the strongest single-feature ideas into one cross-role workflow and runs entirely on 🟢 open data. Its first module *is* #1 Ligtas Ba Ako?, so it degrades safely. |
| **2** | **P4 Isla Link** | The most original idea on the list: small, feasible, and unmistakably Catbalogan. |
| **3** | **P3 Kalinga Catbalogan** | The strongest story if the LGU approves the CBMS aggregates — housing resilience since the 2013 pre-Haiyan baseline, plus a CSWDO angle nobody has built. |

---

## Tech stack

Pin the latest versions at install time, and verify with a real install and production build.

**Core:** Vite · React 19 · TypeScript · Tailwind CSS v4 (`@tailwindcss/vite`) · shadcn/ui + lucide-react · React Router · Zustand (localStorage persist) · react-hook-form + zod · TanStack Table

**Motion & 3D:**

| Library | Use for | Not for |
|---|---|---|
| `motion` (motion/react) | Component state, hover/tap, layout reorders, modals, page transitions | Long scroll timelines |
| `gsap` + `@gsap/react`, ScrollTrigger, SplitText | Hero sequences, scroll storytelling, text reveals, count-ups, timeline scrubbing | Any element Motion already animates — never both on one element |
| `lenis` | Smooth scroll, paired with ScrollTrigger | App and dashboard screens |
| `three` + `@react-three/fiber` + `@react-three/drei` | 3D terrain, flood and elevation visualisation | Decorative 3D — the biggest time sink |

**Maps & GIS:** MapLibre GL JS via `react-map-gl/maplibre` (no API token; 3D extrusion and terrain) · `deck.gl` (heatmaps, hexbins) · `@turf/turf` (point-in-polygon, nearest facility, buffers, with no backend) · `mapshaper` via `npx` for pre-event simplification and reprojection

**Data viz:** Recharts for speed · Apache ECharts when charts need rich animation

**Utilities:** `qrcode` / `html5-qrcode` · `fuse.js` · `vite-plugin-pwa` · BroadcastChannel API (syncs several windows on one laptop, useful for a local-only demo with a separate display screen)

**Time-risk rule:** Motion and GSAP polish is cheap and high-return. three.js earns its cost only where 3D carries meaning.

---

## Design skills

| Need | Covered by |
|---|---|
| Motion for React | ECC `motion-ui`, `motion-foundations`, `motion-patterns`, `motion-advanced` |
| Frontend direction & polish | ECC `frontend-design-direction`, `make-interfaces-feel-better`, `design-system`, `taste` |
| GSAP | Project skill `gsap-motion` (`.claude/skills/gsap-motion/`) |
| three.js / React Three Fiber | Project skill `r3f-scenes` (`.claude/skills/r3f-scenes/`) |
| Design critique, accessibility review, UX copy | Anthropic **Design** plugin |

---

## Prep calendar

| Date | Work |
|---|---|
| Oct 2–3 | Pick the proposal or platform. Send permission requests: Paculaba for anything touching GPDSS or HABAGAT; the LGU (CDRRMO, CPDCO, CBMS office) for 🟡 data. Convert and simplify the 🟢 open-data foundation. |
| Oct 4–5 | Build the scaffold. Run one full four-hour **dry run**, including the poster and demo. |
| Oct 6 | Freeze. Re-verify the build offline. Print the runbook. |
| Oct 7 | Compete. |

**Open question:** Is the project topic self-chosen, or will a theme or problem be announced on the day? If self-chosen, prepare one proposal deeply. If announced, keep the shared data foundation and the shortlist warm.
