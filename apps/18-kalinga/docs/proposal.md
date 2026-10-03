# Proposal 18. Kalinga — vulnerable-resident evacuation priority

_The original one-paragraph pitch for this app (proposal 18 of 20). The approved spec is `docs/brief.md`; where they differ, the brief wins._

- **Problem:** Risk is modelled as purely physical. Seniors, PWDs, pregnant women, and solo parents in hazard zones must be moved first, but they sit in separate registries.
- **What it does:** Overlays vulnerable households on hazard zones, generates a ranked priority evacuation list, assigns it to tanods, and lets them check people off as they're moved.
- **MVP:** Household layer and hazard overlay · ranked list · assignment and check-off · summary
- **Wow:** The map pulses on priority households; a Motion list re-sorts as people are moved
- **Stack:** core + MapLibre, Turf, Motion
- **Data:** **Synthetic households only, never real residents.** The schema follows LGU Portal Pro's senior, PWD, and solo-parent registries. With LGU permission, barangay-level CBMS aggregates (age structure, housing materials) can drive the barangay ranking; households stay synthetic either way.
- **Edge:** The strongest human-impact pitch.
