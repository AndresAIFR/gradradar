/**
 * Server-side geographic utility functions for filtering and coordinate operations
 * Mirrors client-side functionality for consistent state/location filtering
 */

// US State centroids for reference
const US_STATE_CENTROIDS = {
  'AL': { name: 'Alabama', lat: 32.806671, lng: -86.791130 },
  'AK': { name: 'Alaska', lat: 61.370716, lng: -152.404419 },
  'AZ': { name: 'Arizona', lat: 33.729759, lng: -111.431221 },
  'AR': { name: 'Arkansas', lat: 34.969704, lng: -92.373123 },
  'CA': { name: 'California', lat: 36.116203, lng: -119.681564 },
  'CO': { name: 'Colorado', lat: 39.059811, lng: -105.311104 },
  'CT': { name: 'Connecticut', lat: 41.597782, lng: -72.755371 },
  'DE': { name: 'Delaware', lat: 39.318523, lng: -75.507141 },
  'FL': { name: 'Florida', lat: 27.766279, lng: -81.686783 },
  'GA': { name: 'Georgia', lat: 33.040619, lng: -83.643074 },
  'HI': { name: 'Hawaii', lat: 21.094318, lng: -157.498337 },
  'ID': { name: 'Idaho', lat: 44.240459, lng: -114.478828 },
  'IL': { name: 'Illinois', lat: 40.349457, lng: -88.986137 },
  'IN': { name: 'Indiana', lat: 39.849426, lng: -86.258278 },
  'IA': { name: 'Iowa', lat: 42.011539, lng: -93.210526 },
  'KS': { name: 'Kansas', lat: 38.526600, lng: -96.726486 },
  'KY': { name: 'Kentucky', lat: 37.668140, lng: -84.670067 },
  'LA': { name: 'Louisiana', lat: 31.169546, lng: -91.867805 },
  'ME': { name: 'Maine', lat: 44.693947, lng: -69.381927 },
  'MD': { name: 'Maryland', lat: 39.063946, lng: -76.802101 },
  'MA': { name: 'Massachusetts', lat: 42.230171, lng: -71.530106 },
  'MI': { name: 'Michigan', lat: 43.326618, lng: -84.536095 },
  'MN': { name: 'Minnesota', lat: 45.694454, lng: -93.900192 },
  'MS': { name: 'Mississippi', lat: 32.741646, lng: -89.678696 },
  'MO': { name: 'Missouri', lat: 38.456085, lng: -92.288368 },
  'MT': { name: 'Montana', lat: 47.052632, lng: -110.454353 },
  'NE': { name: 'Nebraska', lat: 41.125370, lng: -98.268082 },
  'NV': { name: 'Nevada', lat: 38.313515, lng: -117.055374 },
  'NH': { name: 'New Hampshire', lat: 43.452492, lng: -71.563896 },
  'NJ': { name: 'New Jersey', lat: 40.298904, lng: -74.521011 },
  'NM': { name: 'New Mexico', lat: 34.840515, lng: -106.248482 },
  'NY': { name: 'New York', lat: 42.165726, lng: -74.948051 },
  'NC': { name: 'North Carolina', lat: 35.630066, lng: -79.806419 },
  'ND': { name: 'North Dakota', lat: 47.528912, lng: -99.784012 },
  'OH': { name: 'Ohio', lat: 40.388783, lng: -82.764915 },
  'OK': { name: 'Oklahoma', lat: 35.565342, lng: -96.928917 },
  'OR': { name: 'Oregon', lat: 44.931109, lng: -120.767178 },
  'PA': { name: 'Pennsylvania', lat: 40.590752, lng: -77.209755 },
  'RI': { name: 'Rhode Island', lat: 41.680893, lng: -71.511780 },
  'SC': { name: 'South Carolina', lat: 33.856892, lng: -80.945007 },
  'SD': { name: 'South Dakota', lat: 44.299782, lng: -99.438828 },
  'TN': { name: 'Tennessee', lat: 35.747845, lng: -86.692345 },
  'TX': { name: 'Texas', lat: 31.054487, lng: -97.563461 },
  'UT': { name: 'Utah', lat: 40.150032, lng: -111.862434 },
  'VT': { name: 'Vermont', lat: 44.045876, lng: -72.710686 },
  'VA': { name: 'Virginia', lat: 37.769337, lng: -78.169968 },
  'WA': { name: 'Washington', lat: 47.400902, lng: -121.490494 },
  'WV': { name: 'West Virginia', lat: 38.491226, lng: -80.954570 },
  'WI': { name: 'Wisconsin', lat: 44.268543, lng: -89.616508 },
  'WY': { name: 'Wyoming', lat: 42.755966, lng: -107.302490 },
  'DC': { name: 'District of Columbia', lat: 38.897438, lng: -77.026817 }
} as const;

