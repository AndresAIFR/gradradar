// src/components/maps/AlumniMap.tsx
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useLocation } from "wouter";
import { createCustomIcon } from "@/components/maps/icons";
import MapViewController from "@/components/maps/MapViewController";
import AlumniPopup from "@/components/maps/AlumniPopup";
import { getJitteredPosition } from "@/components/maps/utils";

export default function AlumniMap({
  data,
  viewMode,
}: {
  data: any[];
  viewMode: "us" | "world";
}) {
  const [, setLocation] = useLocation();

  // Filter out alumni without location data
  const mappable = Array.isArray(data) ? data.filter((a) => a.hasLocation) : [];

  // Group by exact coordinates to identify duplicates
  const coordinateGroups = mappable.reduce((groups: Record<string, any[]>, a) => {
    const key = `${a.latitude},${a.longitude}`;
    (groups[key] ||= []).push(a);
    return groups;
  }, {});

  // Initial center/zoom
  const center: [number, number] = viewMode === "us" ? [37.5, -98.5795] : [20, 0];
  const zoom = viewMode === "us" ? 3.5 : 2;

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden">
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <MapViewController viewMode={viewMode} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mappable.map((alumni, i) => {
          const dupCount = coordinateGroups[`${alumni.latitude},${alumni.longitude}`]?.length || 1;
          const [lat, lng] = getJitteredPosition(alumni, dupCount);

          return (
            <Marker
              key={`${alumni.id}-${i}`}
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
    </div>
  );
}