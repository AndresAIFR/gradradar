// src/components/maps/AlumniMapByState.tsx
import { useEffect, useMemo, useCallback, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { getStateFromCoordinates, US_STATE_CENTROIDS } from "@/utils/geo";
import { useLocation } from "wouter";
import MapViewController from "./MapViewController";
import US_STATES from "@/assets/us-states.json";

export default function AlumniMapByState({ data, viewMode }: { data: any[]; viewMode: "us" | "world" }) {
  const [, setLocation] = useLocation();
  const [usStatesGeoJSON, setUsStatesGeoJSON] = useState<any>(US_STATES);

  // Create name to code mapping for GeoJSON compatibility
  const NAME_TO_CODE = useMemo(() => {
    const mapping: Record<string, string> = {};
    Object.entries(US_STATE_CENTROIDS).forEach(([code, data]) => {
      mapping[data.name.toLowerCase()] = code;
    });
    return mapping;
  }, []);

  // Group alumni by state
  const stateGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    data.forEach((alumni) => {
      // Get state from coordinates (more accurate than college names)
      if (alumni.hasLocation && alumni.latitude && alumni.longitude) {
        const lat = parseFloat(alumni.latitude);
        const lng = parseFloat(alumni.longitude);
        const state = getStateFromCoordinates(lat, lng);
        
        if (state && US_STATE_CENTROIDS[state.toUpperCase() as keyof typeof US_STATE_CENTROIDS]) {
          const stateCode = state.toUpperCase();
          if (!groups[stateCode]) groups[stateCode] = [];
          groups[stateCode].push(alumni);
        }
      }
    });
    
    return groups;
  }, [data]);

  // Palette (light → dark)
  const PALETTE = ['#e0e7ff', '#a78bfa', '#8b5cf6', '#6d28d9', '#4c1d95'];

  // Meaningful bins for alumni counts
  const bins = useMemo(() => [
    { min: 1, max: 5, color: PALETTE[0], label: '1–5' },
    { min: 6, max: 10, color: PALETTE[1], label: '6–10' },
    { min: 11, max: 20, color: PALETTE[2], label: '11–20' },
    { min: 21, max: 50, color: PALETTE[3], label: '21–50' },
    { min: 51, max: Infinity, color: PALETTE[4], label: '51+' }
  ], []);

  // Color by absolute bin
  const getStateColor = useCallback((stateCode: string) => {
    const count = stateGroups[stateCode]?.length || 0;
    if (!count) return '#f2f4f7'; // 0 = gray
    
    const bin = bins.find(b => count >= b.min && count <= b.max);
    return bin ? bin.color : PALETTE[4]; // fallback to darkest
  }, [stateGroups, bins]);

  // Handle state click (navigate to alumni page with state filter and drill-down IDs)
  const handleStateClick = useCallback((stateCode: string) => {
    const alumni = stateGroups[stateCode];
    if (!alumni?.length) return;
    
    // Get alumni IDs for drill-down behavior
    const alumniIds = alumni.map(a => a.id);
    
    console.log('🗺️ STATE CHOROPLETH CLICKED:', {
      stateCode,
      alumniCount: alumni.length,
      alumniIds: alumniIds,
      sampleAlumni: alumni.slice(0, 3).map(a => ({
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        cohortYear: a.cohortYear
      }))
    });
    
    const params = new URLSearchParams();
    
    // Set state filter
    params.set('state', stateCode);
    
    // Only include IDs if short enough for a URL; otherwise rely on state filter
    const joined = alumniIds.join(',');
    if (joined.length <= 1500) {
      params.set('ids', joined);
    }
    
    console.log('🗺️ Navigating to:', `/alumni?${params.toString()}`);
    setLocation(`/alumni?${params.toString()}`);
  }, [stateGroups, setLocation]);

  // Custom GeoJSON style function
  const geoJSONStyle = useCallback((feature: any) => {
    const stateName = feature.properties.NAME || feature.properties.name;
    const stateCode = NAME_TO_CODE[stateName?.toLowerCase()] || 
      Object.keys(US_STATE_CENTROIDS).find(code => 
        US_STATE_CENTROIDS[code as keyof typeof US_STATE_CENTROIDS].name.toLowerCase() === stateName?.toLowerCase()
      );
    
    return {
      fillColor: stateCode ? getStateColor(stateCode) : '#f8f9fa',
      weight: 1,
      opacity: 1,
      color: '#ffffff',
      fillOpacity: 0.8
    };
  }, [getStateColor, NAME_TO_CODE]);

  // Handle GeoJSON click events
  const onEachFeature = useCallback((feature: any, layer: any) => {
    const stateName = feature.properties.NAME || feature.properties.name;
    const stateCode = NAME_TO_CODE[stateName?.toLowerCase()] || 
      Object.keys(US_STATE_CENTROIDS).find(code => 
        US_STATE_CENTROIDS[code as keyof typeof US_STATE_CENTROIDS].name.toLowerCase() === stateName?.toLowerCase()
      );
    
    if (stateCode) {
      const count = stateGroups[stateCode]?.length || 0;

      // Lightweight tooltip on hover
      layer.bindTooltip(`${stateName}: ${count} alumni`, {
        permanent: false,
        direction: 'center',
        className: 'state-tooltip'
      });

      // Enhanced interactions
      layer.on('mouseover', function(this: any) { this.setStyle({ weight: 3, color: '#000' }); });
      layer.on('mouseout', function(this: any) { this.setStyle({ weight: 1, color: '#ffffff' }); });

      // Click popup with "View list" button
      layer.on('click', (e: any) => {
        if (!count) return;
        const popupHtml = `
          <div class="p-1 text-center">
            <div class="font-semibold">${stateName}</div>
            <div class="text-xs text-gray-600 mb-2">${count} alumni</div>
            <button
              class="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 js-view-state"
              data-state="${stateCode}"
            >View list</button>
          </div>`;
        layer.bindPopup(popupHtml, { closeButton: true, autoPan: true }).openPopup(e.latlng);
        
        // Delegate click event to button
        setTimeout(() => {
          const btn = document.querySelector(`.js-view-state[data-state="${stateCode}"]`) as HTMLButtonElement | null;
          btn?.addEventListener('click', () => handleStateClick(stateCode));
        }, 0);
      });
    }
  }, [NAME_TO_CODE, stateGroups, handleStateClick]);

  // Color legend component with meaningful bins
  const ColorLegend = useCallback(() => {
    const maxCount = Math.max(...Object.values(stateGroups).map(g => g.length), 0);
    
    return (
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border z-[1000]">
        <h4 className="text-xs font-semibold mb-2">Alumni per state</h4>
        <div className="space-y-1">
          {/* 0 case */}
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-3 border border-gray-300 rounded-sm" style={{ backgroundColor: '#f2f4f7' }} />
            <span>0</span>
          </div>
          {/* Meaningful bins */}
          {bins.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <div className="w-4 h-3 border border-gray-300 rounded-sm" style={{ backgroundColor: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-2">Max: {maxCount} alumni</div>
      </div>
    );
  }, [bins, stateGroups]);

  // US states GeoJSON is now bundled directly - no runtime fetch needed
  console.log('🗺️ Choropleth map ready:', { features: US_STATES.features?.length, bins: bins.length });

  return (
    <>
      <div className="h-[400px] relative">
        <MapContainer
          center={viewMode === 'us' ? [37.5, -98.5795] : [20, 0]}
          zoom={viewMode === 'us' ? 3.5 : 2}
          className="h-full w-full rounded-lg border"
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapViewController viewMode={viewMode} />
          
          {/* Render GeoJSON choropleth if loaded */}
          {usStatesGeoJSON && usStatesGeoJSON !== 'failed' && (
            <GeoJSON
              key={`geojson-${Object.entries(stateGroups).map(([k,v])=>k+':'+v.length).join('|')}`} // Force re-render when data changes
              data={usStatesGeoJSON}
              style={geoJSONStyle}
              onEachFeature={onEachFeature}
            />
          )}
          
          {/* Fallback to simple state markers if GeoJSON failed */}
          {usStatesGeoJSON === 'failed' && Object.entries(stateGroups).map(([stateCode, alumni]) => {
            const stateCentroid = US_STATE_CENTROIDS[stateCode as keyof typeof US_STATE_CENTROIDS];
            return (
              <Marker
                key={stateCode}
                position={[stateCentroid.lat, stateCentroid.lng]}
                icon={L.divIcon({
                  html: `<div style="background: #8b5cf6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${alumni.length}</div>`,
                  iconSize: [30, 20],
                  iconAnchor: [15, 10],
                  className: 'state-fallback-marker'
                })}
              >
                <Popup>
                  <div className="p-2 text-center">
                    <h3 className="font-semibold text-sm">{stateCentroid.name}</h3>
                    <p className="text-xs text-gray-600">{alumni.length} alumni</p>
                    <button 
                      className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      onClick={() => handleStateClick(stateCode)}
                    >
                      View List
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        {usStatesGeoJSON && usStatesGeoJSON !== 'failed' && <ColorLegend />}
      </div>
      
      {!usStatesGeoJSON && (
        <div className="text-center py-4 text-gray-500 text-sm">
          Loading choropleth map data...
          <div className="text-xs mt-1">If loading fails, the map will fall back to marker view.</div>
        </div>
      )}
      
      {usStatesGeoJSON === 'failed' && (
        <div className="text-center py-2 text-orange-600 text-xs">
          Choropleth data unavailable - showing simplified state markers
        </div>
      )}
    </>
  );
}