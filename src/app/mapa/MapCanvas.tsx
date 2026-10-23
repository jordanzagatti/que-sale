"use client";

import {
  AttributionControl,
  GeoJSONSource,
  Map as MapLibreMap,
  NavigationControl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

import type { NormalizedEvent } from "@/lib/types";

type MapCanvasProps = {
  events: NormalizedEvent[];
  selectedId: string | null;
  onSelect: (event: NormalizedEvent) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
};

type EventFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: string;
    title: string;
    slug: string;
    category: string;
  };
};

function collection(events: NormalizedEvent[]) {
  const features: EventFeature[] = events
    .filter(
      (event) =>
        typeof event.lat === "number" && typeof event.lng === "number",
    )
    .map((event) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [event.lng as number, event.lat as number],
      },
      properties: {
        id: event.id,
        title: event.titulo,
        slug: event.slug ?? event.id,
        category: event.categoria,
      },
    }));

  return { type: "FeatureCollection" as const, features };
}

export default function MapCanvas({
  events,
  selectedId,
  onSelect,
  initialCenter,
  initialZoom = 11,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const eventsRef = useRef(events);
  const selectRef = useRef(onSelect);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = initialCenter ?? [-58.3816, -34.6037];

    const map = new MapLibreMap({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center,
      zoom: initialZoom,
      attributionControl: false,
    });

    mapRef.current = map;
    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution: "© OpenFreeMap © OpenStreetMap",
      }),
      "bottom-right",
    );
    map.addControl(
      new NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.on("load", () => {
      map.addSource("events", {
        type: "geojson",
        data: collection(eventsRef.current),
        cluster: true,
        clusterRadius: 46,
        clusterMaxZoom: 13,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "events",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#7c3aed",
            10,
            "#a855f7",
            30,
            "#d946ef",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            18,
            10,
            24,
            30,
            30,
          ],
          "circle-opacity": 0.9,
          "circle-stroke-width": 3,
          "circle-stroke-color": "rgba(255,255,255,0.75)",
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "events",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
          "text-font": ["Noto Sans Bold"],
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "event-halo",
        type: "circle",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 13,
          "circle-color": "rgba(139,92,246,0.22)",
        },
      });

      map.addLayer({
        id: "event-point",
        type: "circle",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 6,
          "circle-color": "#a855f7",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "event-labels",
        type: "symbol",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        minzoom: 11.5,
        layout: {
          "text-field": ["get", "title"],
          "text-size": 10,
          "text-offset": [0, 1.35],
          "text-anchor": "top",
          "text-max-width": 12,
          "text-font": ["Noto Sans Regular"],
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(9,9,11,0.9)",
          "text-halo-width": 2,
        },
      });

      const pointer = () => {
        map.getCanvas().style.cursor = "pointer";
      };
      const normal = () => {
        map.getCanvas().style.cursor = "";
      };

      map.on("mouseenter", "clusters", pointer);
      map.on("mouseleave", "clusters", normal);
      map.on("mouseenter", "event-point", pointer);
      map.on("mouseleave", "event-point", normal);

      map.on("click", "clusters", (event) => {
        const feature = map.queryRenderedFeatures(event.point, {
          layers: ["clusters"],
        })[0];
        if (!feature) return;

        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource("events") as GeoJSONSource;
        source
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            const coordinates = (
              feature.geometry as GeoJSON.Point
            ).coordinates as [number, number];
            map.easeTo({ center: coordinates, zoom });
          })
          .catch(() => undefined);
      });

      map.on("click", "event-point", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const id = String(feature.properties?.id ?? "");
        const selected = eventsRef.current.find((item) => item.id === id);
        if (selected) selectRef.current(selected);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // El mapa se crea una sola vez; las props se sincronizan en otros efectos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const update = () => {
      const source = map.getSource("events") as GeoJSONSource | undefined;
      source?.setData(collection(events));
    };

    if (map.isStyleLoaded()) update();
    else map.once("load", update);

    return () => {
      map.off("load", update);
    };
  }, [events]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !initialCenter) return;

    map.flyTo({
      center: initialCenter,
      zoom: initialZoom,
      duration: 900,
    });
  }, [initialCenter, initialZoom]);

  useEffect(() => {
    if (!selectedId) return;
    const map = mapRef.current;
    const selected = events.find((event) => event.id === selectedId);
    if (!map || !selected) return;
    if (typeof selected.lat !== "number" || typeof selected.lng !== "number") {
      return;
    }

    map.flyTo({
      center: [selected.lng, selected.lat],
      zoom: Math.max(map.getZoom(), 13.5),
      duration: 900,
    });
  }, [events, selectedId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
