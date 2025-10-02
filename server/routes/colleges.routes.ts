import express from "express";
import { isAuthenticated } from "../emailAuth";
import { storage } from "../storage";
import { asyncHandler } from "../utils/asyncHandler";
import { generateRequestId, logWithContext } from "../utils/requestUtils";
import { collegeResolutionService } from "../collegeResolutionService";

export function registerCollegeRoutes(router: express.Router) {
  // College data for import wizard
  router.get("/colleges-data", isAuthenticated, asyncHandler(async (req, res) => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const collegeDataPath = path.join(process.cwd(), 'ipeds-institutions.json');
    const collegeData = JSON.parse(await fs.readFile(collegeDataPath, 'utf-8'));
    res.json(collegeData);
  }));

  // Resolve college names to standardized entries
  router.post('/resolve-colleges', isAuthenticated, asyncHandler(async (req, res) => {
    const { collegeNames } = req.body;
    
    if (!Array.isArray(collegeNames)) {
      return res.status(400).json({ message: 'collegeNames must be an array' });
    }
    
    const resolutions = await collegeResolutionService.resolveColleges(collegeNames);
    res.json(resolutions);
  }));

  // Search for colleges (autocomplete)
  router.get('/colleges/search', isAuthenticated, asyncHandler(async (req, res) => {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.json([]);
    }
    
    const results = await collegeResolutionService.searchColleges(q);
    res.json(results);
  }));

  // Get all college locations
  router.get('/college-locations', isAuthenticated, asyncHandler(async (req, res) => {
    const locations = await storage.getAllCollegeLocations();
    res.json(locations);
  }));

  // Debug endpoint for college locations
  router.get('/debug/college-locations', isAuthenticated, asyncHandler(async (req, res) => {
    const requestId = generateRequestId();
    const userEmail = (req.user as any)?.email || 'unknown';
    
    const collegeLocations = await storage.getAllCollegeLocations();
    
    // Find contaminated entries
    const contaminated = collegeLocations.filter(loc => 
      loc.standardName.includes('(') || loc.standardName.includes('?') ||
      loc.aliases?.some(alias => alias.includes('(') || alias.includes('?'))
    );
    
    // Find Washington University entries specifically
    const washingtonEntries = collegeLocations.filter(loc =>
      loc.standardName.toLowerCase().includes('washington') ||
      loc.aliases?.some(alias => alias.toLowerCase().includes('washington'))
    );
    
    logWithContext('🔍 [DATABASE-DEBUG]', requestId, userEmail, {
      totalLocations: collegeLocations.length,
      contaminatedCount: contaminated.length,
      contaminatedEntries: contaminated.map(loc => ({
        id: loc.id,
        standardName: loc.standardName,
        aliases: loc.aliases
      })),
      washingtonEntries: washingtonEntries.map(loc => ({
        id: loc.id,
        standardName: loc.standardName,
        aliases: loc.aliases
      }))
    });
    
    res.json({
      totalLocations: collegeLocations.length,
      contaminatedCount: contaminated.length,
      contaminatedEntries: contaminated,
      washingtonEntries: washingtonEntries
    });
  }));

  // Cleanup contaminated college location data
  router.post('/college-locations/cleanup', isAuthenticated, asyncHandler(async (req, res) => {
    const requestId = generateRequestId();
    const userEmail = (req.user as any)?.email || 'unknown';
    
    logWithContext('🧹 [CLEANUP-START]', requestId, userEmail, {
      action: 'cleanup_contaminated_standard_names_and_aliases'
    });
    
    const collegeLocations = await storage.getAllCollegeLocations();
    let cleanedCount = 0;
    let totalCleaned = 0;
    
    const cleanName = (name: string) => name
      .replace(/\s*\([^)]*\)/g, '') // Remove parentheticals
      .replace(/\s*\?+\s*/g, '') // Remove question marks
      .replace(/\s+(main\s+campus|campus|system\s+office|online|extension|center)$/i, '')
      .trim();
    
    for (const location of collegeLocations) {
      let hasChanges = false;
      let standardNameCleaned = false;
      let aliasesRemoved = 0;
      
      // Clean standardName if contaminated
      const originalStandardName = location.standardName;
      const cleanedStandardName = cleanName(originalStandardName);
      let newStandardName = originalStandardName;
      
      if (cleanedStandardName !== originalStandardName) {
        newStandardName = cleanedStandardName;
        standardNameCleaned = true;
        hasChanges = true;
        
        logWithContext('🧹 [CLEANING-STANDARD-NAME]', requestId, userEmail, {
          locationId: location.id,
          originalStandardName,
          cleanedStandardName
        });
      }
      
      // Clean aliases
      const originalAliases = location.aliases || [];
      const cleanedAliases = originalAliases
        .map(cleanName)
        .filter(a => a && a !== newStandardName.toLowerCase())
        .filter((alias, index, arr) => arr.indexOf(alias) === index); // Remove duplicates
      
      aliasesRemoved = originalAliases.length - cleanedAliases.length;
      
      if (aliasesRemoved > 0) {
        hasChanges = true;
      }
      
      if (hasChanges) {
        await storage.updateCollegeLocation(location.id, {
          standardName: newStandardName,
          aliases: cleanedAliases
        });
        cleanedCount++;
        totalCleaned += aliasesRemoved + (standardNameCleaned ? 1 : 0);
        
        logWithContext('🧹 [CLEANUP-LOCATION]', requestId, userEmail, {
          locationId: location.id,
          originalStandardName,
          newStandardName,
          standardNameCleaned,
          aliasesRemoved,
          cleanedAliases
        });
      }
    }
    
    logWithContext('🧹 [CLEANUP-COMPLETED]', requestId, userEmail, {
      cleanedCount,
      totalCleaned,
      summary: `Cleaned ${cleanedCount} locations, removed ${totalCleaned} contaminated items`
    });
    
    res.json({ 
      message: 'College location cleanup completed',
      cleanedCount,
      totalCleaned
    });
  }));

  // Update college location (add alias)
  router.patch('/college-locations/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const requestId = generateRequestId();
    const userEmail = (req.user as any)?.email || 'unknown';
    const userId = (req.user as any)?.id;
    const locationId = parseInt(req.params.id);
    const { alias, programName, notes } = req.body;
    
    logWithContext('📝 [COLLEGE-LOCATIONS-PATCH]', requestId, userEmail, {
      payloadSummary: { locationId, alias, programName: programName || null, hasNotes: !!notes }
    });
    
    // Get existing location
    const existingLocation = await storage.getAllCollegeLocations();
    const location = existingLocation.find(loc => loc.id === locationId);
    
    if (!location) {
      return res.status(404).json({ message: 'College location not found' });
    }
    
    // Clean alias by removing student notes and parentheticals
    const cleanedAlias = alias
      .replace(/\s*\([^)]*\)/g, '') // Remove parentheticals like "(transferring into CCNY)"
      .replace(/\s*\?+\s*/g, '') // Remove question marks like "right school?"
      .replace(/\s+(main\s+campus|campus|system\s+office|online|extension|center)$/i, '')
      .trim();
    
    const normalizedAlias = cleanedAlias.toLowerCase().trim();
    const currentAliases = location.aliases || [];
    
    // Check if this is a program extraction scenario
    const hasProgram = /\s*\([^)]*\)/g.test(alias) && programName;
    const isCleanedSameAsStandard = location.standardName.toLowerCase() === normalizedAlias;
    
    let updatedLocation;
    
    // If cleaned alias equals standard name and we have a program, this is program extraction - allow it
    if (isCleanedSameAsStandard && hasProgram) {
      // Add the ORIGINAL alias (with program) to preserve the mapping
      const updatedAliases = [...currentAliases, alias]; // Use original with program
      updatedLocation = await storage.updateCollegeLocation(locationId, {
        aliases: updatedAliases
      });
      
      logWithContext('📝 [COLLEGE-LOCATIONS-PATCH]', requestId, userEmail, {
        result: 'program_extraction_success', 
        originalAlias: alias,
        cleanedAlias,
        programName,
        action: 'kept_original_alias_for_program_extraction'
      });
    }
    // Check if cleaned alias already exists in other aliases (not standard name)
    else if (currentAliases.some(a => a.toLowerCase() === normalizedAlias)) {
      logWithContext('📝 [COLLEGE-LOCATIONS-PATCH]', requestId, userEmail, {
        result: 'alias_already_exists', 
        cleanedAlias,
        existingAliases: currentAliases
      });
      return res.status(400).json({ message: 'Alias already exists for this college location' });
    }
    // Check if cleaned alias matches the standard name
    else if (isCleanedSameAsStandard && !hasProgram) {
      logWithContext('📝 [COLLEGE-LOCATIONS-PATCH]', requestId, userEmail, {
        result: 'alias_same_as_standard', 
        cleanedAlias,
        standardName: location.standardName
      });
      return res.status(400).json({ message: 'Alias cannot be the same as the standard name' });
    }
    // Normal case: add cleaned alias
    else {
      const updatedAliases = [...currentAliases, cleanedAlias];
      updatedLocation = await storage.updateCollegeLocation(locationId, {
        aliases: updatedAliases
      });
      
      logWithContext('📝 [COLLEGE-LOCATIONS-PATCH]', requestId, userEmail, {
        result: 'alias_added_success', 
        originalAlias: alias,
        cleanedAlias,
        updatedAliases
      });
    }
    
    // Update alumni who have this college listed as collegeAttending
    try {
      const alumni = await storage.getAlumni();
      const affectedAlumni = alumni.filter((a: any) => 
        a.collegeAttending && a.collegeAttending.toLowerCase().trim() === alias.toLowerCase().trim()
      );
      
      logWithContext('📝 [ALUMNI-UPDATE-PATCH]', requestId, userEmail, {
        affectedAlumniCount: affectedAlumni.length,
        originalAlias: alias,
        cleanedAlias,
        sampleAffectedAlumni: affectedAlumni.slice(0, 5).map(a => `${a.firstName} ${a.lastName}`)
      });
      
      // Update each affected alumnus to use the standard name
      for (const alumnus of affectedAlumni) {
        await storage.updateAlumni(alumnus.id, {
          collegeAttending: location.standardName
        });
      }
    } catch (alumniUpdateError: any) {
      logWithContext('❌ [ALUMNI-UPDATE-ERROR-PATCH]', requestId, userEmail, {
        error: alumniUpdateError?.message || 'Unknown error'
      });
    }
    
    res.json(updatedLocation);
  }));

  // Create new college location
  router.post('/college-locations', isAuthenticated, asyncHandler(async (req, res) => {
    const requestId = generateRequestId();
    const userEmail = (req.user as any)?.email || 'unknown';
    const userId = (req.user as any)?.id;
    const { collegeName, standardName, latitude, longitude, aliases, programName, notes } = req.body;
    
    logWithContext('📝 [COLLEGE-LOCATIONS-POST]', requestId, userEmail, {
      payloadSummary: { 
        standardName: standardName || collegeName,
        aliasesCount: aliases?.length || 0,
        latType: typeof latitude,
        lngType: typeof longitude
      },
      mode: 'create_new'
    });
    
    // Handle coordinate types (accept numbers, convert to strings)
    let finalLat = latitude ? String(latitude) : null;
    let finalLng = longitude ? String(longitude) : null;
    let source = 'manual';
    
    // If coordinates aren't provided or are NYC defaults, try to geocode
    if (!finalLat || !finalLng || 
        (finalLat === '40.7128' && finalLng === '-74.0060')) {
      
      const query = encodeURIComponent(`${standardName || collegeName} university college`);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=us`,
          {
            headers: { 'User-Agent': 'GradRadar-AlumniTracker/1.0' }
          }
        );
        
        if (response.ok) {
          const results = await response.json();
          if (results.length > 0) {
            finalLat = results[0].lat;
            finalLng = results[0].lon;
            source = 'nominatim';
          }
        }
      } catch (geocodeError) {
        console.warn('Geocoding failed, using provided or default coordinates:', geocodeError);
      }
    }
    
    // Fallback to NYC if still no coordinates
    if (!finalLat || !finalLng) {
      finalLat = '40.7128';
      finalLng = '-74.0060';
      source = 'default';
    }
    
    // Clean college name and aliases
    const cleanName = (name: string) => name
      .replace(/\s*\([^)]*\)/g, '') // Remove parentheticals
      .replace(/\s*\?+\s*/g, '') // Remove question marks
      .replace(/\s+(main\s+campus|campus|system\s+office|online|extension|center)$/i, '')
      .trim();
    
    const cleanedStandardName = cleanName(standardName || collegeName);
    const cleanedAliases = aliases ? 
      aliases.map(cleanName).filter((a: string) => a && a !== cleanedStandardName) :
      [];
    
    logWithContext('📝 [COLLEGE-LOCATIONS-POST]', requestId, userEmail, {
      processing: {
        originalName: standardName || collegeName,
        cleanedStandardName,
        originalAliases: aliases || [],
        cleanedAliases,
        coordinates: { lat: finalLat, lng: finalLng, source }
      }
    });
    
    // Create the new college location
    const newLocation = await storage.createCollegeLocation({
      standardName: cleanedStandardName,
      aliases: cleanedAliases,
      latitude: finalLat,
      longitude: finalLng,
      source
    });
    
    // Update alumni who have this college listed as collegeAttending
    try {
      const alumni = await storage.getAlumni();
      
      // Find alumni with the original college name or any of the aliases
      const searchNames = [
        (standardName || collegeName).toLowerCase().trim(),
        ...cleanedAliases.map((a: string) => a.toLowerCase().trim())
      ];
      
      const affectedAlumni = alumni.filter((a: any) => 
        a.collegeAttending && searchNames.includes(a.collegeAttending.toLowerCase().trim())
      );
      
      logWithContext('📝 [ALUMNI-UPDATE-POST]', requestId, userEmail, {
        affectedAlumniCount: affectedAlumni.length,
        searchNames,
        sampleAffectedAlumni: affectedAlumni.slice(0, 5).map((a: any) => 
          `${a.firstName} ${a.lastName} (${a.collegeAttending})`
        )
      });
      
      // Update each affected alumnus to use the standard name
      for (const alumnus of affectedAlumni) {
        await storage.updateAlumni(alumnus.id, {
          collegeAttending: cleanedStandardName
        });
      }
    } catch (alumniUpdateError: any) {
      logWithContext('❌ [ALUMNI-UPDATE-ERROR-POST]', requestId, userEmail, {
        error: alumniUpdateError?.message || 'Unknown error'
      });
    }
    
    logWithContext('📝 [COLLEGE-LOCATIONS-POST]', requestId, userEmail, {
      result: 'college_location_created',
      newLocationId: newLocation.id,
      finalName: cleanedStandardName,
      finalAliases: cleanedAliases,
      coordinates: { lat: finalLat, lng: finalLng, source }
    });
    
    res.json(newLocation);
  }));

  // Sync college mappings (migration endpoint)
  router.post('/sync-college-mappings', isAuthenticated, asyncHandler(async (req, res) => {
    const alumni = await storage.getAlumni();
    const collegeLocations = await storage.getAllCollegeLocations();
    
    // Create a set of existing college names (including aliases)
    const existingColleges = new Set<string>(
      collegeLocations.flatMap(loc => [loc.standardName.toLowerCase(), ...(loc.aliases || []).map(a => a.toLowerCase())])
    );

    const newColleges = new Set<string>();
    let syncedCount = 0;
    
    // Collect all unique college names from existing alumni
    alumni.forEach(alumnus => {
      if (alumnus.collegeAttending) {
        const collegeName = alumnus.collegeAttending.trim();
        const collegeLower = collegeName.toLowerCase();
        
        // Skip if already exists or is work/military/etc
        if (existingColleges.has(collegeLower) || 
            collegeName.toLowerCase().includes('working') ||
            collegeName.toLowerCase().includes('military') ||
            collegeName.toLowerCase().includes('trade') ||
            collegeName.toLowerCase().includes('hvac') ||
            collegeName.toLowerCase().includes('carpentry')) {
          return;
        }
        
        newColleges.add(collegeName);
      }
    });

    // Resolve college names through IPEDS before creating entries
    for (const collegeName of Array.from(newColleges)) {
      try {
        // Use IPEDS resolution to get canonical name
        const resolutions = await collegeResolutionService.resolveColleges([collegeName]);
        const resolution = resolutions[0];
        
        // Only create entries for successfully resolved IPEDS colleges
        if (resolution && resolution.source === 'ipeds' && resolution.standardName) {
          await storage.createCollegeLocation({
            standardName: resolution.standardName,
            aliases: resolution.originalName !== resolution.standardName ? [resolution.originalName] : [],
            latitude: resolution.latitude?.toString() || '40.7128', // Default to NYC coordinates
            longitude: resolution.longitude?.toString() || '-74.0060',
            source: 'sync-migration'
          });
          syncedCount++;
        } else {
          console.warn(`Skipping unmatched college during sync: "${collegeName}" - not found in IPEDS`);
        }
      } catch (locationError) {
        console.warn(`Failed to sync college location for ${collegeName}:`, locationError);
      }
    }
    
    res.json({ 
      message: 'College mapping sync completed',
      syncedCount,
      totalNewColleges: newColleges.size
    });
  }));
}