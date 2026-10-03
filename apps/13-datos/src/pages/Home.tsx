/**
 * Demo page proving the shared packages work: tap the map, get the three-state
 * hazard answer. Replace it with the project's real first screen.
 */
import { useMemo } from "react";
import { BaseMap, Legend, SelectedPoint, ZoneLayer } from "@rcene/map";
import { HAZARDS, useLayer, useZones } from "@rcene/data";
import { lookupHazards } from "@rcene/geo";
import { useT } from "@rcene/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@rcene/ui/components/card";
import { HazardStatusList, LoadGate } from "@rcene/ui";
import { useAppStore } from "../store.ts";
import { strings } from "../i18n/strings.ts";

export function Home() {
  const t = useT(strings);
  const selected = useAppStore((s) => s.selected);
  const select = useAppStore((s) => s.select);
  const zones = useZones(HAZARDS);
  const boundary = useLayer("boundary");

  const status = useMemo(() => {
    if (!selected || zones.status !== "ready" || boundary.status !== "ready") return null;
    return lookupHazards(selected, zones.data.zones, boundary.data);
  }, [selected, zones, boundary]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="relative h-[60vh] min-h-80 overflow-hidden rounded-xl border lg:h-[calc(100vh-10rem)]">
        <BaseMap onClick={select}>
          {zones.status === "ready" && <ZoneLayer hazard="flood" zones={zones.data.zones.flood} />}
          {selected && <SelectedPoint lngLat={selected} />}
        </BaseMap>
        <Legend className="absolute bottom-3 left-3" hazard="flood" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("home.heading")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("home.hint")}</p>
        </CardHeader>
        <CardContent>
          {/* The answer needs both the zones and the boundary (no boundary = no coverage = no answer). */}
          <LoadGate state={boundary}>
            {() => (
              <LoadGate state={zones}>
                {({ missing }) =>
                  status ? (
                    <HazardStatusList status={status} missing={missing} />
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("home.noPoint")}</p>
                  )
                }
              </LoadGate>
            )}
          </LoadGate>
        </CardContent>
      </Card>
    </div>
  );
}
