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

## Install

```bash
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

`@react-three/fiber@9` pairs with React 19 (v8 is for React 18). If npm prints peer-dependency warnings about React, check this first.

## Data prep — do this before the event, never on the day

The terrain comes from a DEM (digital elevation model) GeoTIFF, converted to a grayscale PNG where black is the lowest point and white the highest. GDAL does this, and QGIS's OSGeo4W Shell includes it:

```bash
# 1. Reproject to WGS84 so the terrain lines up with the GeoJSON layers
gdalwarp -t_srs EPSG:4326 -r bilinear dtm.tif dtm_4326.tif

# 2. Read the elevation range and corner coordinates (write them down)
gdalinfo -mm dtm_4326.tif

# 3. Scale elevations to 0–255 and downsample to a sane size (0 keeps the aspect ratio)
gdal_translate -of PNG -ot Byte -scale <minElev> <maxElev> 0 255 -outsize 1024 0 dtm_4326.tif heightmap.png
```

Save the numbers next to the PNG as `public/data/terrain.json`:

```json
{ "bounds": [124.86, 11.74, 124.93, 11.82], "minElev": 0, "maxElev": 412 }
```

`bounds` is `[west, south, east, north]` from `gdalinfo`. The values above are placeholders, not real Catbalogan extents.

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

## Scene skeleton

```tsx
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { CameraControls, Loader } from "@react-three/drei";

export function FloodScene({ levelM }: { levelM: number }) {
  return (
    <div className="relative h-[70vh]">
      <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 7, 9], fov: 45 }}>
        <color attach="background" args={["#0b1220"]} />
        <hemisphereLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />
        <Suspense fallback={null}>
          <Terrain />
          <Water levelM={levelM} />
        </Suspense>
        <CameraControls makeDefault maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
      <Loader />
    </div>
  );
}
```

- `<Suspense>` is required because `useTexture` suspends while the heightmap loads. `<Loader />` sits *outside* the Canvas and shows load progress.
- The Canvas fills its parent, so give the parent a height. A parent with zero height is the most common cause of "nothing renders".

## Terrain

```tsx
import { useTexture } from "@react-three/drei";
import meta from "@/data/terrain.json";
import { terrainFrame, type TerrainMeta } from "@/three/frame";

const frame = terrainFrame(meta as TerrainMeta);

export function Terrain() {
  const height = useTexture("/data/heightmap.png");
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
import { gsap, useGSAP } from "@/lib/gsap";

export function Water({ levelM }: { levelM: number }) {
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
- **Markers don't line up with terrain:** some data is still in UTM. Reproject everything to EPSG:4326 during prep.
- **Water flickers along the coast (z-fighting):** the water and terrain surfaces are nearly coplanar. Raise the water by a hair (`+0.001`) or lower its opacity.
- **Rehearse on the competition laptop.** Integrated GPUs on battery can run at a fraction of desktop speed.
