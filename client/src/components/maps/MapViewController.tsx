// src/components/maps/MapViewController.tsx
import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function MapViewController({ viewMode }: { viewMode: "us" | "world" }) {
  const map = useMap();
  useEffect(() => {
    const center = viewMode === "us" ? [37.5, -98.5795] : [20, 0];
    const zoom   = viewMode === "us" ? 3.5 : 2;
    map.setView(center as any, zoom as any, { animate: true, duration: 0.5 });
  }, [map, viewMode]);
  return null;
}