// US State boundaries for coordinate-to-state lookup (simplified bounding boxes)
const US_STATE_BOUNDARIES = {
  'AL': { minLat: 30.2, maxLat: 35.0, minLng: -88.5, maxLng: -84.9 },
  'AK': { minLat: 54.8, maxLat: 71.4, minLng: -179.1, maxLng: -129.9 },
  'AZ': { minLat: 31.3, maxLat: 37.0, minLng: -114.8, maxLng: -109.0 },
  'AR': { minLat: 33.0, maxLat: 36.5, minLng: -94.6, maxLng: -89.6 },
  'CA': { minLat: 32.5, maxLat: 42.0, minLng: -124.4, maxLng: -114.1 },
  'CO': { minLat: 36.9, maxLat: 41.0, minLng: -109.1, maxLng: -102.0 },
  'CT': { minLat: 40.9, maxLat: 42.1, minLng: -73.8, maxLng: -71.8 },
  'DE': { minLat: 38.4, maxLat: 39.8, minLng: -75.8, maxLng: -75.0 },
  'FL': { minLat: 24.4, maxLat: 31.0, minLng: -87.6, maxLng: -80.0 },
  'GA': { minLat: 30.3, maxLat: 35.0, minLng: -85.6, maxLng: -80.8 },
  'HI': { minLat: 18.9, maxLat: 28.4, minLng: -178.3, maxLng: -154.8 },
  'ID': { minLat: 41.9, maxLat: 49.0, minLng: -117.2, maxLng: -111.0 },
  'IL': { minLat: 36.9, maxLat: 42.5, minLng: -91.5, maxLng: -87.0 },
  'IN': { minLat: 37.7, maxLat: 41.8, minLng: -88.1, maxLng: -84.8 },
  'IA': { minLat: 40.3, maxLat: 43.5, minLng: -96.6, maxLng: -90.1 },
  'KS': { minLat: 36.9, maxLat: 40.0, minLng: -102.1, maxLng: -94.6 },
  'KY': { minLat: 36.4, maxLat: 39.1, minLng: -89.6, maxLng: -81.9 },
  'LA': { minLat: 28.8, maxLat: 33.0, minLng: -94.0, maxLng: -88.8 },
  'ME': { minLat: 43.0, maxLat: 47.5, minLng: -71.1, maxLng: -66.9 },
  'MD': { minLat: 37.9, maxLat: 39.7, minLng: -79.5, maxLng: -75.0 },
  'MA': { minLat: 41.2, maxLat: 42.9, minLng: -73.5, maxLng: -69.9 },
  'MI': { minLat: 41.6, maxLat: 48.2, minLng: -90.4, maxLng: -82.1 },
  'MN': { minLat: 43.4, maxLat: 49.4, minLng: -97.2, maxLng: -89.5 },
  'MS': { minLat: 30.1, maxLat: 35.0, minLng: -91.7, maxLng: -88.1 },
  'MO': { minLat: 35.9, maxLat: 40.6, minLng: -95.8, maxLng: -89.1 },
  'MT': { minLat: 44.3, maxLat: 49.0, minLng: -116.1, maxLng: -104.0 },
  'NE': { minLat: 39.9, maxLat: 43.0, minLng: -104.1, maxLng: -95.3 },
  'NV': { minLat: 35.0, maxLat: 42.0, minLng: -120.0, maxLng: -114.0 },
  'NH': { minLat: 42.6, maxLat: 45.3, minLng: -72.6, maxLng: -70.6 },
  'NJ': { minLat: 38.9, maxLat: 41.4, minLng: -75.6, maxLng: -73.9 },
  'NM': { minLat: 31.3, maxLat: 37.0, minLng: -109.1, maxLng: -103.0 },
  'NY': { minLat: 40.4, maxLat: 45.0, minLng: -79.8, maxLng: -71.8 },
  'NC': { minLat: 33.8, maxLat: 36.6, minLng: -84.3, maxLng: -75.4 },
  'ND': { minLat: 45.9, maxLat: 49.0, minLng: -104.1, maxLng: -96.6 },
  'OH': { minLat: 38.4, maxLat: 41.9, minLng: -84.8, maxLng: -80.5 },
  'OK': { minLat: 33.6, maxLat: 37.0, minLng: -103.0, maxLng: -94.4 },
  'OR': { minLat: 41.9, maxLat: 46.3, minLng: -124.6, maxLng: -116.4 },
  'PA': { minLat: 39.7, maxLat: 42.3, minLng: -80.5, maxLng: -74.7 },
  'RI': { minLat: 41.1, maxLat: 42.0, minLng: -71.9, maxLng: -71.1 },
  'SC': { minLat: 32.0, maxLat: 35.2, minLng: -83.4, maxLng: -78.5 },
  'SD': { minLat: 42.4, maxLat: 45.9, minLng: -104.1, maxLng: -96.4 },
  'TN': { minLat: 34.9, maxLat: 36.7, minLng: -90.3, maxLng: -81.6 },
  'TX': { minLat: 25.8, maxLat: 36.5, minLng: -106.6, maxLng: -93.5 },
  'UT': { minLat: 36.9, maxLat: 42.0, minLng: -114.1, maxLng: -109.0 },
  'VT': { minLat: 42.7, maxLat: 45.0, minLng: -73.4, maxLng: -71.5 },
  'VA': { minLat: 36.5, maxLat: 39.5, minLng: -83.7, maxLng: -75.2 },
  'WA': { minLat: 45.5, maxLat: 49.0, minLng: -124.8, maxLng: -116.9 },
  'WV': { minLat: 37.2, maxLat: 40.6, minLng: -82.6, maxLng: -77.7 },
  'WI': { minLat: 42.4, maxLat: 47.1, minLng: -92.9, maxLng: -86.2 },
  'WY': { minLat: 40.9, maxLat: 45.0, minLng: -111.1, maxLng: -104.0 },
  'DC': { minLat: 38.8, maxLat: 38.9, minLng: -77.1, maxLng: -76.9 }
} as const;

