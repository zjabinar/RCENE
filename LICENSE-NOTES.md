# License and Usage Notes

Before adding third-party libraries, templates, images, fonts, icons, datasets or code to the entry, check their licences and attribution requirements. Do not use copyrighted images or datasets without permission.

Prefer: your own assets, permissively licensed assets, official public-domain or open-data sources.

## 2026-10-06 — kit merged with the RCENE starter

- **Code.** The app and `rcene/` come from the builder's own RCENE monorepo (`C:\RSCENE`). Dependencies are open-source npm packages pinned in `package.json`; their licences travel with them in `node_modules`.
- **Fonts and icons** are bundled, not loaded from a CDN: Inter, Fraunces, Exo 2 (via Fontsource, SIL Open Font License) and `lucide-react` icons (ISC).
- **Map data.** Boundaries and barangays: OCHA / HDX. Facilities: © OpenStreetMap contributors, ODbL. Hazard maps from CDRRMO/CPDCO are used with permission only and are not redistributed beyond this entry. Until real layers are copied into `data/files/`, the app uses the fake fixtures in `data/fixtures/` (labelled "Sample"). Every shipped layer's attribution is listed in `data/files/sources.json` and shown on `/sources` and the poster.
- **Synthetic data** is generated from fixed seeds, uses codes (`REC-0001`, `BRGY-01`) and contains no personal data.
- **AI.** API keys are never committed: they live only in `.env.local` (git-ignored, never `VITE_`-prefixed) and are used by the local relay at `/api/ai/*`. AI output is a suggestion a person confirms. AI use in building the entry is disclosed in `docs/DISCLOSURE.md` and logged in `AI-LOG.md`.
