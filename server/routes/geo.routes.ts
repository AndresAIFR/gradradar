import type { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { generateRequestId, logWithContext } from "../utils/requestUtils";
import { isAuthenticated } from "../emailAuth";
import {
  buildResolutionContext,
  resolveToLocation,
  hasLocationCoords,
  shouldCountAsUnmapped,
  isNonCollege
} from "../geoResolution";
import { storage } from "../storage";

/**
 * Geographic and mapping related routes
 * Handles alumni location mapping, unmapped analysis, and unmapped colleges
 */
export function registerGeoRoutes(api: Router) {
  // Alumni locations for geo map
  api.get("/alumni-locations", isAuthenticated, asyncHandler(async (req, res) => {
    console.log('🔍 [ALUMNI-LOCATIONS] Endpoint hit by user:', req.user ? (req.user as any).email : 'unknown');
    
    console.log('📊 [ALUMNI-LOCATIONS] Fetching alumni from database...');
    const alumni = await storage.getAlumni();
    console.log(`📊 [ALUMNI-LOCATIONS] Fetched ${alumni.length} alumni from database`);
    
    console.log('🏫 [ALUMNI-LOCATIONS] Fetching college locations from database...');
    const collegeLocations = await storage.getAllCollegeLocations();
    console.log(`🏫 [ALUMNI-LOCATIONS] Fetched ${collegeLocations.length} college locations from database`);
    
    // Use shared resolution context for consistent logic across endpoints
    // Fix type compatibility - convert null aliases to undefined
    const compatibleLocations = collegeLocations.map(loc => ({
      ...loc,
      aliases: loc.aliases || undefined
    }));
    // Fix type compatibility - convert null collegeAttending to undefined
    const compatibleAlumni = alumni.map(a => ({
      ...a,
      collegeAttending: a.collegeAttending || undefined
    }));
    const ctx = await buildResolutionContext(compatibleLocations, compatibleAlumni);
    
    // Format data for geo map component with simplified location logic
    const locationData = alumni.map(a => {
      let loc = null;

      if (a.collegeAttending) {
        loc = resolveToLocation(a.collegeAttending, ctx);
      }

      const hasLocation = hasLocationCoords(loc);
      const latNum = hasLocation ? parseFloat(String(loc!.latitude)) : null;
      const lonNum = hasLocation ? parseFloat(String(loc!.longitude)) : null;

      return {
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        cohortYear: a.cohortYear,
        college: a.collegeAttending || 'Unknown',
        employed: a.employed,
        employer: a.employerName,
        currentlyEnrolled: a.currentlyEnrolled,
        trackingStatus: a.trackingStatus || 'unknown',
        isArchived: !!a.isArchived,
        hasLocation,
        latitude: latNum,
        longitude: lonNum,
        locationSource: loc?.source || "none"
      };
    });
    
    // 📊 FIXED: Use hasLocation property (single source of truth)
    const studentsWithLocations = locationData.filter(a => a.hasLocation);
    // Single definition for unmapped counting (eliminates drift)
    const studentsWithoutLocations = locationData.filter(shouldCountAsUnmapped);
    const uniqueColleges = new Set(locationData.map(a => a.college.toLowerCase())).size;
    const studentsWithCollegeData = locationData.filter(a => a.college && a.college !== 'Unknown');
    const studentsWithoutCollegeData = locationData.filter(a => !a.college || a.college === 'Unknown');
    
    console.log('📊 FIXED ENDPOINT DATA [ALUMNI-LOCATIONS]:', {
      endpoint: '/api/alumni-locations',
      timestamp: new Date().toISOString(),
      totalStudents: locationData.length,
      studentsWithCoordinates: studentsWithLocations.length,
      studentsWithoutCoordinates: studentsWithoutLocations.length,
      studentsWithCollegeData: studentsWithCollegeData.length,
      studentsWithoutCollegeData: studentsWithoutCollegeData.length,
      uniqueCollegesReferenced: uniqueColleges,
      sampleWithoutCoordinates: studentsWithoutLocations.slice(0, 5).map(s => ({
        name: `${s.firstName} ${s.lastName}`,
        college: s.college,
        hasLocation: s.hasLocation,
        locationSource: s.locationSource
      }))
    });
    
    console.log(`✅ [ALUMNI-LOCATIONS] Successfully processed ${locationData.length} alumni with locations`);
    console.log('🎯 [ALUMNI-LOCATIONS] Sending response to frontend');
    
    res.json(locationData);
  }));

  // Get detailed unmapped analysis for geo map
  api.get('/unmapped-analysis', isAuthenticated, asyncHandler(async (req, res) => {
    const requestId = generateRequestId();
    const userEmail = (req.user as any)?.email || 'unknown';
    
    const includeArchived = String(req.query.includeArchived || '') === 'true';
    const all = await storage.getAlumni();
    const alumni = includeArchived ? all : all.filter(a => !a.isArchived);
    const collegeLocations = await storage.getAllCollegeLocations();
    
    logWithContext('🔍 [UNMAPPED-ANALYSIS]', requestId, userEmail, {
      input: { alumniCount: alumni.length, collegeLocationsCount: collegeLocations.length }
    });
    
    // Use shared resolution context for consistent logic across endpoints
    // Fix type compatibility - convert null aliases to undefined
    const compatibleLocations = collegeLocations.map(loc => ({
      ...loc,
      aliases: loc.aliases || undefined
    }));
    // Fix type compatibility - convert null collegeAttending to undefined
    const compatibleAlumni = alumni.map(a => ({
      ...a,
      collegeAttending: a.collegeAttending || undefined
    }));
    const ctx = await buildResolutionContext(compatibleLocations, compatibleAlumni);
    
    // Categorize unmapped alumni (database-only, like unmapped-colleges)
    const unmappedStudents: Array<{
      id: number;
      firstName: string;
      lastName: string;
      cohortYear: number;
      college: string | null;
      reason: string;
      category: string;
    }> = [];
    
    let nonCollegeFilteredCount = 0;
    const nonCollegeExamples: string[] = [];
    
    for (const a of alumni) {
      const college = a.collegeAttending || "";
      if (!college.trim()) {
        unmappedStudents.push({ id: a.id, firstName: a.firstName, lastName: a.lastName, cohortYear: a.cohortYear, college: null, reason: "No college information provided", category: "missing_college" });
        continue;
      }
      if (college.toLowerCase() === "na") {
        unmappedStudents.push({ id: a.id, firstName: a.firstName, lastName: a.lastName, cohortYear: a.cohortYear, college, reason: 'College listed as "NA" - needs clarification', category: "invalid_college" });
        continue;
      }
      if (isNonCollege(college)) {
        // not counted as "unmapped" by design (same rule as the map)
        nonCollegeFilteredCount++;
        if (nonCollegeExamples.length < 10) {
          nonCollegeExamples.push(college);
        }
        continue;
      }

      const loc = resolveToLocation(college, ctx);
      if (!hasLocationCoords(loc)) {
        unmappedStudents.push({
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          cohortYear: a.cohortYear,
          college,
          reason: `College "${college}" cannot be resolved to coordinates`,
          category: "unmapped_college",
        });
      }
    }
    
    logWithContext('🔍 [UNMAPPED-ANALYSIS]', requestId, userEmail, {
      processing: {
        locationMapSize: ctx.locationMap.size,
        nonCollegeFilteredCount,
        nonCollegeExamples,
        finalCounts: {
          missing_college: unmappedStudents.filter(s => s.category === 'missing_college').length,
          invalid_college: unmappedStudents.filter(s => s.category === 'invalid_college').length,
          unmapped_college: unmappedStudents.filter(s => s.category === 'unmapped_college').length
        },
        sampleUnmappedColleges: unmappedStudents.filter(s => s.category === 'unmapped_college').slice(0, 10).map(s => s.college)
      }
    });
    
    // Group by category
    const summary = {
      total: unmappedStudents.length,
      categories: {
        missing_college: unmappedStudents.filter(s => s.category === 'missing_college'),
        invalid_college: unmappedStudents.filter(s => s.category === 'invalid_college'),
        unmapped_college: unmappedStudents.filter(s => s.category === 'unmapped_college')
      },
      allStudents: unmappedStudents.sort((a, b) => a.lastName.localeCompare(b.lastName))
    };
    
    // 📊 COMPREHENSIVE DATA ANALYSIS COMPARISON
    console.log('📊 ENDPOINT COMPARISON [UNMAPPED-ANALYSIS]:', {
      endpoint: '/api/unmapped-analysis',
      timestamp: new Date().toISOString(),
      totalStudents: alumni.length,
      totalUnmappedStudents: unmappedStudents.length,
      missingCollege: summary.categories.missing_college.length,
      invalidCollege: summary.categories.invalid_college.length,
      unmappedCollege: summary.categories.unmapped_college.length,
      nonCollegeFiltered: nonCollegeFilteredCount,
      sampleUnmappedStudents: unmappedStudents.slice(0, 5).map(s => ({
        name: `${s.firstName} ${s.lastName}`,
        college: s.college,
        reason: s.reason,
        category: s.category
      }))
    });
    
    res.json(summary);
  }));

  // Get unmapped colleges (colleges that exist in alumni data but not in college_locations)
  api.get('/unmapped-colleges', isAuthenticated, asyncHandler(async (req, res) => {
    const requestId = generateRequestId();
    const userEmail = (req.user as any)?.email || 'unknown';
    
    const alumni = await storage.getAlumni();
    const collegeLocations = await storage.getAllCollegeLocations();
    
    logWithContext('🏫 [UNMAPPED-COLLEGES]', requestId, userEmail, {
      input: { alumniCount: alumni.length, collegeLocationsCount: collegeLocations.length }
    });
    
    // Create a set of mapped college names (including aliases)
    const mappedColleges = new Set<string>();
    collegeLocations.forEach(location => {
      mappedColleges.add(location.standardName.toLowerCase());
      if (location.aliases) {
        location.aliases.forEach(alias => mappedColleges.add(alias.toLowerCase()));
      }
    });
    
    // Find unmapped colleges
    const unmappedMap = new Map<string, { collegeName: string; students: Array<{firstName: string; lastName: string; cohortYear: number}>; studentCount: number }>();
    let nonCollegeSkippedCount = 0;
    
    alumni.forEach(alumnus => {
      if (alumnus.collegeAttending) {
        const collegeName = alumnus.collegeAttending.trim();
        const collegeLower = collegeName.toLowerCase();
        
        // Skip if already mapped or is work/military/etc (use same logic as analysis)
        if (mappedColleges.has(collegeLower) || isNonCollege(collegeName)) {
          if (isNonCollege(collegeName)) {
            nonCollegeSkippedCount++;
          }
          return;
        }
        
        const studentData = {
          firstName: alumnus.firstName,
          lastName: alumnus.lastName,
          cohortYear: alumnus.cohortYear
        };
        
        if (unmappedMap.has(collegeName)) {
          const existing = unmappedMap.get(collegeName)!;
          existing.students.push(studentData);
          existing.studentCount++;
        } else {
          unmappedMap.set(collegeName, {
            collegeName,
            students: [studentData],
            studentCount: 1
          });
        }
      }
    });
    
    const unmappedColleges = Array.from(unmappedMap.values())
      .sort((a, b) => b.studentCount - a.studentCount);
    
    logWithContext('🏫 [UNMAPPED-COLLEGES]', requestId, userEmail, {
      processing: {
        mappedCollegesSize: mappedColleges.size,
        nonCollegeSkippedCount,
        totalUnmappedColleges: unmappedColleges.length,
        sampleUnmappedColleges: unmappedColleges.slice(0, 10).map(c => c.collegeName)
      }
    });
    
    res.json(unmappedColleges);
  }));
}