// Create name-to-code mapping for flexible state parsing
const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATE_CENTROIDS).map(([code, v]) => [v.name.toLowerCase(), code])
);

/**
 * Normalizes state input to consistent uppercase state codes
 * Handles various formats: 'NY', 'ny', 'New York', ' NY ', etc.
 * @param raw - Raw state input (code or name)
 * @returns Normalized state code or null if invalid
 */
export const normalizeStateCode = (raw?: string | null): string | null => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  
  // Check if it's already a valid state code
  const maybeCode = s.toUpperCase();
  if (US_STATE_CENTROIDS[maybeCode as keyof typeof US_STATE_CENTROIDS]) return maybeCode;
  
  // Try to find by state name
  return NAME_TO_CODE[s.toLowerCase()] ?? null;
};

/**
 * Get US state code from coordinates using bounding box lookup
 * @param lat Latitude coordinate
 * @param lng Longitude coordinate
 * @returns Two-letter state code or null if not found/outside US
 */
export function getStateFromCoordinates(lat: number, lng: number): string | null {
  for (const [stateCode, bounds] of Object.entries(US_STATE_BOUNDARIES)) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat && 
        lng >= bounds.minLng && lng <= bounds.maxLng) {
      return stateCode;
    }
  }
  return null;
}

/**
 * Calculate the distance between two geographic points using the Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point  
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in miles
 */
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Validates and parses geographic coordinates
 * @param lat - Latitude value (string or number)
 * @param lng - Longitude value (string or number)
 * @returns Parsed coordinates or null if invalid
 */
export function parseCoordinates(lat: any, lng: any): { lat: number; lng: number } | null {
  const latNum = typeof lat === "string" ? parseFloat(lat) : lat;
  const lngNum = typeof lng === "string" ? parseFloat(lng) : lng;
  
  if (isNaN(latNum) || isNaN(lngNum)) return null;
  if (latNum < -90 || latNum > 90) return null; // Invalid latitude
  if (lngNum < -180 || lngNum > 180) return null; // Invalid longitude
  
  return { lat: latNum, lng: lngNum };
}