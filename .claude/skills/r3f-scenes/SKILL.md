---
name: r3f-scenes
description: three.js 3D for this project via React Three Fiber and drei — real terrain from a DEM-derived heightmap PNG, an adjustable water-level plane for flood and sea-level-rise scenes, camera presets, exposure counting, loading states, and a performance budget for a laptop demo. Use this whenever the work involves three.js, @react-three/fiber, @react-three/drei, a <Canvas>, 3D terrain or elevation, flood/storm-surge/inundation visualisation, or any "make it 3D" request — and especially before starting 3D work, to decide whether 3D is worth it under the four-hour clock.
---

# three.js scenes with React Three Fiber

This app is built solo in four hours. 3D is the most expensive kind of polish there is: a small mistake can produce a black canvas with no error message. Read the first section before writing any 3D code.

## First: is 3D worth it here?

3D earns its place when **depth is the information**: terrain, flood depth, how far water reaches inland. It does not earn its place as decoration. A spinning globe or floating logo costs the same hour and scores nothing on functionality.

Cheaper options to consider first:
- **MapLibre "3D-lite":** set map `pitch`/`bearing` and add a `fill-extrusion` layer that extrudes barangays or buildings by a value (risk score, population). It takes minutes, uses data already in the app, and reads as 3D to judges.
- **2D + animation:** a flood layer that fades in step by step with GSAP often says more than a 3D scene.

**Time-box:** if terrain and water aren't rendering correctly 45 minutes after you start, stop and ship the MapLibre version. Decide this in advance so you don't have to decide it under pressure.

## Libraries

Nothing to install: every app's `package.json` already has `three`, `@react-three/fiber` 9, `@react-three/drei` and `@types/three` (exact pins). `@react-three/fiber@9` pairs with React 19 (v8 is for React 18); don't change either version.

## Data prep — do this before the event, never on the day

The terrain comes from a DEM (digital elevation model) GeoTIFF, converted to a grayscale PNG where black is the lowest point and white the highest. GDAL does this, and QGIS's OSGeo4W Shell includes it:

```bash
# 1. Reproject to WGS84 so the terrain lines up with the GeoJSON layers
gdalwarp -t_srs EPSG:4326 -r bilinear dtm.tif dtm_4326.tif

# 2. Read the elevation range and corner coordinates (write them down)
gdalinfo -mm dtm_4326.tif

# 3. Scale elevations to 0–255 and downsample to a sane size (0 keeps the aspect ratio)
gdal_translate -of PNG -ot Byte -scale <minElev> <maxElev> 0 255 -outsize 1024 0 dtm_4326.tif heightmap-catbalogan.png
```

### The heightmap contract (brief 02)

Two files, served at `/data/` like every layer:

- `/data/heightmap-catbalogan.png`: 8-bit grayscale, ≤ 1024 px on the long edge, EPSG:4326, black = `minElev`, white = `maxElev`.
- `/data/heightmap-catbalogan.json`:

```json
{ "image": "heightmap-catbalogan.png", "bounds": [124.86, 11.74, 124.93, 11.82], "minElev": 0, "maxElev": 412, "source": "Copernicus GLO-30 DEM", "tier": "open" }
```

`bounds` is `[west, south, east, north]` from `gdalinfo`. The values above are placeholders, not real Catbalogan extents. `source` and `tier` feed the terrain badge and `/sources`.

Where the files live: the data session writes them to the monorepo's root `data/files/`, and `pnpm sync-data` copies them into every app's `data/files/`. On a project branch this app's `data/` is read-only. In a standalone copy you may drop the two files into `data/files/` yourself. They are not in `LAYER_FILES`: load the JSON with `useOptionalLayer` (below) and request the PNG only once the JSON is ready. Never probe for either with `useLayer` or a bare `fetch`.

**Precompute per-feature elevation too.** In QGIS, run *Processing → Sample raster values* on the facilities layer against the DEM to add an `elev_m` property. Exposure then becomes a simple comparison at runtime instead of reading texture pixels in the browser.

**Which DEM:** in the local archive, only Calbayog has real elevation (DSM/DTM, UTM 51N). For Catbalogan, download a free public DEM (such as Copernicus GLO-30) before the event and run the same three commands.

## Geography → scene coordinates

Keep one helper so the terrain, water, and markers always agree on scale:

```ts
// src/three/frame.ts
export type TerrainMeta = { bounds: [number, number, number, number]; minElev: number; maxElev: number };

export function terrainFrame(t: TerrainMeta, size = 10, exaggeration = 3) {
  const [w, s, e, n] = t.bounds;
  const midLat = ((s + n) / 2) * (Math.PI / 180);
  const widthM = (e - w) * 111_320 * Math.cos(midLat);
  const depthM = (n - s) * 110_540;
  const mPerUnit = widthM / size; // metres per scene unit
  const vScale = exaggeration / mPerUnit; // scene units per metre of elevation

  return {
    width: size,
    depth: depthM / mPerUnit,
    vScale,
    elevToY: (elevM: number) => (elevM - t.minElev) * vScale,
    toScene: (lon: number, lat: number, elevM = t.minElev) =>
      [
        ((lon - w) / (e - w) - 0.5) * size,
        (elevM - t.minElev) * vScale,
        (0.5 - (lat - s) / (n - s)) * (depthM / mPerUnit),
      ] as const,
  };
}
```

