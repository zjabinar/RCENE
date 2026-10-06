import { Marker } from "react-map-gl/maplibre";
import type { LngLat } from "@rcene/geo";
import { PIN_COLOR } from "./style.ts";

export interface SelectedPointProps {
  lngLat: LngLat;
  /** Accessible name, e.g. t("map.selectedPoint"). Without it the pin is aria-hidden (mirror the selection in text). */
  label?: string;
  color?: string;
}

// Clicks pass through the pin so the user can tap again right next to it.
const MARKER_STYLE = { pointerEvents: "none" } as const;

/** A pin at the selected point. Render it inside <BaseMap>. */
export function SelectedPoint({ lngLat, label, color = PIN_COLOR }: SelectedPointProps) {
  return (
    <Marker longitude={lngLat[0]} latitude={lngLat[1]} anchor="bottom" style={MARKER_STYLE}>
      <svg
        width="28"
        height="36"
        viewBox="0 0 28 36"
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className="drop-shadow-md"
      >
        <path
          d="M14 1C6.82 1 1 6.6 1 13.5 1 22.9 14 35 14 35s13-12.1 13-21.5C27 6.6 21.18 1 14 1z"
          fill={color}
          stroke="#ffffff"
          strokeWidth="2"
        />
        <circle cx="14" cy="13.5" r="4.5" fill="#ffffff" />
      </svg>
    </Marker>
  );
}
