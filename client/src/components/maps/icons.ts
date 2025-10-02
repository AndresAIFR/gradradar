// src/components/maps/icons.ts
import L from "leaflet";

// one-time default icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// status dot markers
export const createCustomIcon = (status: string) => {
  const color = status === "on-track" ? "#10b981" : status === "near-track" ? "#f59e0b" : "#ef4444";
  return L.divIcon({
    html: `<div style="background-color:${color};width:20px;height:20px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
    className: "custom-marker",
  });
};

// cluster bubbles
export const createClusterIcon = (count: number) => {
  const size = count < 10 ? 30 : count < 100 ? 40 : 50;
  const fontSize = count < 10 ? "12px" : count < 100 ? "14px" : "16px";
  return L.divIcon({
    html: `<div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);width:${size}px;height:${size}px;border-radius:50%;border:3px solid white;box-shadow:0 4px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${fontSize};font-family:system-ui,-apple-system,sans-serif">${count < 1000 ? count : Math.round(count/100)/10 + "k"}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: "cluster-marker",
  });
};