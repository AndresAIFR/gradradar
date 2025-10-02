import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createServer, Server } from "http";
import {
  insertAlumniSchema,
  insertAlumniInteractionSchema,
  insertAlumniTaskSchema,
  insertAlumniMetricSchema,
  insertScholarshipSchema,
  insertResourceSchema,
  insertAiPromptsSchema,
} from "@shared/schema";
import { storage } from "./storage";
import { collegeResolutionService, type CollegeResolution } from "./collegeResolutionService.js";
import { cleanCollegeName } from "@shared/collegeName";
import {
  buildResolutionContext,
  resolveToLocation,
  hasLocationCoords,
  shouldCountAsUnmapped,
  isNonCollege
} from "./geoResolution";
import { registerApiRoutes } from "./routes/index";
import { sendEmail } from "./emailService";
import { sendSMS } from "./smsService";
import { setupSession, setupEmailAuth, isAuthenticated, hashPassword, generateToken, getTokenExpiry, sendVerificationEmail, sendPasswordResetEmail, sendInvitationEmail } from "./emailAuth";
import { authRateLimit, checkLoginLockout, recordFailedLogin, clearFailedLogins, forgotPasswordRateLimit, checkForgotPasswordLimit, logAuthEvent, adminClearLockout } from "./middleware/rateLimiting";
import passport from "passport";
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import * as fsSync from 'fs'; // For streaming operations
import { randomUUID } from 'crypto';

import bcrypt from "bcrypt";

// Logging utility for debugging college mapping issues
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 8);
}

function logWithContext(prefix: string, requestId: string, email: string, data: any) {
  console.log(`${prefix} [${requestId}] [${email}]:`, JSON.stringify(data, null, 2));
}

// Shared college resolution utility
async function resolveCollegeLocations(alumni: any[], collegeLocations: any[]) {
  // Create database location map
  const locationMap = new Map();
  collegeLocations.forEach(loc => {
    locationMap.set(loc.standardName.toLowerCase(), {
      latitude: loc.latitude,
      longitude: loc.longitude,
      source: 'college'
    });
    if (loc.aliases) {
      loc.aliases.forEach((alias: string) => {
        locationMap.set(alias.toLowerCase(), {
          latitude: loc.latitude,
          longitude: loc.longitude,
          source: 'college'
        });
      });
    }
  });

  // Collect unmapped colleges for resolution
  const unmappedColleges = new Set<string>();
  alumni.forEach(a => {
    if (a.collegeAttending && !isNonCollege(a.collegeAttending)) {
      const collegeName = a.collegeAttending.toLowerCase();
      if (!locationMap.get(collegeName)) {
        unmappedColleges.add(a.collegeAttending);
      }
    }
  });

  // Resolve unmapped colleges using resolution service
  let resolvedColleges = new Map<string, {latitude: string, longitude: string}>();
  if (unmappedColleges.size > 0) {
    try {
      console.log(`🔍 Resolving ${unmappedColleges.size} unmapped colleges...`);
      const resolutions = await collegeResolutionService.resolveColleges(Array.from(unmappedColleges));
      resolutions.forEach(resolution => {
        if (resolution.standardName && resolution.latitude && resolution.longitude) {
          resolvedColleges.set(resolution.originalName.toLowerCase(), {
            latitude: resolution.latitude.toString(),
            longitude: resolution.longitude.toString()
          });
          console.log(`✅ Resolved "${resolution.originalName}" → ${resolution.standardName}`);
        }
      });
    } catch (error) {
      console.warn('🚨 College resolution failed:', error);
    }
  }

  return { locationMap, resolvedColleges };
}



// Configure multer for file uploads - use memory storage for security
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

