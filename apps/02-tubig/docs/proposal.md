# Proposal 2. Tubig — 3D flood & sea-level-rise simulator

_The original one-paragraph pitch for this app (proposal 2 of 20). The approved spec is `docs/brief.md`; where they differ, the brief wins._

- **Problem:** Inundation and surge polygons are abstract to non-specialists, so councils plan without feeling the scale.
- **What it does:** 3D coastal terrain with a water-level slider (0.5→4.5 m sea-level rise; SSA1–4 storm surge). Exposed facilities and barangays light up and tally live.
- **MVP:** Terrain · water plane and slider · exposed-facility counter · three preset scenarios
- **Wow:** R3F terrain with an animated water surface; GSAP camera moves between scenarios
- **Stack:** core + three, @react-three/fiber, @react-three/drei, GSAP
- **Data:** NAMRIA inundation and surge. Real elevation exists **only for Calbayog**. Catbalogan needs a heightmap baked in advance or public DEM tiles, which depend on the internet.
- **Risk:** The three.js showpiece, and the proposal most likely to blow the clock. Attempt it only if the heightmap is baked before October 7.
