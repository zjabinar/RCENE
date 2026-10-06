---
name: maplibre-react
description: MapLibre GL JS integration with React for tactical map displays. Covers map initialization, GeoJSON sources, clustering, custom layers, and incident markers. Use when working on map components or spatial visualization.
metadata:
  author: situation-monitor
  version: "1.0"
---

# MapLibre GL JS in React

## Basic Map Component

```typescript
// src/components/map/TacticalMap.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useIncidentStore } from '@/stores/incidents';

const NYC_CENTER: [number, number] = [-73.98, 40.75];
const DEFAULT_ZOOM = 11;

export function TacticalMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { incidents, selectIncident } = useIncidentStore();
  
  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: '/map-style-dark.json',
      center: NYC_CENTER,
      zoom: DEFAULT_ZOOM,
      maxZoom: 18,
      minZoom: 8,
    });
    
    map.current.on('load', () => {
      setupSources(map.current!);
      setupLayers(map.current!);
      setupEventHandlers(map.current!);
    });
    
    // Cleanup
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);
  
  // Update incidents when data changes
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;
    
    const source = map.current.getSource('incidents') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(incidentsToGeoJSON(incidents));
    }
  }, [incidents]);
  
  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full"
      style={{ background: '#0a0a0f' }}
    />
  );
}
```

## GeoJSON Conversion

```typescript
// src/lib/geo.ts
import type { Incident } from '@/types/incidents';

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    id: string;
    title: string;
    category: string;
    severity: string;
    eventTime: string;
  };
}

export function incidentsToGeoJSON(incidents: Incident[]): GeoJSON.FeatureCollection {
  const features: GeoJSONFeature[] = incidents
    .filter(i => i.location)
    .map(incident => ({
      type: 'Feature',
      geometry: incident.location!,
      properties: {
        id: incident.id,
        title: incident.title,
        category: incident.category,
        severity: incident.severity,
        eventTime: incident.eventTime.toISOString(),
      },
    }));
  
  return {
    type: 'FeatureCollection',
    features,
  };
}
```

## Source Setup with Clustering

```typescript
function setupSources(map: maplibregl.Map) {
  map.addSource('incidents', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14, // Cluster until zoom 14
    clusterRadius: 50, // Pixel radius for clustering
    clusterProperties: {
      // Aggregate severity counts per cluster
      critical: ['+', ['case', ['==', ['get', 'severity'], 'critical'], 1, 0]],
      high: ['+', ['case', ['==', ['get', 'severity'], 'high'], 1, 0]],
    },
  });
}
```

## Layer Setup

```typescript
// Severity color mapping
const SEVERITY_COLORS = {
  critical: '#ff2d55',
  high: '#ff6b35',
  moderate: '#ffb800',
  low: '#00d4ff',
  info: '#a1a1aa',
};

function setupLayers(map: maplibregl.Map) {
  // Cluster circles
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'incidents',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'case',
        ['>', ['get', 'critical'], 0], SEVERITY_COLORS.critical,
        ['>', ['get', 'high'], 0], SEVERITY_COLORS.high,
        SEVERITY_COLORS.moderate,
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20,  // 20px for < 10
        10, 30, // 30px for 10-49
        50, 40, // 40px for 50+
      ],
      'circle-opacity': 0.8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });
  
  // Cluster count labels
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'incidents',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['Open Sans Bold'],
      'text-size': 14,
    },
    paint: {
      'text-color': '#ffffff',
    },
  });
  
  // Individual incident points
  map.addLayer({
    id: 'incidents-point',
    type: 'circle',
    source: 'incidents',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'match',
        ['get', 'severity'],
        'critical', SEVERITY_COLORS.critical,
        'high', SEVERITY_COLORS.high,
        'moderate', SEVERITY_COLORS.moderate,
        'low', SEVERITY_COLORS.low,
        SEVERITY_COLORS.info,
      ],
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });
  
  // Pulsing animation for critical incidents
  map.addLayer({
    id: 'incidents-pulse',
    type: 'circle',
    source: 'incidents',
    filter: ['all', 
      ['!', ['has', 'point_count']],
      ['==', ['get', 'severity'], 'critical'],
    ],
    paint: {
      'circle-color': SEVERITY_COLORS.critical,
      'circle-radius': 16,
      'circle-opacity': 0.3,
    },
  });
}
```

## Event Handlers

```typescript
function setupEventHandlers(map: maplibregl.Map) {
  // Change cursor on hover
  map.on('mouseenter', 'incidents-point', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  
  map.on('mouseleave', 'incidents-point', () => {
    map.getCanvas().style.cursor = '';
  });
  
  // Click handler for incidents
  map.on('click', 'incidents-point', (e) => {
    if (!e.features?.length) return;
    
    const feature = e.features[0];
    const id = feature.properties?.id;
    
    if (id) {
      // Update store
      useIncidentStore.getState().selectIncident(id);
      
      // Center on incident
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      map.flyTo({ center: coords, zoom: 15 });
    }
  });
  
  // Click handler for clusters
  map.on('click', 'clusters', async (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
    if (!features.length) return;
    
    const clusterId = features[0].properties?.cluster_id;
    const source = map.getSource('incidents') as maplibregl.GeoJSONSource;
    
    const zoom = await source.getClusterExpansionZoom(clusterId);
    const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
    
    map.flyTo({ center: coords, zoom });
  });
}
```

