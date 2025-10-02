// src/components/maps/AlumniMapClustered.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Supercluster from "supercluster";
import { useLocation } from "wouter";

import MapViewController from "@/components/maps/MapViewController";
import { createClusterIcon, createCustomIcon } from "@/components/maps/icons";
import SharedAlumniListModal from "@/components/analytics/SharedAlumniListModal";
import AlumniPopup from "@/components/maps/AlumniPopup";

export default function AlumniMapClustered({
  data,
  viewMode,
}: {
  data: any[];
  viewMode: "us" | "world";
}) {
  const [, setLocation] = useLocation();
  const [clusters, setClusters] = useState<any[]>([]);

  // Convert alumni data to GeoJSON points for Supercluster
  const points = useMemo(() => {
    const mappableData = Array.isArray(data) ? data.filter((alumni) => alumni.hasLocation) : [];
    return mappableData.map((alumni) => ({
      type: "Feature" as const,
      properties: alumni,
      geometry: {
        type: "Point" as const,
        coordinates: [parseFloat(alumni.longitude), parseFloat(alumni.latitude)],
      },
    }));
  }, [data]);

  // Create stable Supercluster index with ref to prevent infinite loops
  const clusterRef = useRef<Supercluster | null>(null);

  // Update cluster when points change
  useEffect(() => {
    const index = new Supercluster({
      radius: 50, // Cluster radius in pixels
      maxZoom: 20, // Max zoom to cluster points on
      minPoints: 2, // Minimum points to form a cluster
    });

    index.load(points);
    clusterRef.current = index;
  }, [points]);

  // Store map reference for cluster navigation
  const mapRef = useRef<L.Map | null>(null);

  // BREAK THE INFINITE LOOP - Use a stable effect that won't remount
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return; // Prevent multiple initializations

    // This effect will only run once per component instance
    const initializeClusters = () => {
      if (!mapRef.current || !clusterRef.current) {
        setTimeout(initializeClusters, 50); // Retry until both refs are ready
        return;
      }

      const draw = () => {
        if (!mapRef.current || !clusterRef.current) return;
        try {
          const b = mapRef.current.getBounds();
          const bbox: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
          const next = clusterRef.current.getClusters(bbox, Math.floor(mapRef.current.getZoom()));
          setClusters(next);
        } catch (e) {
          console.warn("Cluster update failed:", e);
        }
      };

      let t: NodeJS.Timeout;
      const debounced = () => {
        clearTimeout(t);
        t = setTimeout(draw, 150);
      };

      // Initial draw
      draw();

      // Add map listener
      mapRef.current.on("moveend", debounced);

      hasInitialized.current = true;
    };

    initializeClusters();

    // Cleanup listener on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.off("moveend");
      }
    };
  }, []); // Empty dependency array - this should only run once

  // PHASE 3: State for list view popup
  const [showListView, setShowListView] = useState(false);
  const [listViewData, setListViewData] = useState<any[]>([]);

  // PHASE 2: Add decision logic (preserving existing behavior)
  const handleClusterClick = useCallback((clusterId: number, coordinates: [number, number]) => {
    console.log(`🎯 CLUSTER CLICK TRIGGERED!`, {
      clusterId,
      coordinates,
      hasClusterRef: !!clusterRef.current,
      hasMapRef: !!mapRef.current,
      timestamp: Date.now(),
    });

    if (!clusterRef.current) {
      console.error(`❌ CLUSTER CLICK - no clusterRef`);
      return;
    }

    const originalExpansionZoom = clusterRef.current.getClusterExpansionZoom(clusterId);

    // Fixed zoom levels for predictable navigation: National → Regional → State → City → Street  
    const zoomLevels = [4, 8, 12, 16, 17];
    const currentZoom = mapRef.current?.getZoom() || 0;

    // Find next zoom level, or use original expansion zoom for final level
    let expansionZoom = zoomLevels.find((z) => z > currentZoom);

    // If we're at the final zoom level, use the original expansion logic for list view
    if (!expansionZoom || currentZoom >= 16) {
      expansionZoom = originalExpansionZoom;
    }

    console.log(`📈 EXPANSION ZOOM - current: ${currentZoom}, next: ${expansionZoom}, original: ${originalExpansionZoom}`);

    if (mapRef.current && expansionZoom !== undefined) {
      const maxZoom = mapRef.current.getMaxZoom() ?? 20;
      const z = Math.min(expansionZoom, maxZoom - 1);

      // PHASE 3: Trigger list view at maximum zoom
      const isAtMaxZoom = z >= maxZoom - 1 && currentZoom >= maxZoom - 2;

      if (isAtMaxZoom) {
        console.log(`🎯 MAX ZOOM REACHED - showing list view instead of zooming`);

        // Get children for list view
        const children = clusterRef.current.getChildren(clusterId);
        console.log(`📋 CLUSTER CHILDREN:`, {
          clusterId,
          childCount: children.length,
          children: children.map((c: any) => ({
            id: c.properties.id,
            name: `${c.properties.firstName} ${c.properties.lastName}`,
            college: c.properties.college,
          })),
        });

        setListViewData(children.map((c: any) => c.properties));
        setShowListView(true);
        return;
      }

      console.log(`🗺️ ZOOMING TO: lat=${coordinates[1]}, lng=${coordinates[0]}, zoom=${z}`);

      mapRef.current.setView([coordinates[1], coordinates[0]], z, {
        animate: true,
        duration: 0.5,
      });
    }
  }, []);

  const center: [number, number] = viewMode === "us" ? [37.5, -98.5795] : [20, 0];
  const zoom = viewMode === "us" ? 3.5 : 2;

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        whenReady={(e) => (mapRef.current = e.target)}
      >
        <MapViewController viewMode={viewMode} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {clusters.map((item) => {
          const [lng, lat] = item.geometry.coordinates;
          const isCluster = item.properties.cluster;
          if (isCluster) {
            return (
              <Marker
                key={`cluster-${item.properties.cluster_id}`}
                position={[lat, lng]}
                icon={createClusterIcon(item.properties.point_count)}
                eventHandlers={{ click: () => handleClusterClick(item.properties.cluster_id, [lng, lat]) }}
              />
            );
          }
          const alumni = item.properties;
          return (
            <Marker
              key={`alumni-${alumni.id}`}
              position={[lat, lng]}
              icon={createCustomIcon(alumni.trackingStatus)}
            >
              <Popup>
                <AlumniPopup alumni={alumni} onNavigate={setLocation} />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <SharedAlumniListModal
        isOpen={showListView}
        onClose={() => setShowListView(false)}
        alumni={listViewData}
        onNavigateToAlumni={setLocation}
      />
    </div>
  );
}