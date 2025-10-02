import express from "express";
import { isAuthenticated } from "../emailAuth";
import { storage } from "../storage";
import { asyncHandler } from "../utils/asyncHandler";
import { 
  generateRequestId, 
  logWithContext, 
  parsePagination, 
  parseSort, 
  multi, 
  multiNum, 
  bool, 
  idFrom 
} from "../utils/requestUtils";
import { upload } from "../utils/uploadConfig";
import { handleZod } from "../utils/zodHelper";
import { insertAlumniSchema } from "../../shared/schema";
import { z } from "zod";
import { normalizeStateCode, getStateFromCoordinates, calculateDistance, parseCoordinates } from "../utils/geoUtils";
import {
  buildResolutionContext,
  resolveToLocation,
  hasLocationCoords
} from "../geoResolution";

// Upload configuration imported directly

/**
 * Alumni management routes
 * Handles all alumni CRUD operations, interactions, bulk operations, and related functionality
 */
export function registerAlumniRoutes(router: express.Router) {
  // Basic alumni CRUD operations
  
  // Get all alumni
  router.get("/alumni", isAuthenticated, asyncHandler(async (req, res) => {
    const alumni = await storage.getAlumni();
    res.json(alumni);
  }));

  // Get unique cohort years
  router.get("/alumni/cohort-years", isAuthenticated, asyncHandler(async (req, res) => {
    const alumni = await storage.getAlumni();
    const cohortYears = Array.from(new Set(alumni.map(a => a.cohortYear))).sort((a, b) => b - a);
    res.json(cohortYears);
  }));

  // Get dropout admin data
  router.get("/alumni/dropout-admin", isAuthenticated, asyncHandler(async (req, res) => {
    const allAlumni = await storage.getAlumni();
    // Filter for alumni who dropped out (have dropout dates)
    const dropoutAlumni = allAlumni.filter(alumni => alumni.dropoutDate);
    res.json(dropoutAlumni);
  }));

  // Bulk set dropout dates
  router.post("/alumni/bulk-dropout-dates", isAuthenticated, asyncHandler(async (req, res) => {
    const { alumniIds, dropoutDate } = req.body;
    
    if (!alumniIds || !Array.isArray(alumniIds) || !dropoutDate) {
      return res.status(400).json({ error: "Alumni IDs and dropout date are required" });
    }

    let updatedCount = 0;
    for (const alumniId of alumniIds) {
      try {
        await storage.updateAlumni(alumniId, { dropoutDate });
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update alumni ${alumniId}:`, error);
        // Continue with other updates even if one fails
      }
    }

    res.json({ 
      message: `Updated ${updatedCount} alumni with dropout date`, 
      updatedCount 
    });
  }));

  // Export alumni data
  router.get("/alumni/export", isAuthenticated, asyncHandler(async (req, res) => {
    // Parse filters from query params (same as paginated endpoint)
    const filters: any = {};
    if (req.query.cohortYear) {
      filters.cohortYear = Array.isArray(req.query.cohortYear) 
        ? req.query.cohortYear.map(Number)
        : [Number(req.query.cohortYear)];
    }
    if (req.query.trackingStatus) {
      filters.trackingStatus = Array.isArray(req.query.trackingStatus)
        ? req.query.trackingStatus
        : [req.query.trackingStatus];
    }
    if (req.query.contactRecency) {
      filters.contactRecency = Array.isArray(req.query.contactRecency)
        ? req.query.contactRecency
        : [req.query.contactRecency];
    }
    if (req.query.supportCategory) {
      filters.supportCategory = Array.isArray(req.query.supportCategory)
        ? req.query.supportCategory
        : [req.query.supportCategory];
    }
    if (req.query.collegeAttending) {
      filters.collegeAttending = Array.isArray(req.query.collegeAttending)
        ? req.query.collegeAttending
        : [req.query.collegeAttending];
    }
    if (req.query.employed !== undefined) {
      filters.employed = req.query.employed === 'true';
    }
    if (req.query.receivedScholarships !== undefined) {
      filters.receivedScholarships = req.query.receivedScholarships === 'true';
    }
    if (req.query.currentStage) {
      filters.currentStage = Array.isArray(req.query.currentStage)
        ? req.query.currentStage
        : [req.query.currentStage];
    }
    if (req.query.lastContact) {
      filters.lastContact = Array.isArray(req.query.lastContact)
        ? req.query.lastContact
        : [req.query.lastContact];
    }
    if (req.query.onCourseEconomicLiberation !== undefined) {
      filters.onCourseEconomicLiberation = req.query.onCourseEconomicLiberation === 'true';
    }
    if (req.query.attritionType) {
      filters.attritionType = req.query.attritionType as string;
    }

    // Parse geographic filters (new)
    let geoFilter: { type: 'ids' | 'state' | 'location'; data: any } | null = null;
    
    // 1. IDs filter (highest precedence)
    if (req.query.ids) {
      const ids = Array.isArray(req.query.ids) 
        ? req.query.ids.map(id => Number(id)).filter(id => !isNaN(id))
        : [Number(req.query.ids)].filter(id => !isNaN(id));
      
      if (ids.length > 0) {
        geoFilter = { type: 'ids', data: ids };
      }
    }
    
    // 2. State filter (medium precedence)
    if (!geoFilter && req.query.state) {
      const states = Array.isArray(req.query.state)
        ? req.query.state.map(s => normalizeStateCode(s as string)).filter(Boolean) as string[]
        : [normalizeStateCode(req.query.state as string)].filter(Boolean) as string[];
      
      if (states.length > 0) {
        geoFilter = { type: 'state', data: states };
      }
    }
    
    // 3. Location filter (lowest precedence)
    if (!geoFilter && req.query.lat && req.query.lng && req.query.radiusMiles) {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radius = Number(req.query.radiusMiles);
      
      // Validate coordinates and radius
      if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius) && 
          lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && radius > 0 && radius <= 5000) {
        geoFilter = { type: 'location', data: { lat, lng, radius } };
      }
    }

    // Parse sort
    const sort = req.query.sortField && req.query.sortDirection ? {
      field: req.query.sortField as string,
      direction: req.query.sortDirection as 'asc' | 'desc'
    } : undefined;

    // Get ALL alumni (no pagination) with same filters
    const result = await storage.getAlumniPaginated({
      page: 1,
      limit: 10000, // Large number to get all records
      search: req.query.search as string,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sort
    });

    // Apply geographic filters (post-filtering)
    let filteredAlumni = result.alumni;
    
    if (geoFilter) {
      switch (geoFilter.type) {
        case 'ids':
          const targetIds = new Set(geoFilter.data);
          filteredAlumni = filteredAlumni.filter(alum => targetIds.has(alum.id));
          break;
          
        case 'state':
        case 'location':
          // For state and location filters, we need to resolve coordinates from college names
          // This mirrors the logic from /api/alumni-locations endpoint
          
          // Fetch college locations for coordinate resolution
          const collegeLocations = await storage.getAllCollegeLocations();
          
          // Build resolution context (same as alumni-locations endpoint)
          const compatibleLocations = collegeLocations.map(loc => ({
            ...loc,
            aliases: loc.aliases || undefined
          }));
          const compatibleAlumni = filteredAlumni.map(a => ({
            ...a,
            collegeAttending: a.collegeAttending || undefined
          }));
          const ctx = await buildResolutionContext(compatibleLocations, compatibleAlumni);
          
          // Add coordinates to alumni records
          const alumniWithCoords = filteredAlumni.map(a => {
            let loc = null;
            if (a.collegeAttending) {
              loc = resolveToLocation(a.collegeAttending, ctx);
            }
            
            const hasLocation = hasLocationCoords(loc);
            const latitude = hasLocation ? parseFloat(String(loc!.latitude)) : null;
            const longitude = hasLocation ? parseFloat(String(loc!.longitude)) : null;
            
            return {
              ...a,
              latitude,
              longitude,
              hasLocation
            };
          });
          
          // Apply geographic filtering
          if (geoFilter.type === 'state') {
            const targetStates = new Set(geoFilter.data);
            filteredAlumni = alumniWithCoords.filter(alum => {
              if (!alum.latitude || !alum.longitude) return false;
              
              const stateCode = getStateFromCoordinates(alum.latitude, alum.longitude);
              return stateCode ? targetStates.has(stateCode) : false;
            });
          } else if (geoFilter.type === 'location') {
            const { lat: centerLat, lng: centerLng, radius } = geoFilter.data;
            filteredAlumni = alumniWithCoords.filter(alum => {
              if (!alum.latitude || !alum.longitude) return false;
              
              const distance = calculateDistance(centerLat, centerLng, alum.latitude, alum.longitude);
              return distance <= radius;
            });
          }
          break;
      }
    }

    res.json({
      alumni: filteredAlumni,
      total: filteredAlumni.length
    });
  }));

  // Paginated alumni endpoint
  router.get("/alumni/paginated", isAuthenticated, asyncHandler(async (req, res) => {
    const { page, limit } = parsePagination(req.query);
    const search = (req.query.search as string) || undefined;
    
    // Parse filters using utilities
    const filters: any = {};
    const cohortYear = multiNum(req.query, "cohortYear"); 
    if (cohortYear) filters.cohortYear = cohortYear;
    
    const trackingStatus = multi(req.query, "trackingStatus"); 
    if (trackingStatus) filters.trackingStatus = trackingStatus;
    
    const contactRecency = multi(req.query, "contactRecency"); 
    if (contactRecency) filters.contactRecency = contactRecency;
    
    const supportCategory = multi(req.query, "supportCategory"); 
    if (supportCategory) filters.supportCategory = supportCategory;
    
    const collegeAttending = multi(req.query, "collegeAttending"); 
    if (collegeAttending) filters.collegeAttending = collegeAttending;
    
    const employed = bool(req.query, "employed"); 
    if (employed !== undefined) filters.employed = employed;
    
    const receivedScholarships = bool(req.query, "receivedScholarships"); 
    if (receivedScholarships !== undefined) filters.receivedScholarships = receivedScholarships;
    
    const currentStage = multi(req.query, "currentStage"); 
    if (currentStage) filters.currentStage = currentStage;
    
    const lastContact = multi(req.query, "lastContact"); 
    if (lastContact) filters.lastContact = lastContact;
    
    const onCourse = bool(req.query, "onCourseEconomicLiberation"); 
    if (onCourse !== undefined) filters.onCourseEconomicLiberation = onCourse;
    
    const attritionType = (req.query.attritionType as string) || undefined; 
    if (attritionType) filters.attritionType = attritionType;

    const sort = parseSort(req.query);

    const result = await storage.getAlumniPaginated({
      page,
      limit,
      search,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sort
    });

    res.json(result);
  }));

  // Get single alumni
  router.get("/alumni/:id", isAuthenticated, asyncHandler(async (req, res) => {
    const id = idFrom(req.params.id);
    if (id === undefined) {
      return res.status(400).json({ message: "Invalid alumni ID" });
    }
    const allAlumni = await storage.getAlumni();
    const alumnus = allAlumni.find(a => a.id === id);
    if (!alumnus) {
      return res.status(404).json({ message: "Alumni not found" });
    }
    res.json(alumnus);
  }));

  // Create new alumni
  router.post("/alumni", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const validatedData = insertAlumniSchema.parse(req.body);
      const alumnus = await storage.createAlumni(validatedData as any);
      res.status(201).json(alumnus);
    } catch (err) {
      if (handleZod(res, err)) return;
      throw err;
    }
  }));

  // Import alumni from CSV
  router.post("/alumni/import", isAuthenticated, asyncHandler(async (req, res) => {
    const { alumniData } = req.body;
    
    if (!Array.isArray(alumniData)) {
      return res.status(400).json({ message: "Alumni data must be an array" });
    }

    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const alumni of alumniData) {
      try {
        // Parse and validate the alumni data
        const validatedData = insertAlumniSchema.parse(alumni);
        
        // Check if alumni already exists (by firstName, lastName, cohortYear)
        const allAlumni = await storage.getAlumni();
        const existingAlumni = allAlumni.find(a => 
          a.firstName === validatedData.firstName && 
          a.lastName === validatedData.lastName && 
          a.cohortYear === validatedData.cohortYear
        );

        if (existingAlumni) {
          // Update existing alumni
          await storage.updateAlumni(existingAlumni.id, validatedData as any);
          updated++;
        } else {
          // Create new alumni
          const newAlumni = await storage.createAlumni(validatedData as any);
          created++;
          
          // Create initial note if provided
          if (alumni.initialNote) {
            try {
              await storage.createAlumniInteraction({
                alumniId: newAlumni.id,
                date: new Date().toISOString(),
                type: 'general' as const,
                overview: alumni.initialNote,
                durationMin: 0,
                createdBy: (req.user as any)?.id || 'system'
              });
            } catch (noteError) {
              // Continue with import even if note creation fails
            }
          }
        }
        
      } catch (error) {
        errors++;
        const errorMessage = error instanceof z.ZodError 
          ? `Validation error for ${alumni.firstName} ${alumni.lastName}: ${error.errors.map(e => e.message).join(', ')}`
          : `Error processing ${alumni.firstName} ${alumni.lastName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errorDetails.push(errorMessage);
      }
    }

    res.json({ 
      created, 
      updated, 
      errors,
      errorDetails: errorDetails.slice(0, 10) // Return first 10 errors
    });
  }));

  // Update alumni
  router.patch("/alumni/:id", isAuthenticated, asyncHandler(async (req, res) => {
    const id = idFrom(req.params.id);
    if (id === undefined) {
      return res.status(400).json({ message: "Invalid alumni ID" });
    }
    const validatedData = insertAlumniSchema.partial().parse(req.body);
    
    // Get user ID for audit logging
    const user = req.user as any;
    const editorId = user?.id;
    
    if (!editorId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    // Use the audit-enabled update method
    const alumnus = await storage.updateAlumniWithAudit(id, validatedData as any, editorId);
    res.json(alumnus);
  }));

  // Delete alumni
  router.delete("/alumni/:id", isAuthenticated, asyncHandler(async (req, res) => {
    const id = idFrom(req.params.id);
    if (id === undefined) {
      return res.status(400).json({ message: "Invalid alumni ID" });
    }
    await storage.deleteAlumni(id);
    res.status(204).send();
  }));

  // Bulk update tracking status
  router.patch("/alumni/bulk-update-status", isAuthenticated, asyncHandler(async (req, res) => {
    const { alumniIds, trackingStatus } = req.body;
    
    if (!alumniIds || !Array.isArray(alumniIds) || !trackingStatus) {
      return res.status(400).json({ error: "Alumni IDs and tracking status are required" });
    }

    let updatedCount = 0;
    for (const alumniId of alumniIds) {
      try {
        await storage.updateAlumni(alumniId, { trackingStatus });
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update alumni ${alumniId}:`, error);
        // Continue with other updates even if one fails
      }
    }

    res.json({ 
      message: `Updated ${updatedCount} alumni tracking status`, 
      updatedCount 
    });
  }));

  // Bulk flag for outreach - NOT IMPLEMENTED
  router.patch("/alumni/bulk-flag-outreach", isAuthenticated, asyncHandler(async (req, res) => {
    return res.status(501).json({ 
      message: "Bulk outreach flagging not implemented - needsOutreach field needs to be added to alumni schema" 
    });
  }));

  // Bulk archive/unarchive
  router.patch("/alumni/bulk-archive", isAuthenticated, asyncHandler(async (req, res) => {
    const { alumniIds, archived } = req.body;
    
    if (!alumniIds || !Array.isArray(alumniIds) || typeof archived !== 'boolean') {
      return res.status(400).json({ error: "Alumni IDs and archived status are required" });
    }

    let updatedCount = 0;
    for (const alumniId of alumniIds) {
      try {
        await storage.updateAlumni(alumniId, { isArchived: archived });
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update alumni ${alumniId}:`, error);
        // Continue with other updates even if one fails
      }
    }

    res.json({ 
      message: `${archived ? 'Archived' : 'Unarchived'} ${updatedCount} alumni`, 
      updatedCount 
    });
  }));

  // Get audit log for alumni
  router.get("/alumni/:id/audit", isAuthenticated, asyncHandler(async (req, res) => {
    const alumniId = idFrom(req.params.id);
    if (alumniId === undefined) {
      return res.status(400).json({ message: "Invalid alumni ID" });
    }
    // Note: Audit logs not implemented - returning empty array
    const auditLogs: any[] = [];
    res.json(auditLogs);
  }));

  // Populate last contact dates based on interactions
  router.post("/alumni/populate-last-contact-dates", isAuthenticated, asyncHandler(async (req, res) => {
    console.log('🔄 [POPULATE-LAST-CONTACT] Starting process...');
    
    const allAlumni = await storage.getAlumni();
    let updatedCount = 0;
    
    for (const alumnus of allAlumni) {
      const interactions = await storage.getAlumniInteractionsByMember(alumnus.id);
      
      // Find the most recent successful interaction (where studentResponded = true)
      const successfulInteractions = interactions
        .filter(interaction => interaction.date && interaction.studentResponded === true)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (successfulInteractions.length > 0) {
        const lastContactDate = successfulInteractions[0].date;
        
        // Update the alumni's lastContactDate field
        await storage.updateAlumni(alumnus.id, { lastContactDate });
        updatedCount++;
        
        console.log(`✅ [POPULATE-LAST-CONTACT] Updated ${alumnus.firstName} ${alumnus.lastName}: ${lastContactDate}`);
      } else {
        // No successful interactions found - set graduation date as fallback if not already set
        if (!alumnus.lastContactDate && alumnus.cohortYear) {
          // Use June 1st of cohort year as graduation date
          const graduationDate = `${alumnus.cohortYear}-06-01`;
          await storage.updateAlumni(alumnus.id, { lastContactDate: graduationDate });
          updatedCount++;
          
          console.log(`📅 [POPULATE-LAST-CONTACT] Set graduation date for ${alumnus.firstName} ${alumnus.lastName}: ${graduationDate}`);
        } else {
          console.log(`⚪ [POPULATE-LAST-CONTACT] No successful interactions found for ${alumnus.firstName} ${alumnus.lastName}`);
        }
      }
    }
    
    console.log(`🎉 [POPULATE-LAST-CONTACT] Process complete! Updated ${updatedCount} of ${allAlumni.length} alumni`);
    
    res.json({ 
      message: "Last contact dates populated successfully",
      totalAlumni: allAlumni.length,
      updatedCount 
    });
  }));

  // Update alumni salary - NOT IMPLEMENTED  
  router.put("/alumni/:id/salary", isAuthenticated, asyncHandler(async (req, res) => {
    return res.status(501).json({ 
      message: "Salary updates not implemented - salary field needs to be added to alumni schema" 
    });
  }));

  // Alumni interaction endpoints
  
  // Get interactions for alumni
  router.get("/alumni/:id/interactions", isAuthenticated, asyncHandler(async (req, res) => {
    const alumniId = parseInt(req.params.id);
    const interactions = await storage.getAlumniInteractionsByMember(alumniId);
    res.json(interactions);
  }));

  // Create new interaction
  router.post("/alumni/:id/interactions", isAuthenticated, asyncHandler(async (req, res) => {
    const requestId = generateRequestId();
    const userEmail = (req.user as any)?.email || 'unknown';
    const userId = (req.user as any)?.id;
    const alumniId = parseInt(req.params.id);
    
    logWithContext('📝 [CREATE-INTERACTION]', requestId, userEmail, {
      alumniId,
      payloadKeys: Object.keys(req.body)
    });

    const interactionData = {
      ...req.body,
      alumniId,
      createdBy: userId || 'unknown'
    };

    const interaction = await storage.createAlumniInteraction(interactionData);
    
    logWithContext('✅ [INTERACTION-CREATED]', requestId, userEmail, {
      interactionId: interaction.id,
      alumniId,
      type: interaction.type
    });

    res.status(201).json(interaction);
  }));

  // Update interaction
  router.patch("/alumni/:id/interactions/:interactionId", isAuthenticated, asyncHandler(async (req, res) => {
    const requestId = generateRequestId();
    const userEmail = (req.user as any)?.email || 'unknown';
    const userId = (req.user as any)?.id;
    const alumniId = parseInt(req.params.id);
    const interactionId = parseInt(req.params.interactionId);
    
    logWithContext('📝 [UPDATE-INTERACTION]', requestId, userEmail, {
      alumniId,
      interactionId,
      payloadKeys: Object.keys(req.body)
    });

    // Add editor info to update data
    const updateData = {
      ...req.body,
      lastEditedBy: userId,
      lastEditedAt: new Date()
    };

    const interaction = await storage.updateAlumniInteraction(interactionId, updateData);
    
    logWithContext('✅ [INTERACTION-UPDATED]', requestId, userEmail, {
      interactionId,
      alumniId
    });

    res.json(interaction);
  }));

  // Delete interaction
  router.delete("/alumni/:id/interactions/:interactionId", isAuthenticated, asyncHandler(async (req, res) => {
    const requestId = generateRequestId();
    const userEmail = (req.user as any)?.email || 'unknown';
    const alumniId = parseInt(req.params.id);
    const interactionId = parseInt(req.params.interactionId);
    
    logWithContext('🗑️ [DELETE-INTERACTION]', requestId, userEmail, {
      alumniId,
      interactionId
    });

    await storage.deleteAlumniInteraction(interactionId);
    
    logWithContext('✅ [INTERACTION-DELETED]', requestId, userEmail, {
      interactionId,
      alumniId
    });

    res.status(204).send();
  }));

  // Attachment management endpoints
  
  // Get attachments for interaction
  router.get("/alumni/:id/interactions/:noteId/attachments", isAuthenticated, asyncHandler(async (req, res) => {
    const noteId = parseInt(req.params.noteId);
    const attachments = await storage.getAttachmentsByInteraction(noteId);
    res.json(attachments);
  }));

  // Upload attachment
  router.post("/alumni/:id/interactions/:noteId/attachments/upload", isAuthenticated, upload.single('file'), asyncHandler(async (req, res) => {
    const requestId = generateRequestId();
    const userEmail = (req.user as any)?.email || 'unknown';
    const userId = (req.user as any)?.id;
    const noteId = parseInt(req.params.noteId);
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    logWithContext('📎 [UPLOAD-ATTACHMENT]', requestId, userEmail, {
      noteId,
      filename: req.file.originalname,
      size: req.file.size
    });

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure upload directory exists
      const uploadDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      
      // Save file
      const filePath = path.join(uploadDir, req.file.filename);
      await fs.writeFile(filePath, req.file.buffer);
      
      const attachment = await storage.createAttachment({
        interactionId: noteId,
        originalName: req.file.originalname,
        fileName: req.file.filename, // Store relative path
        size: req.file.size,
        mimeType: req.file.mimetype,
        url: `/uploads/${req.file.filename}`
      });
      
      logWithContext('✅ [ATTACHMENT-UPLOADED]', requestId, userEmail, {
        attachmentId: attachment.id,
        noteId
      });

      res.status(201).json(attachment);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  }));

  // Create attachment record (for external files)
  router.post("/alumni/:id/interactions/:noteId/attachments", isAuthenticated, asyncHandler(async (req, res) => {
    const requestId = generateRequestId();
    const userEmail = (req.user as any)?.email || 'unknown';
    const userId = (req.user as any)?.id;
    const noteId = parseInt(req.params.noteId);
    
    logWithContext('📎 [CREATE-ATTACHMENT]', requestId, userEmail, {
      noteId,
      attachmentData: req.body
    });

    const attachmentData = {
      ...req.body,
      interactionId: noteId,
      uploadedBy: userId || 'unknown'
    };

    const attachment = await storage.createAttachment(attachmentData);
    
    logWithContext('✅ [ATTACHMENT-CREATED]', requestId, userEmail, {
      attachmentId: attachment.id,
      noteId
    });

    res.status(201).json(attachment);
  }));

  // Delete attachment
  router.delete("/alumni/:id/interactions/:noteId/attachments/:fileId", isAuthenticated, asyncHandler(async (req, res) => {
    const requestId = generateRequestId();
    const userEmail = (req.user as any)?.email || 'unknown';
    const fileId = parseInt(req.params.fileId);
    const noteId = parseInt(req.params.noteId);
    
    logWithContext('🗑️ [DELETE-ATTACHMENT]', requestId, userEmail, {
      fileId,
      noteId
    });

    // Get attachment details before deletion for cleanup
    const attachment = await storage.getAttachmentById(fileId);
    
    if (attachment && attachment.fileName) {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const fullPath = path.join(process.cwd(), 'uploads', attachment.fileName);
        await fs.unlink(fullPath);
      } catch (error) {
        console.error('Failed to delete file:', error);
        // Continue with database deletion even if file deletion fails
      }
    }

    await storage.deleteAttachment(fileId);
    
    logWithContext('✅ [ATTACHMENT-DELETED]', requestId, userEmail, {
      fileId,
      noteId
    });

    res.status(204).send();
  }));

  // Alumni AI prompts endpoints
  
  // Get AI prompts for alumni
  router.get("/alumni-ai-prompts", isAuthenticated, asyncHandler(async (req, res) => {
    const user = req.user as any;
    const userId = user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    const prompts = await storage.getAiPrompts(userId);
    res.json(prompts || {});
  }));

  // Save AI prompts for alumni
  router.post("/alumni-ai-prompts", isAuthenticated, asyncHandler(async (req, res) => {
    const user = req.user as any;
    const userId = user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    await storage.upsertAlumniAiPrompts(userId, req.body);
    res.json({ message: "AI prompts saved successfully" });
  }));
}