Real terrain looks flat at true scale. `exaggeration = 3` makes hills readable; say so on the poster ("vertical exaggeration ×3").

## Load the heightmap, or fall back to stylised terrain

`useOptionalLayer(file, schema)` from `@rcene/data` reads `/data/manifest.json` first. When the file isn't listed it returns `absent` **without a request**, so a missing heightmap never prints a 404 (which would fail the smoke test). Its states are `loading`, `absent` (not shipped), `invalid` (shipped, but unreadable or failing the schema) and `ready`; treat `absent` and `invalid` alike, as "no heightmap".

```tsx
// src/three/terrain-source.ts
import { z } from "zod";
export const HEIGHTMAP = "heightmap-catbalogan.json"; // the one place to change if the data session ships other names
export const heightmapMeta = z.object({
  image: z.string(),
  bounds: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  minElev: z.number(),
  maxElev: z.number(),
  source: z.string(),
  tier: z.enum(["open", "permission"]),
});
export type HeightmapMeta = z.infer<typeof heightmapMeta>;
```

```tsx
import { useOptionalLayer } from "@rcene/data";
import { LoadingState } from "@rcene/ui";
import { HEIGHTMAP, heightmapMeta } from "@/three/terrain-source.ts";

export function TerrainView({ levelM }: { levelM: number }) {
  const meta = useOptionalLayer(HEIGHTMAP, heightmapMeta);
  if (meta.status === "loading") return <LoadingState />;
  return meta.status === "ready"
    ? <FloodScene meta={meta.data} levelM={levelM} />   // badge: "Elevation: {source} · vertical exaggeration ×3"
    : <StylisedFloodScene levelM={levelM} />;           // badge: "Stylised terrain — generated from the city outline, not real elevation"
}
```

