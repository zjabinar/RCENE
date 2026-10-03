# Proposal P3. Kalinga Catbalogan — vulnerability-aware social protection

_The original pitch for this platform (P3 of P1–P10). The approved spec is `docs/brief.md`; where they differ, the brief wins._

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
- **Why it scores:** the LGU portal's own gap list says risk is modelled as purely physical; this adds who lives in the hazard zones (seniors, young children, light-material housing) and gives the CSWDO a role in pre-emptive evacuation
