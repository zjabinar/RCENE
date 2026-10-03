# Proposal 1. Ligtas Ba Ako? — address-level "Am I safe?" check

_The original one-paragraph pitch for this app (proposal 1 of 20). The approved spec is `docs/brief.md`; where they differ, the brief wins._

- **Problem:** Hazard data exists, but residents and tourists can't check whether a place is in a flood zone. The need is proven, and so is the need for an answer that can be trusted.
- **What it does:** Tap the map or search a barangay to get a plain-language hazard card (flood 5/25/100-yr, landslide, storm surge, liquefaction), the nearest evacuation center and hospital with distances, and a "what to do now" checklist, in Waray, Filipino, or English.
- **MVP:** Turf point-in-polygon lookup · animated risk card · nearest-facility search · language toggle
- **Wow:** MapLibre fly-to with GSAP staggered hazard chips and a severity gauge
- **Stack:** core + MapLibre, Turf, GSAP
- **Data:** Catbalogan barangays · NOAH layers (pre-simplified) · critical facilities