export async function registerRoutes(app: express.Express): Promise<Server> {
  // Initialize authentication middleware FIRST
  setupSession(app);
  setupEmailAuth();

  // Register all API routes using the new modular aggregator
  registerApiRoutes(app);









  // Contact Timeline API route
  app.get("/api/contacts/timeline", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userRole = user?.role;
      const userId = user?.id;
      
      // Parse query parameters
      const {
        dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default: 30 days ago
        dateTo = new Date().toISOString().split('T')[0], // Default: today
        staffId,
        alumniId,
        contactType,
        cohortYear,
        trackingStatus,
        needsFollowUp,
        supportCategory,
        employed,
        currentlyEnrolled
      } = req.query;

      // Helper function to parse array parameters
      const parseArrayParam = (param: any): string[] | undefined => {
        if (!param) return undefined;
        if (Array.isArray(param)) return param.map(String);
        return [String(param)];
      };

      const parseNumberArrayParam = (param: any): number[] | undefined => {
        if (!param) return undefined;
        if (Array.isArray(param)) return param.map(p => parseInt(String(p))).filter(n => !isNaN(n));
        const num = parseInt(String(param));
        return isNaN(num) ? undefined : [num];
      };

      // Build the timeline query with role-based filtering
      const timelineData = await storage.getContactTimeline({
        dateFrom: String(dateFrom),
        dateTo: String(dateTo),
        staffId: staffId ? String(staffId) : undefined, // Don't auto-filter by staff ID
        alumniId: alumniId ? parseInt(String(alumniId)) : undefined,
        contactType: parseArrayParam(contactType),
        userRole,
        cohortYear: parseNumberArrayParam(cohortYear),
        trackingStatus: parseArrayParam(trackingStatus),
        needsFollowUp: parseArrayParam(needsFollowUp),
        supportCategory: parseArrayParam(supportCategory),
        employed: parseArrayParam(employed),
        currentlyEnrolled: parseArrayParam(currentlyEnrolled)
      });

      res.json(timelineData);
    } catch (error) {
      console.error('Timeline API error:', error);
      res.status(500).json({ message: "Failed to fetch contact timeline" });
    }
  });

  // Alumni Interactions API routes
  app.get("/api/alumni/:id/interactions", isAuthenticated, async (req, res) => {
    try {
      const alumniId = parseInt(req.params.id);
      const interactions = await storage.getAlumniInteractionsByMember(alumniId);
      
      res.json(interactions);
    } catch (error) {
      
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  app.post("/api/alumni/:id/interactions", isAuthenticated, async (req, res) => {
    try {
      const alumniId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;
      
      const validatedData = insertAlumniInteractionSchema.parse({
        ...req.body,
        alumniId,
        createdBy: userId,
      });
      
      const interaction = await storage.createAlumniInteraction(validatedData);
      
      // Auto-update alumni contact fields for queue management
      await storage.updateAlumni(alumniId, {
        lastContactDate: validatedData.date
      });
      
      // Handle complete all follow-ups if requested
      if (req.body.completeAllFollowups) {
        const completedCount = await storage.completeAllFollowupsForAlumni(alumniId);
      }
      
      // Log interaction creation in audit log
      if (userId) {
        await storage.createAuditLogEntry({
          alumniId: alumniId,
          fieldName: 'interaction',
          oldValue: null,
          newValue: `${validatedData.type}: ${validatedData.overview?.substring(0, 100) || 'No content'}${(validatedData.overview?.length || 0) > 100 ? '...' : ''}`,
          editorId: userId,
          timestamp: new Date()
        });

      }
      
      res.status(201).json(interaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create interaction" });
    }
  });

  app.patch("/api/alumni/:id/interactions/:interactionId", isAuthenticated, async (req, res) => {
    try {
      const alumniId = parseInt(req.params.id);
      const interactionId = parseInt(req.params.interactionId);
      
      console.log(`🔧 [UPDATE-INTERACTION] Updating interaction ${interactionId} for alumni ${alumniId}`);
      console.log(`📝 [UPDATE-INTERACTION] Request body:`, JSON.stringify(req.body, null, 2));
      
      const validatedData = insertAlumniInteractionSchema.partial().parse(req.body);
      console.log(`✅ [UPDATE-INTERACTION] Validation passed:`, JSON.stringify(validatedData, null, 2));
      
      // Get original interaction for audit logging
      const originalInteraction = await storage.getAlumniInteraction(interactionId);
      console.log(`📋 [UPDATE-INTERACTION] Original interaction found:`, originalInteraction ? 'Yes' : 'No');
      
      const interaction = await storage.updateAlumniInteraction(interactionId, validatedData);
      
      // Handle complete all follow-ups if requested
      if (req.body.completeAllFollowups) {
        const completedCount = await storage.completeAllFollowupsForAlumni(alumniId);
      }
      
      // Log interaction update in audit log
      const userId = (req.user as any)?.id;
      if (userId && originalInteraction) {
        // Create audit entries for changed fields
        const changes = [];
        if (validatedData.type && validatedData.type !== originalInteraction.type) {
          changes.push(`Type: ${originalInteraction.type} → ${validatedData.type}`);
        }
        if (validatedData.overview && validatedData.overview !== originalInteraction.overview) {
          changes.push(`Content updated`);
        }
        if (validatedData.date && validatedData.date !== originalInteraction.date) {
          changes.push(`Date: ${originalInteraction.date} → ${validatedData.date}`);
        }
        
        if (changes.length > 0) {
          await storage.createAuditLogEntry({
            alumniId: alumniId,
            fieldName: 'interaction',
            oldValue: `${originalInteraction.type}: ${originalInteraction.overview?.substring(0, 50) || 'No content'}${(originalInteraction.overview?.length || 0) > 50 ? '...' : ''}`,
            newValue: changes.join(', '),
            editorId: userId,
            timestamp: new Date()
          });
        }
      }
      
      console.log(`🎉 [UPDATE-INTERACTION] Update successful:`, interaction);
      res.json(interaction);
    } catch (error) {
      console.error(`❌ [UPDATE-INTERACTION] Error updating interaction:`, error);
      
      if (error instanceof z.ZodError) {
        console.error(`🚫 [UPDATE-INTERACTION] Validation error:`, error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error(`💥 [UPDATE-INTERACTION] Internal server error:`, error);
      res.status(500).json({ message: "Failed to update interaction" });
    }
  });

  app.delete("/api/alumni/:id/interactions/:interactionId", isAuthenticated, async (req, res) => {
    try {
      const alumniId = parseInt(req.params.id);
      const interactionId = parseInt(req.params.interactionId);
      
      if (isNaN(alumniId) || isNaN(interactionId)) {
        return res.status(400).json({ message: "Invalid alumni or interaction ID" });
      }
      
      // Get original interaction for audit logging before deletion
      const originalInteraction = await storage.getAlumniInteraction(interactionId);
      
      await storage.deleteAlumniInteraction(interactionId);
      
      // Log interaction deletion in audit log
      const userId = (req.user as any)?.id;
      if (userId && originalInteraction) {
        await storage.createAuditLogEntry({
          alumniId: alumniId,
          fieldName: 'interaction',
          oldValue: `${originalInteraction.type}: ${originalInteraction.overview?.substring(0, 100) || 'No content'}${(originalInteraction.overview?.length || 0) > 100 ? '...' : ''}`,
          newValue: null,
          editorId: userId,
          timestamp: new Date()
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting interaction:', error);
      res.status(500).json({ message: "Failed to delete interaction" });
    }
  });

  // Populate lastContactDate from interactions
  app.post("/api/alumni/populate-last-contact-dates", isAuthenticated, async (req, res) => {
    try {
      console.log('🔄 [POPULATE-LAST-CONTACT] Starting population process...');
      
      // Get all alumni
      const allAlumni = await storage.getAlumni();
      console.log(`📊 [POPULATE-LAST-CONTACT] Found ${allAlumni.length} alumni to process`);
      
      let updatedCount = 0;
      
      for (const alumnus of allAlumni) {
        // Get all interactions for this alumnus
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
    } catch (error) {
      console.error('💥 [POPULATE-LAST-CONTACT] Error:', error);
      res.status(500).json({ message: "Failed to populate last contact dates", error: error.message });
    }
  });

  // Attachment operations
  app.get("/api/alumni/:id/interactions/:noteId/attachments", isAuthenticated, async (req, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      const attachments = await storage.getAttachmentsByInteraction(noteId);
      res.json(attachments);
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  app.post("/api/alumni/:id/interactions/:noteId/attachments/upload", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const alumniId = parseInt(req.params.id);
      const noteId = parseInt(req.params.noteId);
      
      if (isNaN(alumniId) || isNaN(noteId)) {
        return res.status(400).json({ message: "Invalid alumni ID or note ID" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      console.log(`📎 [UPLOAD] Starting upload for alumni ${alumniId}, note ${noteId}`);
      console.log(`📎 [UPLOAD] File details: ${req.file.originalname}, size: ${req.file.size}, type: ${req.file.mimetype}`);
      
      // SECURITY: Verify the interaction belongs to the specified alumni BEFORE writing file
      console.log(`🔍 [UPLOAD] Verifying interaction ${noteId} belongs to alumni ${alumniId}...`);
      const interaction = await storage.getAlumniInteraction(noteId);
      if (!interaction) {
        console.log(`❌ [UPLOAD] Interaction ${noteId} not found`);
        return res.status(404).json({ message: "Interaction not found" });
      }
      
      if (interaction.alumniId !== alumniId) {
        console.log(`❌ [UPLOAD] Authorization failed: interaction belongs to alumni ${interaction.alumniId}, not ${alumniId}`);
        return res.status(403).json({ message: "Interaction does not belong to specified alumni" });
      }
      console.log(`✅ [UPLOAD] Authorization passed`);
      
      // Now that authorization is verified, save the file to disk
      const { originalname, mimetype, size, buffer } = req.file;
      const extension = path.extname(originalname);
      const fileName = `${randomUUID()}${extension}`;
      console.log(`📂 [UPLOAD] Generated filename: ${fileName}`);
      
      // Create directory structure
      const uploadsDir = path.join(process.cwd(), 'uploads', 'notes', interaction.alumniId.toString(), noteId.toString());
      console.log(`📂 [UPLOAD] Creating directory: ${uploadsDir}`);
      await fs.mkdir(uploadsDir, { recursive: true });
      console.log(`✅ [UPLOAD] Directory created successfully`);
      
      // Write file to disk
      const filePath = path.join(uploadsDir, fileName);
      console.log(`💾 [UPLOAD] Writing file to: ${filePath}`);
      console.log(`💾 [UPLOAD] Buffer size: ${buffer.length} bytes`);
      await fs.writeFile(filePath, buffer);
      console.log(`✅ [UPLOAD] File written to disk successfully`);
      
      const url = `/uploads/notes/${interaction.alumniId}/${noteId}/${fileName}`;
      
      console.log(`🗄️ [UPLOAD] Saving to database with URL: ${url}`);
      const attachment = await storage.createAttachment({
        interactionId: noteId,
        originalName: originalname,
        fileName: fileName,
        mimeType: mimetype,
        size: size,
        url
      });
      console.log(`✅ [UPLOAD] Database record created with ID: ${attachment.id}`);
      
      // Verify file was actually written by checking if it exists
      try {
        await fs.access(filePath);
        console.log(`✅ [UPLOAD] File verified on disk: ${filePath}`);
      } catch (error) {
        console.log(`❌ [UPLOAD] WARNING: File not found on disk after writing: ${error.message}`);
      }
      
      console.log(`📎 [UPLOAD] Complete success: ${originalname} -> ${fileName} (ID: ${attachment.id})`);
      res.status(201).json(attachment);
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      res.status(500).json({ message: "Failed to upload attachment" });
    }
  });

  app.post("/api/alumni/:id/interactions/:noteId/attachments", isAuthenticated, async (req, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      const { originalName, fileName, mimeType, size, url } = req.body;
      
      const attachment = await storage.createAttachment({
        interactionId: noteId,
        originalName,
        fileName,
        mimeType,
        size,
        url
      });
      
      res.status(201).json(attachment);
    } catch (error) {
      console.error('Failed to create attachment:', error);
      res.status(500).json({ message: "Failed to create attachment" });
    }
  });

  // Authenticated file download endpoint
  app.get("/api/attachments/:fileId/download", isAuthenticated, async (req, res) => {
    try {
      console.log(`🔽 [DOWNLOAD] Download request for fileId: ${req.params.fileId}`);
      const fileId = parseInt(req.params.fileId);
      
      if (isNaN(fileId)) {
        console.log(`❌ [DOWNLOAD] Invalid file ID: ${req.params.fileId}`);
        return res.status(400).json({ message: "Invalid file ID" });
      }
      
      console.log(`🔍 [DOWNLOAD] Looking up attachment ${fileId} in database...`);
      // Get attachment info from database
      const attachment = await storage.getAttachmentById(fileId);
      if (!attachment) {
        console.log(`❌ [DOWNLOAD] Attachment ${fileId} not found in database`);
        return res.status(404).json({ message: "Attachment not found" });
      }
      console.log(`✅ [DOWNLOAD] Found attachment: ${JSON.stringify(attachment)}`);
      
      // SECURITY: Get the interaction to verify authorization
      console.log(`🔍 [DOWNLOAD] Looking up interaction ${attachment.interactionId}...`);
      const interaction = await storage.getAlumniInteraction(attachment.interactionId);
      if (!interaction) {
        console.log(`❌ [DOWNLOAD] Interaction ${attachment.interactionId} not found`);
        return res.status(404).json({ message: "Associated interaction not found" });
      }
      console.log(`✅ [DOWNLOAD] Found interaction for alumni ${interaction.alumniId}`);
      
      // TODO: Add role-based authorization here if needed
      // For now, all authenticated users can access attachments
      // In the future, add checks like: user has access to this alumni record
      
      // Construct file path using verified data from database
      const filePath = path.join(
        process.cwd(), 
        'uploads', 
        'notes', 
        interaction.alumniId.toString(), 
        attachment.interactionId.toString(), 
        attachment.fileName
      );
      console.log(`📂 [DOWNLOAD] Constructed file path: ${filePath}`);
      
      // Check if file exists
      console.log(`🔍 [DOWNLOAD] Checking if file exists at: ${filePath}`);
      try {
        await fs.access(filePath);
        console.log(`✅ [DOWNLOAD] File exists on disk`);
      } catch (error) {
        console.log(`❌ [DOWNLOAD] File not found on disk: ${error.message}`);
        return res.status(404).json({ message: "File not found on disk" });
      }
      
      // Sanitize filename for Content-Disposition header
      const safeFilename = attachment.originalName.replace(/[^\w\s.-]/g, '');
      console.log(`📄 [DOWNLOAD] Sanitized filename: ${safeFilename}`);
      
      // Set secure headers and stream the file
      console.log(`📤 [DOWNLOAD] Setting headers and streaming file...`);
      res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache');
      
      // Stream the file using sync fs import for createReadStream
      const readStream = fsSync.createReadStream(filePath);
      readStream.on('error', (error) => {
        console.log(`❌ [DOWNLOAD] Stream error: ${error.message}`);
        if (!res.headersSent) {
          res.status(500).json({ message: "File streaming failed" });
        }
      });
      readStream.on('end', () => {
        console.log(`✅ [DOWNLOAD] File streamed successfully: ${attachment.originalName}`);
      });
      readStream.pipe(res);
      
    } catch (error) {
      console.error(`❌ [DOWNLOAD] Unexpected error:`, error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to download file" });
      }
    }
  });

  app.delete("/api/alumni/:id/interactions/:noteId/attachments/:fileId", isAuthenticated, async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      
      if (isNaN(fileId)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }
      
      // Get attachment info before deletion
      const attachment = await storage.getAttachmentById(fileId);
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      // Get the interaction to build the correct file path
      const interaction = await storage.getAlumniInteraction(attachment.interactionId);
      if (!interaction) {
        // Delete from DB even if interaction is missing
        await storage.deleteAttachment(fileId);
        return res.json({ message: "Attachment deleted successfully (orphaned record)" });
      }
      
      // Delete from database first
      await storage.deleteAttachment(fileId);
      
      // Then try to delete the file from disk
      const filePath = path.join(
        process.cwd(), 
        'uploads', 
        'notes', 
        interaction.alumniId.toString(), 
        attachment.interactionId.toString(), 
        attachment.fileName
      );
      
      try {
        await fs.unlink(filePath);
        console.log(`📎 [DELETE] File removed from disk: ${attachment.fileName}`);
      } catch (fileError) {
        // File might not exist, but database deletion succeeded
        console.warn(`📎 [DELETE] Could not remove file from disk: ${attachment.fileName}`, fileError);
      }
      
      res.json({ message: "Attachment deleted successfully" });
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  // Contact Queue Management
  app.get("/api/contact-queue", isAuthenticated, async (req, res) => {
    try {
      console.log('Contact queue endpoint called');
      // For now, use the regular getAlumni() method and augment with empty interaction data
      const alumni = await storage.getAlumni();
      console.log(`Found ${alumni.length} alumni for contact queue`);
      
      // Augment with empty follow-up data for algorithm compatibility
      const alumniWithInteractions = alumni.map(alumni => ({
        ...alumni,
        latestFollowUpPriority: null,
        latestFollowUpDate: null,
        previousTrackingStatus: null,
        lastTrackingStatusChange: null
      }));
      
      res.json(alumniWithInteractions);
    } catch (error) {
      console.error('Error fetching contact queue:', error);
      res.status(500).json({ message: "Failed to fetch contact queue", error: error.message });
    }
  });

  app.post("/api/contact-queue/pin", isAuthenticated, async (req, res) => {
    try {
      const { alumniId, pinned } = req.body;
      if (!alumniId) {
        return res.status(400).json({ error: "Alumni ID is required" });
      }

      await storage.updateAlumni(alumniId, { pinned: !!pinned });
      res.json({ success: true, pinned: !!pinned });
    } catch (error) {
      console.error('Error updating pin status:', error);
      res.status(500).json({ error: "Failed to update pin status" });
    }
  });

  app.post("/api/contact-queue/snooze", isAuthenticated, async (req, res) => {
    try {
      const { alumniId, snoozedUntil } = req.body;
      if (!alumniId) {
        return res.status(400).json({ error: "Alumni ID is required" });
      }

      await storage.updateAlumni(alumniId, { snoozedUntil });
      res.json({ success: true, snoozedUntil });
    } catch (error) {
      console.error('Error updating snooze status:', error);
      res.status(500).json({ error: "Failed to update snooze status" });
    }
  });

  app.post("/api/contact-queue/skip", isAuthenticated, async (req, res) => {
    try {
      const { alumniId } = req.body;
      if (!alumniId) {
        return res.status(400).json({ error: "Alumni ID is required" });
      }

      // Skip until tomorrow (24 hours from now)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await storage.updateAlumni(alumniId, { queueSkippedUntil: tomorrow.toISOString().split('T')[0] });
      res.json({ success: true, skippedUntil: tomorrow.toISOString().split('T')[0] });
    } catch (error) {
      console.error('Error updating skip status:', error);
      res.status(500).json({ error: "Failed to update skip status" });
    }
  });

  // Student routes removed - migrated to alumni system

  // Session notes routes removed - migrated to alumni interaction system

  // Resources routes removed - migrated to alumni system

  // Homework routes removed - migrated to alumni system

  // Study metrics routes removed - migrated to alumni system

  // Exam scores routes removed - migrated to alumni system

  // [TEMP ROUTE REMOVED - functionality moved to ai.routes.ts]

  app.post('/api/settings/mark-reminder-shown', isAuthenticated, async (req, res) => {
    try {
      const updatedSettings = await storage.markReminderShown();
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark reminder as shown" });
    }
  });

  

  





  const httpServer = createServer(app);
  












  // College resolution endpoints
  
  // Resolve college names to standardized entries
  
  // Search colleges for autocomplete

  // College location management endpoints
  
  



  
  // One-time sync endpoint to migrate existing alumni college data to college_locations
  app.post('/api/sync-college-mappings', isAuthenticated, async (req, res) => {
    try {
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
    } catch (error) {
      console.error('Failed to sync college mappings:', error);
      res.status(500).json({ message: 'Failed to sync college mappings' });
    }
  });



  // Admin-only data management endpoints
  
  // Get alumni data statistics for confirmation before deletion
  app.get('/api/admin/alumni-stats', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      
      // Get user from database to check role
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(403).json({ message: 'User not found in database' });
      }
      
      if (dbUser.role !== 'admin') {
        return res.status(403).json({ message: 'Only administrators can access data statistics' });
      }
      
      const stats = await storage.getAlumniStats();
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get alumni statistics' });
    }
  });
  
  // Export alumni data as CSV backup before deletion
  app.post('/api/admin/export-backup', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      
      // Get user from database to check role
      const dbUser = await storage.getUser(userId);
      if (!dbUser || dbUser.role !== 'admin') {
        return res.status(403).json({ message: 'Only administrators can export data' });
      }
      
      const alumniData = await storage.exportAlumniData();
      
      // Convert to CSV format
      if (alumniData.length === 0) {
        return res.json({ 
          message: 'No alumni data to export',
          csvData: '',
          filename: ''
        });
      }
      
      // Get all column headers from the first record
      const headers = Object.keys(alumniData[0]);
      
      // Create CSV content
      const csvRows = [
        headers.join(','), // Header row
        ...alumniData.map(alumni => 
          headers.map(header => {
            const value = alumni[header as keyof typeof alumni];
            // Handle null/undefined values and escape quotes
            const stringValue = value === null || value === undefined ? '' : String(value);
            // Escape quotes and wrap in quotes if contains comma or quote
            return stringValue.includes(',') || stringValue.includes('"') 
              ? `"${stringValue.replace(/"/g, '""')}"` 
              : stringValue;
          }).join(',')
        )
      ].join('\n');
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `alumni_backup_${timestamp}.csv`;
      
      res.json({
        csvData: csvRows,
        filename
      });
    } catch (error) {
      console.error('Failed to export alumni:', error);
      res.status(500).json({ message: 'Failed to export alumni data' });
    }
  });

  app.put("/api/reports/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      const reportId = parseInt(req.params.id);
      const report = await storage.updateReport(reportId, req.body, userId);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to update report" });
    }
  });

  app.delete("/api/reports/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      const reportId = parseInt(req.params.id);
      await storage.deleteReport(reportId, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete report" });
    }
  });

  // Temporary admin route to clear account lockout
  app.post("/api/admin/clear-lockout", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email required" });
      }
      const cleared = adminClearLockout(email);
      res.json({ success: true, cleared, message: `Lockout cleared for ${email}` });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear lockout" });
    }
  });

  return httpServer;
}