## Popup Component

```typescript
// src/components/map/IncidentPopup.tsx
'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { createRoot } from 'react-dom/client';
import type { Incident } from '@/types/incidents';

interface Props {
  map: maplibregl.Map;
  incident: Incident;
  onClose: () => void;
}

export function IncidentPopup({ map, incident, onClose }: Props) {
  const popupRef = useRef<maplibregl.Popup | null>(null);
  
  useEffect(() => {
    if (!incident.location) return;
    
    const container = document.createElement('div');
    const root = createRoot(container);
    
    root.render(
      <div className="p-3 min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full bg-severity-${incident.severity}`} />
          <span className="text-xs uppercase text-text-secondary">
            {incident.category}
          </span>
        </div>
        <h3 className="font-medium text-sm mb-1">{incident.title}</h3>
        {incident.locationText && (
          <p className="text-xs text-text-secondary">{incident.locationText}</p>
        )}
        <p className="text-xs text-text-muted mt-2">
          {new Date(incident.eventTime).toLocaleTimeString()}
        </p>
      </div>
    );
    
    popupRef.current = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      className: 'incident-popup',
    })
      .setLngLat(incident.location.coordinates as [number, number])
      .setDOMContent(container)
      .addTo(map);
    
    popupRef.current.on('close', onClose);
    
    return () => {
      root.unmount();
      popupRef.current?.remove();
    };
  }, [map, incident, onClose]);
  
  return null;
}
```

## Popup Styles

```css
/* src/app/globals.css */
.incident-popup .maplibregl-popup-content {
  background: var(--bg-secondary);
  border: 1px solid var(--bg-tertiary);
  border-radius: 8px;
  padding: 0;
  color: var(--text-primary);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.incident-popup .maplibregl-popup-tip {
  border-top-color: var(--bg-secondary);
}

.incident-popup .maplibregl-popup-close-button {
  color: var(--text-secondary);
  font-size: 18px;
  padding: 4px 8px;
}
```

## Dark Tactical Map Style

```json
// public/map-style-dark.json
{
  "version": 8,
  "name": "Tactical Dark",
  "sources": {
    "protomaps": {
      "type": "vector",
      "url": "pmtiles:///tiles/nyc.pmtiles"
    }
  },
  "layers": [
    {
      "id": "background",
      "type": "background",
      "paint": { "background-color": "#0a0a0f" }
    },
    {
      "id": "water",
      "type": "fill",
      "source": "protomaps",
      "source-layer": "water",
      "paint": { "fill-color": "#12121a" }
    },
    {
      "id": "roads",
      "type": "line",
      "source": "protomaps",
      "source-layer": "roads",
      "paint": {
        "line-color": "#1a1a24",
        "line-width": 1
      }
    },
    {
      "id": "buildings",
      "type": "fill",
      "source": "protomaps",
      "source-layer": "buildings",
      "paint": {
        "fill-color": "#15151f",
        "fill-opacity": 0.5
      }
    }
  ]
}
```

## Fit Bounds to Incidents

```typescript
function fitToIncidents(map: maplibregl.Map, incidents: Incident[]) {
  const validIncidents = incidents.filter(i => i.location);
  if (validIncidents.length === 0) return;
  
  const bounds = new maplibregl.LngLatBounds();
  
  validIncidents.forEach(incident => {
    bounds.extend(incident.location!.coordinates as [number, number]);
  });
  
  map.fitBounds(bounds, {
    padding: 50,
    maxZoom: 15,
    duration: 1000,
  });
}
```

## Animate to Location

```typescript
function flyToIncident(map: maplibregl.Map, incident: Incident) {
  if (!incident.location) return;
  
  map.flyTo({
    center: incident.location.coordinates as [number, number],
    zoom: 16,
    duration: 1500,
    essential: true,
  });
}
```

## Get Visible Bounds

```typescript
function getVisibleBbox(map: maplibregl.Map): [number, number, number, number] {
  const bounds = map.getBounds();
  return [
    bounds.getWest(),  // sw_lng
    bounds.getSouth(), // sw_lat
    bounds.getEast(),  // ne_lng
    bounds.getNorth(), // ne_lat
  ];
}
```

## Performance Tips

1. **Use clustering** — essential for 1000+ points
2. **Debounce updates** — don't update source on every state change
3. **Limit features** — query with viewport bounds
4. **Use WebGL layers** — avoid HTML markers for many points
5. **Simplify geometries** — reduce polygon complexity server-side

