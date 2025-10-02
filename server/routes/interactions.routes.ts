import { Router } from "express";
import { z } from "zod";
import { insertAlumniInteractionSchema } from "@shared/schema";
import { storage } from "../storage";
import { isAuthenticated } from "../emailAuth";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Alumni Interactions Routes
 * Handles CRUD operations for alumni interactions (session notes, communications, etc.)
 */

export function registerInteractionsRoutes(api: Router) {
  // GET interactions by alumni
  api.get("/alumni/:id/interactions", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const alumniId = parseInt(req.params.id);
      const interactions = await storage.getAlumniInteractionsByMember(alumniId);
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  }));

  // CREATE interaction
  api.post("/alumni/:id/interactions", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const alumniId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;

      const validatedData = insertAlumniInteractionSchema.parse({
        ...req.body,
        alumniId,
        createdBy: userId,
      });

      const interaction = await storage.createAlumniInteraction(validatedData);

      await storage.updateAlumni(alumniId, {
        lastContactDate: validatedData.date
      });

      if (req.body.completeAllFollowups) {
        await storage.completeAllFollowupsForAlumni(alumniId);
      }

      if (userId) {
        await storage.createAuditLogEntry({
          alumniId,
          fieldName: "interaction",
          oldValue: null,
          newValue: `${validatedData.type}: ${validatedData.overview?.substring(0, 100) || "No content"}${
            (validatedData.overview?.length || 0) > 100 ? "..." : ""
          }`,
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
  }));

  // UPDATE interaction
  api.patch("/alumni/:id/interactions/:interactionId", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const alumniId = parseInt(req.params.id);
      const interactionId = parseInt(req.params.interactionId);

      const validatedData = insertAlumniInteractionSchema.partial().parse(req.body);
      const original = await storage.getAlumniInteraction(interactionId);
      const interaction = await storage.updateAlumniInteraction(interactionId, validatedData);

      if (req.body.completeAllFollowups) {
        await storage.completeAllFollowupsForAlumni(alumniId);
      }

      const userId = (req.user as any)?.id;
      if (userId && original) {
        const changes = [];
        if (validatedData.type && validatedData.type !== original.type) {
          changes.push(`Type: ${original.type} → ${validatedData.type}`);
        }
        if (validatedData.overview && validatedData.overview !== original.overview) {
          changes.push(`Content updated`);
        }
        if (validatedData.date && validatedData.date !== original.date) {
          changes.push(`Date: ${original.date} → ${validatedData.date}`);
        }
        if (changes.length) {
          await storage.createAuditLogEntry({
            alumniId,
            fieldName: "interaction",
            oldValue: `${original.type}: ${original.overview?.substring(0, 50) || "No content"}${
              (original.overview?.length || 0) > 50 ? "..." : ""
            }`,
            newValue: changes.join(", "),
            editorId: userId,
            timestamp: new Date()
          });
        }
      }

      res.json(interaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update interaction" });
    }
  }));

  // DELETE interaction
  api.delete("/alumni/:id/interactions/:interactionId", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const alumniId = parseInt(req.params.id);
      const interactionId = parseInt(req.params.interactionId);
      if (isNaN(alumniId) || isNaN(interactionId)) {
        return res.status(400).json({ message: "Invalid alumni or interaction ID" });
      }
      const original = await storage.getAlumniInteraction(interactionId);
      await storage.deleteAlumniInteraction(interactionId);

      const userId = (req.user as any)?.id;
      if (userId && original) {
        await storage.createAuditLogEntry({
          alumniId,
          fieldName: "interaction",
          oldValue: `${original.type}: ${original.overview?.substring(0, 100) || "No content"}${
            (original.overview?.length || 0) > 100 ? "..." : ""
          }`,
          newValue: null,
          editorId: userId,
          timestamp: new Date()
        });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete interaction" });
    }
  }));
}