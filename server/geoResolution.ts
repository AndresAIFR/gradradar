import { cleanCollegeName } from "@shared/collegeName";
import { collegeResolutionService } from "./collegeResolutionService";

// ---- light, pure utils
export const normalize = (s: string) => cleanCollegeName((s || "").trim()).toLowerCase();
export const isValidCoord = (v: any) => Number.isFinite(parseFloat(String(v)));
export const isNonCollege = (name: string) => {
  const lower = (name || "").toLowerCase();
  return (
    lower.includes("work") ||
    lower.includes("military") ||
    lower.includes("armed forces") ||
    lower.includes("trade") ||
    lower.includes("hvac") ||
    lower.includes("carpentry") ||
    lower === "na" ||
    lower === ""
  );
};

type Loc = { latitude: string; longitude: string; source: "college" | "ipeds" | "resolved" };
type LocationMap = Map<string, Loc>;
type ResolutionMap = Map<string, string>;
type ResolvedByOriginalMap = Map<string, { standardName: string; lat: string; lon: string }>;

export async function buildResolutionContext(
  collegeLocations: Array<{ standardName: string; aliases?: string[]; latitude: any; longitude: any }>,
  alumni: Array<{ collegeAttending?: string }>
): Promise<{ locationMap: LocationMap; resolutionMap: ResolutionMap; resolvedByOriginal: ResolvedByOriginalMap }> {
  // DB locations (only valid coords)
  const locationMap: LocationMap = new Map();
  for (const loc of collegeLocations) {
    if (!isValidCoord(loc.latitude) || !isValidCoord(loc.longitude)) continue;
    const stdKey = normalize(loc.standardName);
    const value: Loc = { latitude: String(loc.latitude), longitude: String(loc.longitude), source: "college" };
    locationMap.set(stdKey, value);
    (loc.aliases || []).forEach((alias) => locationMap.set(normalize(alias), value));
  }

  // Names we still don't have, normalized
  const unknowns = Array.from(
    new Set(
      alumni
        .map((a) => a.collegeAttending)
        .filter((n): n is string => !!n && !isNonCollege(n))
        .map((n) => normalize(n))
        .filter((n) => n && !locationMap.has(n))
    )
  );

  const resolutionMap: ResolutionMap = new Map();
  const resolvedByOriginal: ResolvedByOriginalMap = new Map();

  if (unknowns.length) {
    const resolutions = await collegeResolutionService.resolveColleges(unknowns);
    for (const r of resolutions) {
      const key = normalize(r.originalName);
      if (r.standardName) resolutionMap.set(key, r.standardName);
      if (r.latitude != null && r.longitude != null) {
        resolvedByOriginal.set(key, {
          standardName: r.standardName || r.originalName,
          lat: String(r.latitude),
          lon: String(r.longitude),
        });
      }
    }
  }

  return { locationMap, resolutionMap, resolvedByOriginal };
}

export function resolveToLocation(
  name: string,
  ctx: { locationMap: LocationMap; resolutionMap: ResolutionMap; resolvedByOriginal: ResolvedByOriginalMap }
): Loc | null {
  const key = normalize(name);
  const { locationMap, resolutionMap, resolvedByOriginal } = ctx;

  // resolved name → DB
  const resolvedName = resolutionMap.get(key);
  if (resolvedName) {
    const hit = locationMap.get(normalize(resolvedName));
    if (hit) return hit;
  }
  // direct coords from resolver
  const direct = resolvedByOriginal.get(key);
  if (direct) return { latitude: direct.lat, longitude: direct.lon, source: "ipeds" };
  // DB original
  const db = locationMap.get(key);
  if (db) return db;

  return null;
}

export function hasLocationCoords(loc: { latitude: any; longitude: any } | null | undefined) {
  if (!loc) return false;
  const lat = parseFloat(String(loc.latitude));
  const lon = parseFloat(String(loc.longitude));
  return Number.isFinite(lat) && Number.isFinite(lon);
}

// One definition for the badge/list "unmapped" decision
export function shouldCountAsUnmapped(row: { isArchived?: boolean; hasLocation: boolean; college?: string }) {
  if (row.isArchived) return false;
  const c = (row.college || "").toLowerCase().trim();
  // Unmapped = no coords + looks like a college (exclude NA/non-college) + allow "Unknown"
  return !row.hasLocation && (c === "unknown" || (c && c !== "na" && !isNonCollege(c)));
}

// Debug logging helper
export const dbg = (...args: any[]) => (process.env.DEBUG_GEO === "1" ? console.log(...args) : void 0);