**No heightmap is the normal case** (the only real elevation in the archive is Calbayog's). The stylised fallback builds a height grid from the city outline (distance to the sea plus seeded noise from `createRng`; brief 02 gives the exact functions) and is **always labelled** on screen. Never present it as real elevation, and never let counts depend on it.

To keep one pipeline for both sources, turn either one into a `Float32Array` height grid (the real PNG via `createImageBitmap` → canvas → `getImageData`, red channel, 0 → `minElev`, 255 → `maxElev`) and displace the plane's vertices from it:

```ts
// Row-major grid, w × h, north row first. Call once per grid, then render the geometry.
export function applyHeights(geo: THREE.PlaneGeometry, grid: Float32Array, w: number, h: number, toY: (m: number) => number) {
  const pos = geo.attributes.position;
  const sx = geo.parameters.widthSegments + 1;
  const sy = geo.parameters.heightSegments + 1;
  for (let j = 0; j < sy; j++) {
    for (let i = 0; i < sx; i++) {
      const gx = Math.round((i / (sx - 1)) * (w - 1));
      const gy = Math.round((j / (sy - 1)) * (h - 1));
      pos.setZ(j * sx + i, toY(grid[gy * w + gx]!)); // local z becomes world y after rotation-x = -π/2
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}
```

The `displacementMap` version under **Terrain** is the shortest path when only the real PNG matters; the grid version is what brief 02 asks for.

## Scene skeleton

```tsx
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { CameraControls, Loader } from "@react-three/drei";
import type { HeightmapMeta } from "@/three/terrain-source.ts";

export function FloodScene({ meta, levelM }: { meta: HeightmapMeta; levelM: number }) {
  const frame = terrainFrame(meta);
  return (
    <div className="relative h-[70vh]">
      <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 7, 9], fov: 45 }}>
        <color attach="background" args={["#0b1220"]} />
        <hemisphereLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />
        <Suspense fallback={null}>
          <Terrain meta={meta} frame={frame} />
          <Water levelM={levelM} frame={frame} />
        </Suspense>
        <CameraControls makeDefault maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
      <Loader />
    </div>
  );
}
```

- Memoize `frame` (`useMemo`) if the parent re-renders often; `meta` is stable once loaded.
- `<Suspense>` is required because `useTexture` suspends while the heightmap loads. `<Loader />` sits *outside* the Canvas and shows load progress.
- The Canvas fills its parent, so give the parent a height. A parent with zero height is the most common cause of "nothing renders".

## Terrain

```tsx
import { useTexture } from "@react-three/drei";
import type { HeightmapMeta } from "@/three/terrain-source.ts";
import type { terrainFrame } from "@/three/frame.ts";

type Frame = ReturnType<typeof terrainFrame>;

export function Terrain({ meta, frame }: { meta: HeightmapMeta; frame: Frame }) {
  const height = useTexture(`/data/${meta.image}`); // requested only after the JSON said it exists
  return (
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[frame.width, frame.depth, 256, 256]} />
      <meshStandardMaterial
        color="#5f8a6a"
        displacementMap={height}
        displacementScale={(meta.maxElev - meta.minElev) * frame.vScale}
      />
    </mesh>
  );
}
```

- **The segment count (256, 256) is what makes terrain possible.** A plane with the default single segment has four vertices and cannot displace. If the terrain is flat, check this first, then `displacementScale`.
- Rotating `-Math.PI / 2` on X lays the plane flat with north toward −Z, which matches `toScene`.
- Leave the heightmap texture's color space at its default. Displacement must read raw values. Only set `SRGBColorSpace` on color textures such as satellite imagery.

## Water level

Tween the water with GSAP and call `invalidate` each frame. In `frameloop="demand"` mode, R3F only renders when asked:

```tsx
import { useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gsap, useGSAP } from "@rcene/ui/motion";
import type { terrainFrame } from "@/three/frame.ts";

export function Water({ levelM, frame }: { levelM: number; frame: ReturnType<typeof terrainFrame> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);

  useGSAP(
    () => {
      if (!mesh.current) return;
      gsap.to(mesh.current.position, {
        y: frame.elevToY(levelM),
        duration: 0.8,
        ease: "power2.out",
        onUpdate: invalidate,
      });
    },
    { dependencies: [levelM] },
  );

  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[frame.width, frame.depth]} />
      <meshStandardMaterial color="#2f7fd6" transparent opacity={0.55} />
    </mesh>
  );
}
```

Don't also pass `position-y` as a prop. React would reset the position on every re-render and fight the tween. The water starts at y = 0 and rises into place on mount, which doubles as a nice intro.

## Exposure count

With `elev_m` precomputed, exposure is a filter. Render the number in normal DOM outside the Canvas, where it's cheaper and sharper than 3D text:

```ts
const exposed = facilities.features.filter((f) => f.properties.elev_m <= levelM);
```

Pair it with the GSAP count-up recipe from the `gsap-motion` skill.

## Camera presets

drei's `CameraControls` has smooth transitions built in, so no GSAP is needed. Hold it in a ref created *outside* the Canvas, so ordinary DOM buttons can drive it:

```tsx
import { useRef, type ComponentRef } from "react";
import { CameraControls } from "@react-three/drei";

const PRESETS = {
  overview: [0, 7, 9, 0, 0, 0],
  coastline: [-3, 3, 4, -2, 0, 0],
} as const;

// in FloodScene:
const controls = useRef<ComponentRef<typeof CameraControls>>(null);
const go = (p: readonly number[]) =>
  controls.current?.setLookAt(p[0], p[1], p[2], p[3], p[4], p[5], true); // position, target, animate

// inside <Canvas>:  <CameraControls ref={controls} makeDefault maxPolarAngle={Math.PI / 2.1} />
// outside <Canvas>: <button onClick={() => go(PRESETS.coastline)}>Coastline</button>
```

Define three or four named presets (overview, coastline, city center) and put them on buttons. Presets keep a live demo from turning into a drag-and-get-lost session. If a preset jumps instead of gliding under `frameloop="demand"`, that's the demand-mode failure described in the performance section.

## Labels and markers

- drei `<Html>` places a real DOM element in 3D. Each one is costly, so keep it to about 20 labels.
- More than about 50 markers? Use one `instancedMesh` instead of 50 meshes. It's one draw call instead of 50.

## Performance budget for the demo laptop

| Setting | Budget |
|---|---|
| `dpr` | `[1, 1.5]` — full retina resolution costs 4× the pixels for little visible gain |
| Terrain segments | ≤ 256 × 256 |
| Heightmap | ≤ 1024 px on the long edge |
| Lights | One hemisphere + one directional. **No shadows.** |
| Post-processing | None |
| `frameloop` | `"demand"` — cooler laptop, longer battery during judging |

`"demand"` has one failure mode: something changes outside React (a GSAP tween, a manual mutation) and the screen doesn't update. The fix is to call `invalidate()`. If you are fighting it during the build, switch to `frameloop="always"`. It's a one-word change, and correctness matters more than battery.

## Gotchas

- **Black or empty canvas:** the parent has no height, a light is missing, or the camera is inside or under the terrain. Move the camera up and back before debugging anything else.
- **Terrain mirrored or rotated:** check the `-Math.PI / 2` sign and that the PNG came from the reprojected (EPSG:4326) GeoTIFF.
- **A 404 for the heightmap in the console:** something fetched it directly. Only `useOptionalLayer` may decide whether it exists.
- **Markers don't line up with terrain:** some data is still in UTM. Reproject everything to EPSG:4326 during prep.
- **Water flickers along the coast (z-fighting):** the water and terrain surfaces are nearly coplanar. Raise the water by a hair (`+0.001`) or lower its opacity.
- **Rehearse on the competition laptop.** Integrated GPUs on battery can run at a fraction of desktop speed.
